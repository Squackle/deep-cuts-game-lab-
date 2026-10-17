import {actions,initial,reduce,completed} from "./engine.js";
// Constructive replay certificate, not a claim of unique or globally optimal
// route. Every newly generated challenge is tested from state zero.
export function certifyMastery(level){
 if(level.curated!=="mana-masteries-2.0")return null;
 const trace=[];let state=initial(level);
 const apply=(type,id,detail)=>{
  const opts=actions(level,state).filter(a=>a.type===type&&
   (id===null||a.id===id)&&
   (!detail||a.type==="tap"?(!detail||a.color===detail):a.mode===detail));
  // For paid abilities prefer mana that is true colorless over other colors.
  const score=a=>(a.spend||[]).filter(mid=>state.manaUnits.find(u=>u.id===mid)?.color==="C").length;
  const action=opts.sort((a,b)=>score(b)-score(a))[0];
  if(!action)throw Error(level.id+" cannot "+[type,id,detail].join("/")+
   " at stage "+state.stage+" pool "+JSON.stringify(state.pool));
  const result=reduce(level,state,action);
  if(!result.ok)throw Error(level.id+" invalid certificate move "+result.error);
  trace.push(action);state=result.state;
 };
 let cycle=0;
 while(!completed(level,state)){
  // Pair stage boundaries are intentionally real spell casts in the same
  // simplified turn, not fake mid-turn refreshes.
  if(cycle>0)apply("end",null);
  apply("activate","f7","sol");
  apply("activate","f8","filter");
  apply("tap","f6","C");
  apply("activate","f12","coffers");
  apply("tap","f0","B");apply("tap","f1","B");
  apply("ritual","h"+cycle);
  apply("tap","f2","U");apply("activate","f9","filter-U-0");
  apply("tap","f3","U");apply("tap","f4","R");
  apply("activate",cycle===0?"f10":"f"+(13+cycle),"treasure-R");
  apply("cast",null);
  if(!completed(level,state))apply("cast",null);
  cycle++;
  if(cycle>level.turnLimit)throw Error(level.id+" exceeded the turn budget");
 }
 return {status:"solved",turn:state.turn,spentLife:state.spentLife,
  actions:trace,steps:trace.length,
  certification:"legal multi-ward route; not a proof of optimality"};
}
