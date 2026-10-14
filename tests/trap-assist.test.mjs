import test from "node:test";
import assert from "node:assert/strict";
import {newRun} from "../src/engine.js";
import {trapSignal,drawTrapHints} from "../src/trap-assist.js";
function scenario(){
 const run=newRun({seed:5});
 run.body=[{x:10,y:10},{x:5,y:4},{x:6,y:5}];
 const enemy={id:7,kind:"skitter",pos:{x:5,y:5},dir:"right",period:4};
 run.enemies=[enemy];
 return {run,enemy};
}
test("training hints reveal a one-exit ordinary trap, not normal open spaces",()=>{
 const {run,enemy}=scenario();
 assert.deepEqual(trapSignal(run,enemy),{exits:1,escape:"down"});
 run.body.push({x:5,y:6});
 assert.deepEqual(trapSignal(run,enemy),{exits:0,escape:null});
});
test("bosses, Brood Trail and completed training show no hints",()=>{
 const {run,enemy}=scenario();
 run.evolutionsChosen=3;assert.equal(trapSignal(run,enemy),null);
 run.evolutionsChosen=0;run.encounter={kind:"warden"};
 assert.equal(trapSignal(run,enemy),null);
 run.encounter=null;enemy.kind="warden";assert.equal(trapSignal(run,enemy),null);
 run.mode="classic";enemy.kind="skitter";assert.equal(trapSignal(run,enemy),null);
});
test("amber hint is pixel crisp and does not mutate the seeded simulation",()=>{
 const {run}=scenario(),strokes=[],rects=[];
 const ctx={save(){},restore(){},setLineDash(){},lineWidth:0,strokeStyle:"",fillStyle:"",
  strokeRect(...p){strokes.push(p)},fillRect(...p){rects.push(p)}};
 const before={body:JSON.stringify(run.body),enemy:JSON.stringify(run.enemies[0]),ticks:run.runTicks};
 drawTrapHints(ctx,run,20);
 assert.deepEqual(strokes,[[101,101,18,18]]);
 assert.ok(rects.some(r=>r.join(",")==="109,116,3,3"));
 assert.equal(run.runTicks,before.ticks);
 assert.equal(JSON.stringify(run.body),before.body);
 assert.equal(JSON.stringify(run.enemies[0]),before.enemy);
});
