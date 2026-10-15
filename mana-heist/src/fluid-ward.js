// Top-down dye-in-water ward, driven by the accepted orbs from ward-charge.js.
// One reusable 64x64 semi-Lagrangian dye/velocity grid; no network, shaders,
// workers, texture downloads, or per-mana setup. Mouse and touch impart velocity.
// Visual state never changes the Magic rules, mana pool, or solver state.
import {COLOR_RGB,cssForOrbs} from "./fluid-palette.js";

const N=64,COUNT=N*N,MID=(N-1)/2,RADIUS=N*.465;
const INDEX=(x,y)=>y*N+x;
const FIELDS=["mass","r","g","b","vx","vy"];
const inside=(x,y)=>Math.hypot(x-MID,y-MID)<RADIUS;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function makeFluidGrid(){
 const active=new Uint8Array(COUNT),drag=new Float32Array(COUNT);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const i=INDEX(x,y),dist=Math.hypot(x-MID,y-MID);
  active[i]=dist<RADIUS?1:0;
  const wall=clamp((RADIUS-dist)/5,0,1);
  drag[i]=wall>.01?.987*(.17+.83*wall):0;
 }
 const grid={active,drag,n:N,mass:new Float32Array(COUNT),r:new Float32Array(COUNT),g:new Float32Array(COUNT),b:new Float32Array(COUNT),vx:new Float32Array(COUNT),vy:new Float32Array(COUNT)};
 grid.tmp=Object.fromEntries(FIELDS.map(k=>[k,new Float32Array(COUNT)]));
 return grid;
}
export function addDye(grid,color,x=MID,y=MID,amount=1){
 const rgb=COLOR_RGB[color];if(!rgb)return;
 const rad=6.7,spread=rad*rad*.78;
 for(let gy=Math.max(0,Math.floor(y-rad*2));gy<=Math.min(N-1,Math.ceil(y+rad*2));gy++){
  for(let gx=Math.max(0,Math.floor(x-rad*2));gx<=Math.min(N-1,Math.ceil(x+rad*2));gx++){
   const i=INDEX(gx,gy);if(!grid.active[i])continue;
   const d=(gx-x)**2+(gy-y)**2;
   const n=amount*Math.exp(-d/spread);
   grid.mass[i]+=n;
   grid.r[i]+=rgb[0]*n;grid.g[i]+=rgb[1]*n;grid.b[i]+=rgb[2]*n;
   // Droplet impact gives local radial ripples, not persistent boundary orbit.
   grid.vx[i]+=(gx-x)*.004*n;grid.vy[i]+=(gy-y)*.004*n;
  }
 }
}
export function stirDye(grid,x,y,dx,dy){
 const speed=clamp(Math.hypot(dx,dy),0,10);
 if(!speed)return;
 const radius2=105;
 for(let j=Math.max(1,Math.floor(y-11));j<Math.min(N-1,Math.ceil(y+11));j++){
  for(let i=Math.max(1,Math.floor(x-11));i<Math.min(N-1,Math.ceil(x+11));i++){
   const p=INDEX(i,j),rx=i-x,ry=j-y,d2=rx*rx+ry*ry;
   if(!grid.active[p]||d2>radius2)continue;
   const f=(1-d2/radius2)**2;
   grid.vx[p]+=clamp(dx,-10,10)*.18*f-ry*.004*f;
   grid.vy[p]+=clamp(dy,-10,10)*.18*f+rx*.004*f;
  }
 }
}
function sample(grid,field,x,y){
 x=clamp(x,0,N-1.001);y=clamp(y,0,N-1.001);
 const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
 const a=INDEX(x0,y0),b=INDEX(x0+1,y0),c=INDEX(x0,y0+1),d=INDEX(x0+1,y0+1);
 const fallback=field[INDEX(Math.round(x),Math.round(y))]||0;
 const av=grid.active[a]?field[a]:fallback,bv=grid.active[b]?field[b]:fallback;
 const cv=grid.active[c]?field[c]:fallback,dv=grid.active[d]?field[d]:fallback;
 return ((av*(1-fx)+bv*fx)*(1-fy)+(cv*(1-fx)+dv*fx)*fy);
}

export function advanceFluid(grid,dt=1){
 const {tmp}=grid;
 dt=clamp(dt,.05,1.8);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const i=INDEX(x,y);
  if(!grid.active[i]){for(const k of FIELDS)tmp[k][i]=0;continue;}
  const sx=x-grid.vx[i]*dt*.72,sy=y-grid.vy[i]*dt*.72;
  for(const k of FIELDS)tmp[k][i]=sample(grid,grid[k],sx,sy);
 }
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const i=INDEX(x,y);if(!grid.active[i])continue;
  const left=i-1,right=i+1,up=i-N,down=i+N;
  const neighbors=(grid.active[left]?1:0)+(grid.active[right]?1:0)+(grid.active[up]?1:0)+(grid.active[down]?1:0);
  for(const k of ["mass","r","g","b"]){
   const average=neighbors?((grid.active[left]?tmp[k][left]:0)+(grid.active[right]?tmp[k][right]:0)+(grid.active[up]?tmp[k][up]:0)+(grid.active[down]?tmp[k][down]:0))/neighbors:tmp[k][i];
   grid[k][i]=Math.max(0,(tmp[k][i]*.96+average*.04)*.9998);
  }
  grid.vx[i]=tmp.vx[i]*grid.drag[i];
  grid.vy[i]=tmp.vy[i]*grid.drag[i];
 }
}
export function installFluidWard({canvas,target,onInteract=()=>{}}){
 const ctx=canvas?.getContext?.("2d",{alpha:true,desynchronized:true});
 if(!ctx||!target)return {
  available:false,sync:()=>{},clear:()=>{},pause:()=>{},resume:()=>{},
  isStirring:()=>false,lastStirAt:()=>0
 };
 target.classList.add("fluid-enabled");
 const grid=makeFluidGrid(),off=document.createElement("canvas");
 off.width=N;off.height=N;
 const offctx=off.getContext("2d"),pixels=offctx.createImageData(N,N);
 canvas.width=192;canvas.height=192;
 let active=false,raf=0,lastFrame=0,motionStart=0,lastStir=0,drag=null;
 let charged=[],appliedIds=new Set(),ripples=[],pulse=0;
 const reduced=()=>window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches===true;
 function clearGrid(){
  for(const k of FIELDS)grid[k].fill(0);
  appliedIds.clear();charged=[];ripples=[];pulse=0;
 }
 const coord=event=>{
  const bounds=canvas.getBoundingClientRect();
  return {x:(event.clientX-bounds.left)/Math.max(bounds.width,1)*(N-1),
          y:(event.clientY-bounds.top)/Math.max(bounds.height,1)*(N-1)};
 };
 function render(){
  const data=pixels.data;
  for(let i=0;i<COUNT;i++){
   const offset=i*4;
   if(!grid.active[i]){data[offset+3]=0;continue;}
   const mass=grid.mass[i],opacity=clamp(1-Math.exp(-mass*1.55),0,.94);
   const inv=1/Math.max(mass,.0001);
   const r=mass?grid.r[i]*inv:21,g=mass?grid.g[i]*inv:53,b=mass?grid.b[i]*inv:64;
   data[offset]=Math.round(21*(1-opacity)+r*opacity);
   data[offset+1]=Math.round(53*(1-opacity)+g*opacity);
   data[offset+2]=Math.round(64*(1-opacity)+b*opacity);
   data[offset+3]=255;
  }
  offctx.putImageData(pixels,0,0);
  const w=canvas.width,h=canvas.height,m=w/2,rad=w*.468;
  ctx.clearRect(0,0,w,h);
  ctx.save();
  ctx.beginPath();ctx.arc(m,m,rad,0,Math.PI*2);ctx.clip();
  const water=ctx.createRadialGradient(m-30,m-41,5,m,m,rad);
  water.addColorStop(0,"#315a68");water.addColorStop(.62,"#173942");water.addColorStop(1,"#0b232d");
  ctx.fillStyle=water;ctx.fillRect(0,0,w,h);
  ctx.globalAlpha=.97;
  ctx.drawImage(off,0,0,w,h);
  ctx.globalAlpha=1;
  const shine=ctx.createRadialGradient(m-31,m-35,0,m,m,rad);
  shine.addColorStop(0,"rgba(255,255,255,.13)");shine.addColorStop(.48,"rgba(255,255,255,.012)");shine.addColorStop(1,"rgba(0,0,0,.36)");
  ctx.fillStyle=shine;ctx.fillRect(0,0,w,h);
  for(const ripple of ripples){
   ctx.beginPath();ctx.arc(ripple.x,ripple.y,ripple.age*27+3,0,Math.PI*2);
   ctx.lineWidth=1.6;ctx.strokeStyle="rgba(245,247,251,"+(Math.max(0,1-ripple.age/2)*.55)+")";ctx.stroke();
  }
  ctx.restore();
  ctx.lineWidth=3;ctx.strokeStyle="rgba(229,210,157,.75)";
  ctx.shadowColor=cssForOrbs(charged);ctx.shadowBlur=7+pulse*16;
  ctx.beginPath();ctx.arc(m,m,rad-1.5,0,Math.PI*2);ctx.stroke();
  ctx.shadowBlur=0;
 }
 function frame(now){
  if(!active)return;
  if(document.hidden||(!charged.length&&!drag&&!ripples.length)){raf=requestAnimationFrame(frame);return;}
  const dt=Math.min((now-lastFrame)/16.67||1,1.7);lastFrame=now;
  if(!reduced()){advanceFluid(grid,dt);for(const ripple of ripples)ripple.age+=dt*.09;}
  ripples=ripples.filter(r=>r.age<2);pulse=Math.max(0,pulse-.025*dt);
  render();raf=requestAnimationFrame(frame);
 }
 function resume(){
  if(active)return;active=true;lastFrame=0;
  render();
  if(!reduced())raf=requestAnimationFrame(frame);
 }
 function pause(){active=false;cancelAnimationFrame(raf);raf=0;drag=null;}
 function inject(orb){
  // Every drop lands in the INTERIOR. Color-specific angles separate freshly
  // injected dyes so the player's stirring creates real overlapping plumes.
  const key=String(orb.id),n=key.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
  const dir=({R:.1,U:2.2,G:4.05,B:3.3,W:5.2,C:1.15}[orb.color]||0)+n*.13;
  const radius=N*(.09+(n%4)*.028);
  const x=MID+Math.cos(dir)*radius,y=MID+Math.sin(dir)*radius;
  addDye(grid,orb.color,x,y,1.2);
  ripples.push({x:x/N*canvas.width,y:y/N*canvas.height,age:0});
  pulse=1;
 }
 function sync(next,{reset=false}={}){
  const list=next||[],ids=new Set(list.map(o=>o.id));
  if(reset||charged.some(o=>!ids.has(o.id)||!list.find(p=>p.id===o.id&&p.color===o.color)))clearGrid();
  for(const orb of list)if(!appliedIds.has(orb.id)){inject(orb);appliedIds.add(orb.id);}
  charged=list.map(o=>({...o}));
  target.style.setProperty("--fusion-color",cssForOrbs(charged));
  target.dataset.fusionCount=String(charged.length);
  if(!active||reduced())render();
 }
 canvas.addEventListener("pointerdown",e=>{
  const c=coord(e);if(!inside(c.x,c.y))return;
  e.preventDefault();try{canvas.setPointerCapture?.(e.pointerId);}catch{}
  drag={id:e.pointerId,x:c.x,y:c.y};motionStart=performance.now();lastStir=motionStart;
  target.classList.add("is-stirring");onInteract();
 });
 canvas.addEventListener("pointermove",e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const c=coord(e),dx=c.x-drag.x,dy=c.y-drag.y;
  stirDye(grid,c.x,c.y,dx,dy);
  drag.x=c.x;drag.y=c.y;lastStir=performance.now();onInteract();
  if(reduced())render();
 });
 function release(e){
  if(!drag||e?.pointerId!=null&&e.pointerId!==drag.id)return;
  drag=null;lastStir=performance.now();target.classList.remove("is-stirring");onInteract();
 }
 for(const type of ["pointerup","pointercancel","lostpointercapture"])canvas.addEventListener(type,release);
 return {
  available:true,sync,clear(){clearGrid();target.style.setProperty("--fusion-color","#32616d");render();},
  pause,resume,isStirring:()=>!!drag,lastStirAt:()=>lastStir,
  getColor:()=>cssForOrbs(charged),getCount:()=>charged.length,
  // Exposed for direct browser QA, does not affect authoritative puzzle rules.
  debugCellMass:()=>grid.mass.reduce((sum,v)=>sum+v,0)
 };
}
