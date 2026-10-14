import test from "node:test";
import assert from "node:assert/strict";
import {newRun,start} from "../src/engine.js";
import {PREY,spawnPrey,decidePrey,advancePrey,reachableArea} from "../src/enemies.js";
test("all prey and two miniboss types have distinct defined AI identities",()=>{
 assert.deepEqual(Object.keys(PREY),["skitter","runner","stalker","weaver"]);
 assert.ok(PREY.stalker.period>0&&PREY.weaver.period>0);
 assert.notEqual(PREY.skitter.accent,PREY.runner.accent);
});
test("a normal enemy spawns well clear of head and stays off the moving body",()=>{
 const run=newRun({seed:76});
 const enemy=run.enemies[0];
 assert.ok(enemy);
 assert.ok(!run.body.some(p=>p.x===enemy.pos.x&&p.y===enemy.pos.y));
 assert.ok(reachableArea(run,enemy.pos,enemy.id)>10);
});
test("AI chooses one of the three non-reversing moves and never teleports",()=>{
 const run=newRun({seed:7});
 const e=run.enemies[0],first={...e.pos};
 const d=decidePrey(run,e);
 assert.ok(d);
 assert.ok(Math.abs(d.dest.x-first.x)+Math.abs(d.dest.y-first.y)===1);
 e.clock=e.period-1;const n=advancePrey(run,e);
 assert.equal(n.type,"moved");assert.deepEqual(e.pos,d.dest);
});
test("fully surrounded prey must collide rather than stand still",()=>{
 const run=newRun({seed:13});start(run);
 const e={id:60,pos:{x:6,y:6},dir:"right",period:1,clock:0,moves:0,kind:"skitter"};
 run.body=[{x:10,y:10},{x:7,y:6},{x:6,y:5},{x:6,y:7},{x:5,y:6}];
 run.enemies=[e];
 const p=advancePrey(run,e);
 assert.equal(p.type,"captured");
});

test("Alpha 0.3.1 halves both enemy speeds without changing player speed",()=>{
 const run=newRun({seed:111});
 assert.equal(PREY.skitter.period,4,"Skitter should move once per four player simulation steps");
 assert.equal(PREY.runner.period,4,"Runner should move once per four player simulation steps");
 const initial=run.enemies[0];
 assert.equal(initial.period,4);
 const runner=spawnPrey(run,"runner");
 assert.ok(runner);
 assert.equal(runner.period,4);
});
test("newly spawned prey wait three beats and move exactly on fourth beat",()=>{
 const run=newRun({seed:7});
 const enemy=run.enemies[0];
 const initial={...enemy.pos};
 for(let i=1;i<4;i++){
  const result=advancePrey(run,enemy);
  assert.equal(result.type,"waiting");
  assert.deepEqual(enemy.pos,initial,"prey moved before fourth simulation step");
  assert.equal(enemy.moves,0);
 }
 const result=advancePrey(run,enemy);
 assert.equal(result.type,"moved");
 assert.equal(enemy.moves,1);
 assert.equal(Math.abs(enemy.pos.x-initial.x)+Math.abs(enemy.pos.y-initial.y),1);
});
