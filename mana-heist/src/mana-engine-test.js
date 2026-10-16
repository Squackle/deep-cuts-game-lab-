import {SOURCES,COLORS,PHASES,ENGINE_VERSION,initial,legalActions,apply,complete,actionLabel,effectiveTypes} from "./mana-engine-v2.js";
import {ENGINE_SCENARIOS,scenarioById} from "./mana-lab-scenarios.js";
const $=id=>document.getElementById(id);
const colors={W:["#e5d6a3","#29271f"],U:["#6bbcf1","#0f273e"],B:["#a29bb8","#221e2d"],R:["#f08066","#44251e"],G:["#7fcaa0","#183b27"],C:["#e2ddd0","#2b3133"]};
const symbols={W:"W",U:"U",B:"B",R:"R",G:"G",C:"◇"};
let index=0,scenario=ENGINE_SCENARIOS[0],state=initial(scenario),undo=[],selection=null,notice="Tap a mana source to see its abilities.";
const safe=x=>String(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const manaIcon=(color)=>'<span class="me-pip me-'+safe(color)+'">'+symbols[color]+'</span>';
const cost=(c)=>COLORS.map(k=>Array(c?.[k]||0).fill(manaIcon(k)).join("")).join("")+(c?.N?'<span class="me-pip me-generic">'+c.N+'</span>':"");
function choose(i){
 index=(i+ENGINE_SCENARIOS.length)%ENGINE_SCENARIOS.length;
 scenario=ENGINE_SCENARIOS[index];state=initial(scenario);undo=[];selection=null;
 notice="Tap a permanent to view its mana abilities. Spend or convert mana, then cast the spell.";
 render();
 window.scrollTo({top:0,behavior:"instant"});
}
function take(action){
 const result=apply(scenario,state,action);
 if(!result.ok){notice=result.error;render();return;}
 undo.push(state);
 state=result.state;
 if(action.type==="advance")notice="Step changed. Floating mana emptied; lands stay tapped until your next turn.";
 else if(action.type==="cast")notice=complete(scenario,state)?"Vault cracked! Your mana calculations were correct.":"Spell cast. Prepare the next payment.";
 else notice=actionLabel(scenario,undo[undo.length-1],action);
 selection=null;render();
}
function button(label,cls,click,disabled=false){
 const b=document.createElement("button");b.type="button";b.className=cls;b.textContent=label;b.disabled=disabled;b.addEventListener("click",click);return b;
}
function renderPicker(){
 const menu=$("scenarioSelect");
 menu.replaceChildren(...ENGINE_SCENARIOS.map((s,i)=>{
  const option=document.createElement("option");option.value=String(i);option.textContent=String(i+1).padStart(2,"0")+" · "+s.title;return option;
 }));
 menu.value=String(index);
}
function render(){
 const done=complete(scenario,state);
 $("scenarioSelect").value=String(index);
 $("challengeTitle").textContent=scenario.title;
 $("challengeTier").textContent=scenario.tier;
 $("challengeCount").textContent="EXERCISE "+(index+1)+" / "+ENGINE_SCENARIOS.length;
 $("objectiveCopy").textContent=scenario.objective;
 $("goalTitle").textContent=done?"VAULT OPEN":scenario.goals[state.cast].name;
 $("goalCost").innerHTML=done?'<span class="me-success">✦ SPELL RESOLVED</span>':cost(scenario.goals[state.cast].cost);
 $("goalType").textContent=done?"Complete":scenario.goals[state.cast].spellType.toUpperCase()+(scenario.goals[state.cast].when?" · CAST IN "+scenario.goals[state.cast].when.toUpperCase():"");
 $("phaseLabel").textContent=PHASES.indexOf(state.phase)+1+" / "+PHASES.length+" · "+state.phase.toUpperCase();
 $("turnLabel").textContent="TURN "+state.turn;
 $("lifeLabel").textContent="LIFE "+state.life;
 $("devotionLabel").textContent=scenario.devotion?"DEVOTION "+Object.entries(scenario.devotion).filter(([,v])=>v>0).map(([k,v])=>k+":"+v).join(" "):"";
 $("note").textContent=notice;
 $("winBanner").hidden=!done;
 $("undoButton").disabled=undo.length===0;
 const actions=legalActions(scenario,state);
 $("advanceButton").disabled=done||!actions.some(a=>a.type==="advance");
 const cards=$("permanents");cards.replaceChildren();
 for(const p of state.permanents){
  const card=SOURCES[p.key];const el=document.createElement("button");el.type="button";el.className="me-card"+(p.tapped?" tapped":"")+(selection===p.id?" selected":"");
  const opts=actions.filter(a=>a.type==="activate"&&a.source===p.id);
  const accessible=card.name+(p.tapped?", tapped":", untapped")+", "+opts.length+" legal activations";
  el.setAttribute("aria-label",accessible);el.setAttribute("aria-pressed",String(selection===p.id));
  const types=effectiveTypes(state,p);
  const banner=document.createElement("span");banner.className="me-card-label";banner.textContent=card.type==="Artifact"?"✧ ARTIFACT":"◇ LAND";
  const title=document.createElement("strong");title.textContent=card.name;
  const tag=document.createElement("small");tag.textContent=types.length?types.join(" · "):"Mana source";
  const top=document.createElement("span");top.className="me-card-top";top.append(banner,title,tag);
  const status=document.createElement("span");status.className="me-card-state";status.textContent=p.tapped?"↷ TAPPED":opts.length?opts.length+" ACTION"+(opts.length===1?"":"S"):"NO MANA PATH";
  el.append(top,status);
  el.addEventListener("click",()=>{selection=selection===p.id?null:p.id;notice=card.note||"Choose the exact mana ability and payment below.";render();});
  cards.append(el);
 }
 const actionPanel=$("activationChoices");actionPanel.replaceChildren();
 if(!selection||!state.permanents.some(p=>p.id===selection)){
  const span=document.createElement("span");span.className="me-muted";span.textContent="Select a land or artifact on the table to use it.";actionPanel.append(span);
 }else{
  const opts=actions.filter(a=>a.type==="activate"&&a.source===selection);
  if(!opts.length){
   const span=document.createElement("span");span.className="me-muted";span.textContent="No legal activation. This source may be tapped, or its activation cost is unpaid.";actionPanel.append(span);
  }
  for(const action of opts){
   const text=actionLabel(scenario,state,action);
   const b=button(text,"me-action",()=>take(action));
   actionPanel.append(b);
  }
 }
 const castPanel=$("castChoices");castPanel.replaceChildren();
 const spells=actions.filter(a=>a.type==="cast");
 if(!done&&!spells.length){
  castPanel.append(button("NEED DIFFERENT MANA OR TIMING","me-cast",()=>{},true));
 }
 for(const a of spells){
  castPanel.append(button("✦ CAST SPELL — "+(a.spend.length?a.spend.map(id=>state.pool.find(x=>x.id===id)?.color).join(" + "):"FREE"),"me-cast",()=>take(a)));
 }
 const pool=$("manaPool");pool.replaceChildren();
 if(!state.pool.length){
  const blank=document.createElement("span");blank.className="me-muted";blank.textContent="No floating mana. Tap a permanent to add mana here.";pool.append(blank);
 }
 for(const m of state.pool){
  const holder=document.createElement("span");holder.className="me-mana";holder.innerHTML=manaIcon(m.color);
  holder.title=(m.color==="C"?"Colorless":m.color)+" mana from "+SOURCES[state.permanents.find(p=>p.id===m.source)?.key]?.name;
  const label=document.createElement("small");label.textContent=m.restriction==="creature"?"CREATURE ONLY":m.source.toUpperCase();holder.append(label);pool.append(holder);
 }
 $("tip").textContent=done?"You completed this technical calibration board. Next, try another one.":scenario.tagline;
}
$("scenarioSelect").addEventListener("change",e=>choose(Number(e.target.value)));
$("prevButton").addEventListener("click",()=>choose(index-1));
$("nextButton").addEventListener("click",()=>choose(index+1));
$("resetButton").addEventListener("click",()=>choose(index));
$("undoButton").addEventListener("click",()=>{if(!undo.length)return;state=undo.pop();selection=null;notice="Last action undone. Mana and tapped states restored.";render();});
$("advanceButton").addEventListener("click",()=>{const action=legalActions(scenario,state).find(a=>a.type==="advance");if(action)take(action);});
$("guideButton").addEventListener("click",()=>{
 const detail=$("mechanicsGuide");detail.open=!detail.open; 
 if(detail.open)detail.scrollIntoView({behavior:"smooth",block:"nearest"});
});
document.addEventListener("keydown",e=>{
 if(e.target instanceof HTMLSelectElement)return;
 if(e.key==="Escape"){selection=null;render();}
});
renderPicker();
const linked=new URLSearchParams(location.search).get("board");
const target=linked?ENGINE_SCENARIOS.findIndex(x=>x.id===linked):-1;
choose(target>=0?target:0);
