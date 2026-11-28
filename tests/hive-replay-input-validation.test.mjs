import test from "node:test";
import assert from "node:assert/strict";
import {newRun,start,step,RULES_VERSION} from "../src/engine.js";
import {replayScore} from "../src/replay-verification.js";
test("local replay rejects missing or invalid seed and mode without nondeterminism or throw",()=>{
 const seed=7919,r=start(newRun({seed,mode:"classic"}));
 for(let i=0;i<1000&&r.status==="running";i++)step(r);
 assert.equal(r.status,"over");
 const expected={ticks:r.runTicks,score:r.score,kills:r.kills,evolutionsChosen:r.evolutionsChosen,outcome:r.outcome};
 assert.equal(replayScore(seed,[],expected,"classic").ok,true);
 for(const invalid of [undefined,null,NaN,Infinity,"7919",1.5,Number.MAX_SAFE_INTEGER+1]){
  assert.equal(replayScore(invalid,[],expected,"classic").ok,false);
 }
 for(const mode of ["practice","unknown",null,{},[]])
  assert.equal(replayScore(seed,[],expected,mode).ok,false);
 const {outcome,...legacy}=expected;
 assert.equal(replayScore(seed,[],legacy,"classic").ok,true);
 assert.equal(RULES_VERSION,"hive-1.5.4");
});
