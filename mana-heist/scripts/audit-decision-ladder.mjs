#!/usr/bin/env node
import {DECISION_LADDER} from "../src/decision-ladder.js";
import {DECISION_CHECKPOINTS,checkpoint} from "../src/decision-checkpoints.js";
import {analyzeDecision} from "../src/decision-analysis.js";
import {VERSION} from "../src/engine.js";
import {solve,replay} from "../src/solver.js";
const rows=[];
for(const probe of DECISION_CHECKPOINTS){
 const level=DECISION_LADDER[probe.level],point=checkpoint(level,probe.prefix,probe.select);
 const decision=analyzeDecision(level,point.state,point.alternatives);
 const route=solve(level,{maxStates:65000});
 const replayOK=route.status==="solved"&&replay(level,route.actions).ok;
 rows.push({id:level.id,concept:probe.concept,engine:VERSION,route:route.status,replayOK,referenceActions:route.steps,...decision});
 if(!replayOK||decision.status!=="complete")process.exitCode=1;
}
console.log(JSON.stringify({humanCalibrated:false,scope:"authored checkpoints only; bits are NOT whole-puzzle human difficulty",rows},null,2));
