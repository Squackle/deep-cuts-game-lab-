import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LEVELS} from "../src/levels.js";
import {VERSION,initial,actions,reduce,key} from "../src/engine.js";
import {replay,solve} from "../src/solver.js";
import {analyzeStrategy,choiceMenu} from "../src/strategy-graph.js";
import {profileReferenceRoute} from "../src/route-decision-profile.js";
import {campaignDecisionAudit,campaignDecisionSummary,representativeLevels} from "../src/campaign-decision-audit.js";
const level=(card="island",repeats=1)=>({id:"mh-test-graph",version:VERSION,life:20,turnLimit:repeats,
 field:[{id:"a",card}],hand:[],library:[],stages:Array.from({length:repeats},()=>({name:"Blue",cost:{U:1}}))});
test("forced repetitions add actions, not consequential choice patterns",()=>{
 const one=analyzeStrategy(level()),six=analyzeStrategy(level("island",6));
 for(const r of [one,six]){
  assert.equal(r.status,"complete");
  assert.equal(r.metrics.minimumCriticalCommitments,0);
  assert.equal(r.metrics.referenceDecisionPatterns,0);
 }
 assert.equal(one.metrics.shortestActions,2);assert.equal(six.metrics.shortestActions,17);
 assert.ok(replay(level("island",6),six.route).ok);
});
test("repeating the same color choice remains one pattern while choice visits increase",()=>{
 const one=analyzeStrategy(level("dualUR")),six=analyzeStrategy(level("dualUR",6));
 assert.equal(one.metrics.minimumCriticalCommitments,1);
 assert.equal(six.metrics.minimumCriticalCommitments,6);
 assert.equal(one.metrics.referenceDecisionPatterns,1);
 assert.equal(six.metrics.referenceDecisionPatterns,1);
 const p=profileReferenceRoute(level("dualUR",6),six.route);
 assert.equal(p.choiceVisits,6);assert.equal(p.distinctChoiceMenus,1);assert.equal(p.repeatedChoiceMenus,5);
});
test("graph detects a color commitment that opens one ward and strands the next",()=>{
 const p={...level("dualUR"),field:[{id:"a",card:"dualUR"},{id:"b",card:"island"}],
  stages:[{name:"Blue",cost:{U:1}},{name:"Red",cost:{R:1}}]};
 const r=analyzeStrategy(p);
 assert.equal(r.status,"complete");assert.equal(r.metrics.minimumDeferredCommitments,1);
 assert.ok(replay(p,r.route).ok);
});
test("exhausted state/edge budgets return null metrics, not an easy or unsolvable verdict",()=>{
 const states=analyzeStrategy(level("dualUR"),{maxStates:1});
 assert.equal(states.status,"inconclusive");assert.equal(states.reason,"state-budget");
 assert.equal(states.metrics,null);assert.equal(states.route,null);
 const edges=analyzeStrategy(level("dualUR"),{maxEdges:1});
 assert.equal(edges.status,"inconclusive");assert.equal(edges.reason,"edge-budget");
 assert.equal(edges.metrics,null);
 for(const value of [0,-1,NaN,Infinity,1.5])assert.throws(()=>analyzeStrategy(level(),{maxStates:value}),RangeError);
});
test("an exhausted complete graph can prove failure and terminate reversible activation cycles",()=>{
 const no={...level(),stages:[{name:"Red",cost:{R:1}}]};
 assert.equal(analyzeStrategy(no).status,"unsolvable");
 const cycle={...level("basalt"),stages:[{name:"C",cost:{C:1}}]};
 const r=analyzeStrategy(cycle);assert.equal(r.status,"complete");
 assert.equal(r.states,3);assert.ok(replay(cycle,r.route).ok);
});
test("reverse lower bounds agree with independently enumerated small winning traces",()=>{
 const p={...level("dualUR",2),hand:[{id:"b",card:"island"}],stages:[{name:"Both",cost:{U:1,R:1}}]};
 const memo=new Map();
 function enumerate(s){
  if(s.stage===p.stages.length)return 0;
  const k=key(s);if(memo.has(k))return memo.get(k);
  const options=actions(p,s).map(action=>({action,state:reduce(p,s,action).state}));
  const finishes=options.map(o=>solve(p,{startState:o.state,maxStates:10000}).status==="solved");
  const commitments=options.flatMap((o,i)=>o.action.type!=="end"?[finishes[i]]:[]);
  const cost=Number(commitments.includes(true)&&commitments.includes(false));
  const values=options.flatMap((o,i)=>finishes[i]?[enumerate(o.state)+(o.action.type==="end"?0:cost)]:[]);
  const best=values.length?Math.min(...values):Infinity;memo.set(k,best);return best;
 }
 const r=analyzeStrategy(p);assert.equal(r.status,"complete");
 assert.equal(r.metrics.minimumCriticalCommitments,enumerate(initial(p)));
});
test("coarse menu descriptions ignore cosmetic labels but retain charge differences",()=>{
 const p=level("dualUR"),renamed={...p,title:"New title",briefing:"New text",stages:[{name:"New ward name",cost:{U:1}}]};
 assert.deepEqual(analyzeStrategy(p).metrics,analyzeStrategy(renamed).metrics);
 const a={...level("chalice"),charges:{a:1}},b={...a,charges:{a:2}};
 assert.notDeepEqual(choiceMenu(a,initial(a),actions(a,initial(a))),choiceMenu(b,initial(b),actions(b,initial(b))));
});
test("reference observations reject forged or unfinished traces and do not mutate puzzle definitions",()=>{
 const p=level(),before=JSON.stringify(p),route=solve(p).actions;
 assert.throws(()=>profileReferenceRoute(p,[]),/does not finish/);
 assert.throws(()=>profileReferenceRoute(p,[{type:"tap",id:"missing",color:"U"}]),/Invalid reference/);
 const profile=profileReferenceRoute(p,route);
 assert.equal(profile.legalReplay,true);assert.equal(profile.singleOptionCommitments,2);
 assert.equal(JSON.stringify(p),before);
});
for(const id of ["mh-07","mh-16","mh-109","mh-110","mh-251","mh-301"]){
 test(id+": complete graph route replays and lower bounds do not exceed the reference route",()=>{
  const p=LEVELS.find(p=>p.id===id),r=analyzeStrategy(p);
  assert.equal(r.status,"complete");assert.ok(replay(p,r.route).ok);
  assert.ok(r.metrics.minimumCriticalCommitments<=r.metrics.referenceCriticalCommitments);
  assert.ok(r.metrics.minimumDeferredCommitments<=r.metrics.referenceDeferredCommitments);
  assert.ok(r.metrics.minimumDeferredCommitments<=r.metrics.minimumCriticalCommitments);
 });
}
test("all 500 route profiles replay while graph selection and incomplete coverage remain explicit",{timeout:150000},()=>{
 const r=campaignDecisionAudit({graphIds:["mh-01","mh-500"],maxStates:3});
 assert.equal(r.summary.legalReferenceReplays,500);assert.equal(r.summary.graphSelected,2);
 assert.equal(r.summary.graphInconclusive,1);assert.equal(r.summary.graphComplete,1);
 assert.equal(r.summary.humanPlaytests,0);
 assert.equal(r.rows.filter(row=>row.graph===null).length,498);
 const s=campaignDecisionSummary(r);assert.equal(s.graphs.length,2);
 assert.equal(s.graphs.find(g=>g.id==="mh-500").metrics,null);
 assert.equal(s.graphs.find(g=>g.id==="mh-01").metrics.shortestActions,2);
 assert.equal(s.galaxies.length,10);assert.ok(s.galaxies.every(g=>g.vaults===50));
 const picked=representativeLevels();assert.equal(new Set(picked.map(p=>p.id)).size,picked.length);
 for(const base of LEVELS.slice(0,18))assert.ok(picked.includes(base));
 for(let i=49;i<500;i+=50)assert.ok(picked.includes(LEVELS[i]));
 for(const ids of [["missing"],["mh-01","mh-01"]])assert.throws(()=>campaignDecisionAudit({graphIds:ids}));
});
test("analysis is isolated from browser state, public APIs and imported unmerged practice work",()=>{
 for(const path of ["strategy-graph.js","route-decision-profile.js","campaign-decision-audit.js"]){
  const source=readFileSync(new URL("../src/"+path,import.meta.url),"utf8");
  assert.doesNotMatch(source,/localStorage|sessionStorage|fetch\(|XMLHttpRequest|decision-ladder\.js|decision-analysis\.js/);
 }
});
