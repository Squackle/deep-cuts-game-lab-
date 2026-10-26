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
 assert.equal(motionPhase(75,150),.5);
 assert.equal(motionPhase(900,150),1);
 assert.equal(motionPhase(-50,150),0);
 assert.deepEqual(after,[{x:6,y:6},{x:5,y:6},{x:4,y:6}],"Never mutate real hitboxes");
});
test("instant snap for reduced motion, teleports, body growth and corrupted positions",()=>{
 const a=[{x:2,y:2},{x:1,y:2}];
 const b=[{x:3,y:2},{x:2,y:2}];
 assert.equal(smoothBody(a,b,.5,{enabled:false}),b);
 const grown=[...b,{x:1,y:2}];
 assert.equal(smoothBody(a,grown,.5),grown);
 const jump=[{x:12,y:2},{x:2,y:2}];
 assert.equal(smoothBody(a,jump,.5),jump);
 const broken=[{x:NaN,y:2},{x:2,y:2}];
 assert.equal(smoothBody(a,broken,.5),broken);
 assert.equal(smoothBody(a,b,.5,{enabled:false}),b);
 assert.equal(motionPhase(NaN,150),1);
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
});
