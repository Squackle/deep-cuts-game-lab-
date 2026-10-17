// Constructive legality certificates for the 15 capstones.
// This proves there is a legal route using exact cards and payments.
// This is NOT an optimal-solution proof; do not label the resulting trace
// as the unique or fastest route without future solver/difficulty audits.
import {actions,initial,reduce,completed} from "./engine.js";
const by=(type,id,modeOrColor)=>a=>a.type===type&&a.id===id&&
 (!modeOrColor||(type==="tap"?a.color===modeOrColor:a.mode===modeOrColor));
const plan={
 2:[
  ["tap","f4","C"],["activate","f6","filter"],["tap","f0","B"],
  ["ritual","h0"],["tap","f1","B"],["tap","f2","U"],["tap","f3","R"],
  ["activate","f5","sol"],["activate","f7","treasure-G"]
 ],
 3:[
  ["activate","f6","sol"],["activate","f7","filter"],["tap","f2","U"],
  ["activate","f8","filter-U-0"],["tap","f3","U"],["tap","f0","B"],
  ["ritual","h0"],["tap","f1","B"],["activate","f9","treasure-B"],
  ["tap","f4","R"],["tap","f5","C"],["activate","f10","petal-G"]
 ],
 4:[
  ["activate","f7","sol"],["activate","f8","filter"],["tap","f2","U"],
  ["activate","f9","filter-U-0"],["tap","f3","U"],["tap","f0","B"],
  ["ritual","h0"],["tap","f1","B"],["tap","f4","R"],["tap","f5","W"],
  ["tap","f6","C"],["activate","f10","treasure-R"],["activate","f11","petal-G"]
 ]
};
export function certifyCapstone(level){
 if(!level.revision||!level.curated)return null;
 const moves=plan[level.galaxy];
 if(!moves)throw Error("No certificate for "+level.id);
 let state=initial(level);const trace=[];
 for(const [type,id,mode] of moves){
  const legal=actions(level,state).find(by(type,id,mode));
  if(!legal)throw Error("Illegal certified move "+level.id+": "+[type,id,mode].join("/"));
  const result=reduce(level,state,legal);
  if(!result.ok)throw Error("Replay error "+level.id+": "+result.error);
  trace.push(legal);state=result.state;
 }
 const cast=actions(level,state).find(a=>a.type==="cast");
 if(!cast)throw Error("Certified route cannot pay final ward "+level.id);
 const end=reduce(level,state,cast);
 if(!end.ok||!completed(level,end.state))throw Error("Capstone did not complete "+level.id);
 trace.push(cast);
 return {status:"solved",turn:end.state.turn,spentLife:end.state.spentLife,
  actions:trace,steps:trace.length,certification:"legal route only; optimum not independently proven"};
}
