import test from "node:test";
import assert from "node:assert/strict";
import {newRun,start,pause,turn,step,progress,emptyTile,seededRandom,effectiveTickMs,chooseMutation,PLAYER_BASE_TICK_MS,PLAYER_MIN_TICK_MS,PLAYER_ACCELERATION_MS,RULES_VERSION,OPENING_GRACE_MS,orbInterval} from "../src/engine.js";

test("new seeded predator run starts with moving prey and scarce brood",()=>{
 const a=newRun({cols:18,rows:22,seed:48}),b=newRun({cols:18,rows:22,seed:48});
 assert.equal(a.status,"ready");assert.equal(a.food,null);
 assert.equal(a.enemies.length,1);
 assert.deepEqual(a.enemies,b.enemies);
 assert.ok(a.orbIn>=70&&a.orbIn<=105);
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
 assert.equal(run.food,null);assert.ok(run.orbIn>=70&&run.orbIn<105);
});
test("pausing/drafting stops movement, AI clocks and orb countdowns",()=>{
 const run=newRun({seed:4});start(run);pause(run);
 const pos={...run.body[0]},cl=run.enemies[0].clock,orb=run.orbIn;
 step(run);
 assert.deepEqual(run.body[0],pos);assert.equal(run.enemies[0].clock,cl);assert.equal(run.orbIn,orb);
 run.status="draft";step(run);assert.deepEqual(run.body[0],pos);
});
test("stepping onto an enemy kills the player, without crediting a capture",()=>{
 const run=newRun({seed:4});start(run);run.mercy=0;
 const head=run.body[0];run.enemies=[{id:2,kind:"skitter",pos:{x:head.x+1,y:head.y},dir:"up",period:2,clock:0}];
 step(run);assert.equal(run.status,"over");assert.equal(run.kills,0);
 assert.match(run.endReason,/hunter/i);
});
test("a white shield can avert dangerous interception",()=>{
 const run=newRun({seed:4});start(run);run.mercy=0;
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

test("Alpha 0.4.1 calms the player pace around ten percent while retaining relative evolution scaling",()=>{
 assert.equal(RULES_VERSION,"hive-1.2");
 assert.equal(PLAYER_BASE_TICK_MS,150);
 assert.equal(PLAYER_MIN_TICK_MS,105);
 assert.equal(PLAYER_ACCELERATION_MS,4);
 const run=newRun({seed:123});
 assert.equal(run.tickMs,150);
 assert.equal(effectiveTickMs(run),150);
 assert.ok(135/150<=.91&&135/150>=.89,"starting speed should be about 10% slower");
 start(run);
 for(let i=1;i<=32;i++){
  run.status="draft";run.draftOptions=["W","G","B"];
  assert.ok(chooseMutation(run,"W"));
  assert.equal(run.tickMs,Math.max(105,150-Math.floor(i/2)*4));
 }
 assert.ok(run.tickMs>=105,"high-level play remains manageable");
 assert.ok(94/105>=.89&&94/105<=.91,"late-game cap should also be about 10% slower");
});
test("a slower baseline preserves active WUBRG movement modifiers and deterministic replay",()=>{
 const a=newRun({seed:61}),b=newRun({seed:61});
 start(a);start(b);
 for(let tick=0;tick<5;tick++){
  if(tick===1){assert.equal(turn(a,"up"),true);assert.equal(turn(b,"up"),true)}
  step(a);step(b);
  assert.equal(a.runTicks,b.runTicks);
  assert.deepEqual(a.body,b.body);
  assert.equal(a.score,b.score);
 }
 const base=effectiveTickMs(a);
 a.effects.blueTicks=4;
 assert.ok(effectiveTickMs(a)>base,"Blue still slows player");
 a.effects.blueTicks=0;a.effects.redTicks=4;
 assert.ok(effectiveTickMs(a)<base,"Red still speeds player");
});

test("a single Brood Instinct recovery saves an ordinary prey collision only once",()=>{
 const run=newRun({seed:47});start(run);
 assert.equal(run.mercy,1);
 const first={x:run.body[0].x+1,y:run.body[0].y};
 run.enemies=[{id:20,kind:"skitter",pos:first,dir:"up",period:4,clock:0}];
 step(run);
 assert.equal(run.status,"running");
 assert.equal(run.mercy,0);assert.equal(run.saves,1);
 assert.equal(run.event.name,"Brood Instinct");
 const h=run.body[0],d={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[run.direction];
 run.enemies=[{id:21,kind:"runner",pos:{x:h.x+d[0],y:h.y+d[1]},dir:"up",period:4,clock:0}];
 step(run);
 assert.equal(run.status,"over");assert.match(run.endReason,/hunter/i);
});
test("Brood Instinct does not protect against boss contact or arena walls",()=>{
 const boss=newRun({seed:88});start(boss);
 boss.enemies=[{id:3,kind:"warden",pos:{x:boss.body[0].x+1,y:boss.body[0].y},dir:"up",period:4,clock:0}];
 step(boss);assert.equal(boss.status,"over");assert.equal(boss.mercy,1);
 const wall=newRun({seed:42});start(wall);
 wall.body=[{x:17,y:11},{x:16,y:11},{x:15,y:11}];wall.direction="right";
 step(wall);assert.equal(wall.status,"over");assert.equal(wall.mercy,1);
});
test("free prey dodge conserves a mutation shield for the actual boss",()=>{
 const run=newRun({seed:51});start(run);run.effects.shield=1;
 run.enemies=[{id:4,kind:"skitter",pos:{x:run.body[0].x+1,y:run.body[0].y},dir:"up",period:4,clock:0}];
 step(run);assert.equal(run.status,"running");assert.equal(run.mercy,0);
 assert.equal(run.effects.shield,1);
});
test("nine seconds of grace decrement only during active Predator Hunt play",()=>{
 const run=newRun({seed:41});start(run);
 assert.equal(run.openingGraceMs,OPENING_GRACE_MS);
 run.enemies=[];run.respawnIn=300;
 step(run);assert.equal(run.openingGraceMs,OPENING_GRACE_MS-150);
 pause(run);step(run);assert.equal(run.openingGraceMs,OPENING_GRACE_MS-150);
 const classic=newRun({seed:41,mode:"classic"});assert.equal(classic.openingGraceMs,0);
 assert.equal(classic.mercy,0);
});
test("the first two evolutions have one regular enemy, then at most two",()=>{
 for(const ev of [0,1,2,3]){
  const run=newRun({seed:60});start(run);
  run.evolutionsChosen=ev;run.enemies=[];run.respawnIn=0;
  run.body=[{x:9,y:10},{x:8,y:10},{x:7,y:10}];run.direction="right";
  step(run);assert.equal(run.enemies.length,1,"first prey should spawn");
  run.respawnIn=0;step(run);
  assert.equal(run.enemies.length,ev>=3?2:1,"stage "+ev);
 }
});
test("early hunt orbs are more frequent; late and classic keep prior cadence",()=>{
 const early=newRun({seed:12}),late=newRun({seed:12}),classic=newRun({seed:12,mode:"classic"});
 const short=orbInterval(early);
 assert.ok(short>=70&&short<105);
 late.evolutionsChosen=2;
 const regular=orbInterval(late);
 assert.ok(regular>=145&&regular<230);
 assert.ok(orbInterval(classic)>=145);
});
