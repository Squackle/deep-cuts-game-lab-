import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {smoothBody,motionPhase} from "../src/render-motion.js";
import {createCachedBackdrop} from "../src/level-background.js";
import {newRun,start,step} from "../src/engine.js";

test("visual interpolation moves smoothly between deterministic neighboring grid positions",()=>{
 const before=[{x:5,y:6},{x:4,y:6},{x:3,y:6}];
 const after=[{x:6,y:6},{x:5,y:6},{x:4,y:6}];
 assert.deepEqual(smoothBody(before,after,0),before);
 assert.deepEqual(smoothBody(before,after,0.5),[{x:5.5,y:6},{x:4.5,y:6},{x:3.5,y:6}]);
 assert.equal(smoothBody(before,after,1),after,"No allocation after interpolation completes");
 assert.deepEqual(smoothBody([{x:5,y:5}],[{x:5,y:4}],.25),[{x:5,y:4.75}],
  "Vertical and corner transitions are smoothed on the same cell grid");
 assert.equal(motionPhase(75,150),.5);
 assert.equal(motionPhase(900,150),1);
 assert.equal(motionPhase(-50,150),0);
 assert.deepEqual(after,[{x:6,y:6},{x:5,y:6},{x:4,y:6}],"Never mutate real hitboxes");
});
test("smooth one-segment growth and keep the new tail anchored while body moves",()=>{
 const before=[{x:5,y:5},{x:4,y:5},{x:3,y:5}];
 const after=[{x:6,y:5},{x:5,y:5},{x:4,y:5},{x:3,y:5}];
 assert.deepEqual(smoothBody(before,after,0),[...before,{x:3,y:5}]);
 assert.deepEqual(smoothBody(before,after,.5),[
  {x:5.5,y:5},{x:4.5,y:5},{x:3.5,y:5},{x:3,y:5}
 ]);
 assert.equal(smoothBody(before,after,1),after);
 assert.equal(smoothBody(before,after,.5,{enabled:false}),after);
 assert.deepEqual(before,[{x:5,y:5},{x:4,y:5},{x:3,y:5}]);
 assert.deepEqual(after,[{x:6,y:5},{x:5,y:5},{x:4,y:5},{x:3,y:5}]);
});
test("still snap safely for teleports, shrinking, multi-growth and invalid tail",()=>{
 const a=[{x:2,y:2},{x:1,y:2}];
 const b=[{x:3,y:2},{x:2,y:2}];
 assert.equal(smoothBody(a,b,.5,{enabled:false}),b);
 const validGrowth=[...b,{x:1,y:2}];
 assert.deepEqual(smoothBody(a,validGrowth,.5),[
  {x:2.5,y:2},{x:1.5,y:2},{x:1,y:2}
 ]);
 const wrongTail=[...b,{x:0,y:2}];
 assert.equal(smoothBody(a,wrongTail,.5),wrongTail);
 const twoNewSegments=[...validGrowth,{x:0,y:2}];
 assert.equal(smoothBody(a,twoNewSegments,.5),twoNewSegments);
 const shrink=[{x:3,y:2}];
 assert.equal(smoothBody(a,shrink,.5),shrink);
 const jump=[{x:12,y:2},{x:2,y:2}];
 assert.equal(smoothBody(a,jump,.5),jump);
 const broken=[{x:NaN,y:2},{x:2,y:2}];
 assert.equal(smoothBody(a,broken,.5),broken);
 assert.equal(motionPhase(NaN,150),1);
});
test("real Brood Trail orb grants next-tick growth without snapping render",()=>{
 const run=newRun({seed:10,mode:"classic"});
 run.body=[{x:8,y:10},{x:7,y:10},{x:6,y:10}];
 run.direction="right";run.turnQueue=[];
 run.food={x:9,y:10};
 start(run);
 const length=run.body.length;
 step(run);
 assert.equal(run.brood,1);
 assert.equal(run.body.length,length,"Orb collection schedules rather than immediately adds length");
 assert.equal(run.growthDebt,1);
 const before=run.body.map(p=>({...p}));
 step(run);
 assert.equal(run.body.length,length+1,"Next movement consumes growth debt");
 assert.equal(run.growthDebt,0);
 const mid=smoothBody(before,run.body,.5);
 assert.equal(mid.length,run.body.length);
 assert.equal(mid[0].x,before[0].x+.5);
 assert.deepEqual(mid.at(-1),before.at(-1),"New tail emerges at the old tail position");
 assert.deepEqual(run.body.at(-1),before.at(-1),"Engine collision state stays exact");
});

function mockContext(){
 const calls={rect:0,images:0};
 const ctx={save(){},restore(){},fillRect(){calls.rect++},drawImage(){calls.images++},
  createLinearGradient(){return {addColorStop(){}}},set fillStyle(_value){}};
 return {ctx,calls};
}
test("background painter caches heavy grid/gradient work until biome, image readiness or size changes",()=>{
 const off=mockContext(),screen=mockContext();
 let creations=0;
 const surface={width:360,height:440,getContext(){return off.ctx}};
 const paint=createCachedBackdrop(()=>{creations++;return surface});
 const canvas={width:360,height:440};
 const image={complete:false,naturalWidth:0};
 paint(screen.ctx,canvas,image,18,22,20,1);
 const first=off.calls.rect;
 assert.ok(first>400,"Initial canvas background actually rendered");
 paint(screen.ctx,canvas,image,18,22,20,1);
 assert.equal(off.calls.rect,first,"Unchanged backdrop must never repaint each animation frame");
 assert.equal(screen.calls.images,2,"Only one blit per animation frame");
 image.complete=true;image.naturalWidth=288;
 paint(screen.ctx,canvas,image,18,22,20,1);
 assert.ok(off.calls.rect>first,"Image readiness invalidates cached tile");
 const second=off.calls.rect;
 paint(screen.ctx,canvas,image,18,22,20,2);
 assert.ok(off.calls.rect>second,"Biome transition invalidates cached tile");
 const third=off.calls.rect;
 canvas.width=400;
 paint(screen.ctx,canvas,image,18,22,20,2);
 assert.ok(off.calls.rect>third,"Backing resolution invalidates cached tile");
 assert.equal(creations,1,"No extra canvas per frame or biome");
});
test("replay-visible game state is unchanged by pure animation sampling",()=>{
 const r=newRun({seed:745,mode:"classic"}),control=newRun({seed:745,mode:"classic"});
 start(r);start(control);
 for(let i=0;i<12;i++){
  const previous=r.body.map(x=>({...x}));
  step(r);step(control);
  smoothBody(previous,r.body,0.28);
  assert.deepEqual({body:r.body,moves:r.moves,score:r.score,runTicks:r.runTicks,
    outcome:r.outcome,seed:r.seed},
    {body:control.body,moves:control.moves,score:control.score,runTicks:control.runTicks,
    outcome:control.outcome,seed:control.seed});
  if(r.status!=="running")break;
 }
});
test("game main keeps authoritative queue/step but renders smoothed swarm",()=>{
 const src=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 assert.match(src,/state\.visualBefore=state\.run\.moves>movesBefore\?bodyBefore:null/);
 assert.match(src,/paintBackdrop\(context,canvas,arenaBackground/);
 assert.match(src,/drawConnectedSpine\(body\)/);
 assert.match(src,/motionPhase\(state\.accumulator,effectiveTickMs\(run\)\)/);
 assert.match(src,/state\.visualBefore=null/,"New runs and resumes must cancel stale animations");
});
