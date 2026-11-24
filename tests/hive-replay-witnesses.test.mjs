import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {newRun,start,step,turn,chooseMutation,RULES_VERSION,ENDINGS} from "../src/engine.js";
import {createLairRun,completeLairRun,LAIR_BOSSES} from "../src/lair.js";
import {replayScore} from "../src/replay-verification.js";
const fixture=JSON.parse(readFileSync(new URL("./fixtures/hive-run-witnesses.json",import.meta.url),"utf8"));
const directions={u:"up",r:"right",d:"down",l:"left"};
const expectedResult=r=>({score:r.score,kills:r.kills,evolutionsChosen:r.evolutionsChosen,ticks:r.runTicks,outcome:r.outcome});
const allBosses=LAIR_BOSSES.map(b=>b.id).sort();
test("witness fixture pins the rules version and contains all required independent runs",()=>{
 assert.equal(fixture.format,1);assert.equal(fixture.rules,RULES_VERSION);
 assert.equal(fixture.witnesses.length,10);
 assert.equal(new Set(fixture.witnesses.map(w=>w.label)).size,10);
 assert.deepEqual(fixture.witnesses.filter(w=>w.lairBoss).map(w=>w.lairBoss).sort(),allBosses);
 assert.equal(fixture.witnesses.filter(w=>w.expected.outcome===ENDINGS.BROODMOTHER_DEFEATED).length,2);
 assert.equal(fixture.witnesses.filter(w=>w.expected.outcome===ENDINGS.PERFECT_CLEAR).length,1);
});
for(const w of fixture.witnesses)test("fixed legal witness: "+w.label,t=>{
 assert.equal(w.rules,RULES_VERSION);assert.match(w.actions,/^[.urdlWUBRG]+$/);
 const r=start(w.lairBoss?createLairRun(w.lairBoss):newRun({mode:w.mode,seed:w.seed,cols:w.cols,rows:w.rows}));
 assert.equal(r.seed,w.seed);
 const events=[],defeated=new Set(),started=new Set(),abilities=new Set(),offers={W:0,U:0,B:0,R:0,G:0};
 let maxBody=r.body.length,previousEncounter=null;
 for(const action of w.actions){
  assert.ok(!["won","over"].includes(r.status),"witness cannot continue after termination");
  if(Object.hasOwn(offers,action)){
   assert.equal(r.status,"draft");
   for(const color of r.draftOptions)offers[color]++;
   events.push([r.runTicks,"choose",action]);
   assert.equal(chooseMutation(r,action),true);
  }else{
   assert.equal(r.status,"running");
   if(action!=="."){const d=directions[action];events.push([r.runTicks,"turn",d]);assert.equal(turn(r,d),true)}
   step(r);if(w.lairBoss)completeLairRun(r);
  }
  maxBody=Math.max(maxBody,r.body.length);
  if(r.encounter){started.add(r.encounter.kind);if(r.encounter.lastAbility?.type)abilities.add(r.encounter.kind+":"+r.encounter.lastAbility.type)}
  if(r.lastEncounter?.type==="defeat"&&r.lastEncounter!==previousEncounter){defeated.add(r.lastEncounter.kind);previousEncounter=r.lastEncounter}
 }
 assert.deepEqual(expectedResult(r),w.expected);
 assert.ok(["won","over"].includes(r.status));
 if(w.expected.outcome===ENDINGS.BROODMOTHER_DEFEATED){
  assert.deepEqual([...defeated].sort(),allBosses);
  assert.deepEqual([...started].sort(),allBosses);
  assert.equal(r.bossWins,3);assert.equal(r.minibossWins,3);assert.equal(r.body.length,7);
 }
 if(w.lairBoss)assert.equal(r.lastEncounter.kind,w.lairBoss);
 if(w.expected.outcome===ENDINGS.PERFECT_CLEAR){
  const rocks=r.terrain.filter(t=>t.kind==="rock"&&t.lifeMs===null).map(t=>t.pos.x+","+t.pos.y);
  assert.equal(new Set([...r.body.map(p=>p.x+","+p.y),...rocks]).size,r.cols*r.rows);
 }
 if(!w.lairBoss&&w.cols===18&&w.rows===22){
  const verified=replayScore(w.seed,events,w.expected,w.mode);
  assert.equal(verified.ok,true,JSON.stringify(verified));
  assert.equal(replayScore(w.seed,events,{...w.expected,score:w.expected.score+1},w.mode).ok,false);
  assert.equal(replayScore(w.seed,events,{...w.expected,ticks:w.expected.ticks+1},w.mode).ok,false);
  const other=w.expected.outcome===ENDINGS.DEATH?ENDINGS.PERFECT_CLEAR:ENDINGS.DEATH;
  assert.equal(replayScore(w.seed,events,{...w.expected,outcome:other},w.mode).ok,false);
 }
 const before=JSON.stringify(r);step(r);assert.equal(JSON.stringify(r),before);
 t.diagnostic(JSON.stringify({label:w.label,maxBody,defeated:[...defeated],abilities:[...abilities],offers,selected:r.mutations,saves:r.saves,outcome:r.outcome}));
});
