import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LEVELS} from "../src/levels.js";
import {LEARN_LEVELS} from "../src/expanded-learn.js";
import {BONUS_TRIALS,BONUS_TRIAL_STORAGE_KEY,normalizeBonusBests,betterBonusScore} from "../src/bonus-trials.js";
import {initial,actions,reduce,validate,completed,medal} from "../src/engine.js";
import {chooseAutomaticCast} from "../src/auto-cast.js";
import {solve,replay} from "../src/solver.js";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
function apply(level,state,pred){
 const action=actions(level,state).find(pred);
 assert.ok(action,"No legal move: "+level.id+" turn "+state.turn+" stage "+state.stage);
 const r=reduce(level,state,action);assert.ok(r.ok,r.error);
 return r.state;
}
test("bonus trials are two distinct proven scored side vaults, not 501st and 502nd campaign levels",{timeout:30000},()=>{
 assert.equal(BONUS_TRIALS.length,2);
 assert.equal(LEVELS.length,500);
 assert.equal(LEARN_LEVELS.length,28);
 assert.deepEqual(BONUS_TRIALS.map(x=>x.id),["mh-bonus-01","mh-bonus-02"]);
 const campaignIds=new Set(LEVELS.map(x=>x.id));
 for(const level of BONUS_TRIALS){
  assert.ok(!campaignIds.has(level.id));
  assert.equal(validate(level),true);
  assert.equal(level.stages.length,2);
  const route=solve(level,{maxStates:55000});
  assert.equal(route.status,"solved",level.id+" "+JSON.stringify(route));
  assert.ok(replay(level,route.actions).ok,level.id);
  assert.ok(route.turn<=level.turnLimit);
 }
});
test("Borrowed Gate forces Fellwar WHITE for ward one and Talisman BLACK for ward two",()=>{
 const level=BONUS_TRIALS[0];let s=initial(level);
 s=apply(level,s,a=>a.type==="activate"&&a.id==="f0"&&a.mode==="fellwar-W");
 s=apply(level,s,a=>a.type==="tap"&&a.id==="f1"&&a.color==="U");
 assert.ok(chooseAutomaticCast(level,s));
 s=apply(level,s,a=>a.type==="cast");
 s=apply(level,s,a=>a.type==="activate"&&a.id==="f2"&&a.mode==="talisman-B");
 assert.equal(s.life,1);
 s=apply(level,s,a=>a.type==="tap"&&a.id==="f3"&&a.color==="C");
 s=apply(level,s,a=>a.type==="cast");
 assert.ok(completed(level,s));assert.equal(s.turn,1);
});
test("Talisman's Two Turns uses safe C first, dangerous B second, and no phase mana carrying",()=>{
 const level=BONUS_TRIALS[1];let s=initial(level);
 s=apply(level,s,a=>a.type==="activate"&&a.id==="f0"&&a.mode==="fellwar-R");
 s=apply(level,s,a=>a.type==="activate"&&a.id==="f1"&&a.mode==="talisman-C");
 assert.equal(s.life,2);
 s=apply(level,s,a=>a.type==="cast");
 s=apply(level,s,a=>a.type==="end");
 assert.equal(s.turn,2);assert.equal(s.pool.R,0);assert.equal(s.pool.C,0);
 s=apply(level,s,a=>a.type==="activate"&&a.id==="f1"&&a.mode==="talisman-B");
 s=apply(level,s,a=>a.type==="tap"&&a.id==="f2"&&a.color==="U");
 s=apply(level,s,a=>a.type==="cast");
 assert.equal(s.life,1);assert.ok(completed(level,s));
});
test("bonus medals are validated and isolated from both historical and variety saves",()=>{
 assert.equal(BONUS_TRIAL_STORAGE_KEY,"dc-mana-heist-bonus-trials-v1");
 assert.deepEqual(normalizeBonusBests({v:0,bests:{}}),{});
 const best={turn:1,spentLife:1,actions:6,stars:3};
 assert.deepEqual(normalizeBonusBests({v:1,bests:{"mh-bonus-01":best,"mh-250":best}}),{"mh-bonus-01":best});
 assert.deepEqual(normalizeBonusBests({v:1,bests:{"mh-bonus-01":{...best,stars:5}}}),{});
 assert.ok(betterBonusScore({turn:1,spentLife:0,actions:8},best));
 assert.ok(!betterBonusScore({turn:2,spentLife:0,actions:3},best));
 const ui=read("src/main.js");
 assert.match(ui,/BONUS_TRIAL_STORAGE_KEY/);
 assert.match(ui,/persistBonusTrials/);
 assert.match(ui,/dc-mana-heist-landfall-v2/);
 assert.match(ui,/dc-mana-heist-variety-v1/);
 assert.match(ui,/if\(trialIndex!==null\)\{/);
 assert.match(ui,/bonus\.dataset\.trialIndex/);
 assert.match(ui,/score|stars|BONUS VAULT OPEN/);
});
