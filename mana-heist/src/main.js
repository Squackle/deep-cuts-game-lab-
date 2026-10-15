import {LEVELS,CHAPTERS} from "./levels.js";
import {COLORS,CARDS,initial,actions,reduce,completed,getCard,lookup,medal} from "./engine.js";
import {solve} from "./solver.js";
const el=id=>document.getElementById(id);
const SYMBOL={W:{name:"White",color:"#e5dfb7",icon:"W"},U:{name:"Blue",color:"#287eb0",icon:"U"},B:{name:"Black",color:"#595067",icon:"B"},R:{name:"Red",color:"#c05b48",icon:"R"},G:{name:"Green",color:"#498967",icon:"G"},C:{name:"Colorless",color:"#bec5bd",icon:"C"},N:{name:"Generic",color:"#bec5bd",icon:"◇"}};
const storageKey="dc-mana-heist-landfall-v2";
function readProgress(){
 try{const x=JSON.parse(localStorage.getItem(storageKey)||"null");if(x&&x.v===2&&typeof x.bests==="object"&&x.bests&&!Array.isArray(x.bests))return {bests:x.bests,index:Math.max(0,Math.min(LEVELS.length-1,Number.isInteger(x.index)?x.index:0))};}catch{}
 return {bests:{},index:0};
}
let progress=readProgress(),index=progress.index,level=LEVELS[index],state=initial(level),history=[],choiceActions=[],selectedMessage="";
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
 el("actionTitle").textContent=title;
 el("choices").innerHTML='<p class="muted small">'+help+'</p>'+moves.map((action,i)=>'<button class="choice-button" type="button" data-choice="'+i+'">'+desc(action)+'</button>').join("");
 if(!moves.length)el("choices").innerHTML='<p class="muted">'+help+'</p>';
}
function message(text,error=false){el("feedback").textContent=text;el("feedback").classList.toggle("bad",error);}
function perform(action){
 const out=reduce(level,state,action);
 if(!out.ok){message(out.error,true);return;}
 history.push(state);state=out.state;
 if(completed(level,state)){
  const best=progress.bests[level.id];
  if(!best||state.turn<best.turn||(state.turn===best.turn&&state.spentLife<best.spentLife))progress.bests[level.id]={turn:state.turn,spentLife:state.spentLife};
  persist();message("The vault breaks open! Case closed.");
 }else if(action.type==="end")message("Turn "+state.turn+". All your lands untap; floating mana empties.");
 else if(action.type==="play")message(getCard(level,action.id).name+" enters the battlefield"+(state.field.find(f=>f.id===action.id)?.tapped?" tapped.":"."));
 else if(action.type==="tap")message("Mana added: "+SYMBOL[action.color].name+". The land is now tapped.");
 else if(action.type==="fetch")message("Fetched "+getCard(level,action.targetId).name+". The fetch land is gone.");
 else if(action.type==="cast")message("Ward dispelled! "+(level.stages.length-state.stage)+" ward(s) remain.");
 render();
}
function tapLand(id){
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
 const card=getCard(level,id),possible=actions(level,state).filter(a=>a.type==="play"&&a.id===id);
 if(!possible.length){message(state.played?"You have already played a land this turn.":"This land cannot be played right now.",true);return;}
 if(possible.length===1)perform(possible[0]);
 else choices(card.kind==="shock"?"SHOCK OR SAVE LIFE":card.kind==="bounce"?"RETURN A LAND":"PLAY YOUR LAND",card.kind==="shock"?"Pay 2 life to enter untapped, or enter tapped at no life cost.":card.kind==="bounce"?"This land enters tapped and sends a battlefield land back to your hand.":"Select how to play this land.",possible);
}
function castSpell(){
 const stage=level.stages[state.stage];if(!stage)return;
 const possible=actions(level,state).filter(a=>a.type==="cast");
 if(!possible.length){message("Insufficient mana for "+stage.name+". Tap lands, change colors, or end the turn.",true);return;}
 if(possible.length===1)perform(possible[0]);
 else choices("CHOOSE YOUR PAYMENT",stage.effect==="untap"?"Select your payment and which tapped land to untap.":"Colored costs are exact; generic mana may be paid from any remaining color.",possible);
}
function landHtml(instance,field){
 const card=getCard(level,instance.id),tapped=field&&instance.tapped;
 const mark=card.kind==="basic"?"◆":card.kind==="dual"?"◈":card.kind==="shock"?"✶":card.kind==="pain"?"⚡":card.kind==="check"?"⌑":card.kind==="fetch"?"⌁":card.kind==="bounce"?"↶":"◇";
 return '<button type="button" class="land-card '+(tapped?"is-tapped":"")+'" data-cardid="'+instance.id+'" data-zone="'+(field?"field":"hand")+'" data-kind="'+card.kind+'" aria-label="'+(field?"Tap ":"Play ")+card.name+(tapped?", tapped":"")+'">'+
  '<span class="land-name">'+card.name+'</span><span class="land-kind">'+card.kind.toUpperCase()+'</span>'+
  '<span class="land-art" aria-hidden="true"><span>'+mark+'</span></span>'+
  '<span class="type-line">'+card.flavor+'</span>'+
  '<span class="mana-line">'+card.colors.map(c=>coin(c)).join("")+'</span>'+(tapped?'<span class="tap-stamp">TAPPED ↷</span>':"")+'</button>';
}
function render(){
 const proof=proofs.get(level.id),isWin=completed(level,state),stage=level.stages[state.stage];
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
 el("wardDescription").textContent=isWin?"The heist is complete. Your best route is preserved on this device.":stage.effect==="untap"?"Casting this heist spell also untaps one land you choose.":"Tap your lands to collect the exact colored mana. Gray diamond symbols are generic costs.";
 el("castButton").disabled=isWin;
 el("castButton").textContent=isWin?"VAULT CRACKED":stage.effect==="untap"?"CAST REWIND SPELL ↗":"CAST SPELL · BREAK WARD ↗";
 el("stageList").innerHTML=level.stages.map((spell,i)=>'<span class="stage-marker '+(i<state.stage?"done":i===state.stage?"active":"")+'">'+(i<state.stage?"✓":String(i+1).padStart(2,"0"))+" "+spell.name+"</span>").join("");
 el("battleCount").textContent=state.field.length+" LAND"+(state.field.length===1?"":"S");
 el("battlefield").innerHTML=state.field.length?state.field.map(f=>landHtml(f,true)).join(""):'<span class="empty">No lands in play yet. Play one from your hand.</span>';
 el("hand").innerHTML=state.hand.length?state.hand.map(id=>landHtml({id},false)).join(""):'<span class="empty">No land cards remain in hand.</span>';
 el("libraryPanel").hidden=level.library.length===0;
 el("libraryPanel").textContent=level.library.length?"RESERVE / FETCH TARGETS: "+level.library.map(x=>CARDS[x.card].name).join(" · "):"";
 el("poolTotal").textContent=Object.values(state.pool).reduce((a,b)=>a+b,0)+" IN POOL";
 el("pool").innerHTML=COLORS.map(c=>'<div class="pool-cell">'+coin(c)+'<strong>'+state.pool[c]+'</strong></div>').join("");
 el("undo").disabled=history.length===0;
 el("endTurn").disabled=isWin||state.turn===level.turnLimit;
 el("winPanel").hidden=!isWin;
 if(isWin){
  const score=medal(level,state,proof);
  el("winTitle").textContent="★".repeat(score)+" VAULT CRACKED";
  el("winCopy").textContent="Solved turn "+state.turn+" · "+state.spentLife+" life spent · perfect line: turn "+proof.turn+" / "+proof.spentLife+" life spent";
 }
 el("skip").textContent=index===LEVELS.length-1?"FIRST VAULT ↶":"NEXT VAULT →";
 el("winNext").textContent=index===LEVELS.length-1?"REPLAY CAMPAIGN →":"NEXT VAULT →";
 const wins=LEVELS.filter(x=>progress.bests[x.id]).length;
 el("campaignTotal").textContent=wins+" / 18 CRACKED";
 el("chapterPicker").innerHTML=LEVELS.map((p,i)=>{
  const best=progress.bests[p.id],opt=proofs.get(p.id),score=best?medal(p,{turn:best.turn,spentLife:best.spentLife,stage:p.stages.length},opt):0;
  return '<button class="vault-choice" type="button" data-level="'+i+'" data-rank="'+p.rank+'" aria-pressed="'+(i===index)+'" aria-label="Vault '+(i+1)+', '+p.title+'"><span class="number">'+String(i+1).padStart(2,"0")+'</span><span class="name">'+p.title+'</span><span class="record">'+(best?"★".repeat(score)+" "+best.turn+"T":"UNCRACKED")+'</span></button>';
 }).join("");
 choices(isWin?"CASE CLOSED":"YOUR NEXT CHOICE",isWin?"The vault is open. Head to the next case.":state.turn>=level.turnLimit?"Final permitted turn. Every tap and spell counts.":selectedMessage||"Tap a battlefield land, or play a land from your hand.",[]);
 selectedMessage="";
}
function load(i){
 index=(i+LEVELS.length)%LEVELS.length;level=LEVELS[index];state=initial(level);history=[];selectedMessage="";progress.index=index;persist();render();
 message("Vault "+String(index+1).padStart(2,"0")+" ready. Tap a land or play one from your hand.");
}
el("chapterPicker").addEventListener("click",e=>{const x=e.target.closest("[data-level]");if(x)load(Number(x.dataset.level));});
for(const id of ["battlefield","hand"])el(id).addEventListener("click",e=>{const b=e.target.closest("[data-cardid]");if(!b)return;if(b.dataset.zone==="field")tapLand(b.dataset.cardid);else playLand(b.dataset.cardid);});
el("choices").addEventListener("click",e=>{const b=e.target.closest("[data-choice]");if(!b)return;const a=choiceActions[Number(b.dataset.choice)];if(a)perform(a);});
el("castButton").addEventListener("click",castSpell);
el("endTurn").addEventListener("click",()=>{const a=actions(level,state).find(a=>a.type==="end");if(a)perform(a);else message("No turns remain. Undo or restart to try another line.",true);});
el("undo").addEventListener("click",()=>{if(!history.length)return;state=history.pop();render();message("Previous move undone. Land drops, life and mana are restored.");});
el("reset").addEventListener("click",()=>load(index));
el("skip").addEventListener("click",()=>load(index+1));
el("winNext").addEventListener("click",()=>load(index+1));
load(index);
