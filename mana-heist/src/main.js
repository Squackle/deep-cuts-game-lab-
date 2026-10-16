import {LEVELS,CHAPTERS,GALAXIES,BASE_LEVELS} from "./levels.js";
import {COLORS,CARDS,initial,actions,reduce,completed,getCard,lookup,medal} from "./engine.js";
import {solve} from "./solver.js";
import {highestUnlocked,unlocked,chapterIndex,stageCode,normalizedBests,chapterAccessible,galaxyAccessible} from "./campaign.js";
import {renderOverworld} from "./overworld.js";
import {reconstruct,transitionOrbs,consistent,sendOrb} from "./mana-orbs.js";
import {renderWardCharge} from "./ward-charge.js";
import {installFluidWard} from "./fluid-ward.js";
import {PRELOADED_MIX_COUNT} from "./fluid-palette.js";
import {chooseAutomaticCast} from "./auto-cast.js";
import {landPainting} from "./land-art.js";
import {installLandDragging} from "./drag-lands.js";
import {renderCardReferences,referenceFor} from "./card-references.js";
import {installCardInspector} from "./card-inspector.js";
import {installCardMagnifier} from "./card-magnifier.js";
import {imageFor,printingFor,startStagePrintings,invalidateStagePrintings} from "./printing-art.js";
import {missingMana,failureText,flashWard} from "./ward-feedback.js";
import {isFinalTurn,requiredManaText,finalTurnMessage,tappedLandMessage} from "./turn-guidance.js";
const el=id=>document.getElementById(id);
const SYMBOL={W:{name:"White",color:"#e5dfb7",icon:"W"},U:{name:"Blue",color:"#287eb0",icon:"U"},B:{name:"Black",color:"#595067",icon:"B"},R:{name:"Red",color:"#c05b48",icon:"R"},G:{name:"Green",color:"#498967",icon:"G"},C:{name:"Colorless",color:"#bec5bd",icon:"◇"},N:{name:"Generic",color:"#bec5bd",icon:"1"}};
const storageKey="dc-mana-heist-landfall-v2";
function readProgress(){
 try{const x=JSON.parse(localStorage.getItem(storageKey)||"null");if(x&&x.v===2&&typeof x.bests==="object"&&x.bests&&!Array.isArray(x.bests))return {bests:normalizedBests(x.bests),index:Math.max(0,Math.min(LEVELS.length-1,Number.isInteger(x.index)?x.index:0))};}catch{}
 return {bests:{},index:0};
}
let progress=readProgress(),index=Math.min(progress.index,highestUnlocked(progress.bests)),level=LEVELS[index],state=initial(level),history=[],choiceActions=[],selectedMessage="";
let world=chapterIndex(index),manaOrbs=reconstruct(state.pool),landDrag=null,lastCardId=null,selectedHandId=null;
let autoCastEnabled=false;
try{autoCastEnabled=localStorage.getItem("dc-mana-heist-auto-cast")==="yes";}catch{}
el("autoCastToggle").checked=autoCastEnabled;
let viewEpoch=0;
let autoTimer=null;
function cancelAuto(){
 if(autoTimer!==null){clearTimeout(autoTimer);autoTimer=null;}
 el("wardTarget")?.classList.remove("auto-primed");
}
// The water is optional to stir: leave a short window after charging, let
// stirring postpone the finish, but NEVER let interaction block a puzzle.
const AUTO_SETTLE_MS=2000,AUTO_STIR_MAX_MS=5100;
function queueAutoCast(){
 if(!autoCastEnabled||pendingFlights.size||completed(level,state))return;
 if(!chooseAutomaticCast(level,state)||autoTimer!==null)return;
 el("wardTarget").classList.add("auto-primed");
 el("autoCastLabel").textContent="WARD READY · STIR TO MIX";
 const epoch=viewEpoch,primedAt=performance.now();
 function tryCast(){
  if(epoch!==viewEpoch||pendingFlights.size||completed(level,state)){autoTimer=null;return;}
  const now=performance.now(),elapsed=now-primedAt;
  const stirring=fluid.isStirring()||now-fluid.lastStirAt()<900;
  if(elapsed<AUTO_SETTLE_MS||(stirring&&elapsed<AUTO_STIR_MAX_MS)){
   autoTimer=setTimeout(tryCast,140);return;
  }
  const legal=chooseAutomaticCast(level,state);
  if(!legal){autoTimer=null;return;}
  fluid.burst();
  el("autoCastLabel").textContent="CHROMATIC WARD BREAKING";
  autoTimer=setTimeout(()=>{
   autoTimer=null;
   if(epoch!==viewEpoch||pendingFlights.size||completed(level,state))return;
   const stillLegal=chooseAutomaticCast(level,state);
   if(stillLegal)perform(stillLegal);
  },250);
 }
 autoTimer=setTimeout(tryCast,140);
}

const pendingFlights=new Set();
const fluid=installFluidWard({
 canvas:el("wardFluidCanvas"),target:el("wardTarget"),
 onInteract:()=>{if(autoCastEnabled&&autoTimer!==null)el("autoCastLabel").textContent="STIR THE WATER · AUTO-CAST WHEN IT SETTLES";}
});
el("wardTarget").dataset.preloadedMixes=String(PRELOADED_MIX_COUNT);
let currentFluidStage="";
function chargeWard({pendingId=null,animateId=null}={}){
 const stageKey=level.id+":"+state.stage;
 const isNewStage=currentFluidStage!==stageKey;
 currentFluidStage=stageKey;
 const result=renderWardCharge({
  svg:el("wardManaRing"),count:el("wardChargeCount"),
  cost:level.stages[state.stage]?.cost||{},orbs:manaOrbs,
  pendingId,pendingIds:[...pendingFlights],animateId,open:completed(level,state),
  fluid:fluid.available
 });
 fluid.sync(result.charged,{reset:isNewStage});
 return result;
}
const cardInspector=installCardInspector({dialog:el("realCardInspector"),closeButton:el("closeInspector")});
const magnifier=installCardMagnifier({
 battlefield:el("battlefield"),hand:el("hand"),panel:el("cardMagnifier"),
 canvas:el("magnifierCanvas"),title:el("magnifierTitle")
});
function inspectById(id){
 const record=lookup(level,id);
 if(!record)return false;
 lastCardId=id;
 return cardInspector.show(record.card,getCard(level,id).name,printingFor(id,record.card));
}
// Compute proof only for the active or completed vault, not 250 at startup.
// Every generated variant preserves a tested original route. The strict CI
// campaign suite separately verifies the full 250-vault catalog offline.
const proofCache=new Map();
const sourceProofCache=new Map();
function proofFor(id){
 if(proofCache.has(id))return proofCache.get(id);
 const puzzle=LEVELS.find(v=>v.id===id);
 if(!puzzle)return null;
 const exact=solve(puzzle,{maxStates:65000});
 let proof=exact;
 if(exact.status!=="solved"&&puzzle.templateId){
  const source=BASE_LEVELS.find(p=>p.id===puzzle.templateId);
  if(source){
   if(!sourceProofCache.has(source.id))sourceProofCache.set(source.id,solve(source,{maxStates:65000}));
   proof=sourceProofCache.get(source.id);
  }
 }
 if(proof?.status!=="solved")throw Error("Unproven vault: "+id);
 proofCache.set(id,proof);
 return proof;
}
const proofs={get:proofFor};
const lockGlyphs=["✧","⌑","◈","✦","⬡","✶"];
function persist(){try{localStorage.setItem(storageKey,JSON.stringify({v:2,index,bests:progress.bests}));}catch{}}
const coin=(c,extra="")=>'<span class="mana-glyph '+c+'" style="--coin:'+SYMBOL[c].color+'" aria-label="'+(c==="N"&&extra?extra+" generic mana":SYMBOL[c].name+" mana")+'">'+(extra||SYMBOL[c].icon)+'</span>';
function costHtml(cost){
 // Generic costs are numeric; diamonds are true colorless.
 return Object.entries(cost).flatMap(([k,n])=>k==="N"?(n?[coin("N",String(n))]:[]):Array.from({length:n},()=>coin(k))).join("");
}
function desc(action){
 if(action.type==="activate"){
  const source=getCard(level,action.id);
  const paid=action.spend.map(id=>state.manaUnits.find(x=>x.id===id)?.color).filter(Boolean);
  return (paid.length?"Spend "+paid.join(" + ")+" · ":"")+source.name+" → "+action.output.join(" + ")+
    (source.v2==="ziggurat"?" · creature spells only":"")+
    (source.v2==="treasure"||source.v2==="petal"?" · sacrifice":"");
 }
 if(action.type==="play")return (action.shock?"Pay 2 life · enter untapped":getCard(level,action.id).kind==="shock"?"Save 2 life · enter tapped":getCard(level,action.id).kind==="bounce"?"Return "+getCard(level,action.returnId).name+" · enter tapped":"Play "+getCard(level,action.id).name);
 if(action.type==="tap")return "Tap for "+SYMBOL[action.color].name+(getCard(level,action.id).kind==="pain"&&action.color!=="C"?" · lose 1 life":"");
 if(action.type==="fetch")return "Find "+getCard(level,action.targetId).name+(action.shock?" · pay 3 life":" · pay 1 life");
 if(action.type==="cast"){
  const payment=COLORS.map(c=>action.spend[c]?action.spend[c]+c:"").filter(Boolean).join(" + ");
  return "Spend "+payment+(action.untapId?" · untap "+getCard(level,action.untapId).name:"");
 }
 return "End this turn";
}
function choices(title,help,moves){
 choiceActions=moves;
 el("actionBox").hidden=moves.length===0;
 el("actionTitle").textContent=title;
 el("choices").innerHTML='<p class="muted small">'+help+'</p>'+moves.map((action,i)=>'<button class="choice-button" type="button" data-choice="'+i+'">'+desc(action)+'</button>').join("");
 if(!moves.length)el("choices").innerHTML='<p class="muted">'+help+'</p>';
}
function message(text,error=false){
 const item=el("feedback");
 item.textContent=text;
 item.classList.toggle("bad",error);
 if(error){
  item.animate?.([{opacity:.55,transform:"translateX(-50%) translateY(8px)"},{opacity:1,transform:"translateX(-50%) translateY(0)"}],{duration:280,easing:"ease-out"});
 }
}
function rejectCast(){
 const stage=level.stages[state.stage];
 if(stage&&state.manaUnits?.some(u=>u.restriction)&&!actions(level,state).some(a=>a.type==="cast")){
  const matching=COLORS.every(c=>(state.pool[c]||0)>=(stage.cost[c]||0));
  if(matching){message("Some floating mana is restricted to creature spells and cannot pay for this spell.",true);return;}
 }

 if(!stage)return;
 const missing=missingMana(state.pool,stage.cost);
 flashWard({vault:el("heist").querySelector(".vault-card"),ward:el("lockGlyph"),costRow:el("wardCost"),button:null,pool:null,missing});
 message(failureText(missing),true);
}
function perform(action){
 const sourceRect=(action.type==="tap"||action.type==="activate")?el("battlefield").querySelector('[data-cardid="'+action.id+'"]')?.getBoundingClientRect():null;
 const out=reduce(level,state,action);
 if(!out.ok){if(action?.type==="cast")rejectCast();else message(out.error,true);return;}
 cancelAuto();
 if(action.type!=="tap"){viewEpoch++;pendingFlights.clear();el("manaTravelLayer").replaceChildren();}
 history.push({state,orbs:manaOrbs.map(o=>({...o})),actionType:action.type});
 state=out.state;
 manaOrbs=(action.type==="activate"||action.type==="tap"&&getCard(level,action.id).kind==="bounce")?reconstruct(state.pool):transitionOrbs(manaOrbs,action,state.pool);
 if(!consistent(state.pool,manaOrbs))manaOrbs=reconstruct(state.pool);
 // Floating mana expires at the turn boundary. Reset ALL visual pigment,
 // currents, ripples and glow immediately, even while Canvas is animating.
 // This does not change the reducer, spell costs or playable land state.
 if(action.type==="end"){fluid.clear();currentFluidStage="";}
 const pendingId=action.type==="tap"&&getCard(level,action.id).kind!=="bounce"?manaOrbs[manaOrbs.length-1]?.id:null;
 if(pendingId!=null)pendingFlights.add(pendingId);
 if(completed(level,state)){
  const best=progress.bests[level.id];
  if(!best||state.turn<best.turn||(state.turn===best.turn&&state.spentLife<best.spentLife))progress.bests[level.id]={turn:state.turn,spentLife:state.spentLife};
  persist();message("The vault breaks open! Case closed.");
 }else if(action.type==="end")message("Turn "+state.turn+" · lands untapped · mana emptied.");
 else if(action.type==="play")message(getCard(level,action.id).name+" enters the battlefield"+(state.field.find(f=>f.id===action.id)?.tapped?" tapped.":"."));
 else if(action.type==="tap")message(getCard(level,action.id).kind==="bounce"?"Simic Growth Chamber adds green AND blue mana.":"+1 "+SYMBOL[action.color].name+" mana · land tapped sideways.");
  else if(action.type==="activate")message(getCard(level,action.id).name+" produces "+action.output.join(" + ")+" mana"+(getCard(level,action.id).v2==="ziggurat"?" (creature spells only).":"."));
 else if(action.type==="fetch")message("Fetched "+getCard(level,action.targetId).name+". The fetch land is gone.");
 else if(action.type==="cast")message("Spell cast · "+(level.stages.length-state.stage)+" seals remain.");
 landDrag?.cancel();
 render(pendingId);
 if(pendingId){
  const epoch=viewEpoch;
  sendOrb({
   color:action.color,sourceRect,id:pendingId,layer:el("manaTravelLayer"),
   target:null,destination:el("wardTarget"),
   onArrival:()=>{if(epoch===viewEpoch){
    pendingFlights.delete(pendingId);
    chargeWard({animateId:pendingId});
     updateCastButton();
    queueAutoCast();
   }}
  });
 }else queueAutoCast();
}
function tapLand(id){
 lastCardId=id;
 if(completed(level,state))return;
 const onField=state.field.find(f=>f.id===id);
 if(!onField){message("This land is not on the battlefield.",true);return;}
 if(onField.tapped&&getCard(level,id).v2!=="petal"){message(tappedLandMessage(level,state),true);return;}
 const card=getCard(level,id),possible=actions(level,state).filter(a=>(a.type==="tap"||a.type==="fetch"||a.type==="activate")&&a.id===id);
 if(card.kind==="fetch"){
  if(!possible.length)message("This fetch land has no legal target, or you cannot pay the life cost.",true);
  else choices("SEARCH YOUR RESERVE","Sacrifice this fetch land and pay 1 life to choose a compatible land.",possible);
 }else if(possible.length===1)perform(possible[0]);
 else if(possible.length)choices("CHOOSE A MANA ABILITY",card.v2?"Each choice shows the exact output and any input payment.":"Tap "+card.name+" for one mana color.",possible);
 else message("This source is unavailable, or you cannot pay its activation cost or life payment.",true);
}
function playLand(id){
 lastCardId=id;selectedHandId=null;
 const card=getCard(level,id),possible=actions(level,state).filter(a=>a.type==="play"&&a.id===id);
 if(!possible.length){message(state.played?"You have already played a land this turn.":"This land cannot be played right now.",true);return;}
 if(possible.length===1)perform(possible[0]);
 else choices(card.kind==="shock"?"SHOCK OR SAVE LIFE":card.kind==="bounce"?"RETURN A LAND":"PLAY YOUR LAND",card.kind==="shock"?"Pay 2 life to enter untapped, or enter tapped at no life cost.":card.kind==="bounce"?"This land enters tapped and sends a battlefield land back to your hand.":"Select how to play this land.",possible);
}
function landHtml(instance,field){
 const card=getCard(level,instance.id),tapped=field&&instance.tapped;
 const key=lookup(level,instance.id).card;
 const full=referenceFor(key);
 const name=full?.name||card.name;
 const src=imageFor(instance.id,key);
 const fallback=landPainting(card);
 const alt=name+" — Magic: The Gathering card from Scryfall";
 return '<button type="button" draggable="false" class="land-card mtg-real-land '+(tapped?"is-tapped":"")+'" data-cardid="'+instance.id+'" data-zone="'+(field?"field":"hand")+'" data-kind="'+card.kind+'" data-real-card="'+key+'" aria-label="'+(field?"Tap ":"Select or drag to play: ")+name+(tapped?", tapped":"")+'" title="'+name+' · '+(field?"tap to produce mana":"drag to play · tap to inspect")+'">'+
  '<img class="mtg-card-image" data-card-key="'+key+'" src="'+src+'" alt="'+alt+'" draggable="false" decoding="async" loading="eager">'+
  '<span class="mtg-fallback" aria-hidden="true"><strong>'+name+'</strong>'+fallback+'</span>'+
  '</button>';
}

// Keep image DOM nodes alive: a Scryfall /cards/random redirect must NEVER
// reload on tap, play, Undo, automatic casting or cost updates.
function syncLandRows(){
 const existing=new Map(
  [...document.querySelectorAll('#battlefield .land-card[data-cardid],#hand .land-card[data-cardid]')]
   .map(node=>[node.dataset.cardid,node])
 );
 const make=(instance,field)=>{
  const id=instance.id,card=getCard(level,id),tapped=field&&instance.tapped;
  let node=existing.get(id);
  if(!node){
   const wrapper=document.createElement("template");
   wrapper.innerHTML=landHtml(instance,field);
   node=wrapper.content.firstElementChild;
  }
  node.classList.toggle("is-tapped",!!tapped);
  node.dataset.zone=field?"field":"hand";
  const name=card.name;
  node.setAttribute("aria-label",(field?"Tap ":"Select or drag to play: ")+name+(tapped?", tapped":""));
  node.title=name+" · "+(field?"tap to produce mana":"tap to select, drag to play");
   node.classList.toggle("hand-selected",!field&&id===selectedHandId);
   if(field)node.removeAttribute("aria-pressed");else node.setAttribute("aria-pressed",String(id===selectedHandId));
  return node;
 };
 const fieldNodes=state.field.map(f=>make(f,true));
 const handNodes=state.hand.map(id=>make({id},false));
 const empty=text=>{
  const item=document.createElement("span");
  item.className="empty";item.textContent=text;return item;
 };
 el("battlefield").replaceChildren(...(fieldNodes.length?fieldNodes:[empty("No lands in play yet. Play one from your hand.")]));
 el("hand").replaceChildren(...(handNodes.length?handNodes:[empty("No land cards remain in hand.")]));
 handNodes.forEach((node,i)=>{const m=(handNodes.length-1)/2;node.style.setProperty("--fan-tilt",((i-m)*Math.min(7,27/Math.max(1,handNodes.length-1)))+"deg");node.style.setProperty("--fan-drop",(Math.abs(i-m)*5)+"px");});
 el("playSelectedLand").disabled=!selectedHandId||!state.hand.includes(selectedHandId)||!!state.played;
 el("inspectSelected").disabled=!selectedHandId||!state.hand.includes(selectedHandId);
}
function selectHand(id){
 if(!state.hand.includes(id))return;
 selectedHandId=selectedHandId===id?null:id;
 syncLandRows();
 message(selectedHandId?"Selected "+getCard(level,id).name+" · play it or inspect it.":"Selection cleared.");
}
function updateCastButton(){
 const ready=!completed(level,state)&&!pendingFlights.size&&!!chooseAutomaticCast(level,state);
 const button=el("castButton");
 button.disabled=!ready;
 button.textContent=ready?"CAST SPELL ✦":"NEED MORE MANA";
 button.setAttribute("aria-label",ready?"Cast the spell by spending mana":"Spell not ready; produce more mana");
 el("autoCastLabel").textContent=completed(level,state)?"VAULT OPEN":ready?(autoCastEnabled?"READY · AUTO-CAST ARMED":"READY · TAP CAST SPELL"):"TAP LANDS TO ADD MANA";
}
function teachingCue(){
 if(completed(level,state))return "Vault opened. Nice work!";
 if(chooseAutomaticCast(level,state))return "Your mana matches the cost. Cast to spend it.";
 if(index===0)return "Tap your Island. Turning a land sideways makes mana.";
 if(index===1)return state.hand.length?"Play your Mountain from your hand.":"Tap your Mountain for red mana.";
 if(index===2)return state.hand.length&&!state.played?"Play a land from your hand.":state.field.some(f=>!f.tapped)?"Tap a land to make mana.":"End your turn to untap your lands.";
 if(state.hand.length&&!state.played&&state.field.every(f=>f.tapped))return "Select a land in your hand, then play it.";
 if(state.field.some(f=>!f.tapped))return "Choose a mana source. Some abilities require another mana first.";
 return state.turn<level.turnLimit?"End turn: lands untap and floating mana disappears.":"Final turn. Undo or restart for another solution.";
}
function render(pendingId=null){
 const proof=proofs.get(level.id),isWin=completed(level,state),stage=level.stages[state.stage];
 el("stageLabel").textContent="STAGE "+stageCode(index);
 el("chapterName").textContent=level.chapter;
 el("difficulty").textContent=["INITIATE","ROOKIE","TACTICIAN","EXPERT","MASTERMIND"][level.rank-1];
 el("vaultName").textContent=level.title;
 el("briefing").textContent=level.briefing;
 el("turnNumber").textContent=state.turn+" / "+level.turnLimit;
 el("lifeTotal").textContent=state.life;
 el("landDrop").textContent=state.played?"USED":"AVAILABLE";
 el("parScore").textContent="TURN "+proof.turn+" · -"+proof.spentLife+" LIFE";
 el("lockGlyph").textContent=lockGlyphs[index%lockGlyphs.length];
 el("wardCounter").textContent=isWin?"VAULT OPEN":"WARD "+(state.stage+1)+" OF "+level.stages.length;
 el("wardName").textContent=isWin?"The seal is broken":stage.name;
 el("wardCost").innerHTML=isWin?"":costHtml(stage.cost);
 el("wardDescription").textContent=isWin?"The heist is complete. Your best route is preserved on this device.":stage.effect==="untap"?"Casting this heist spell also untaps one land you choose.":"Numbers show generic mana costs, payable with any kind of mana; a diamond requires truly colorless mana.";
 const finalTurn=!isWin&&isFinalTurn(level,state);
 const neededMana=isWin?"":requiredManaText(level,state);
 el("lessonPrompt").textContent=teachingCue();
 el("autoCastToggle").checked=autoCastEnabled;
 el("stageList").innerHTML=level.stages.map((spell,i)=>'<span class="stage-marker '+(i<state.stage?"done":i===state.stage?"active":"")+'">'+(i<state.stage?"✓":String(i+1).padStart(2,"0"))+" "+spell.name+"</span>").join("");
 el("battleCount").textContent=state.field.length+" SOURCE"+(state.field.length===1?"":"S");
 if(selectedHandId&&!state.hand.includes(selectedHandId))selectedHandId=null;
 syncLandRows();
 el("handGuide").hidden=state.hand.length===0;
 el("hand").closest(".hand-card").classList.toggle("hand-empty",state.hand.length===0);
 el("libraryPanel").hidden=level.library.length===0;
 el("libraryPanel").textContent=level.library.length?"RESERVE / FETCH TARGETS: "+level.library.map(x=>CARDS[x.card].name).join(" · "):"";

 chargeWard({pendingId});
 updateCastButton();
 el("undo").disabled=history.length===0;
 // Keep Final Turn clickable to explain the puzzle limit. A disabled button
 // would be silently unresponsive precisely when players most need guidance.
 const endButton=el("endTurn");
 endButton.disabled=isWin;
 endButton.classList.toggle("turn-limit",finalTurn);
 endButton.innerHTML=finalTurn?'FINAL TURN <span aria-hidden="true">✕</span>':'END TURN <span aria-hidden="true">↗</span>';
 endButton.title=finalTurn?"No more turns. Tap for advice on this puzzle.":"End turn and untap your lands";
 endButton.setAttribute("aria-label",finalTurn?"Final turn. No further turns allowed. Tap for Undo or Restart advice.":"End turn and untap lands");
 el("winPanel").hidden=!isWin;
 if(isWin){
  const score=medal(level,state,proof);
  el("winTitle").textContent="★".repeat(score)+" VAULT CRACKED";
  el("winCopy").textContent="Solved turn "+state.turn+" · "+state.spentLife+" life spent · perfect line: turn "+proof.turn+" / "+proof.spentLife+" life spent";
 }
 el("skip").textContent="← MAP";
 el("winNext").textContent=index===LEVELS.length-1?"REPLAY CAMPAIGN →":"NEXT VAULT →";
 renderOverworld({world,bests:progress.bests,index,proofs,medal});
 choices(isWin?"CASE CLOSED":"YOUR NEXT CHOICE",isWin?"The vault is open. Head to the next case.":state.turn>=level.turnLimit?"Final permitted turn. Every tap and spell counts.":selectedMessage||"Tap battlefield lands for mana; drag hand lands onto the battlefield to play.",[]);
 selectedMessage="";
}
function showMap(){
 fluid.pause();fluid.clear();currentFluidStage="";
 magnifier.hide();
 invalidateStagePrintings();
 cancelAuto();viewEpoch++;pendingFlights.clear();
 cardInspector.hide({restore:false});
 landDrag?.cancel();
 document.body.classList.remove("in-heist");
 el("gameNotes").hidden=true;el("gameNotes").open=false;
  el("toggleGuide").setAttribute("aria-expanded","false");
 el("actionBox").hidden=true;
 el("manaTravelLayer").replaceChildren();
 el("gameScreen").hidden=true;el("campaignScreen").hidden=false;
 renderOverworld({world,bests:progress.bests,index,proofs,medal});
 el("campaignScreen").scrollIntoView({block:"start",behavior:"instant"});
}
function showGame(){
 fluid.resume();
 document.body.classList.add("in-heist");
 el("campaignScreen").hidden=true;el("gameScreen").hidden=false;
 el("gameNotes").hidden=false;
 renderCardReferences(el("cardGallery"),level);
 el("gameScreen").scrollIntoView({block:"start",behavior:"instant"});
}
function load(i,enter=false){
 fluid.clear();currentFluidStage="";
 magnifier.hide();
 cancelAuto();viewEpoch++;pendingFlights.clear();
 cardInspector.hide({restore:false});
 lastCardId=null;selectedHandId=null;
 landDrag?.cancel();
 if(!unlocked(i,progress.bests)){message("That vault is sealed. Crack the previous stage to unlock it.",true);return false;}
 index=i;world=chapterIndex(index);
 level=LEVELS[index];state=initial(level);history=[];selectedMessage="";
 startStagePrintings(level);
 el("battlefield").replaceChildren();el("hand").replaceChildren();
 manaOrbs=reconstruct(state.pool);el("manaTravelLayer").replaceChildren();
 progress.index=index;persist();render();
 if(!el("gameNotes").hidden)renderCardReferences(el("cardGallery"),level);
 message("Stage "+stageCode(index)+" · "+teachingCue());
 if(enter)showGame();
 return true;
}
el("chapterPicker").addEventListener("click",e=>{
 const x=e.target.closest("[data-level]");
 if(x)load(Number(x.dataset.level),true);
});
el("previousWorld").addEventListener("click",()=>{
 if(world>0){world--;renderOverworld({world,bests:progress.bests,index,proofs,medal});}
});
el("nextWorld").addEventListener("click",()=>{
 if(world<CHAPTERS.length-1&&chapterAccessible(world+1,progress.bests)){world++;renderOverworld({world,bests:progress.bests,index,proofs,medal});}
});
el("galaxyPicker").addEventListener("click",e=>{
 const button=e.target.closest("[data-galaxy]");
 if(!button||button.disabled)return;
 const galaxy=Number(button.dataset.galaxy);
 if(!galaxyAccessible(galaxy,progress.bests))return;
 const accessible=highestUnlocked(progress.bests);
 const first=GALAXIES[galaxy].worldRange[0];
 const last=Math.min(GALAXIES[galaxy].worldRange[1],chapterIndex(accessible));
 world=Math.max(first,last);
 renderOverworld({world,bests:progress.bests,index,proofs,medal});
});
el("worldPips").addEventListener("click",e=>{
 const button=e.target.closest("[data-world]");
 if(button&&!button.disabled){world=Number(button.dataset.world);renderOverworld({world,bests:progress.bests,index,proofs,medal});}
});
el("returnMap").addEventListener("click",showMap);
el("toggleGuide").addEventListener("click",()=>{
 const guide=el("gameNotes");guide.open=!guide.open;
 el("toggleGuide").setAttribute("aria-expanded",String(guide.open));
 if(guide.open)guide.scrollIntoView({block:"start",behavior:"smooth"});
});
el("autoCastToggle").addEventListener("change",e=>{
 autoCastEnabled=e.target.checked;
 try{localStorage.setItem("dc-mana-heist-auto-cast",autoCastEnabled?"yes":"no");}catch{}
 cancelAuto();updateCastButton();if(autoCastEnabled)queueAutoCast();
});
el("castButton").addEventListener("click",()=>{
 if(pendingFlights.size)return;
 const cast=chooseAutomaticCast(level,state);
 if(cast){cancelAuto();fluid.burst();perform(cast);}else rejectCast();
});
el("playSelectedLand").addEventListener("click",()=>{if(selectedHandId)playLand(selectedHandId);});
el("inspectSelected").addEventListener("click",()=>{if(selectedHandId)inspectById(selectedHandId);});
el("dismissChoices").addEventListener("click",()=>choices("YOUR NEXT CHOICE","Tap a land or play a land from your hand.",[]));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!el("actionBox").hidden){choices("YOUR NEXT CHOICE","Selection canceled.",[]);}});
for(const zone of ["hand","battlefield"]){
 el(zone).addEventListener("error",e=>{
  if(e.target.matches?.(".mtg-card-image"))e.target.closest(".land-card")?.classList.add("image-failed");
 },true);
}
el("battlefield").addEventListener("click",e=>{
 const card=e.target.closest('[data-zone="field"][data-cardid]');
 if(card)tapLand(card.dataset.cardid);
 else if(selectedHandId)playLand(selectedHandId);
});
for(const id of ["battlefield","hand"])el(id).addEventListener("keydown",e=>{
 if(e.key.toLowerCase()!=="i"||e.altKey||e.ctrlKey||e.metaKey)return;
 const card=e.target.closest('[data-cardid]');
 if(card){e.preventDefault();inspectById(card.dataset.cardid);}
});
landDrag=installLandDragging({
 hand:el("hand"),battlefield:el("battlefield"),
 onDrop:id=>playLand(id),
 onInspect:id=>selectHand(id),
 onHint:(text,error=false)=>message(text,error)
});
el("choices").addEventListener("click",e=>{const b=e.target.closest("[data-choice]");if(!b)return;const a=choiceActions[Number(b.dataset.choice)];if(a)perform(a);});
el("endTurn").addEventListener("click",()=>{const a=actions(level,state).find(a=>a.type==="end");if(a)perform(a);else message(finalTurnMessage(level,state),true);});
el("undo").addEventListener("click",()=>{
 if(!history.length)return;
 cancelAuto();viewEpoch++;pendingFlights.clear();
 let prev=history.pop();
 // An automatic cast is a consequence of the previous manual move.
 // Undo that move and every automatically resolved ward after it together.
 while(prev.actionType==="cast"&&history.length)prev=history.pop();
 state=prev.state;manaOrbs=prev.orbs;
 el("manaTravelLayer").replaceChildren();render();
 message("Previous move undone, including any automatically cast wards.");
});
el("reset").addEventListener("click",()=>load(index));
el("skip").addEventListener("click",showMap);
el("winNext").addEventListener("click",()=>{if(index+1<LEVELS.length&&unlocked(index+1,progress.bests))load(index+1,true);else showMap();});
load(index);
showMap();
