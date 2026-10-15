// Mana Heist v1.0 — forced, automatic ward resolution.
// Mana is *never* created here; the existing deterministic reducer is authoritative.
// A spell resolves when legal mana has arrived at the ward. In the rare case where
// multiple generic payments or untap targets are legal, choose a completable line.
import {actions,reduce,key,completed,COLORS} from "./engine.js";
import {solve} from "./solver.js";

const memo=new Map();
function nextWardBias(level,s,action){
 const future=level.stages[s.stage+1]?.cost||{};
 const n=reduce(level,s,action).state;
 const leftover=COLORS.reduce((total,c)=>total+(n.pool[c]||0)*((future[c]||0)?8:1),0);
 const untap=action.untapId?n.field.find(x=>x.id===action.untapId)?.tapped===false?1:0:0;
 return leftover+untap;
}
export function chooseAutomaticCast(level,state){
 const options=actions(level,state).filter(a=>a.type==="cast");
 if(!options.length)return null;
 if(options.length===1)return options[0];
 const memoKey=level.id+"|"+key(state);
 const prior=memo.get(memoKey);
 if(prior)return options.find(a=>JSON.stringify(a)===prior)||options[0];
 const candidates=options.map(action=>{
  const next=reduce(level,state,action).state;
  const route=completed(level,next)?{status:"solved",turn:next.turn,spentLife:next.spentLife,steps:0}:solve(level,{startState:next,maxStates:40000});
  return {action,route,bias:nextWardBias(level,state,action)};
 });
 candidates.sort((a,b)=>{
  const viableA=a.route.status==="solved",viableB=b.route.status==="solved";
  if(viableA!==viableB)return viableA?-1:1;
  if(viableA){
   const p=(a.route.turn-b.route.turn)||((a.route.spentLife||0)-(b.route.spentLife||0));
   if(p)return p;
  }
  return b.bias-a.bias;
 });
 memo.set(memoKey,JSON.stringify(candidates[0].action));
 if(memo.size>1200)memo.clear();
 return candidates[0].action;
}
export function resolveAutomaticCasts(level,start){
 let state=start,casts=[];
 // Multi-ward puzzles may have sufficient leftover mana to automatically
 // open the next ward. Prevent spinning even if a malformed level slips in.
 for(let i=0;i<level.stages.length;i++){
  const action=chooseAutomaticCast(level,state);
  if(!action)break;
  const out=reduce(level,state,action);
  if(!out.ok)throw Error("Auto cast must be legal: "+out.error);
  state=out.state;casts.push(action);
 }
 return {state,casts};
}
