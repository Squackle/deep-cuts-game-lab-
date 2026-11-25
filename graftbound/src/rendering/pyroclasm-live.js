// Presentation-only adapter for the approved Cinematic Inferno Animation Lab.
import { SmokeField, computeImpactTime } from './pyroclasm/smoke-fluid.js';
import { createPixelAtlas } from './pyroclasm/pixel-art.js';
import { ashSmokePuffs } from './pyroclasm/ash-smoke.js';
import { drawSmokeOnArena, clipToArena } from './pyroclasm/arena-projection.js';
export const PRESET=Object.freeze({spriteDensity:1.5,spreadSpeed:.65,fire:1.5,smoke:1.35});
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
const rnd=n=>{const f=Math.sin(n*127.1+18.73)*43758.5453;return f-Math.floor(f);};
export const gridFor=(width,reduced,low)=>reduced||low?44:width<820?64:80;
export const impactFor=field=>computeImpactTime(field.arrivals,PRESET.spreadSpeed,3.16);
export class PyroclasmVisual {
 constructor(sc){this.sc=sc;this.ash=new Map();this.scorch=new Float32Array(256);this.clock=0;this.active=null;}
 mount(){
  if(this.canvas)return;
  const gl=this.sc.canvas,doc=gl.ownerDocument,canvas=doc.createElement('canvas');
  canvas.setAttribute('aria-hidden','true');
  Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'1'});
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Pyroclasm overlay unavailable');
  const atlas=createPixelAtlas(doc),texture=doc.createElement('canvas'),textureCtx=texture.getContext('2d'),scorchSurface=doc.createElement('canvas');
  scorchSurface.width=scorchSurface.height=128;
  const scorchCtx=scorchSurface.getContext('2d');if(!textureCtx||!scorchCtx)throw Error('Pyroclasm textures unavailable');
  gl.parentNode.insertBefore(canvas,gl.nextSibling);
  Object.assign(this,{canvas,ctx,atlas,texture,textureCtx,scorchSurface,scorchCtx});
 }
 start(from){
  this.mount();this.finish();
  const sc=this.sc,cells=gridFor(sc.canvas.clientWidth,sc.reduced,sc.fx?.density<.55);
  const field=new SmokeField(cells,cells,PRESET),origin={x:clamp((from[0]+sc.w/2)/sc.w),y:clamp((from[2]+sc.h/2)/sc.h)};
  field.trackTargets([...sc.units.values()].filter(v=>!v.hidden).map(v=>({x:clamp((v.pos[0]+sc.w/2)/sc.w)*(cells-1),y:clamp((v.pos[2]+sc.h/2)/sc.h)*(cells-1)})));
  this.texture.width=this.texture.height=cells*4;
  return new Promise(resolve=>{this.active={field,origin,elapsed:0,resolve,impacted:false,lastPaint:-1};});
 }
 finish(){if(this.active){this.active.resolve();this.active=null;}}
 reset(){this.finish();this.ash.clear();this.scorch.fill(0);this.clock=0;this.canvas?.remove();this.canvas=null;this.ctx=null;this.atlas=null;this.texture=null;this.textureCtx=null;this.scorchSurface=null;this.scorchCtx=null;}
 addAsh(uid,pos){if(this.canvas)this.ash.set(pos[0]+','+pos[2],{uid,pos:[pos[0],0,pos[2]],born:this.clock});}
 mergeScorch(field){
  if(!field.scorchDirty)return;
  for(let i=0;i<256;i++)this.scorch[i]=Math.max(this.scorch[i],field.scorch[i]);
  const ctx=this.scorchCtx;ctx.clearRect(0,0,128,128);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){const amount=this.scorch[y*16+x];if(amount<.08)continue;
   for(let i=0;i<8;i++){const seed=x*91+y*37+i*157;ctx.fillStyle=i%2?'#1a1512':'#2a211b';ctx.globalAlpha=Math.min(.38,amount*.38)*(.45+.55*rnd(seed));ctx.fillRect(x*8+Math.floor(rnd(seed+17)*8),y*8+Math.floor(rnd(seed+31)*8),1+(i%3===0?1:0),1);}
  }ctx.globalAlpha=1;field.scorchDirty=false;
 }
 frame(dt){
  if(!this.canvas)return;this.clock+=dt;
  try{
   const sc=this.sc,a=this.active;
   if(a){
    a.elapsed=Math.min(6,a.elapsed+dt*Math.min(2,Math.max(.5,sc.speed||1)));a.field.advanceTo(a.elapsed,a.origin,sc.reduced);
    if(!a.impacted&&(a.field.time>=impactFor(a.field)||a.elapsed>=4.1)){a.impacted=true;a.resolve();sc.light?.([a.origin.x*sc.w-sc.w/2,.6,a.origin.y*sc.h-sc.h/2],[1,.41,.1],7,.6,3);if(!sc.reduced)sc.shake?.(.12);}
    if(a.field.time-a.lastPaint>=.18){this.mergeScorch(a.field);a.lastPaint=a.field.time;}
    if(a.elapsed>=5.95||a.field.time>=5.2+a.field.visualDelay){this.mergeScorch(a.field);this.finish();}
   }
   const w=sc.canvas.clientWidth,h=sc.canvas.clientHeight;if(!w||!h||!sc.cam)return;
   const effects=this.canvas,ctx=this.ctx,pixelAtlas=this.atlas,velocityScratch=[0,0],dpr=Math.min(sc.canvas.ownerDocument.defaultView?.devicePixelRatio||1,w<820?1.5:2),pw=Math.round(w*dpr),ph=Math.round(h*dpr);
   if(effects.width!==pw||effects.height!==ph){effects.width=pw;effects.height=ph;}
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
   if(this.scorch.some(v=>v>.08))drawSmokeOnArena(ctx,this.scorchSurface,sc,{elevation:.055,steps:4});
   function drawContainedBillows(field,reduced) {
  if(!field.brush||!field.puffs.length)return;
  ctx.save();
  clipToArena(ctx,sc,0.04);
  const src=field.brush;
  for(const puff of field.puffs){
    const age=puff.age/puff.life;
    const birth=smooth(puff.age/.24);
    const fade=1-smooth((age-.54)/.46);
    const sootReveal=smooth((field.time-(3.00+field.visualDelay))/.70);
    const alpha=birth*fade*(.09+.26*sootReveal)*PRESET.smoke*(reduced?.55:1);
    if(alpha<=.005)continue;
    const [wx,,wz]=sc.world(puff.x/(field.w-1)*sc.w-.5,puff.y/(field.h-1)*sc.h-.5);
    const height=.30+Math.min(1.25,puff.age*.75);
    const p=sc.project([wx,height,wz]);
    const q=sc.project([wx+1,height,wz]);
    const pixelTile=Math.max(14,Math.hypot(q.x-p.x,q.y-p.y));
    const radius=Math.min(83,Math.max(9,pixelTile*(puff.size/10)*(1+puff.age*.9)*1.16));
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.translate(p.x,p.y);
    ctx.rotate(puff.rotate+puff.age*.21);
    ctx.drawImage(src,-radius,-radius,radius*2,radius*2);
    ctx.restore();
  }
  ctx.restore();
}
// Options B+C: nearest-neighbor pixel ember pops and small S-curved flames.
// Both are emitted by the caster, advected by the fluid, and masked to the 8×8
// battlefield. These replace (not augment) the old vector triangles and strokes.
function drawPixelFire(field,reduced,targetCtx=ctx,pass='top') {
  const ctx=targetCtx;
  if(!pixelAtlas)return;
  ctx.save();
  clipToArena(ctx,sc,0.04);
  ctx.imageSmoothingEnabled=false;
  ctx.globalCompositeOperation='source-over';
  const intensity=PRESET.fire;
  const flameFade=1-smooth((field.time-(3.40+field.visualDelay))/.62);
  const renderPos=(x,y,height)=>{
    const [wx,,z]=sc.world(x/(field.w-1)*sc.w-.5,y/(field.h-1)*sc.h-.5);
    return sc.project([wx,height,z]);
  };
  for(const f of field.flames){
    const behind=sc.mode==='canvas-2d' && (f.x/(field.w-1)*8+f.y/(field.h-1)*8)<6.3;
    if(sc.mode==='canvas-2d' && (pass==='ground')!==behind)continue;
    const life=clamp(1-f.age/f.life);
    const opacity=life*flameFade*(.27+.56*f.heat)*intensity*(reduced?.58:1);
    if(opacity<.04)continue;
    const p=renderPos(f.x,f.y,.18+f.age*.17);
    const r=renderPos(f.x+(field.w-1)/sc.w,f.y,.18+f.age*.17);
    const tilePx=Math.hypot(r.x-p.x,r.y-p.y);
    const height=Math.round(clamp(tilePx*(.53+f.size*.17),13,35));
    const width=Math.round(height*17/23);
    const frame=Math.min(7,Math.floor(f.age/f.life*8));
    const sprite=pixelAtlas.flames[frame];
    const wind=field.velocityAt(f.x,f.y,velocityScratch)[0];
    ctx.save();
    ctx.globalAlpha=clamp(opacity,0,.81);
    ctx.translate(Math.round(p.x),Math.round(p.y));
    if(wind<-.8)ctx.scale(-1,1);
    ctx.drawImage(sprite,-Math.round(width/2),-height,width,height);
    ctx.restore();
  }
  // The little scattered Rising Embers remain visible during ignition,
  // expansion, impact and the brief cooling aftermath.
  for(const e of field.embers){
    const behind=sc.mode==='canvas-2d' && (e.x/(field.w-1)*8+e.y/(field.h-1)*8)<6.3;
    if(sc.mode==='canvas-2d' && (pass==='ground')!==behind)continue;
    const progress=clamp(e.age/e.life);
    const p=renderPos(e.x,e.y,.28+e.age*.85);
    const r=renderPos(e.x+(field.w-1)/sc.w,e.y,.28+e.age*.85);
    const tilePx=Math.hypot(r.x-p.x,r.y-p.y);
    const width=Math.round(clamp(tilePx*(.18+e.size*.023),7,13));
    const height=Math.round(width*13/9);
    const frame=Math.min(7,Math.floor(progress*8));
    ctx.globalAlpha=clamp((1-progress*.65)*(reduced?.58:1),0,.94);
    ctx.drawImage(pixelAtlas.embers[frame],
      Math.round(p.x-width*.5),Math.round(p.y-height*.55),width,height);
  }
  // Additional boundary licks reuse existing Curling Flame C frames;
  // they never consume the owner-approved B/C sprite density allowance.
  for(const lick of field.licks){
    const behind=sc.mode==='canvas-2d' && (lick.x/(field.w-1)*8+lick.y/(field.h-1)*8)<6.3;
    if(sc.mode==='canvas-2d' && (pass==='ground')!==behind)continue;
    const life=1-lick.age/lick.life;
    const p=renderPos(lick.x,lick.y,.22+lick.age*.4);
    const tile=sc.project(sc.world(0,0)),next=sc.project(sc.world(1,0));
    const base=Math.max(14,Math.hypot(tile.x-next.x,tile.y-next.y)*.63);
    const height=Math.round(Math.min(43,base*1.35)),width=Math.round(height*17/23);
    const frame=Math.min(7,Math.floor(lick.age/lick.life*8));
    ctx.save();ctx.globalAlpha=clamp(life*.72*(reduced?.55:1));
    ctx.translate(Math.round(p.x),Math.round(p.y));
    if(lick.flip<0)ctx.scale(-1,1);
    ctx.drawImage(pixelAtlas.flames[frame],-width/2,-height,width,height);
    ctx.restore();
  }
  ctx.restore();
}

   function ashPile(unit,age) {
  if(!pixelAtlas)return;
  const opacity=smooth(age/.37);
  const point=sc.project(unit.pos);
  const across=sc.project([unit.pos[0]+1,0,unit.pos[2]]);
  const tilePx=Math.hypot(across.x-point.x,across.y-point.y);
  // Keep pale powder mounds legible on both wide desktop boards and small
  // phones without letting a corpse's ash cover multiple full tiles.
  const compact=effects.clientWidth<620;
  const drawW=Math.round(clamp(tilePx*1.35,compact?27:41,compact?46:70));
  const drawH=Math.round(drawW*29/48);
  ctx.save();
  clipToArena(ctx,sc,0.04);
  ctx.imageSmoothingEnabled=false;
  ctx.globalAlpha=opacity;
  ctx.drawImage(pixelAtlas.ash,
    Math.round(point.x-drawW*.5),Math.round(point.y-drawH*.58),
    drawW,drawH);
  ctx.restore();
}
// Subtle perpetual smoke from a defeated creature's Ash A powder mound.
// These are small staggered cool-gray pixel clusters, not more red fire.
// Use a separate level clock: the spell's timeline freezes at DURATION,
// but the remaining ash continues smoldering until this battle resets.
function drawAshSmoke(unit,timeSinceDeath,reduced) {
  if(!Number.isFinite(timeSinceDeath)||timeSinceDeath<0)return;
  const wisps=ashSmokePuffs(timeSinceDeath,unit.uid,reduced);
  if(!wisps.length)return;
  const point=sc.project(unit.pos);
  const across=sc.project([unit.pos[0]+1,0,unit.pos[2]]);
  const tilePx=Math.hypot(across.x-point.x,across.y-point.y);
  const compact=effects.clientWidth<620;
  const drawW=Math.round(clamp(tilePx*1.35,compact?27:41,compact?46:70));
  const drawH=drawW*29/48;
  const smokeUnit=Math.max(1.5,Math.min(3.5,drawW*.065));
  const originY=point.y-drawH*.29;
  ctx.save();
  clipToArena(ctx,sc,0.04);
  ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#aab0ae';
  for(const puff of wisps){
    const x=Math.round(point.x+puff.x*drawW),y=Math.round(originY-puff.rise*drawH);
    const px=Math.max(1,Math.round(smokeUnit*(puff.size/.05)));
    ctx.globalAlpha=puff.alpha;
    ctx.fillRect(x,y,px+1,px);
    ctx.globalAlpha=puff.alpha*.55;
    ctx.fillRect(x-px,y+px,px,px);
    ctx.globalAlpha=puff.alpha*.32;
    ctx.fillRect(x+px,y-px,Math.max(1,px-1),px);
  }
  ctx.restore();
}

   if(this.active){const field=this.active.field;this.textureCtx.clearRect(0,0,this.texture.width,this.texture.height);
    field.render(this.textureCtx,this.texture.width,this.texture.height,{smoke:PRESET.smoke,fire:PRESET.fire,reduced:sc.reduced,cheapBloom:w<820,skipBloom:sc.fx?.density<.55});
    drawSmokeOnArena(ctx,this.texture,sc,{elevation:.15,steps:w<820?4:6,opacity:.94});
    if(!sc.reduced&&sc.fx?.density>=.55)drawSmokeOnArena(ctx,this.texture,sc,{elevation:.65,steps:w<820?3:5,opacity:.35});
    drawContainedBillows(field,sc.reduced);drawPixelFire(field,sc.reduced);
   }
   for(const u of this.ash.values()){const age=this.clock-u.born;ashPile(u,age);drawAshSmoke(u,age,sc.reduced);}
  }catch(err){this.reset();console.warn('Pyroclasm visual unavailable; combat unaffected',err);}
 }
}
