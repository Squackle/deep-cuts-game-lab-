import test from "node:test";
import assert from "node:assert/strict";
import {drawBroodPickup} from "../src/pickups.js";
test("pickup remains an outlined, high contrast target over painted art",()=>{
 const calls=[],colors=[];
 const ctx={save(){calls.push("save")},restore(){calls.push("restore")},
  fillRect(){calls.push("fillRect")},
  beginPath(){calls.push("beginPath")},arc(){calls.push("arc")},fill(){calls.push("fill")},
  stroke(){calls.push("stroke")},
  createRadialGradient(){calls.push("radial");return {addColorStop(){}}},
  set fillStyle(v){colors.push(v)},set strokeStyle(v){colors.push(v)},set lineWidth(v){}
 };
 drawBroodPickup(ctx,{x:1,y:2},20,120);
 assert.equal(calls[0],"save");assert.equal(calls.at(-1),"restore");
 assert.ok(calls.includes("radial"));
 assert.ok(colors.includes("rgba(8,12,15,.94)"));
 assert.ok(colors.includes("#fff3c9"));
 assert.ok(colors.includes("#fff9e7"));
});
test("pickup animation is harmless when rendered at different times",()=>{
 const grad={addColorStop(){}};
 const ctx={save(){},restore(){},fillRect(){},beginPath(){},arc(){},fill(){},stroke(){},
  createRadialGradient(){return grad},set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){}
 };
 for(const t of [0,55,1000,70000])assert.doesNotThrow(()=>drawBroodPickup(ctx,{x:0,y:0},20,t));
});
