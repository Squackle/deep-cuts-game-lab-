import test from "node:test";
import assert from "node:assert/strict";
import {newRun,start} from "../src/engine.js";
import {PREY,ORDINARY_PREY,spawnPrey,decidePrey,advancePrey,reachableArea} from "../src/enemies.js";
test("all prey and two miniboss types have distinct defined AI identities",()=>{
 assert.deepEqual(Object.keys(PREY),["warden","guardian","skitter","runner","stalker","weaver"]);
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
 const run=newRun({seed:7});run.openingGraceMs=0;
 const e=run.enemies[0],first={...e.pos};
 const d=decidePrey(run,e);
 assert.ok(d);
 assert.ok(Math.abs(d.dest.x-first.x)+Math.abs(d.dest.y-first.y)===1);
 e.clock=e.period-1;const n=advancePrey(run,e);
 assert.equal(n.type,"moved");
 assert.equal(Math.abs(e.pos.x-first.x)+Math.abs(e.pos.y-first.y),1);
 assert.ok(e.dir!=="left"||e.pos.x===first.x-1,"the chosen move must match the heading");
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
 const run=newRun({seed:7});run.openingGraceMs=0;
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

test("ordinary prey are deliberately short-sighted while a boss anticipates a dead end",()=>{
 assert.deepEqual(ORDINARY_PREY,["skitter","runner"]);
 // A forward one-cell pocket is safe for this beat, but a dead end on the
 // following beat. Side routes remain open; only strategic bosses notice.
 const run={cols:12,rows:12,
  body:[{x:10,y:10},{x:7,y:5},{x:6,y:4},{x:6,y:6}],
  enemies:[],terrain:[],random:()=>0};
 const enemy={id:9,pos:{x:5,y:5},dir:"right",clock:0,period:4,moves:0};
 // A flood fill can backtrack through (5,5), but enemy reversal is banned.
 assert.ok(reachableArea(run,{x:6,y:5},9)>1);
 assert.deepEqual(run.body.slice(1),[{x:7,y:5},{x:6,y:4},{x:6,y:6}]);
 for(const kind of ORDINARY_PREY){
  const chosen=decidePrey(run,{...enemy,kind});
  assert.equal(chosen.dir,"right",kind+" should favor an obvious corridor instead of pathfinding");
 }
 for(const kind of ["stalker","weaver","warden","guardian"]){
  const chosen=decidePrey(run,{...enemy,kind});
  assert.notEqual(chosen.dir,"right",kind+" should avoid the dead-end pocket");
 }
});
test("regular prey can turn on a whim, but never reverse or enter an occupied cell",()=>{
 const run={cols:12,rows:12,body:[{x:10,y:10}],enemies:[],terrain:[],random:()=>.99};
 for(const kind of ORDINARY_PREY){
  const enemy={id:1,pos:{x:5,y:5},dir:"right",kind};
  const chosen=decidePrey(run,enemy);
  assert.ok(["up","down"].includes(chosen.dir));
  assert.ok(Math.abs(chosen.dest.x-5)+Math.abs(chosen.dest.y-5)===1);
 }
});

test("natural prey move every seven beats during opening grace, then every four",()=>{
 const run=newRun({seed:7});
 const enemy=run.enemies[0];assert.equal(enemy.period,4);
 for(let i=1;i<7;i++)assert.equal(advancePrey(run,enemy).type,"waiting");
 assert.equal(advancePrey(run,enemy).type,"moved");
 run.openingGraceMs=0;
 for(let i=1;i<4;i++)assert.equal(advancePrey(run,enemy).type,"waiting");
 assert.equal(advancePrey(run,enemy).type,"moved");
});
test("bosses retain their own movement period during ordinary prey grace",()=>{
 const run=newRun({seed:7});
 const enemy={id:35,kind:"warden",pos:{x:5,y:5},dir:"right",period:4,clock:0};
 run.enemies=[enemy];
 for(let i=1;i<4;i++)assert.equal(advancePrey(run,enemy).type,"waiting");
 assert.equal(advancePrey(run,enemy).type,"moved");
});
