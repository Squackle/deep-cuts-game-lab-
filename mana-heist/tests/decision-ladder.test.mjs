import test from "node:test";
import assert from "node:assert/strict";
import {DECISION_LADDER} from "../src/decision-ladder.js";
import {DECISION_CHECKPOINTS,checkpoint} from "../src/decision-checkpoints.js";
import {analyzeDecision} from "../src/decision-analysis.js";
import {LEVELS} from "../src/levels.js";
import {initial,actions,reduce,completed,validate} from "../src/engine.js";
import {solve,replay} from "../src/solver.js";
import {chooseAutomaticCast,resolveAutomaticCasts} from "../src/auto-cast.js";
import {analyzeStrategy} from "../src/strategy-graph.js";

for(const level of DECISION_LADDER){
 test(`${level.id}: valid, solver-proven and playable through automatic payment`,()=>{
  assert.equal(validate(level),true);
  const proof=solve(level,{maxStates:65000});
  assert.equal(proof.status,"solved");assert.ok(replay(level,proof.actions).ok);
  let state=initial(level);
  for(const move of proof.actions){
   const action=move.type==="cast"?chooseAutomaticCast(level,state):move;
   assert.ok(action);const out=reduce(level,state,action);assert.ok(out.ok);state=out.state;
  }
  assert.ok(completed(level,state));
 });
}
test("practice IDs stay separate from all 500 saved campaign identities",()=>{
 assert.equal(LEVELS.length,500);
 assert.equal(new Set(DECISION_LADDER.map(l=>l.id)).size,7);
 for(const p of DECISION_LADDER)assert.ok(!LEVELS.some(l=>l.id===p.id));
});
for(const probe of DECISION_CHECKPOINTS){
 const level=DECISION_LADDER[probe.level];
 test(`${level.id}: checkpoint proves consequential alternatives (${probe.concept})`,()=>{
  const point=checkpoint(level,probe.prefix,probe.select);
  const result=analyzeDecision(level,point.state,point.alternatives);
  assert.equal(result.status,"complete",JSON.stringify(result));
  assert.equal(result.winning,1,JSON.stringify(result));
  assert.ok(result.options>=2);
  if(probe.level===0)assert.equal(result.deferredTraps,0);
  else assert.ok(result.deferredTraps>=1,"wrong choices can open this ward but lose the vault");
 });
}
test("incomplete search produces no rating or false loss claim",()=>{
 const p=DECISION_LADDER[2],point=checkpoint(p,[],a=>a.type==="tap");
 const r=analyzeDecision(p,point.state,point.alternatives,{maxStates:1});
 assert.equal(r.status,"inconclusive");
 for(const k of ["winning","progressing","deferredTraps","deferredBits"])assert.equal(r[k],null);
 assert.throws(()=>analyzeDecision(p,point.state,point.alternatives,{maxStates:0}));
 assert.throws(()=>analyzeDecision(p,point.state,[{type:"tap",id:"fake",color:"U"}]));
});
test("duplicate successors and immediately useless choices do not inflate deferred bits",()=>{
 const p=DECISION_LADDER[1],s=initial(p),opts=actions(p,s).filter(a=>a.id==="dual");
 const first=analyzeDecision(p,s,opts),duplicates=analyzeDecision(p,s,[...opts,...opts]);
 assert.deepEqual(duplicates,first);
 // In a single-ward board, green cannot even clear the current ward.
 const base=DECISION_LADDER[0];
 const extra={...base,field:[{id:"dual",card:"command"},{id:"fixed",card:"island"}],commanderColors:["U","R","G"]};
 const choices=actions(extra,initial(extra)).filter(a=>a.id==="dual");
 const more=analyzeDecision(extra,initial(extra),choices);
 assert.equal(more.options,3);assert.equal(more.progressing,1);
 assert.equal(more.deferredBits,0);
});
test("repeating a forced blue ward adds work without adding decision burden",()=>{
 const single={...DECISION_LADDER[0],field:[{id:"fixed",card:"island"}],turnLimit:1,
  stages:[{name:"Blue",cost:{U:1}}]};
 const repeated={...single,turnLimit:6,stages:Array.from({length:6},()=>({name:"Blue",cost:{U:1}}))};
 const one=analyzeDecision(single,initial(single),actions(single,initial(single)).filter(a=>a.type==="tap"));
 const six=analyzeDecision(repeated,initial(repeated),actions(repeated,initial(repeated)).filter(a=>a.type==="tap"));
 assert.equal(one.deferredBits,0);assert.equal(six.deferredBits,0);
 assert.ok(solve(repeated).steps>solve(single).steps);
});
for(const turn of [1,2])test(`final sample requires ${turn===1?"blue":"red"} filter output on turn ${turn}`,()=>{
 const level=DECISION_LADDER[4],proof=solve(level,{maxStates:65000});
 assert.equal(proof.status,"solved");
 let state=initial(level);
 if(turn===2){
  for(const a of proof.actions){state=reduce(level,state,a).state;if(a.type==="end")break;}
 }
 const seed=actions(level,state).find(a=>a.type==="tap"&&a.id==="blue1"&&a.color==="U");
 assert.ok(seed);state=reduce(level,state,seed).state;
 const alternatives=actions(level,state).filter(a=>a.type==="activate"&&a.id==="filter");
 const result=analyzeDecision(level,state,alternatives);
 assert.equal(result.status,"complete");assert.equal(result.winning,1);
 const winning=result.outcomes.find(o=>o.finish==="solved");
 assert.deepEqual(winning.action.output,turn===1?["U","U"]:["R","R"]);
 if(turn===2)assert.ok(result.deferredTraps>=1,"a mixed output can open ward two but loses the last red requirement");
});

test("matched-action generic payment comparison separates deferred risk from click count",()=>{
 const easy=DECISION_LADDER[5],hard=DECISION_LADDER[6];
 const a=analyzeStrategy(easy),b=analyzeStrategy(hard),rev=analyzeStrategy(hard,{reverseActions:true});
 assert.equal(a.status,"complete");assert.equal(b.status,"complete");
 assert.equal(a.metrics.shortestActions,b.metrics.shortestActions);
 assert.equal(a.metrics.shortestActions,4);
 assert.equal(a.metrics.minimumDeferredCommitments,0);
 // There is an optimal safe ordering: red first, cast, then blue.
 assert.equal(b.metrics.minimumDeferredCommitments,0);
 assert.ok(b.metrics.shortestDeferredCommitments.max>a.metrics.shortestDeferredCommitments.max);
 const charged=actions(hard,initial(hard)).find(a=>a.type==="tap"&&a.id==="blue");
 const point=reduce(hard,initial(hard),charged).state;
 const risk=analyzeDecision(hard,point,actions(hard,point));
 assert.equal(risk.status,"complete");assert.ok(risk.deferredTraps>=1);
 for(const k of ["shortestActions","minimumCriticalCommitments","minimumDeferredCommitments","shortestCriticalCommitments","shortestDeferredCommitments","firstDistinctCommitments","winningFirstCommitments"])assert.deepEqual(b.metrics[k],rev.metrics[k],k);
 assert.equal(b.states,rev.states);assert.equal(b.edges,rev.edges);
 assert.ok(replay(hard,b.route).ok);assert.ok(replay(hard,rev.route).ok);
 // The optional automatic mode makes timing a resource commitment too.
 let s=initial(hard);s=reduce(hard,s,actions(hard,s).find(x=>x.id==="blue")).state;
 const bad=resolveAutomaticCasts(hard,s).state;
 assert.equal(solve(hard,{startState:bad}).status,"unsolvable");
 s=initial(hard);s=reduce(hard,s,actions(hard,s).find(x=>x.id==="red")).state;
 const good=resolveAutomaticCasts(hard,s).state;assert.equal(solve(hard,{startState:good}).status,"solved");
 console.log("MANA_HEIST_MATCHED_PAIR "+JSON.stringify({easy:a.metrics,hard:b.metrics,states:[a.states,b.states]}));
});
test("report bounded graph coverage for all seven unranked trials",()=>{
 const rows=DECISION_LADDER.map(p=>{const r=analyzeStrategy(p,{maxStates:3000,maxEdges:60000});if(r.route)assert.ok(replay(p,r.route).ok);return {id:p.id,status:r.status,reason:r.reason||null,states:r.states,edges:r.edges,metrics:r.metrics};});
 assert.ok(rows.every(r=>r.status==="complete"||r.status==="inconclusive"));
 console.log("MANA_HEIST_TRIAL_COVERAGE "+JSON.stringify(rows));
});
