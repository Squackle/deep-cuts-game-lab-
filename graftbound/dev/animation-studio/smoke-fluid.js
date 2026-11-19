// GRAFTBOUND Pyroclasm / red fire board-wipe Animation Lab: 2D fluid + fuel-limited combustion solver.
// Semi-Lagrangian transport, pressure projection, vorticity, fuel reaction and heat buoyancy.
// The camera-facing smoke sheet is an illusion of volume, NOT a full 3D fluid solver.
// Reference principles: NVIDIA GPU Gems chapter 38; Unreal Niagara 2D Gas; Unity Curl Noise.
// Pure math until render() is called; it never reads game state, save data or gameplay RNG.
const DT = 1 / 30;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = v => { const t = clamp(v, 0, 1); return t*t*(3-2*t); };
const hash = n => { const s = Math.sin(n*127.1+78.233)*43758.5453; return s-Math.floor(s); };
// Artist-directed approximation of blackbody-like incandescent color. This is
// a compact real-time game ramp, not a physically calibrated spectral integral.
export function flameColor(temperature) {
  const t=clamp(temperature,0,1);
  const stops=[[185,31,5],[252,69,7],[255,147,20],[255,207,71],[255,248,194]];
  const u=t*4,i=Math.min(3,Math.floor(u)),f=u-i;
  return stops[i].map((c,j)=>Math.round(c+(stops[i+1][j]-c)*f));
}
const FIRE_PALETTE=Array.from({length:256},(_,i)=>flameColor(i/255));
// Sprite-only comparison presets. These never scale fuel, heat, smoke or ash.
export const FIRE_SPRITE_DENSITIES=Object.freeze([1,1.35,1.5,1.75]);
export function normalizedSpriteDensity(value) {
  const number=Number(value);
  return FIRE_SPRITE_DENSITIES.includes(number)?number:1;
}
// Carry fractional spawns between simulation frames. Compared with rounding
// every frame, this accurately targets 1.35x, 1.5x and 1.75x over a full cast.
export function scaledSpriteSpawn(base,scale,remainder=0) {
  const exact=base*normalizedSpriteDensity(scale)+remainder;
  const count=Math.floor(exact+1e-9);
  return {count,remainder:Math.max(0,exact-count)};
}

export class SmokeField {
  constructor(w = 98, h = 62, {spriteDensity=1}={}) {
    this.spriteDensity=normalizedSpriteDensity(spriteDensity);
    this.w = Math.max(18, Math.floor(w));
    this.h = Math.max(18, Math.floor(h));
    this.n = this.w*this.h;
    for(const k of ['u','v','nu','nv','density','heat','fuel','flame','nextDensity','nextHeat','nextFuel','nextFlame','div','p','pn','curl']) {
      this[k] = new Float32Array(this.n);
    }
    this.embers = [];
    this.puffs = [];
    this.flames = [];
    this.reset();
  }
  reset() {
    for(const k of ['u','v','nu','nv','density','heat','fuel','flame','nextDensity','nextHeat','nextFuel','nextFlame','div','p','pn','curl']) this[k].fill(0);
    this.time = 0;
    this.embers.length = 0;
    this.puffs.length = 0;
    this.flames.length = 0;
    this.seed = 0;
    this._emberCarry=0;
    this._flameCarry=0;
    this.origin = {x:this.w*.5,y:this.h*.5};
    this.frame = null;
  }
  // Bilinear fetch, identical for velocity, temperature and smoke-density advection.
  sample(a,x,y) {
    const w=this.w,h=this.h;
    x=clamp(x,0,w-1.001);y=clamp(y,0,h-1.001);
    const i=x|0,j=y|0,k=j*w+i,fx=x-i,fy=y-j;
    const a0=a[k]*(1-fx)+a[k+1]*fx, a1=a[k+w]*(1-fx)+a[k+w+1]*fx;
    return a0*(1-fy)+a1*fy;
  }
  velocityAt(x,y) { return [this.sample(this.u,x,y),this.sample(this.v,x,y)]; }
  // Impermeable walls: cancel normal airflow and preserve damped tangential
  // flow so smoke slides, folds and recirculates against the invisible arena box.
  // A little inboard restitution makes a plume rebound instead of disappearing.
  _walls() {
    const {w,h,u,v}=this, slip=.87, bounce=.42;
    for(let y=1;y<h-1;y++){
      const l=y*w,r=l+w-1;
      if(u[l+1]<0)u[l+1]=-u[l+1]*bounce;
      if(u[r-1]>0)u[r-1]=-u[r-1]*bounce;
      u[l]=0;u[r]=0;
      v[l]=v[l+1]*slip;v[r]=v[r-1]*slip;
    }
    for(let x=0;x<w;x++){
      const top=x,bottom=(h-1)*w+x;
      if(v[top+w]<0)v[top+w]=-v[top+w]*bounce;
      if(v[bottom-w]>0)v[bottom-w]=-v[bottom-w]*bounce;
      v[top]=0;v[bottom]=0;
      u[top]=x===0||x===w-1?0:u[top+w]*slip;
      u[bottom]=x===0||x===w-1?0:u[bottom-w]*slip;
    }
  }
  _fieldEdges() {
    // Reflective density/heat ghost cells preserve gas at the border instead of
    // destroying it when the advancing smoke front impacts a wall.
    const {w,h}=this;
    for(const a of [this.density,this.heat,this.fuel,this.flame]){
      for(let y=1;y<h-1;y++){
        const k=y*w;
        a[k]=a[k+1];a[k+w-1]=a[k+w-2];
      }
      for(let x=0;x<w;x++){
        a[x]=a[w+x];
        a[(h-1)*w+x]=a[(h-2)*w+x];
      }
    }
  }
  _reflectParticle(p) {
    // Mirror overshoot off walls; subsequent motion follows the deflected flow.
    const min=.7, xmax=this.w-1.7,ymax=this.h-1.7;
    if(p.x<min)p.x=min+(min-p.x)*.45;
    if(p.x>xmax)p.x=xmax-(p.x-xmax)*.45;
    if(p.y<min)p.y=min+(min-p.y)*.45;
    if(p.y>ymax)p.y=ymax-(p.y-ymax)*.45;
    p.x=clamp(p.x,min,xmax);p.y=clamp(p.y,min,ymax);
  }
  _project() {
    const {w,h,u,v,div}=this;
    this.p.fill(0);
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const k=y*w+x;
      div[k]=-.5*(u[k+1]-u[k-1]+v[k+w]-v[k-w]);
    }
    // Gauss-Jacobi pressure iterations keep flow coherent without a heavy 3D solver.
    for(let iter=0;iter<8;iter++){
      const p=this.p,pn=this.pn;
      for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
        const k=y*w+x;
        pn[k]=(div[k]+p[k+1]+p[k-1]+p[k+w]+p[k-w])*.25;
      }
      this.p=pn;this.pn=p;
    }
    const p=this.p;
    // Zero-normal pressure gradient across the four solid boundaries.
    for(let y=1;y<h-1;y++){
      const k=y*w;p[k]=p[k+1];p[k+w-1]=p[k+w-2];
    }
    for(let x=0;x<w;x++){p[x]=p[w+x];p[(h-1)*w+x]=p[(h-2)*w+x];}
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const k=y*w+x;
      u[k]-=.5*(p[k+1]-p[k-1]);
      v[k]-=.5*(p[k+w]-p[k-w]);
    }
    this._walls();
  }
  _inject(cx,cy,r,amount,fire) {
    const w=this.w,h=this.h,x0=Math.max(1,Math.floor(cx-r*2)),x1=Math.min(w-2,Math.ceil(cx+r*2));
    const y0=Math.max(1,Math.floor(cy-r*2)),y1=Math.min(h-2,Math.ceil(cy+r*2));
    const rr=1/(r*r);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const k=y*w+x, q=((x-cx)**2+(y-cy)**2)*rr;
      if(q>=4)continue;
      const falloff=Math.exp(-q*1.3);
      // Fuel and heat are emitted locally; smoke is mostly a combustion
      // by-product rather than a cloud painted directly at the caster.
      this.density[k]=Math.min(8,this.density[k]+amount*.07*falloff);
      this.fuel[k]=Math.min(9,this.fuel[k]+amount*1.15*falloff);
      this.heat[k]=Math.min(6.2,this.heat[k]+fire*.95*falloff);
    }
  }
  _spawnEmbers(cx,cy,t,charge,blast,reduced) {
    if(t>3.42)return;
    const spawn=scaledSpriteSpawn(reduced?2:Math.round(2+5*charge+7*blast),
      this.spriteDensity,this._emberCarry);
    this._emberCarry=spawn.remainder;
    const max=Math.round((reduced?48:170)*this.spriteDensity);
    for(let i=0;i<spawn.count && this.embers.length<max;i++){
      const a=t*11.5+i*2.399+hash(++this.seed)*.8;
      const r=1+hash(this.seed+47)*2.5;
      this.embers.push({
        x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r,
        px:cx+Math.cos(a)*r,py:cy+Math.sin(a)*r,
        age:0,life:.4+hash(this.seed+13)*.78,
        size:.7+hash(this.seed+31)*1.55,
        bright:hash(this.seed+7)
      });
    }
  }
  _spawnPuffs(cx,cy,t,charge,blast,reduced) {
    if(t>3.34)return;
    const n=reduced?1:3;
    for(let i=0;i<n && this.puffs.length<(reduced?34:115);i++) {
      const hand=i%2,angle=t*(5.4+5.8*charge)+hand*Math.PI+(hash(++this.seed)-.5)*.85;
      const r=1.3+hash(this.seed+67)*2;
      this.puffs.push({
        x:cx+Math.cos(angle)*r,y:cy+Math.sin(angle)*r,
        age:0,life:1.0+hash(this.seed+22)*1.25,
        size:2.4+hash(this.seed+9)*2.9,
        rotate:hash(this.seed+11)*Math.PI*2
      });
    }
  }
  _spawnFlames(cx,cy,t,charge,blast,reduced) {
    if(t>3.31)return;
    const spawn=scaledSpriteSpawn(reduced?1:Math.round(2+2*charge+2*blast),
      this.spriteDensity,this._flameCarry);
    this._flameCarry=spawn.remainder;
    const max=Math.round((reduced?30:96)*this.spriteDensity);
    for(let i=0;i<spawn.count&&this.flames.length<max;i++) {
      const a=t*(5.4+6.5*charge)+i*2.39996+(hash(++this.seed)-.5)*.7;
      const r=.6+hash(this.seed+19)*2.6;
      const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r*.82;
      this.flames.push({x,y,px:x,py:y,age:0,life:.68+hash(this.seed+71)*1.02,
        size:.58+hash(this.seed+13)*.9,seed:hash(this.seed+97),heat:1});
    }
  }
  step(origin = {x:.5,y:.5},reduced=false) {
    const w=this.w,h=this.h,n=this.n,dt=DT,t=this.time+dt;
    const cx=clamp(origin.x,0.05,.95)*(w-1),cy=clamp(origin.y,.05,.95)*(h-1);
    this.origin={x:cx,y:cy};
    const charge=smooth((t-.13)/1.35),blast=smooth((t-1.18)/1.52);
    const strength=reduced?.48:1;
    const dying=smooth((t-3.28)/.6);
    // Advect air velocity by its own previous field, then apply caster-driven vortex
    // and low-frequency divergence-free (stream-function) turbulence.
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const k=y*w+x,px=x-this.u[k]*dt*.58,py=y-this.v[k]*dt*.58;
      const dx=x-cx,dy=y-cy,r=Math.max(1,Math.hypot(dx,dy)),fall=Math.exp(-r/(Math.max(w,h)*.78));
      const swirl=(7+27*charge)*fall*strength*(1-dying*.85);
      const angle=Math.atan2(dy,dx);
      const lobes=Math.max(.55,1+.28*Math.sin(angle*4.3-t*2.7)+.18*Math.cos(angle*7.1+t*1.4));
      const outward=(1+165*blast)*fall*strength*lobes*(1-dying*.75);
      const psiX=x*.19+t*1.1,psiY=y*.23-t*1.5;
      const curlX=(7+18*charge)*Math.sin(psiX)*Math.cos(psiY)*.23;
      const curlY=-(7+18*charge)*Math.cos(psiX)*Math.sin(psiY)*.19;
      const tu=(dx/r)*outward-(dy/r)*swirl+curlX;
      const tv=(dy/r)*outward+(dx/r)*swirl+curlY-this.heat[k]*.23;
      this.nu[k]=this.sample(this.u,px,py)*.62+tu*.38;
      this.nv[k]=this.sample(this.v,px,py)*.62+tv*.38;
    }
    [this.u,this.nu]=[this.nu,this.u];
    [this.v,this.nv]=[this.nv,this.v];
    // Enforce low-divergence flow; retain a little radial expansion from a magical
    // continuously emitting source, which an incompressible projection would erase.
    this._project();
    // Vorticity confinement recovers small rolling curls damped by semi-Lagrangian transport.
    const u=this.u,v=this.v,curl=this.curl;
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const k=y*w+x;
      curl[k]=.5*(v[k+1]-v[k-1]-u[k+w]+u[k-w]);
    }
    for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
      const k=y*w+x,dx=Math.abs(curl[k+1])-Math.abs(curl[k-1]),dy=Math.abs(curl[k+w])-Math.abs(curl[k-w]);
      const len=Math.hypot(dx,dy)+1e-4;
      u[k] += (dy/len)*curl[k]*dt*4.5;
      v[k] -= (dx/len)*curl[k]*dt*4.5;
    }
    this._walls();
    // Four separately advected scalar fields: fuel, hot gas, emitted flame and
    // the smaller soot residue. Combustion happens after transport.
    const decay=Math.exp(-dt*(.94+dying*1.8)),cool=Math.exp(-dt*(.88+dying*2.8));
    const fuelDecay=Math.exp(-dt*(.30+dying*3.2));
    const flameDecay=Math.exp(-dt*(2.25+dying*5.1));
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const k=y*w+x;
      const dx=x-cx,dy=y-cy,r=Math.max(1,Math.hypot(dx,dy));
      // The blow-out component spreads the cloud outward instead of letting it
      // swirl in one spot; only the caster emits new material.
      // Outward force turns into recirculating wall flow rather than moving
      // smoke through the container. Projected backtraces stay within the box.
      const boundary=Math.min(x-1,y-1,w-2-x,h-2-y);
      const radiate=blast*strength*36/(1+r*.03)*smooth(boundary/5);
      const vx=u[k]+(dx/r)*radiate,vy=v[k]+(dy/r)*radiate;
      const bx=x-vx*dt,by=y-vy*dt;
      this.nextDensity[k]=this.sample(this.density,bx,by)*decay;
      this.nextHeat[k]=this.sample(this.heat,bx,by)*cool;
      this.nextFuel[k]=this.sample(this.fuel,bx,by)*fuelDecay;
      this.nextFlame[k]=this.sample(this.flame,bx,by)*flameDecay;
    }
    [this.density,this.nextDensity]=[this.nextDensity,this.density];
    [this.heat,this.nextHeat]=[this.nextHeat,this.heat];
    [this.fuel,this.nextFuel]=[this.nextFuel,this.fuel];
    [this.flame,this.nextFlame]=[this.nextFlame,this.flame];
    this._fieldEdges();
    this.nextDensity.fill(0);this.nextHeat.fill(0);
    this.nextFuel.fill(0);this.nextFlame.fill(0);
    // Two hands releasing overlapping hot plumes; the rest of the battlefield
    // receives only advected density. Nothing is painted globally.
    if(t<3.28){
      for(let hand=0;hand<2;hand++){
        const angle=t*(5.4+5.8*charge)+hand*Math.PI;
        const radius=2.2+1.4*charge;
        const x=cx+Math.cos(angle)*radius,y=cy+Math.sin(angle)*radius*.65;
        const rate=(21+39*charge)*(1-.32*blast)*strength*dt;
        this._inject(x,y,4.1+charge*1.1,rate,rate*(.74+.12*charge));
      }
      this._inject(cx,cy,3.1,8*strength*dt,3*strength*dt);
      this._spawnPuffs(cx,cy,t,charge,blast,reduced);
      this._spawnFlames(cx,cy,t,charge,blast,reduced);
      this._spawnEmbers(cx,cy,t,charge,blast,reduced);
    }
    // A fuel-limited, finite ignition reaction: burning consumes fuel,
    // deposits temperature and luminous reaction products, and makes a
    // small amount of smoke. The hot core ignites incoming fuel.
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const k=y*w+x;
      const ignition=smooth((this.heat[k]-.23)/.87);
      if(ignition<=0||this.fuel[k]<=0)continue;
      const burn=Math.min(this.fuel[k],this.fuel[k]*ignition*dt*(3.8+1.8*charge));
      this.fuel[k]-=burn;
      this.heat[k]=Math.min(6.2,this.heat[k]+burn*.42);
      this.flame[k]=Math.min(6.5,this.flame[k]+burn*3.8);
      this.density[k]=Math.min(8,this.density[k]+burn*.075);
    }
    this._fieldEdges();
    const rest=[];
    for(const p of this.embers){
      p.age+=dt;
      if(p.age>=p.life)continue;
      p.px=p.x;p.py=p.y;
      const [vx,vy]=this.velocityAt(p.x,p.y);
      p.x += vx*dt*.94+(hash(this.seed+p.age*19)-.5)*dt*2;
      p.y += vy*dt*.94-dt*2.4;
      this._reflectParticle(p);
      rest.push(p);
    }
    this.embers=rest;
    const puffs=[];
    for(const puff of this.puffs){
      puff.age+=dt;
      if(puff.age>puff.life)continue;
      const [vx,vy]=this.velocityAt(puff.x,puff.y);
      puff.x+=vx*dt*.88;
      puff.y+=(vy-1.9)*dt;
      this._reflectParticle(puff);
      puffs.push(puff);
    }
    this.puffs=puffs;
    const tongues=[];
    for(const f of this.flames) {
      f.age+=dt;
      if(f.age>=f.life)continue;
      f.px=f.x;f.py=f.y;
      const [vx,vy]=this.velocityAt(f.x,f.y);
      f.x+=vx*dt*.96;
      f.y+=(vy-2.1)*dt*.96;
      this._reflectParticle(f);
      f.heat=clamp(this.sample(this.flame,f.x,f.y)/2.8,0,1);
      tongues.push(f);
    }
    this.flames=tongues;
    this.time=t;
  }
  advanceTo(time,origin,reduced=false) {
    if(!Number.isFinite(time)||time<=this.time)return;
    const target=clamp(time,0,6);
    // Bounded catch-up keeps tab suspension and fast playback from freezing UI.
    let steps=0;
    while(this.time+DT*.5<target && steps<8){
      this.step(origin,reduced);
      steps++;
    }
    if(target-this.time>DT*8)this.time=target-DT*8;
  }
  stats(origin={x:.5,y:.5}) {
    const cx=origin.x*(this.w-1),cy=origin.y*(this.h-1);
    let mass=0,radialMass=0,remote=0,fuelMass=0,flameMass=0,heatMass=0;
    for(let y=0;y<this.h;y++)for(let x=0;x<this.w;x++){
      const d=this.density[y*this.w+x],r=Math.hypot(x-cx,y-cy);
      mass+=d;radialMass+=d*r;
      fuelMass+=this.fuel[y*this.w+x];
      flameMass+=this.flame[y*this.w+x];
      heatMass+=this.heat[y*this.w+x];
      if(r>Math.min(this.w,this.h)*.31)remote+=d;
    }
    return {mass,radius:mass>0?radialMass/mass:0,remote,fuel:fuelMass,flame:flameMass,heat:heatMass};
  }
  render(ctx,width,height,{smoke=1,fire=1,reduced=false}={}) {
    if(!this.surface){
      this.surface=document.createElement('canvas');
      this.surface.width=this.w;this.surface.height=this.h;
      this.sctx=this.surface.getContext('2d',{willReadFrequently:false});
      this.pixels=this.sctx.createImageData(this.w,this.h);
      this.fireSurface=document.createElement('canvas');
      this.fireSurface.width=this.w;this.fireSurface.height=this.h;
      this.fireCtx=this.fireSurface.getContext('2d');
      this.firePixels=this.fireCtx.createImageData(this.w,this.h);
      // One reusable lumpy smoke brush: every moving billow originates at the
      // player and follows the same velocity field as the density texture.
      this.brush=document.createElement('canvas');
      this.brush.width=this.brush.height=128;
      const bctx=this.brush.getContext('2d');
      for(let n=0;n<6;n++) {
        const a=n*2.399,px=64+Math.cos(a)*23,py=64+Math.sin(a)*19,r=31+(n%3)*8;
        const g=bctx.createRadialGradient(px,py,r*.05,px,py,r);
        g.addColorStop(0,'rgba(27,29,31,.73)');
        g.addColorStop(.55,'rgba(40,42,44,.53)');
        g.addColorStop(.85,'rgba(67,65,64,.16)');
        g.addColorStop(1,'rgba(57,54,52,0)');
        bctx.fillStyle=g;bctx.beginPath();bctx.arc(px,py,r,0,Math.PI*2);bctx.fill();
      }
    }
    const im=this.pixels.data,glowPixels=this.firePixels.data;
    const w=this.w,h=this.h,den=this.density,heat=this.heat,flame=this.flame;
    const flameFade=1-smooth((this.time-3.42)/.56);
    const smokeFade=1-smooth((this.time-4.22)/.78);
    const sootLate=smooth((this.time-3.12)/.75);
    let fireOpacity=0,sootOpacity=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const k=y*w+x,o=k*4,d=den[k],hot=heat[k],reaction=flame[k];
      if((d<.005&&reaction<.008)||smokeFade<=0) {
        im[o+3]=0;glowPixels[o+3]=0;continue;
      }
      // The flame is an emissive combustion field; soot density is NOT the
      // source of orange light. Spatial gradients create rolling flame edges.
      const xl=x>0?k-1:k,xr=x<w-1?k+1:k;
      const yl=y>0?k-w:k,yr=y<h-1?k+w:k;
      const rim=clamp((Math.abs(flame[xr]-flame[xl])+Math.abs(flame[yr]-flame[yl]))*.10,0,1);
      const breakup=.69+.31*Math.sin(x*.31+y*.23-this.time*3.8)*Math.cos(y*.46-x*.17+this.time*2.8);
      const fireA=clamp((1-Math.exp(-reaction*.50*fire))*flameFade*(.86+.14*rim)*breakup,0,.97);
      const sootA=clamp((1-Math.exp(-d*.60))*(.095+.29*sootLate)*smoke*smokeFade,0,.52);
      const coverage=clamp(fireA+sootA*(1-fireA),0,.98);
      if(coverage<.002){im[o+3]=0;glowPixels[o+3]=0;continue;}
      const color=FIRE_PALETTE[Math.round(clamp((hot-.13)/7.0,0,1)*255)];
      const smoky=clamp(sootA*(1-fireA)/coverage,0,1);
      const sootShade=37+Math.round(rim*12);
      for(let j=0;j<3;j++)im[o+j]=Math.round(color[j]*(1-smoky)+sootShade*smoky);
      im[o+3]=Math.round(255*coverage);
      // Only the actual reaction field contributes to the fire's soft bloom.
      glowPixels[o]=color[0];
      glowPixels[o+1]=color[1];
      glowPixels[o+2]=color[2];
      glowPixels[o+3]=Math.round(255*fireA);
      fireOpacity+=fireA;sootOpacity+=sootA*(1-fireA);
    }
    this.lastRenderMetrics={fireOpacity,sootOpacity,
      fireFraction:fireOpacity+sootOpacity>0?fireOpacity/(fireOpacity+sootOpacity):0};
    this.sctx.putImageData(this.pixels,0,0);
    this.fireCtx.putImageData(this.firePixels,0,0);
    ctx.save();
    ctx.imageSmoothingEnabled=true;
    // A separate emissive bloom; the gray soot receives no additive glow.
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=reduced?.10:.31;
    ctx.filter=reduced?'blur(3px)':'blur(9px)';
    ctx.drawImage(this.fireSurface,0,0,width,height);
    ctx.filter='none';
    ctx.globalAlpha=1;
    ctx.globalCompositeOperation='source-over';
    ctx.filter=reduced?'blur(1px)':'blur(1.8px)';
    ctx.drawImage(this.surface,0,0,width,height);
    ctx.filter='none';
    const sx=width/w,sy=height/h;
    // Advected billows give the gas irregular volume without 3D ray marching.
    ctx.globalCompositeOperation='source-over';
    for(const p of this.puffs) {
      const life=smooth(Math.min(p.age/.2,1))*(1-smooth((p.age/p.life-.57)/.43));
      // Smoke is secondary while fire burns; it becomes more visible after
      // the flame front collapses into the ashfall.
      const alpha=life*smokeFade*(.08+.27*sootLate)*smoke*(reduced?.55:1);
      if(alpha<=.005)continue;
      const r=p.size*(1+p.age*1.75)*sx;
      ctx.save();ctx.globalAlpha=alpha;
      ctx.translate(p.x*sx,p.y*sy);ctx.rotate(p.rotate+p.age*.30);
      ctx.drawImage(this.brush,-r,-r,r*2,r*2);
      ctx.restore();
    }
    // Ember particle motion remains in the gas solver; rendering lives in
    // studio.js via the nearest-neighbor Rising Ember atlas. No canvas strokes.
    ctx.globalCompositeOperation='source-over';
    ctx.restore();
  }
}
