// P05: Three user-requested hint levels, grounded in the authoritative
// puzzle reducer. Never guess a route from an old puzzle revision or a
// certificate that fails to replay against THIS exact board.
import {COLORS,actions,initial,reduce,key,completed,getCard} from "./engine.js";
import {solve} from "./solver.js";
const names={W:"white",U:"blue",B:"black",R:"red",G:"green",C:"true colorless",N:"generic"};
const shortCost=cost=>Object.entries(cost||{}).filter(([,n])=>n>0).map(([c,n])=>n+" "+(names[c]||c)).join(", ");
export function validateHintRoute(level,start,trace){
 if(!Array.isArray(trace))return null;
 let state=start;
 for(const action of trace){
  const legal=actions(level,state).find(a=>JSON.stringify(a)===JSON.stringify(action));
  if(!legal)return null;
  const out=reduce(level,state,legal);
  if(!out.ok)return null;
  state=out.state;
 }
 return completed(level,state)?{actions:trace,turn:state.turn,spentLife:state.spentLife}:null;
}
export function continuationFromProof(level,state,reference){
 if(reference?.status!=="solved"||!Array.isArray(reference.actions))return null;
 let current=initial(level);
 for(let i=0;i<=reference.actions.length;i++){
  if(key(current)===key(state)){
   const continuation=reference.actions.slice(i);
   return validateHintRoute(level,state,continuation);
  }
  const action=reference.actions[i];
  if(!action)break;
  const legal=actions(level,current).find(a=>JSON.stringify(a)===JSON.stringify(action));
  if(!legal)return null; // incompatible historical/base-template solution
  const out=reduce(level,current,legal);
  if(!out.ok)return null;
  current=out.state;
 }
 return null;
}
export function legalContinuation(level,state,reference,{maxStates=12000}={}){
 if(completed(level,state))return {status:"complete",actions:[]};
 const certified=continuationFromProof(level,state,reference);
 if(certified)return {status:"solved",...certified,source:"verified reference replay"};
 // A player's actions can diverge from the reference route. Check the
 // actual current state, not a hypothetical reset, with bounded search.
 const computed=solve(level,{startState:state,maxStates});
 if(computed.status!=="solved")return {status:computed.status,actions:[],reason:computed.reason||"No legal finish is known from the current position."};
 const valid=validateHintRoute(level,state,computed.actions);
 if(!valid)return {status:"inconclusive",actions:[],reason:"An alternate finish could not be verified."};
 return {status:"solved",...valid,source:"bounded current-state search"};
}
export function hintConcept(level,state){
 if(completed(level,state))return "The vault is complete. Review the solved ward and your resource choices.";
 const cost=level.stages[state.stage]?.cost||{},have=state.pool||{};
 const missing=COLORS.filter(c=>(cost[c]||0)>(have[c]||0));
 const needed=shortCost(cost);
 const exact=missing.map(c=>((cost[c]||0)-(have[c]||0))+" "+names[c]).join(", ");
 const general=cost.N>0?" Generic mana may be paid using any otherwise unneeded mana, but a colorless diamond requires actual colorless mana.":"";
 const turn=state.turn===level.turnLimit?" You are on the last turn; end-turn is no longer an option.":"";
 const scarcity=exact?" First identify a source for "+exact+".":" You may already have enough symbols; check whether you can legally pay the spell cost.";
 return "Ward "+(state.stage+1)+" needs "+(needed||"no mana")+"."+scarcity+general+turn;
}
function line(level,state,a){
 if(a.type==="end")return "End the turn (untap sources; floating mana clears).";
 if(a.type==="cast")return "Cast “"+(level.stages[state.stage]?.name||"the ward spell")+"” using a legal mana payment.";
 if(a.type==="play")return "Play "+getCard(level,a.id).name+(a.shock?" untapped, paying 2 life":a.returnId?" and return "+getCard(level,a.returnId).name:"")+".";
 if(a.type==="fetch")return "Sacrifice the fetch source to find "+getCard(level,a.targetId).name+(a.shock?", paying for its untapped entry":"")+".";
 if(a.type==="tap")return "Tap "+getCard(level,a.id).name+" for "+(a.output?.join(" + ")||a.color||"mana")+".";
 if(a.type==="activate")return "Activate "+getCard(level,a.id).name+" (mode "+(a.mode||"mana")+")"+(a.output?.length?" for "+a.output.join(" + "):"")+".";
 if(a.type==="ritual")return "Cast "+getCard(level,a.id).name+" for "+(a.output?.join(" + ")||"its effect")+".";
 return "Take the next legal action.";
}
export function hintInstruction(level,state,route,full=false){
 if(route.status!=="solved")return "No verified winning continuation from this exact position was found within the search limit. Undo recent moves or Restart; the game will not invent a solution.";
 if(!route.actions.length)return "All wards are already open.";
 if(!full){
  const a=route.actions[0],first=line(level,state,a);
  return "A verified next move is: "+first+" The complete sequence stays hidden until you request Hint 3.";
 }
 let position=state;
 const items=[];
 for(const a of route.actions.slice(0,120)){
  items.push((items.length+1)+". "+line(level,position,a));
  const out=reduce(level,position,a);
  if(!out.ok)throw Error("Hint route changed during rendering.");
  position=out.state;
 }
 if(route.actions.length>120)items.push("Further actions omitted.");
 return "Verified playable continuation from your CURRENT position (not necessarily globally optimal):\n"+items.join("\n");
}
