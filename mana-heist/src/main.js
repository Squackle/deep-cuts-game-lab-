import {LEVELS,CHAPTERS} from "./levels.js";
import {COLORS,CARDS,initial,actions,reduce,completed,getCard,lookup,medal} from "./engine.js";
import {solve} from "./solver.js";
import {highestUnlocked,unlocked,chapterIndex,stageCode,normalizedBests,chapterAccessible} from "./campaign.js";
import {renderOverworld} from "./overworld.js";
import {reconstruct,transitionOrbs,consistent,sendOrb} from "./mana-orbs.js";
import {renderWardCharge} from "./ward-charge.js";
import {chooseAutomaticCast} from "./auto-cast.js";
import {landPainting} from "./land-art.js";
import {installLandDragging} from "./drag-lands.js";
import {renderCardReferences,referenceFor} from "./card-references.js";
import {installCardInspector} from "./card-inspector.js";
import {cardImageUrl} from "./scryfall-cards.js";
import {missingMana,failureText,flashWard} from "./ward-feedback.js";
const el=id=>document.getElementById(id);
const SYMBOL={W:{name:"White",color:"#e5dfb7",icon:"W"},U:{name:"Blue",color:"#287eb0",icon:"U"},B:{name:"Black",color:"#595067",icon:"B"},R:{name:"Red",color:"#c05b48",icon:"R"},G:{name:"Green",color:"#498967",icon:"G"},C:{name:"Colorless",color:"#bec5bd",icon:"C"},N:{name:"Generic",color:"#bec5bd",icon:"◇"}};
const storageKey="dc-mana-heist-landfall-v2";
function readProgress(){
 try{const x=JSON.parse(localStorage.getItem(storageKey)||"null");if(x&&x.v===2&&typeof x.bests==="object"&&x.bests&&!Array.isArray(x.bests))return {bests:normalizedBests(x.bests),index:Math.max(0,Math.min(LEVELS.length-1,Number.isInteger(x.index)?x.index:0))};}catch{}
 return {bests:{},index:0};
}
let progress=readProgress(),index=Math.min(progress.index,highestUnlocked(progress.bests)),level=LEVELS[index],state=initial(level),history=[],choiceActions=[],selectedMessage="";
let world=chapterIndex(index),manaOrbs=reconstruct(state.pool),landDrag=null,lastCardId=null;
let viewEpoch=0;
let autoTimer=null;
function cancelAuto(){
 if(autoTimer!==null){clearTimeout(autoTimer);autoTimer=null;}
 el("wardTarget")?.classList.remove("auto-primed");
}
function queueAutoCast(){
 if(pendingFlights.size||completed(level,state))return;
 const payment=chooseAutomaticCast(level,state);
 if(!payment||autoTimer!==null)return;
 el("wardTarget").classList.add("auto-primed");
 el("autoCastLabel").textContent="WARD PRIMED · CASTING AUTOMATICALLY";
 const epoch=viewEpoch;
 autoTimer=setTimeout(()=>{
  autoTimer=null;
  if(epoch!==viewEpoch||pendingFlights.size||completed(level,state))return;
  const legal=chooseAutomaticCast(level,state);
  if(legal)perform(legal);
 },520);
}

const pendingFlights=new Set();
function chargeWard({pendingId=null,animateId=null}={}){
 return renderWardCharge({
  svg:el("wardManaRing"),count:el("wardChargeCount"),
  cost:level.stages[state.stage]?.cost||{},orbs:manaOrbs,
  pendingId,pendingIds:[...pendingFlights],animateId,open:completed(level,state)
 });
}
const cardInspector=installCardInspector({dialog:el("realCardInspector"),trigger:el("inspectLand"),closeButton:el("closeInspector")});
function inspectById(id){
 const record=lookup(level,id);
 if(!record)return false;
 lastCardId=id;
 return cardInspector.show(record.card,getCard(level,id).name);
}
const proofs=new Map();
for(const puzzle of LEVELS){
 const proof=solve(puzzle,{maxStates:40000});
 if(proof.status!=="solved")throw Error("Unproven vault: "+puzzle.id);
 proofs.set(puzzle.id,proof);
}
const lockGlyphs=["✧","⌑","◈","✦","⬡","✶"];
function persist(){try{localStorage.setItem(storageKey,JSON.stringify({v:2,index,bests:progress.bests}));}catch{}}
const coin=(c,extra="")=>'<span class="mana-glyph '+c+'" style="--coin:'+SYMBOL[c].color+'" aria-label="'+SYMBOL[c].name+' mana">'+(extra||SYMBOL[c].icon)+'</span>';
function costHtml(cost){
 return Object.entries(cost).flatMap(([k,n])=>Array.from({length:n},()=>coin(k))).join("");
}
function desc(action){
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
 const stage=level.stages[state.stage];if(!stage)return;
 const missing=missingMana(state.pool,stage.cost);
 flashWard({vault:el("heist").querySelector(".vault-card"),ward:el("lockGlyph"),costRow:el("wardCost"),button:null,pool:null,missing});
 message(failureText(missing),true);
}
function perform(action){
 const sourceRect=action.type==="tap"?el("battlefield").querySelector('[data-cardid="'+action.id+'"]')?.getBoundingClientRect():null;
 const out=reduce(level,state,action);
 if(!out.ok){if(action?.type==="cast")rejectCast();else message(out.error,true);return;}
 cancelAuto();
 if(action.type!=="tap"){viewEpoch++;pendingFlights.clear();el("manaTravelLayer").replaceChildren();}
 history.push({state,orbs:manaOrbs.map(o=>({...o}))});
 state=out.state;
 manaOrbs=transitionOrbs(manaOrbs,action,state.pool);
 if(!consistent(state.pool,manaOrbs))manaOrbs=reconstruct(state.pool);
 const pendingId=action.type==="tap"?manaOrbs[manaOrbs.length-1]?.id:null;
 if(pendingId!=null)pendingFlights.add(pendingId);
 if(completed(level,state)){
  const best=progress.bests[level.id];
  if(!best||state.turn<best.turn||(state.turn===best.turn&&state.spentLife<best.spentLife))progress.bests[level.id]={turn:state.turn,spentLife:state.spentLife};
  persist();message("The vault breaks open! Case closed.");
 }else if(action.type==="end")message("Turn "+state.turn+". All your lands untap; floating mana empties.");
 else if(action.type==="play")message(getCard(level,action.id).name+" enters the battlefield"+(state.field.find(f=>f.id===action.id)?.tapped?" tapped.":"."));
 else if(action.type==="tap")message("Mana added: "+SYMBOL[action.color].name+". The land is now tapped.");
 else if(action.type==="fetch")message("Fetched "+getCard(level,action.targetId).name+". The fetch land is gone.");
 else if(action.type==="cast")message("Ward dispelled! "+(level.stages.length-state.stage)+" ward(s) remain.");
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
    queueAutoCast();
   }}
  });
 }else queueAutoCast();
}
function tapLand(id){
 lastCardId=id;
 if(completed(level,state))return;
 const onField=state.field.find(f=>f.id===id);
 if(!onField||onField.tapped){message("This land is tapped. End your turn to untap it.",true);return;}
 const card=getCard(level,id),possible=actions(level,state).filter(a=>(a.type==="tap"||a.type==="fetch")&&a.id===id);
 if(card.kind==="fetch"){
  if(!possible.length)message("This fetch land has no legal target, or you cannot pay the life cost.",true);
  else choices("SEARCH YOUR RESERVE","Sacrifice this fetch land and pay 1 life to choose a compatible land.",possible);
 }else if(possible.length===1)perform(possible[0]);
 else if(possible.length)choices("CHOOSE YOUR MANA","Tap "+card.name+" for one mana color. A land cannot supply both colors at once.",possible);
 else message("This land cannot produce mana safely at your current life total.",true);
}
function playLand(id){
 lastCardId=id;
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
 const src=cardImageUrl(key);
 const fallback=landPainting(card);
 const alt=name+" — Magic: The Gathering land card from Scryfall";
 return '<button type="button" draggable="false" class="land-card mtg-real-land '+(tapped?"is-tapped":"")+'" data-cardid="'+instance.id+'" data-zone="'+(field?"field":"hand")+'" data-kind="'+card.kind+'" data-real-card="'+key+'" aria-label="'+(field?"Tap ":"Drag to battlefield: ")+name+(tapped?", tapped":"")+'" title="'+name+' · '+(field?"tap to produce mana":"drag to play · tap to inspect")+'">'+
  '<img class="mtg-card-image" data-card-key="'+key+'" src="'+src+'" alt="'+alt+'" draggable="false" decoding="async" loading="eager">'+
  '<span class="mtg-fallback" aria-hidden="true"><strong>'+name+'</strong>'+fallback+'</span>'+
  '</button>';
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
 el("wardDescription").textContent=isWin?"The heist is complete. Your best route is preserved on this device.":stage.effect==="untap"?"Casting this heist spell also untaps one land you choose.":"Colored mana symbols require that exact color. A gray diamond is generic: you may use any remaining mana.";
 el("autoCastLabel").textContent=isWin?"ALL WARDS OPEN":stage.effect==="untap"?"AUTO REWIND · CHANNEL MANA":"AUTO-CAST ENABLED · CHANNEL MANA";
 el("stageList").innerHTML=level.stages.map((spell,i)=>'<span class="stage-marker '+(i<state.stage?"done":i===state.stage?"active":"")+'">'+(i<state.stage?"✓":String(i+1).padStart(2,"0"))+" "+spell.name+"</span>").join("");
 el("battleCount").textContent=state.field.length+" LAND"+(state.field.length===1?"":"S");
 el("battlefield").innerHTML=state.field.length?state.field.map(f=>landHtml(f,true)).join(""):'<span class="empty">No lands in play yet. Play one from your hand.</span>';
 el("hand").innerHTML=state.hand.length?state.hand.map(id=>landHtml({id},false)).join(""):'<span class="empty">No land cards remain in hand.</span>';
 el("libraryPanel").hidden=level.library.length===0;
 el("libraryPanel").textContent=level.library.length?"RESERVE / FETCH TARGETS: "+level.library.map(x=>CARDS[x.card].name).join(" · "):"";

 chargeWard({pendingId});
 el("undo").disabled=history.length===0;
 el("endTurn").disabled=isWin||state.turn===level.turnLimit;
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
 cancelAuto();viewEpoch++;pendingFlights.clear();
 cardInspector.hide({restore:false});
 landDrag?.cancel();
 document.body.classList.remove("in-heist");
 el("gameNotes").hidden=true;
 el("actionBox").hidden=true;
 el("manaTravelLayer").replaceChildren();
 el("gameScreen").hidden=true;el("campaignScreen").hidden=false;
 renderOverworld({world,bests:progress.bests,index,proofs,medal});
 el("campaignScreen").scrollIntoView({block:"start",behavior:"instant"});
}
function showGame(){
 document.body.classList.add("in-heist");
 el("campaignScreen").hidden=true;el("gameScreen").hidden=false;
 el("gameNotes").hidden=false;
 renderCardReferences(el("cardGallery"),level);
 el("gameScreen").scrollIntoView({block:"start",behavior:"instant"});
}
function load(i,enter=false){
 cancelAuto();viewEpoch++;pendingFlights.clear();
 cardInspector.hide({restore:false});
 lastCardId=null;
 landDrag?.cancel();
 if(!unlocked(i,progress.bests)){message("That vault is sealed. Crack the previous stage to unlock it.",true);return false;}
 index=i;world=chapterIndex(index);
 level=LEVELS[index];state=initial(level);history=[];selectedMessage="";
 manaOrbs=reconstruct(state.pool);el("manaTravelLayer").replaceChildren();
 progress.index=index;persist();render();
 if(!el("gameNotes").hidden)renderCardReferences(el("cardGallery"),level);
 message("Stage "+stageCode(index)+" ready. Drag a hand land up to the battlefield; tap battlefield lands for mana.");
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
el("worldPips").addEventListener("click",e=>{
 const button=e.target.closest("[data-world]");
 if(button&&!button.disabled){world=Number(button.dataset.world);renderOverworld({world,bests:progress.bests,index,proofs,medal});}
});
el("returnMap").addEventListener("click",showMap);
el("inspectLand").addEventListener("inspect-current-land",()=>{
 const id=lastCardId&&lookup(level,lastCardId)?lastCardId:(state.field[0]?.id||state.hand[0]);
 if(id)inspectById(id);
});
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
});
for(const id of ["battlefield","hand"])el(id).addEventListener("keydown",e=>{
 if(e.key.toLowerCase()!=="i"||e.altKey||e.ctrlKey||e.metaKey)return;
 const card=e.target.closest('[data-cardid]');
 if(card){e.preventDefault();inspectById(card.dataset.cardid);}
});
landDrag=installLandDragging({
 hand:el("hand"),battlefield:el("battlefield"),
 onDrop:id=>playLand(id),
 onInspect:id=>inspectById(id),
 onHint:(text,error=false)=>message(text,error)
});
el("choices").addEventListener("click",e=>{const b=e.target.closest("[data-choice]");if(!b)return;const a=choiceActions[Number(b.dataset.choice)];if(a)perform(a);});
el("endTurn").addEventListener("click",()=>{const a=actions(level,state).find(a=>a.type==="end");if(a)perform(a);else message("No turns remain. Undo or restart to try another line.",true);});
el("undo").addEventListener("click",()=>{if(!history.length)return;cancelAuto();viewEpoch++;pendingFlights.clear();const prev=history.pop();state=prev.state;manaOrbs=prev.orbs;el("manaTravelLayer").replaceChildren();render();message("Previous move undone. Land drops, life and mana are restored.");});
el("reset").addEventListener("click",()=>load(index));
el("skip").addEventListener("click",showMap);
el("winNext").addEventListener("click",()=>{if(index+1<LEVELS.length&&unlocked(index+1,progress.bests))load(index+1,true);else showMap();});
load(index);
showMap();
