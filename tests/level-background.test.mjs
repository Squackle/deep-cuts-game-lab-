import test from "node:test";
import assert from "node:assert/strict";
import {LEVEL_ONE,levelForStage,loadLevelBackground,drawLevelBackground} from "../src/level-background.js";

test("level 1 has an exact local background asset and Hatchery name",()=>{
 assert.equal(LEVEL_ONE.id,1);
 assert.equal(LEVEL_ONE.name,"THE HATCHERY");
 assert.match(LEVEL_ONE.asset,/\/assets\/backgrounds\/hatchery\.webp$/);
});
test("evolution milestones select four distinct playable depths",()=>{
 assert.deepEqual([1,5,9,13,20].map(n=>levelForStage(n).id),[1,2,3,4,4]);
});
test("headless loading returns a graceful null",()=>{
 assert.equal(loadLevelBackground(),null);
});
test("background image draws before the guide grid and restores canvas state",()=>{
 const calls=[];
 const ctx={
  save(){calls.push("save")},
  restore(){calls.push("restore")},
  fillRect(){calls.push("fillRect")},
  drawImage(){calls.push("drawImage")},
  createLinearGradient(){return {addColorStop(){}}},
  beginPath(){calls.push("beginPath")},
  moveTo(){},lineTo(){},stroke(){calls.push("stroke")},
  set fillStyle(x){},set strokeStyle(x){},set lineWidth(x){},set imageSmoothingEnabled(x){},set imageSmoothingQuality(x){}
 };
 drawLevelBackground(ctx,{width:360,height:440},{complete:true,naturalWidth:240},18,22,20);
 assert.ok(calls.includes("drawImage"));
 assert.ok(calls.indexOf("drawImage")<calls.lastIndexOf("fillRect"),"pixel grid draws on top of the artwork");
 assert.ok(calls.filter(c=>c==="fillRect").length>60,"each grid boundary remains individually visible");
 assert.equal(calls.at(-1),"restore");
});
test("image failure uses fallback without crashing",()=>{
 const ctx={save(){},restore(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},set fillStyle(x){},set strokeStyle(x){},set lineWidth(x){}};
 assert.doesNotThrow(()=>drawLevelBackground(ctx,{width:360,height:440},null,18,22,20));
});

test("background shades painted art and its busy sides without hiding gameplay",()=>{
 const colors=[],gradients=[];
 const ctx={save(){},restore(){},fillRect(){},drawImage(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},
  createLinearGradient(){const g={stops:[],addColorStop(at,value){this.stops.push([at,value])}};gradients.push(g);return g},
  set fillStyle(value){colors.push(value)},set strokeStyle(v){},set lineWidth(v){},set imageSmoothingEnabled(v){},set imageSmoothingQuality(v){}
 };
 drawLevelBackground(ctx,{width:360,height:440},{complete:true,naturalWidth:240},18,22,20);
 assert.ok(colors.includes("rgba(3,8,11,0.36)"),"global darkening should be strong enough to reduce visual competition");
 assert.equal(gradients.length,2,"both bright edges should receive their own fade");
 assert.ok(gradients.every(g=>g.stops.some(([,color])=>color.includes("0.42"))));
});
