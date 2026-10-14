import test from "node:test";
import assert from "node:assert/strict";
import {LEVEL_ONE,levelForStage,loadLevelBackground,drawLevelBackground} from "../src/level-background.js";

test("level 1 has an exact local background asset and Hatchery name",()=>{
 assert.equal(LEVEL_ONE.id,1);
 assert.equal(LEVEL_ONE.name,"THE HATCHERY");
 assert.equal(LEVEL_ONE.asset,"/assets/backgrounds/hatchery.webp");
});
test("speed tiers do not switch to a non-existent second level",()=>{
 for(const stage of [1,2,3,20])assert.equal(levelForStage(stage),LEVEL_ONE);
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
  beginPath(){calls.push("beginPath")},
  moveTo(){},lineTo(){},stroke(){calls.push("stroke")},
  set fillStyle(x){},set strokeStyle(x){},set lineWidth(x){},set imageSmoothingEnabled(x){},set imageSmoothingQuality(x){}
 };
 drawLevelBackground(ctx,{width:360,height:440},{complete:true,naturalWidth:240},18,22,20);
 assert.ok(calls.includes("drawImage"));
 assert.ok(calls.indexOf("drawImage")<calls.indexOf("stroke"));
 assert.equal(calls.at(-1),"restore");
});
test("image failure uses fallback without crashing",()=>{
 const ctx={save(){},restore(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},set fillStyle(x){},set strokeStyle(x){},set lineWidth(x){}};
 assert.doesNotThrow(()=>drawLevelBackground(ctx,{width:360,height:440},null,18,22,20));
});
