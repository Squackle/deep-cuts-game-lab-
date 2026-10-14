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
test("player head locator overlays a readable directional indicator",()=>{
 const {ctx,rects,strokes}=mock(),head={x:5,y:6};
 drawPlayerLocator(ctx,head,"right",20,"below");
 assert.deepEqual(rects[0].args,[101,121,18,18]);
 assert.equal(strokes[0].color,"#d7b66a");
 drawPlayerLocator(ctx,head,"right",20,"above");
 assert.ok(rects.some(r=>r.args.join(",")==="116,128,4,4"));
 const before=rects.length;
 drawPlayerLocator(ctx,null,"right");
 assert.equal(rects.length,before);
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
