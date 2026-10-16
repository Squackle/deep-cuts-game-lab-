import test from "node:test";
import assert from "node:assert/strict";
import {makeFluidGrid,fillDyeProportions,stirDye,advanceFluid,installFluidWard} from "../src/fluid-ward.js";
import {pigmentStatistics} from "../src/pigment-mixer.js";
import {readFileSync} from "node:fs";

function setupPool(){
 const g=makeFluidGrid();
 fillDyeProportions(g,[{id:1,color:"R"},{id:2,color:"U"}]);
 stirDye(g,32,31,5,4);
 return g;
}
function energy(g){return g.vx.reduce((sum,v,i)=>sum+(g.active[i]?Math.abs(v)+Math.abs(g.vy[i]):0),0);}
test("30fps and 60fps damp stirring energy by elapsed time, preserving pigment balance",()=>{
 const faster=setupPool(),slower=setupPool();
 const t=32*64+31;
 assert.ok(faster.turbulence[t]>.1);
 for(let frame=0;frame<60;frame++)advanceFluid(faster,1);
 for(let frame=0;frame<30;frame++)advanceFluid(slower,2);
 const a=pigmentStatistics(faster),b=pigmentStatistics(slower);
 assert.ok(Math.abs(a.ratio.R-.5)<.035);
 assert.ok(Math.abs(b.ratio.R-.5)<.035);
 assert.ok(a.blendedCells>50&&b.blendedCells>50);
 // Turbulence uses pow(.93,dt) so 60 x 1 and 30 x 2 are equivalent.
 assert.ok(Math.abs(faster.turbulence[t]-slower.turbulence[t])<.0003);
 const fast=energy(faster),slow=energy(slower);
 assert.ok(fast>0&&slow>0,"both devices retain motion");
 assert.ok(slow/fast>.48&&slow/fast<2.2,
  "flow energy should stay comparable across 30/60fps: "+slow+" / "+fast);
});
function mockWard({mobile,width,highDensity=true}){
 const previous={document:globalThis.document,window:globalThis.window,
  requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
 const eventHandlers={};
 const ctx={clearRect(){},save(){},restore(){},beginPath(){},arc(){},
  clip(){},fillRect(){},drawImage(){},stroke(){},createRadialGradient(){return {addColorStop(){}};}};
 const off={createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){}};
 const canvas={
  width:192,height:192,
  getContext(){return ctx;},
  getBoundingClientRect(){return {left:12,top:20,width,height:width};},
  addEventListener(name,listener){eventHandlers[name]=listener;},
  setPointerCapture(){},
 };
 const classes=new Set();
 const target={classList:{add(...xs){xs.forEach(x=>classes.add(x));},
  remove(...xs){xs.forEach(x=>classes.delete(x));},contains(x){return classes.has(x);}},
  style:{setProperty(){}},dataset:{}};
 globalThis.document={hidden:false,createElement(){return {getContext(){return off;}};}};
 globalThis.window={innerWidth:mobile?390:1280,devicePixelRatio:highDensity?2:1,
  matchMedia(){return {matches:false};}};
 globalThis.requestAnimationFrame=()=>1;
 globalThis.cancelAnimationFrame=()=>{};
 let interactions=0;
 const fluid=installFluidWard({canvas,target,onInteract(){interactions++;}});
 fluid.sync([{id:1,color:"R"},{id:2,color:"U"}],{reset:true});
 function dispatch(kind,x,y,pointerType="mouse"){
  const event={pointerId:9,pointerType,clientX:12+x*width,clientY:20+y*width,preventDefault(){}};
  assert.ok(eventHandlers[kind],"missing "+kind+" handler");
  eventHandlers[kind](event);
 }
 function restore(){
  for(const [k,v] of Object.entries(previous))if(v===undefined)delete globalThis[k];else globalThis[k]=v;
 }
 return {fluid,canvas,dispatch,restore,get interactions(){return interactions;}};
}
test("moving a desktop cursor without clicking mixes the pot as effectively as a touch drag",()=>{
 const desktop=mockWard({mobile:false,width:336});
 let desktopEnergy;
 try{
  assert.equal(desktop.fluid.debugResolution(),512,"large desktop water should have crisp 512px backing");
  desktop.dispatch("pointerenter",.3,.5);
  for(let x=.34;x<=.70;x+=.04)desktop.dispatch("pointermove",x,.5+Math.sin(x*16)*.06);
  desktopEnergy=desktop.fluid.debugVelocityEnergy();
  assert.ok(desktopEnergy>25,"hover motion must stir with no mouse button down");
  assert.ok(desktop.interactions>2);
 }finally{desktop.restore();}
 const mobile=mockWard({mobile:true,width:190});
 try{
  assert.equal(mobile.fluid.debugResolution(),256,"mobile avoids unnecessary high-resolution render work");
  mobile.dispatch("pointerdown",.3,.5,"touch");
  for(let x=.34;x<=.70;x+=.04)mobile.dispatch("pointermove",x,.5+Math.sin(x*16)*.06,"touch");
  mobile.dispatch("pointerup",.70,.5,"touch");
  const mobileEnergy=mobile.fluid.debugVelocityEnergy();
  assert.ok(mobileEnergy>25);
  assert.ok(desktopEnergy/mobileEnergy>.75&&desktopEnergy/mobileEnergy<1.3,
   "same normalized cursor/finger path should have comparable fluid energy: "+desktopEnergy+" vs "+mobileEnergy);
  assert.ok(mobile.interactions>2);
 }finally{mobile.restore();}
});
test("casting has the same bounded opportunity to stir on desktop and phone",()=>{
 const main=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 const fluid=readFileSync(new URL("../src/fluid-ward.js",import.meta.url),"utf8");
 const mixer=readFileSync(new URL("../src/pigment-mixer.js",import.meta.url),"utf8");
 assert.match(main,/AUTO_SETTLE_MS=2000,AUTO_STIR_MAX_MS=5100/);
 assert.match(main,/now-fluid\.lastStirAt\(\)<900/);
 assert.match(main,/WARD READY · STIR TO MIX/);
 assert.match(fluid,/function stirBetween\(from,to\)/);
 assert.match(fluid,/Math\.ceil\(distance\/2\.4\)/);
 assert.match(fluid,/Math\.pow\(grid\.drag\[i\],dt\)/);
 assert.match(mixer,/Math\.pow\(\.93,dt\)/);
 assert.match(mixer,/1-Math\.pow\(1-perFrame,dt\)/);
});
