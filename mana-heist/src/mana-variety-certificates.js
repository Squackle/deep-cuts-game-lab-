// Certified strategy traces are intentionally DIFFERENT across families.
// We replay the genuine engine rules, including life, paid activation costs,
// mana spell casting, static effects and the graveyard. This is a legality
// certificate, not a proof of unique optimality.
import {actions,initial,reduce,completed} from "./engine.js";
const tap=(id,color)=>["tap",id,color];
const activate=(id,mode)=>["activate",id,mode];
const cast=(id)=>["ritual",id];
function instructions(level,round){
 const family=level.mastery.family;
 if(family==="tide")return [
  tap("f0","U"),cast("h"+round),tap("f1","U"),tap("f2","U"),
  tap("f3","R"),tap("f4","W"),activate("f5","lotus-U"),
  activate("f6","arcane-U"),activate("f7","nyxlotus-U"),
  tap("f8","C"),activate("f9","stone-C"),tap("f10","G")];
 if(family==="prism")return [
  activate("f1","thran-CCC"),activate("f2","filter"),
  activate("f3","prism-G"),activate("f4","arcane-U"),
  activate("f5","filter-U-0"),activate("f6","gilded-B"),
  activate("f7","lotus-R"),cast("h"+round),
  activate("f8","nyxlotus-G"),activate("f9","lantern-W"),
  activate("f10",level.field.find(f=>f.id==="f10")?.card==="vessel"?"vessel-C":"stone-C"),
  tap("f0","C"),tap("f11","U"),tap("f12","W"),
  activate(round?"f"+(13+round):"f13","treasure-G")];
 if(family==="geyser")return [
  tap("f0","R"),tap("f1","R"),activate("f6","thran-CCC"),
  activate("f5","stone-C"),cast("h"+round),
  tap("f2","R"),tap("f3","U"),tap("f4","W"),
  activate("f7","arcane-U"),activate("f8","gilded-B"),
  activate("f9","prism-W"),tap("f10","C"),
  activate("f11","lantern-G"),activate("f12","nyxlotus-B"),
  activate(round?"f"+(13+round):"f13","treasure-G")];
 if(family==="rite")return [
  tap("f0","R"),cast("h"+round),
  tap("f1","R"),activate("f10","nyxlotus-R"),
  activate("f5","thran-CCC"),
  activate("f8",level.field.find(f=>f.id==="f8")?.card==="cylix"?"cylix-W":"prism-W"),
  tap("f9","C"),activate("f6","arcane-U"),
  activate("f7","gilded-B"),tap("f2","U"),tap("f3","W"),tap("f4","G"),
  activate("f11","lantern-G"),
  activate(round?"f"+(13+round):"f13","treasure-G")];
 return [
  tap("f0","R"),activate("f5","thran-CCC"),cast("h0"),
  tap("f1","R"),activate("f8","gilded-R"),tap("f2","U"),
  tap("f3","W"),activate("f9","arcane-U"),
  activate("f11","prism-W"),activate("f12","worn-CC"),
  tap("f4","C"),activate("f10","stone-C"),
  activate("f6","basalt-CCC"),activate("f7","key-untap-f6"),
  activate("f6","basalt-CCC")
 ];
}
export function certifyDiverse(level){
 if(level.curated!=="mana-diversity-3.0")return null;
 let state=initial(level);const trace=[];
 const apply=(type,id,detail)=>{
  const legal=actions(level,state).filter(a=>a.type===type&&
   (id===null||a.id===id)&&
   (!detail||(type==="tap"?a.color===detail:a.mode===detail)));
  const countColorless=a=>(a.spend||[]).filter(m=>state.manaUnits.some(u=>u.id===m&&u.color==="C")).length;
  const action=legal.sort((a,b)=>countColorless(b)-countColorless(a))[0];
  if(!action)throw Error("Invalid mana route "+level.id+" "+
   JSON.stringify([type,id,detail])+" turn "+state.turn+" stage "+state.stage+" pool "+JSON.stringify(state.pool));
  const next=reduce(level,state,action);
  if(!next.ok)throw Error("Broken route "+level.id+" "+next.error);
  state=next.state;trace.push(action);
 };
 for(let round=0;round<level.turnLimit;round++){
  if(round)apply("end",null);
  for(const [type,id,detail] of instructions(level,round))apply(type,id,detail);
  const casts=Math.min(2,level.stages.length-state.stage);
  for(let n=0;n<casts;n++)apply("cast",null);
 }
 if(!completed(level,state))throw Error("Incomplete route "+level.id+" stage "+state.stage);
 return {status:"solved",turn:state.turn,spentLife:state.spentLife,
  actions:trace,steps:trace.length,
  certification:"legal specialized mana route, not globally optimal"};
}
