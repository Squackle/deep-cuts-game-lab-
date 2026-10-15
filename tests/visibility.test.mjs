import test from "node:test";
import assert from "node:assert/strict";
import {drawArenaGrid} from "../src/level-background.js";
import {drawPlayerLocator,drawQueuedTurn} from "../src/player-visibility.js";
function mock(){
 const rects=[],strokes=[];
 const ctx={fillStyle:"",strokeStyle:"",lineWidth:1,save(){},restore(){},
  fillRect(...args){rects.push({args,color:this.fillStyle})},
  strokeRect(...args){strokes.push({args,color:this.strokeStyle,width:this.lineWidth})}};
 return {ctx,rects,strokes};
}
test("grid cells have legible 1px edges and stronger every-five landmarks",()=>{
 const {ctx,rects}=mock();
 drawArenaGrid(ctx,8,7,20,1);
 const minor=rects.find(r=>r.args.join(",")==="19,0,1,140");
 const major=rects.find(r=>r.args.join(",")==="99,0,1,140");
 assert.ok(minor);assert.ok(minor.color.endsWith(".24)"));
 assert.ok(major);assert.ok(major.color.endsWith(".37)"));
 assert.ok(rects.some(r=>r.args.join(",")==="0,99,160,1"));
 assert.ok(rects.some(r=>r.args.join(",")==="1,1,19,19"));
});
test("head marker shrinks to a subtle 8px plate underneath detailed Sliver art",()=>{
 const {ctx,rects,strokes}=mock(),head={x:5,y:6};
 drawPlayerLocator(ctx,head,"right",20,"below");
 assert.deepEqual(rects[0].args,[106,126,8,8]);
 assert.equal(rects[0].color,"rgba(5,18,17,.30)");
 assert.deepEqual(strokes[0].args,[106,126,8,8]);
 assert.equal(strokes[0].width,1);
 assert.equal(strokes[0].color,"#bda267");
 assert.ok(8*8<18*18/3,"plate uses less than one third the old square area");
 drawPlayerLocator(ctx,head,"right",20,"above");
 assert.deepEqual(rects[1].args,[117,128,3,3],"only a tiny directional pip overlaps the sprite layer");
 assert.equal(rects.length,2,"old oversized corner brackets must be gone");
 const before=rects.length;
 drawPlayerLocator(ctx,null,"right");
 assert.equal(rects.length,before);
});
test("tiny direction pip still tracks all four headings without extra UI",()=>{
 const head={x:5,y:6};
 for(const [heading,expected] of Object.entries({
  up:[108,120,3,3],right:[117,128,3,3],
  down:[108,137,3,3],left:[100,128,3,3]
 })){
  const {ctx,rects,strokes}=mock();
  drawPlayerLocator(ctx,head,heading,20,"above");
  assert.deepEqual(rects.map(x=>x.args),[expected],heading);
  assert.equal(strokes.length,0,heading);
 }
});

test("queued keyboard turn shows a direction marker before the next movement tick",()=>{
 const {ctx,rects}=mock();
 assert.equal(drawQueuedTurn(ctx,{x:5,y:5},"up",18,22),true);
 assert.ok(rects.some(r=>r.args.join(",")==="102,82,16,16"));
 assert.ok(rects.some(r=>r.args.join(",")==="108,88,4,4"));
 const before=rects.length;
 assert.equal(drawQueuedTurn(ctx,{x:5,y:5},null,18,22),false);
 assert.equal(drawQueuedTurn(ctx,{x:0,y:0},"up",18,22),false);
 assert.equal(rects.length,before);
});
