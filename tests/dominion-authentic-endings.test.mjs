import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {newRun,start,step,turn,chooseMutation,RULES_VERSION,ENDINGS,isPerfectClear} from "../src/engine.js";
import {spawnMiniboss} from "../src/miniboss.js";
import {createLairRun,completeLairRun} from "../src/lair.js";
import {replayScore} from "../src/replay-verification.js";

const path=(w=8,h=8)=>{
 const cells=[];
 for(let y=0;y<h;y++){
  const xs=Array.from({length:w},(_,x)=>x);
  if(y%2)xs.reverse();
  for(const x of xs)cells.push({x,y});
 }
 return cells;
};
function nearPerfectRun({rock=null,temporary=null,energy=0}={}){
 const run=newRun({cols:8,rows:8,seed:29,mode:"classic"});start(run);
 const sequence=path(),last=sequence.at(-1);
 // The tail-to-head path is physically contiguous, not just injected coverage.
 const exclusions=p=>(p.x===last.x&&p.y===last.y)||
  (rock&&p.x===rock.x&&p.y===rock.y)||
  (temporary&&p.x===temporary.x&&p.y===temporary.y);
 run.body=sequence.filter(p=>!exclusions(p)).reverse();
 const head=run.body[0];
 assert.equal(Math.abs(head.x-last.x)+Math.abs(head.y-last.y),1);
 run.food={...last};run.direction=last.x<head.x?"left":"right";
 run.turnQueue=[];run.terrain=[
  ...(rock?[{kind:"rock",pos:rock,warningMs:0,lifeMs:null}]:[]),
  ...(temporary?[{kind:"rift",pos:temporary,warningMs:0,lifeMs:5000}]:[])
 ];
 run.enemies=[];run.growthDebt=1;run.energy=energy;
 return run;
}
function trappedBroodmother({lair=false,phase=3,energy=0}={}){
 const run=lair?createLairRun("broodmother"):newRun({seed:101,mode:"hunt"});
 start(run);
 if(!lair)run.evolutionsChosen=12;
 run.enemies=[];run.encounter=null;run.food=null;run.terrain=[];
 assert.equal(spawnMiniboss(run,"broodmother"),true);
 run.encounter.introMs=0;run.encounter.phase=phase;
 run.encounter.abilityMs=0;
 run.body=[{x:9,y:10},{x:8,y:10},{x:6,y:6},{x:5,y:5},{x:5,y:7},{x:10,y:10},{x:11,y:10}];
 run.direction="down";run.turnQueue=[];run.mercy=0;
 run.enemies=[{id:120,kind:"broodmother",pos:{x:5,y:6},dir:"right",period:1,clock:0,moves:0}];
 run.enemySerial=120;run.energy=energy;
 return run;
}
const snapshot=r=>({
 status:r.status,outcome:r.outcome,score:r.score,energy:r.energy,
 ticks:r.runTicks,body:r.body.map(p=>({...p})),eventSerial:r.eventSerial,
 bossWins:r.bossWins,kills:r.kills,draftCount:r.draftCount
});
test("Dominion 2A introduces a versioned, distinct deterministic ending contract",()=>{
 assert.equal(RULES_VERSION,"hive-1.5.4");
 assert.deepEqual(Object.values(ENDINGS),
  ["perfect_clear","broodmother_defeated","step_limit","death","lair_practice"]);
 const r=newRun({seed:4});
 assert.equal(r.outcome,null);assert.equal(isPerfectClear(r),false);
});
test("True final Brood Trail orb triggers authentic perfect clear with exactly one win event",()=>{
 const r=nearPerfectRun({energy:4}),beforeDraft=r.draftCount,oldScore=r.score;
 assert.equal(r.body.length,63);assert.equal(isPerfectClear(r),false);
 step(r);
 assert.equal(r.status,"won");assert.equal(r.outcome,ENDINGS.PERFECT_CLEAR);
 assert.equal(r.body.length,64);assert.equal(isPerfectClear(r),true);
 assert.equal(r.score,oldScore+100);assert.equal(r.brood,1);
 assert.equal(r.runTicks,1);assert.equal(r.draftCount,beforeDraft);
 assert.equal(r.draftOptions.length,0);assert.equal(r.event.type,"victory");
 assert.equal(r.event.outcome,"perfect_clear");
 const frozen=snapshot(r);
 step(r);start(r);assert.deepEqual(snapshot(r),frozen);
 assert.equal(turn(r,"up"),false);assert.equal(chooseMutation(r,"G"),false);
});
test("Permanent rock is outside the playable arena, but temporary rift cannot fake an arena-fill victory",()=>{
 const rock=nearPerfectRun({rock:{x:0,y:0}});assert.equal(rock.body.length,62);
 step(rock);assert.equal(rock.status,"won");assert.equal(rock.outcome,ENDINGS.PERFECT_CLEAR);
 const temporary=nearPerfectRun({temporary:{x:0,y:0}});
 step(temporary);
 assert.equal(isPerfectClear(temporary),false);
 assert.equal(temporary.status,"running");
 assert.equal(temporary.outcome,null);
 assert.equal(temporary.food,null,"the only remaining free tile is reserved by a temporary rift");
});
test("6,000 movement steps end the expedition without lying about a perfect clear",()=>{
 const r=newRun({seed:102,mode:"classic"});start(r);
 r.runTicks=6000;
 const previous=snapshot(r);step(r);
 assert.equal(r.status,"over");assert.equal(r.outcome,ENDINGS.STEP_LIMIT);
 assert.match(r.endReason,/6,000/);
 assert.equal(r.event.type,"run-limit");assert.equal(r.event.outcome,"step_limit");
 assert.equal(r.score,previous.score);
 assert.deepEqual(r.body,previous.body);
 const frozen=snapshot(r);step(r);assert.deepEqual(snapshot(r),frozen);
});
test("A real final Arcade Broodmother capture awards one final prize and ends immediately",()=>{
 const r=trappedBroodmother({energy:4});
 const draftCount=r.draftCount,eventBefore=r.eventSerial;
 step(r);
 assert.equal(r.status,"won");assert.equal(r.outcome,ENDINGS.BROODMOTHER_DEFEATED);
 assert.equal(r.score,1500);assert.equal(r.energy,12);
 assert.equal(r.kills,1);assert.equal(r.bossWins,1);
 assert.equal(r.encounter,null);assert.equal(r.enemies.length,0);
 assert.equal(r.queuedEncounter,null);assert.deepEqual(r.draftOptions,[]);
 assert.equal(r.draftCount,draftCount,"final boss must not open a new mutation draft");
 assert.equal(r.event.type,"victory");assert.equal(r.event.kind,"broodmother");
 assert.equal(r.event.outcome,"broodmother_defeated");
 assert.equal(r.lastEncounter.kind,"broodmother");
 assert.equal(r.eventSerial,eventBefore+2,"one reward event plus one terminal event");
 const frozen=snapshot(r);step(r);assert.deepEqual(snapshot(r),frozen);
 assert.equal(turn(r,"up"),false);
});
test("Earlier Broodmother phases and the other bosses do not prematurely finish Arcade",()=>{
 const early=trappedBroodmother({phase:2});
 step(early);
 assert.equal(early.outcome,null);
 assert.equal(early.status,"running");
 assert.equal(early.encounter.phase,3);
 const phaseOne=trappedBroodmother({phase:1});
 step(phaseOne);
 assert.equal(phaseOne.outcome,null);
 assert.equal(phaseOne.encounter.phase,2);
 const notMilestone=trappedBroodmother();
 notMilestone.evolutionsChosen=2;
 step(notMilestone);
 assert.equal(notMilestone.outcome,null);
 assert.equal(notMilestone.status,"draft");
});
test("Lair practice stays unranked and cannot masquerade as a real Hunt victory",()=>{
 const r=trappedBroodmother({lair:true,energy:4});
 step(r);
 assert.equal(r.outcome,null,"Lair must not trigger the Arcade victory event");
 assert.equal(r.lastEncounter?.type,"defeat");
 assert.equal(completeLairRun(r),true);
 assert.equal(r.status,"won");assert.equal(r.outcome,ENDINGS.LAIR_PRACTICE);
 assert.equal(completeLairRun(r),false);
});
test("Fatal collision emits a distinct death outcome, not a win",()=>{
 const r=newRun({seed:33,mode:"hunt"});start(r);
 r.mercy=0;r.effects.shield=0;r.effects.molt=0;
 r.body=[{x:r.cols-1,y:12},{x:r.cols-2,y:12},{x:r.cols-3,y:12}];
 r.direction="right";r.turnQueue=[];step(r);
 assert.equal(r.status,"over");assert.equal(r.outcome,ENDINGS.DEATH);
 assert.equal(r.event.type,"death");assert.equal(r.event.outcome,"death");
 assert.equal(r.score,0);
});
test("Server-style deterministic replay validates terminal result types and rejects forged wins",()=>{
 const real=newRun({seed:103,mode:"hunt"});start(real);
 for(let i=0;i<1000&&real.status==="running";i++)step(real);
 assert.equal(real.status,"over");assert.equal(real.outcome,ENDINGS.DEATH);
 const expected={score:real.score,kills:real.kills,evolutionsChosen:real.evolutionsChosen,
  ticks:real.runTicks,outcome:real.outcome};
 const correct=replayScore(103,[],expected);
 assert.equal(correct.ok,true,JSON.stringify(correct));
 assert.equal(correct.outcome,ENDINGS.DEATH);
 assert.equal(replayScore(103,[],{...expected,outcome:ENDINGS.BROODMOTHER_DEFEATED}).ok,false);
 assert.equal(replayScore(103,[],{...expected,outcome:ENDINGS.PERFECT_CLEAR}).ok,false);
 assert.equal(replayScore(103,[],{...expected,score:expected.score+1500}).ok,false);
});
test("Real victory title/timeout semantics are separate from future cinematic art and developer cheats",()=>{
 const html=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 assert.match(html,/outcome==="broodmother_defeated"\?"THE HIVE REIGNS!"/);
 assert.match(html,/outcome==="step_limit"\?"EXPEDITION ENDED"/);
 const engine=readFileSync(new URL("../src/engine.js",import.meta.url),"utf8");
 assert.doesNotMatch(engine,/DIRECTOR_ONLY|director\/mode|super-orb|invulnerable/);
});
