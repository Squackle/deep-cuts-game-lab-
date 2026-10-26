// Offline checkpoint diagnostic, NOT an empirical human difficulty rating.
// Compare alternatives within one actual player decision (a land play, a source
// mode, etc.). Do not count unrelated actions or click-order permutations.
import {actions,reduce,key} from "./engine.js";
import {solve} from "./solver.js";
export const DECISION_ANALYSIS_VERSION="mh-decision-checkpoint-1";
export function analyzeDecision(level,state,alternatives,{maxStates=65000}={}){
 if(!Number.isSafeInteger(maxStates)||maxStates<1)throw new RangeError("Invalid state budget");
 const legal=new Set(actions(level,state).map(a=>JSON.stringify(a))),seen=new Set(),outcomes=[];
 for(const action of alternatives){
  if(!legal.has(JSON.stringify(action)))throw new Error("Checkpoint contains an illegal action");
  const next=reduce(level,state,action).state,signature=key(next);
  if(seen.has(signature))continue;
  seen.add(signature);
  const finish=solve(level,{startState:next,maxStates});
  // Same board, truncated after the current ward: can this option appear to
  // make progress while committing the player to a later failure?
  const prefix={...level,stages:level.stages.slice(0,state.stage+1)};
  const advance=solve(prefix,{startState:next,maxStates});
  outcomes.push({action,finish:finish.status,advance:advance.status});
 }
 const incomplete=outcomes.some(o=>o.finish==="inconclusive"||o.advance==="inconclusive");
 const winning=outcomes.filter(o=>o.finish==="solved").length;
 const progressing=outcomes.filter(o=>o.advance==="solved").length;
 const deferredTraps=outcomes.filter(o=>o.advance==="solved"&&o.finish==="unsolvable").length;
 const status=incomplete?"inconclusive":!winning?"no-winning-option":"complete";
 return {version:DECISION_ANALYSIS_VERSION,status,options:outcomes.length,outcomes,
  // Null means unproven, never a low-difficulty score or proof of no solution.
  winning:incomplete?null:winning,progressing:incomplete?null:progressing,
  deferredTraps:incomplete?null:deferredTraps,
  // I = options that can clear the current ward; W = options that can finish.
  // log2(I/W) isolates misleading short-term progress; adding forced actions,
  // duplicate successors or immediately useless options awards no extra bits.
  deferredBits:status==="complete"?Math.log2(progressing/winning):null};
}
