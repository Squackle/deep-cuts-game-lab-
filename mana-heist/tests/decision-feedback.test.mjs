import test from "node:test";import assert from "node:assert/strict";
import {DECISION_LADDER} from "../src/decision-ladder.js";
import {initial,actions,reduce} from "../src/engine.js";
import {reviewPlan,wardPaymentRecap} from "../src/decision-feedback.js";
const p=DECISION_LADDER[6];
const move=(s,fn)=>{const a=actions(p,s).find(fn);assert.ok(a);const out=reduce(p,s,a);assert.ok(out.ok);return out.state;};
test("all seven trials have distinct curated first clues",()=>{
 assert.equal(new Set(DECISION_LADDER.map(p=>p.decision.clue)).size,7);
 assert.ok(DECISION_LADDER.every(p=>p.decision.clue.length>20));
});
test("plan check distinguishes a verified route from exhaustion and losing generic spending",()=>{
 let s=initial(p);assert.equal(reviewPlan(p,s).status,"solved");
 assert.equal(reviewPlan(p,s,{maxStates:1}).status,"inconclusive");
 s=move(s,a=>a.type==="tap"&&a.id==="blue");s=move(s,a=>a.type==="cast");
 assert.equal(reviewPlan(p,s).status,"unsolvable");
 assert.match(reviewPlan(p,s).text,/Undo/);
});
test("completion recap describes actual payment, not an unrelated reference",()=>{
 let s=initial(p),history=[];
 for(const id of ["red","blue"]){
  s=move(s,a=>a.type==="tap"&&a.id===id);
  const a=actions(p,s).find(a=>a.type==="cast");assert.ok(a);
  history.push({state:s,action:a,automatic:id==="red"});
  s=reduce(p,s,a).state;
 }
 assert.equal(reviewPlan(p,s).status,"complete");
 assert.deepEqual(wardPaymentRecap(p,history),["First generic seal: 1 red (automatic)","Final blue seal: 1 blue (manual)"]);
});
