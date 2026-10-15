import {LEVELS} from "./levels.js";
import {ENGINE_VERSION,FAMILIES,initialState,applyAction,reachableIds,legalActions} from "./engine.js";
import {solve} from "./solver.js";

const $=id=>document.getElementById(id);
const F={
 sun:{name:"Sun",glyph:"✳",color:"#d8b765"},
 tide:{name:"Tide",glyph:"≋",color:"#75c3d6"},
 shadow:{name:"Shadow",glyph:"◈",color:"#ad94c9"},
 ember:{name:"Ember",glyph:"✧",color:"#e59a73"},
 grove:{name:"Grove",glyph:"❧",color:"#9cc99b"}
};
const SAVE_KEY="dc-mana-heist-progress-v1";
function loadProgress(){
 try{
  const data=JSON.parse(localStorage.getItem(SAVE_KEY)||"null");
  if(data?.version===ENGINE_VERSION && data.best && typeof data.best==="object")
   return {best:Object.fromEntries(Object.entries(data.best).filter(([k,v])=>LEVELS.some(l=>l.id===k)&&Number.isInteger(v)&&v>0&&v<500)),lastLevel:Math.max(0,Math.min(LEVELS.length-1,Number.isInteger(data.lastLevel)?data.lastLevel:0))};
 }catch{}
 return {best:{},lastLevel:0};
}
let progress=loadProgress();
let index=progress.lastLevel;
let level=LEVELS[index],state=initialState(level),history=[],selectedId=null;
const optimum=new Map();
for(const vault of LEVELS){
 const proof=solve(vault);
 if(proof.status!=="solved")throw Error("Unsolved tutorial vault: "+vault.id);
 optimum.set(vault.id,proof.moves);
}
function persist(){
 try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:ENGINE_VERSION,best:progress.best,lastLevel:index}));}catch{}
}
function status(message,bad=false){$("status").textContent=message;$("status").classList.toggle("error",bad);}
function vec(vector){return Object.entries(vector).filter(([,n])=>n).map(([f,n])=>n+" "+F[f].name).join(" + ");}
function stars(moves,par){return moves<=par?3:moves<=par+2?2:1;}
function makePicker(){
 $("levelPicker").innerHTML=LEVELS.map((v,i)=>{
  const best=progress.best[v.id],score=best?stars(best,optimum.get(v.id)):0;
  return '<button class="level-button" data-level="'+i+'" type="button" aria-pressed="'+(i===index)+'" aria-label="Vault '+(i+1)+': '+v.title+'">'+
    '<b>'+String(i+1).padStart(2,"0")+'</b><strong>'+v.title+'</strong><small>'+(score?"★".repeat(score)+" "+best+" MOVES":"NOT YET CRACKED")+'</small></button>';
 }).join("");
}
function tileMarkup(c,connected){
 const exhausted=Object.hasOwn(state.uses,c.id)&&state.uses[c.id]===0;
 const available=connected.has(c.id)||c.type==="relay"||c.type==="vault";
 const classes=["tile",!available?"is-offline":"",exhausted?"is-exhausted":"",state.opened&&c.type==="vault"?"is-complete":"",selectedId===c.id?"is-selected":""].filter(Boolean).join(" ");
 const glyph=c.type==="source"?F[Object.keys(c.output)[0]].glyph:c.type==="dual"?"✣":c.type==="converter"?"◇":c.type==="vault"?"⬡":"";
 const path=c.type==="relay"?'<svg class="tile-pipe" viewBox="0 0 100 100" style="transform:rotate('+(90*state.rotations[c.id])+'deg)" aria-hidden="true"><path d="'+(c.shape==="straight"?"M 50 0 V 100":"M 50 0 V 50 H 100")+'"/></svg>':'<span class="tile-glyph" aria-hidden="true">'+glyph+'</span>';
 const count=c.type==="relay"?state.turns[c.id]+" TURNS":Object.hasOwn(state.uses,c.id)?state.uses[c.id]+" LEFT":"";
 return '<button type="button" class="'+classes+'" data-id="'+c.id+'" data-type="'+c.type+'" aria-pressed="'+(selectedId===c.id)+'" aria-label="'+c.label+(available?"":" disconnected")+'">'+
   (count?'<span class="tile-uses">'+count+'</span>':"")+
   (!available?'<span class="tile-offline" aria-hidden="true">×</span>':"")+path+
   '<span class="tile-name">'+c.label+'</span></button>';
}
function renderBoard(){
 const connected=reachableIds(level,state);
 const coordinates=new Map(level.components.map(c=>[c.at.join(","),c]));
 const cells=[];
 for(let y=0;y<level.height;y++)for(let x=0;x<level.width;x++){
  const c=coordinates.get(x+","+y);cells.push(c?tileMarkup(c,connected):'<span class="empty-tile" aria-hidden="true"></span>');
 }
 $("board").style.setProperty("--cols",String(level.width));
 $("board").innerHTML=cells.join("");
 $("routingText").textContent=level.routing==="global"?"OPEN CIRCUIT · ENERGY CAN BE USED FROM ANY DEVICE":"ROUTED CIRCUIT · DEVICES MUST CONNECT TO THE VAULT";
}
function renderLedger(){
 $("energyList").innerHTML=FAMILIES.filter(f=>level.goal[f]||state.energy[f]).map(f=>{
  const have=state.energy[f],need=level.goal[f]||0;
  return '<div class="energy-row '+(have>=need?"met":"")+'"><span class="energy-symbol" style="--family:'+F[f].color+'" aria-hidden="true">'+F[f].glyph+'</span><span class="energy-name">'+F[f].name+'</span><span class="energy-number" aria-label="'+have+' '+F[f].name+' energy held">'+have+'</span><span class="energy-number need" aria-label="'+need+' '+F[f].name+' energy needed">'+need+'</span></div>';
 }).join("");
}
function panelButton(label,action,disabled=false){
 const kind=action.type, id=action.id||"",choice=action.choice??0;
 return '<button type="button" class="device-action" data-action="'+kind+'" data-id="'+id+'" data-choice="'+choice+'" '+(disabled?"disabled":"")+'>'+label+'</button>';
}
function renderDevice(){
 const c=level.components.find(x=>x.id===selectedId);
 if(!c){$("devicePanel").innerHTML="<p>Choose a tile to inspect and operate a device.</p>";return;}
 const connected=reachableIds(level,state).has(c.id);
 let copy='<h3>'+c.label+'</h3>';
 if(c.type==="source")copy+='<p>Generates <strong>'+vec(c.output)+'</strong> per activation. '+state.uses[c.id]+' charge(s) left.</p>'+panelButton("ACTIVATE WELL · 1 MOVE",{type:"activate",id:c.id,choice:0},state.opened);
 if(c.type==="dual")copy+='<p>Choose exactly one output per activation. '+state.uses[c.id]+' charge(s) left.</p><div class="device-choices">'+c.options.map((v,i)=>panelButton("TAKE "+vec(v),{type:"activate",id:c.id,choice:i},state.opened)).join("")+'</div>';
 if(c.type==="converter")copy+='<p>Spend <strong>'+vec(c.input)+'</strong> to gain <strong>'+vec(c.output)+'</strong>. '+state.uses[c.id]+' conversion(s) left.</p>'+panelButton("CONVERT · 1 MOVE",{type:"convert",id:c.id},state.opened);
 if(c.type==="relay")copy+='<p>Each tap turns this '+c.shape+' conductor <strong>90° clockwise</strong>. '+state.turns[c.id]+' turn(s) left.</p>'+panelButton("ROTATE CLOCKWISE · 1 MOVE",{type:"rotate",id:c.id},state.opened);
 if(c.type==="vault")copy+='<p>Requires <strong>'+vec(level.goal)+'</strong>. Seal opening consumes the resources and counts as a move.</p>'+panelButton("BREAK THE SEAL · 1 MOVE",{type:"open"},state.opened);
 if(c.type==="wall")copy+="<p>Solid stone. It cannot conduct energy.</p>";
 if(!connected&&c.type!=="relay")copy+='<p class="device-meta">CONNECTION BROKEN · Rotate a relay to reconnect.</p>';
 $("devicePanel").innerHTML=copy;
}
function render(){
 makePicker();
 $("chapter").textContent=level.chapter;
 $("vaultTitle").textContent=level.title;
 $("briefing").textContent=level.briefing;
 $("moves").innerHTML=state.moves+' <small>/ '+optimum.get(level.id)+' PAR</small>';
 renderBoard();renderLedger();renderDevice();
 $("undo").disabled=history.length===0;
 $("next").textContent=index===LEVELS.length-1?"FIRST VAULT ↺":"NEXT VAULT →";
 $("winNext").textContent=index===LEVELS.length-1?"REPLAY THE CAMPAIGN →":"CONTINUE THE HEIST →";
 $("winPanel").hidden=!state.opened;
 if(state.opened){
  const par=optimum.get(level.id);
  $("winCopy").textContent="★".repeat(stars(state.moves,par))+" · "+state.moves+" move(s) · perfect route "+par+" move(s)"+(progress.best[level.id]===state.moves?" · PERSONAL BEST":"");
 }
}
function use(action){
 const result=applyAction(level,state,action);
 if(!result.ok){status(result.error,true);return;}
 history.push(state);state=result.state;
 if(state.opened){
  const previous=progress.best[level.id];
  if(!previous||state.moves<previous)progress.best[level.id]=state.moves;
  persist();
  status(state.moves<=optimum.get(level.id)?"Perfect heist. The seal gives way!":"Vault open! Try for the perfect route.");
 }else if(!legalActions(level,state).length)status("No legal actions remain. Use Undo or Reset to try another route.",true);
 else status("Move "+state.moves+" recorded. The vault awaits your next action.");
 render();
}
function loadLevel(i){
 index=(i+LEVELS.length)%LEVELS.length;
 level=LEVELS[index];state=initialState(level);history=[];selectedId=level.components[0]?.id||null;
 progress.lastLevel=index;persist();render();
 status("Vault "+(index+1)+" loaded. Select a device, then use its action button.");
}
$("levelPicker").addEventListener("click",event=>{
 const button=event.target.closest("[data-level]");
 if(button)loadLevel(Number(button.dataset.level));
});
$("board").addEventListener("click",event=>{
 const button=event.target.closest("button[data-id]");
 if(!button)return;
 selectedId=button.dataset.id;
 renderBoard();renderDevice();
 status("Selected "+level.components.find(c=>c.id===selectedId).label+". Choose an action in the Device Dossier.");
});
$("devicePanel").addEventListener("click",event=>{
 const button=event.target.closest("button[data-action]");
 if(!button)return;
 const {action,id,choice}=button.dataset;
 use(action==="open"?{type:"open"}:action==="activate"?{type:action,id,choice:Number(choice)}:{type:action,id});
});
$("undo").addEventListener("click",()=>{if(!history.length)return;state=history.pop();render();status("Last move undone. No energy or charges were lost.");});
$("reset").addEventListener("click",()=>loadLevel(index));
$("next").addEventListener("click",()=>loadLevel(index+1));
$("winNext").addEventListener("click",()=>loadLevel(index+1));
loadLevel(index);
