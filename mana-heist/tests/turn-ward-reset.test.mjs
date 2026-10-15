import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {installFluidWard} from "../src/fluid-ward.js";
import {BASE_LEVELS} from "../src/levels.js";
import {initial,reduce} from "../src/engine.js";
import {reconstruct,transitionOrbs} from "../src/mana-orbs.js";

function mockWard(){
 const frameCallbacks=[];
 let pixels=null;
 const saved={
  document:globalThis.document,window:globalThis.window,
  requestAnimationFrame:globalThis.requestAnimationFrame,
  cancelAnimationFrame:globalThis.cancelAnimationFrame
 };
 const fakeCtx={
  clearRect(){},save(){},restore(){},beginPath(){},arc(){},clip(){},fillRect(){},stroke(){},
  createRadialGradient(){return {addColorStop(){}};},
  drawImage(){},set fillStyle(v){},set strokeStyle(v){},set globalAlpha(v){},
  set lineWidth(v){},set shadowColor(v){},set shadowBlur(v){}
 };
 const offCtx={
  createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},
  putImageData(image){pixels=new Uint8ClampedArray(image.data);}
 };
 const canvas={
  width:192,height:192,
  getContext(){return fakeCtx;},addEventListener(){},
  getBoundingClientRect(){return {left:0,top:0,width:192,height:192};}
 };
 const css=new Map(),classes=new Set(),dataset={};
 const target={
  classList:{add(...names){names.forEach(n=>classes.add(n));},remove(...names){names.forEach(n=>classes.delete(n));},contains(n){return classes.has(n);}},
  style:{setProperty(k,v){css.set(k,v);},getPropertyValue(k){return css.get(k)||"";}},
  dataset
 };
 globalThis.document={hidden:false,createElement(){return {width:0,height:0,getContext(){return offCtx;}};}};
 globalThis.window={innerWidth:390,matchMedia(){return {matches:false};}};
 globalThis.requestAnimationFrame=fn=>(frameCallbacks.push(fn),frameCallbacks.length);
 globalThis.cancelAnimationFrame=()=>{};
 const pixel=()=>{
  const p=(32*64+32)*4;
  return [...pixels.slice(p,p+3)];
 };
 return {
  canvas,target,frameCallbacks,pixel,
  restore(){
   for(const k of Object.keys(saved))if(saved[k]===undefined)delete globalThis[k];else globalThis[k]=saved[k];
  }
 };
}

test("end turn clears actual drawn Canvas pixels, pigment, glow and touch state while active",()=>{
 const fake=mockWard();
 try{
  const ward=installFluidWard({canvas:fake.canvas,target:fake.target});
  const red=[{id:"mana-1",color:"R"}];
  ward.sync(red);
  assert.equal(ward.getCount(),1);
  const colored=fake.pixel();
  assert.ok(colored[0]>colored[2]*2,"red dye renders visibly");
  ward.resume(); // reproduce the live animation loop active during end-turn
  assert.equal(fake.frameCallbacks.length,1);
  ward.sync([],{reset:false}); // action.type=end moves pool to empty
  assert.deepEqual(fake.pixel(),[21,53,64],"neutral water must be DRAWN immediately rather than left red");
  assert.equal(ward.getCount(),0);
  assert.equal(ward.debugCellMass(),0);
  assert.equal(fake.target.dataset.fusionCount,"0");
  assert.ok(!fake.target.classList.contains("is-stirring"));
  ward.sync([{id:"mana-2",color:"U"}],{reset:true});
  assert.equal(ward.getCount(),1,"fresh next-turn mana charges again");
  ward.clear();
  assert.deepEqual(fake.pixel(),[21,53,64],"explicit turn reset flushes the Canvas even while active");
  assert.equal(fake.target.dataset.fusionCount,"0");
  assert.equal(ward.lastStirAt(),0);
  ward.pause();
 }finally{fake.restore();}
});

test("ending a legal turn zeroes authoritative mana while leaving land for the next turn",()=>{
 const level=BASE_LEVELS[2]; // Paired Sigils, two turns
 let state=initial(level);
 let visual=reconstruct(state.pool);
 for(const action of [{type:"play",id:"a"},{type:"tap",id:"a",color:"U"}]){
  const out=reduce(level,state,action);
  assert.equal(out.ok,true,JSON.stringify(action));
  state=out.state;
  visual=transitionOrbs(visual,action,state.pool);
 }
 assert.equal(state.pool.U,1);
 assert.equal(visual.length,1);
 const end=reduce(level,state,{type:"end"});
 assert.equal(end.ok,true);
 const empty=transitionOrbs(visual,{type:"end"},end.state.pool);
 assert.equal(end.state.turn,2);
 assert.equal(end.state.pool.U,0);
 assert.equal(empty.length,0);
 assert.ok(end.state.field.some(f=>f.id==="a"&&!f.tapped));
});

test("real game explicitly clears ward visual state after a successful end turn",()=>{
 const main=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 const fluid=readFileSync(new URL("../src/fluid-ward.js",import.meta.url),"utf8");
 assert.match(main,/if\(action\.type==="end"\)\{fluid\.clear\(\);currentFluidStage="";\}/);
 assert.match(fluid,/if\(reset\|\|removed\|\|!list\.length\|\|!active\|\|reduced\(\)\)render\(\)/);
 assert.match(fluid,/target\.dataset\.fusionCount="0"/);
});
