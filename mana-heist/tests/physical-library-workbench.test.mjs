import test from "node:test";import assert from "node:assert/strict";
import {createWorkbench} from "../src/physical-library-workbench.js";
const find=(g,type,fields={})=>g.choices.find(a=>a.type===type&&Object.entries(fields).every(([k,v])=>a[k]===v));
function move(g,type,fields,auto=false){const a=find(g,type,fields);assert.ok(a);const r=g.move(a,auto);assert.ok(r.ok);return r;}
test("workbench consumes one copy, retains other copy, undo and bounce do not misstate reserve",()=>{
 const g=createWorkbench();move(g,"fetch",{id:"f1",targetId:"blue1"});
 assert.deepEqual(g.reserve.map(c=>c.id),["blue2","red"]);assert.ok(find(g,"fetch",{targetId:"blue2"}));
 move(g,"play",{id:"bounce",returnId:"blue1"});assert.ok(g.state.hand.includes("blue1"));assert.equal(find(g,"fetch",{targetId:"blue1"}),undefined);
 g.undo();assert.equal(g.reserve.length,2);g.undo();assert.equal(g.reserve.length,3);assert.equal(g.state.life,10);
});
test("manual and automatic routes solve, undo restores entire automatic transaction, reset starts fresh",()=>{
 for(const auto of [false,true]){
  const g=createWorkbench();
  move(g,"fetch",{id:"f1",targetId:"blue1"},auto);move(g,"fetch",{id:"f2",targetId:"red"},auto);
  move(g,"tap",{id:"blue1"},auto);move(g,"tap",{id:"red"},auto);
  if(!auto)move(g,"cast",{},false);
  assert.ok(g.done);g.undo();assert.equal(g.done,false);
  assert.equal(g.state.pool.R,auto?0:1);g.reset();assert.equal(g.reserve.length,3);assert.equal(g.canUndo,false);assert.equal(g.state.life,10);
 }
});
