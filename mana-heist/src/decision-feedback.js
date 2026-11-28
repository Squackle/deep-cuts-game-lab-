import {COLORS,completed,getCard} from "./engine.js";
import {legalContinuation} from "./verified-hints.js";
const names={W:"white",U:"blue",B:"black",R:"red",G:"green",C:"colorless"};
export function reviewPlan(level,state,{maxStates=12000}={}){
 if(completed(level,state))return {status:"complete",text:"Every ward is open."};
 const route=legalContinuation(level,state,null,{maxStates});
 const scope=" This checks manual casting, not the optional automatic timing.";
 if(route.status==="solved")return {status:"solved",text:"A legal finish still exists from your current resources. Continue, or reveal Hint 2 for a verified move."+scope};
 if(route.status==="unsolvable")return {status:"unsolvable",text:"The completed search found no manual finish from this position. Undo a resource commitment and inspect the remaining wards."+scope};
 return {status:"inconclusive",text:"The search budget was reached or a route could not be verified. Your position is not proven lost."+scope};
}
export function wardPaymentRecap(level,history){
 return history.filter(f=>f.action?.type==="cast").map(({state,action,automatic})=>{
  const paid=COLORS.filter(c=>action.spend[c]).map(c=>action.spend[c]+" "+names[c]).join(" + ");
  return level.stages[state.stage].name+": "+paid+(action.untapId?"; untapped "+getCard(level,action.untapId).name:"")+(automatic?" (automatic)":" (manual)");
 });
}
