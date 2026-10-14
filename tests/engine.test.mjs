import test from "node:test";
import assert from "node:assert/strict";
import {newRun,start,pause,turn,step,progress,emptyTile,seededRandom,effectiveTickMs,chooseMutation} from "../src/engine.js";

test("new seeded predator run starts with moving prey and scarce brood",()=>{
 const a=newRun({cols:18,rows:22,seed:48}),b=newRun({cols:18,rows:22,seed:48});
 assert.equal(a.status,"ready");assert.equal(a.food,null);
 assert.equal(a.enemies.length,1);
 assert.deepEqual(a.enemies,b.enemies);
 assert.ok(a.orbIn>=100);
 const e=a.enemies[0];assert.ok(Math.abs(e.pos.x-a.body[0].x)+Math.abs(e.pos.y-a.body[0].y)>=6);
});
test("player moves using deterministic queue; reversing is blocked",()=>{
 const run=newRun({seed:11});const head={...run.body[0]};step(run);
 assert.deepEqual(run.body[0],head);
 start(run);assert.equal(turn(run,"left"),false);
 assert.equal(turn(run,"up"),true);
 assert.equal(turn(run,"left"),true);
 step(run);step(run);
 assert.deepEqual(run.body[0],{x:head.x-1,y:head.y-1});
 assert.equal(run.runTicks,2);
});
test("enemy movement is continuous at a fixed interval and obeys board boundaries",()=>{
 const run=newRun({seed:16});start(run);
 const enemy=run.enemies[0];const from={...enemy.pos};
 enemy.period=1;run.direction="right";run.body=[{x:5,y:6},{x:4,y:6},{x:3,y:6}];
 run.enemies=[{...enemy,pos:{x:11,y:13},dir:"up",clock:0}];
 step(run);const pos=run.enemies[0].pos;
 assert.notDeepEqual(pos,{x:11,y:13});
 assert.ok(pos.x>=0&&pos.y>=0&&pos.x<18&&pos.y<22);
});
test("enemy capture is credited exactly once, awards 3 EV and growth",()=>{
 const run=newRun({seed:3});start(run);
 run.body=[{x:9,y:10},{x:8,y:10},{x:6,y:6},{x:5,y:5},{x:5,y:7},{x:10,y:10}];
 run.direction="down";run.enemies=[{id:20,kind:"skitter",pos:{x:5,y:6},dir:"right",period:1,clock:0,moves:0}];
 run.enemySerial=20;const before=run.score;
 step(run);
 assert.equal(run.kills,1);
 assert.equal(run.energy,3);
 assert.equal(run.score,before+300);
 assert.equal(run.enemies.length,0);
 assert.ok(run.growthDebt>0);
 const energy=run.energy;step(run);assert.equal(run.energy,energy);
});
test("two normal captures unlock one mutation at 5 EV and carry remainder",()=>{
 const run=newRun({seed:3});start(run);
 for(let i=0;i<2;i++){
  run.body=[{x:9,y:10},{x:8,y:10},{x:6,y:6},{x:5,y:5},{x:5,y:7},{x:10,y:10}];
  run.direction="down";run.turnQueue=[];
  run.enemies=[{id:20+i,kind:"skitter",pos:{x:5,y:6},dir:"right",period:1,clock:0,moves:0}];
  step(run);
 }
 assert.equal(run.kills,2);assert.equal(run.energy,1);
 assert.equal(run.status,"draft");assert.equal(run.draftOptions.length,3);
 assert.equal(chooseMutation(run,run.draftOptions[0]),true);
 assert.equal(run.evolutionsChosen,1);assert.equal(run.stage,2);
});
test("rare orb rewards 1 EV, and orbs do not instantly respawn",()=>{
 const run=newRun({seed:31});start(run);
 run.enemies=[];run.respawnIn=20;
 run.food={x:run.body[0].x+1,y:run.body[0].y};
 step(run);
 assert.equal(run.energy,1);assert.equal(run.brood,1);assert.equal(run.score,100);
 assert.equal(run.food,null);assert.ok(run.orbIn>=145);
});
test("pausing/drafting stops movement, AI clocks and orb countdowns",()=>{
 const run=newRun({seed:4});start(run);pause(run);
 const pos={...run.body[0]},cl=run.enemies[0].clock,orb=run.orbIn;
 step(run);
 assert.deepEqual(run.body[0],pos);assert.equal(run.enemies[0].clock,cl);assert.equal(run.orbIn,orb);
 run.status="draft";step(run);assert.deepEqual(run.body[0],pos);
});
test("stepping onto an enemy kills the player, without crediting a capture",()=>{
 const run=newRun({seed:4});start(run);
 const head=run.body[0];run.enemies=[{id:2,kind:"skitter",pos:{x:head.x+1,y:head.y},dir:"up",period:2,clock:0}];
 step(run);assert.equal(run.status,"over");assert.equal(run.kills,0);
 assert.match(run.endReason,/hunter/i);
});
test("a white shield can avert dangerous interception",()=>{
 const run=newRun({seed:4});start(run);
 run.effects.shield=1;const head=run.body[0];
 run.enemies=[{id:2,kind:"skitter",pos:{x:head.x+1,y:head.y},dir:"up",period:2,clock:0}];
 step(run);
 assert.equal(run.status,"running");assert.equal(run.effects.shield,0);assert.equal(run.saves,1);
});
test("regular death after wall crossing still terminates run",()=>{
 const run=newRun({seed:88});start(run);
 run.body=[{x:17,y:11},{x:16,y:11},{x:15,y:11}];run.direction="right";
 run.effects.shield=0;run.effects.molt=0;
 step(run);assert.equal(run.status,"over");assert.match(run.endReason,/wall/i);
});
test("seeded random source stable and empty tile never overlaps body",()=>{
 const a=seededRandom(123),b=seededRandom(123);
 assert.deepEqual(Array.from({length:10},()=>a()),Array.from({length:10},()=>b()));
 const tile=emptyTile([{x:0,y:0},{x:1,y:0}],2,2,()=>0);
 assert.deepEqual(tile,{x:0,y:1});
});
test("red and blue change effective player speed but not WUBRG mutation identity",()=>{
 const run=newRun({seed:21});const base=effectiveTickMs(run);
 run.effects.blueTicks=28;assert.ok(effectiveTickMs(run)>base);
 run.effects.blueTicks=0;run.effects.redTicks=24;assert.ok(effectiveTickMs(run)<base);
 assert.equal(progress(run).untilNext,5);
});
