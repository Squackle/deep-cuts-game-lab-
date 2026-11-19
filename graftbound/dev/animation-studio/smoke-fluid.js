// GRAFTBOUND Cinderstorm Animation Lab: small, independently-authored 2D smoke simulator.
// Grid-based semi-Lagrangian transport + pressure projection + curl turbulence + buoyancy.
// The camera-facing smoke sheet is an illusion of volume, NOT a full 3D fluid solver.
// Reference principles: NVIDIA GPU Gems chapter 38; Unreal Niagara 2D Gas; Unity Curl Noise.
// Pure math until render() is called; it never reads game state, save data or gameplay RNG.
const DT = 1 / 30;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = v => { const t = clamp(v, 0, 1); return t*t*(3-2*t); };
const hash = n => { const s = Math.sin(n*127.1+78.233)*43758.5453; return s-Math.floor(s); };

export class SmokeField {
  constructor(w = 98, h = 62) {
    this.w = Math.max(18, Math.floor(w));
    this.h = Math.max(18, Math.floor(h));
    this.n = this.w*this.h;
    for(const k of ['u','v','nu','nv','density','heat','nextDensity','nextHeat','div','p','pn','curl']) {
      this[k] = new Float32Array(this.n);
    }
    this.embers = [];
    this.puffs = [];
    this.reset();
  }
  reset() {
    for(const k of ['u','v','nu','nv','density','heat','nextDensity','nextHeat','div','p','pn','curl']) this[k].fill(0);
    this.time = 0;
    this.embers.length = 0;
    this.puffs.length = 0;
    this.seed = 0;
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
    for(const a of [this.density,this.heat]){
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
      this.density[k]=Math.min(8,this.density[k]+amount*falloff);
      this.heat[k]=Math.min(5,this.heat[k]+fire*falloff);
    }
  }
  _spawnEmbers(cx,cy,t,charge,blast,reduced) {
    if(t>3.42)return;
    const count=reduced?2:Math.round(2+5*charge+7*blast);
    const max=reduced?48:170;
    for(let i=0;i<count && this.embers.length<max;i++){
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
      const outward=(1+92*blast)*fall*strength*lobes*(1-dying*.75);
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
    const decay=Math.exp(-dt*(.39+dying*3.7)),cool=Math.exp(-dt*(1.8+dying*3.6));
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const k=y*w+x;
      const dx=x-cx,dy=y-cy,r=Math.max(1,Math.hypot(dx,dy));
      // The blow-out component spreads the cloud outward instead of letting it
      // swirl in one spot; only the caster emits new material.
      // Outward force turns into recirculating wall flow rather than moving
      // smoke through the container. Projected backtraces stay within the box.
      const boundary=Math.min(x-1,y-1,w-2-x,h-2-y);
      const radiate=blast*strength*22/(1+r*.03)*smooth(boundary/5);
      const vx=u[k]+(dx/r)*radiate,vy=v[k]+(dy/r)*radiate;
      const bx=x-vx*dt,by=y-vy*dt;
      this.nextDensity[k]=this.sample(this.density,bx,by)*decay;
      this.nextHeat[k]=this.sample(this.heat,bx,by)*cool;
    }
    [this.density,this.nextDensity]=[this.nextDensity,this.density];
    [this.heat,this.nextHeat]=[this.nextHeat,this.heat];
    this._fieldEdges();
    this.nextDensity.fill(0);this.nextHeat.fill(0);
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
      this._spawnEmbers(cx,cy,t,charge,blast,reduced);
    }
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
    let mass=0,radialMass=0,remote=0;
    for(let y=0;y<this.h;y++)for(let x=0;x<this.w;x++){
      const d=this.density[y*this.w+x],r=Math.hypot(x-cx,y-cy);
      mass+=d;radialMass+=d*r;
      if(r>Math.min(this.w,this.h)*.31)remote+=d;
    }
    return {mass,radius:mass>0?radialMass/mass:0,remote};
  }
  render(ctx,width,height,{smoke=1,reduced=false}={}) {
    if(!this.surface){
      this.surface=document.createElement('canvas');
      this.surface.width=this.w;this.surface.height=this.h;
      this.sctx=this.surface.getContext('2d',{willReadFrequently:false});
      this.pixels=this.sctx.createImageData(this.w,this.h);
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
    const im=this.pixels.data,w=this.w,h=this.h,den=this.density,heat=this.heat;
    const fade=1-smooth((this.time-3.46)/.88);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const k=y*w+x,o=k*4,d=den[k],hot=heat[k];
      if(d<.006||fade<=0){im[o+3]=0;continue;}
      // Density = opacity, heat = emission/color. Neighbor gradients produce
      // subtle pale back-lit edges on the smoke plumes instead of flat dark fog.
      const xl=k-1>=y*w?k-1:k,xr=x<w-1?k+1:k;
      const yl=y>0?k-w:k,yr=y<h-1?k+w:k;
      const rim=Math.min(1,Math.abs(den[xr]-den[xl])*.22+Math.abs(den[yr]-den[yl])*.24);
      const eddy=.78+.22*Math.sin(x*.43+y*.25-this.time*3)*Math.cos(y*.31-x*.1+this.time*2);
      const ember=clamp(hot*.18,0,.64);
      const shade=clamp(8+rim*48+d*2,0,75);
      // Charcoal body, silver-gray curling edges and isolated red hot pockets.
      // Fire appears INSIDE the cloud instead of uniformly tinting it yellow.
      im[o]=clamp(26+shade+ember*62,0,255);
      im[o+1]=clamp(30+shade+ember*23,0,255);
      im[o+2]=clamp(35+shade*.92-ember*13,0,255);
      im[o+3]=Math.round(255*clamp((1-Math.exp(-d*.70*smoke))*fade*eddy,0,.92));
    }
    this.sctx.putImageData(this.pixels,0,0);
    ctx.save();
    ctx.imageSmoothingEnabled=true;
    // A small filter softens the low-resolution density grid into continuous curls.
    ctx.filter=reduced?'blur(2px)':'blur(3px)';
    ctx.drawImage(this.surface,0,0,width,height);
    ctx.filter='none';
    const sx=width/w,sy=height/h;
    // Advected billows give the gas irregular volume without 3D ray marching.
    ctx.globalCompositeOperation='source-over';
    for(const p of this.puffs) {
      const life=smooth(Math.min(p.age/.2,1))*(1-smooth((p.age/p.life-.57)/.43));
      const alpha=life*fade*(reduced?.18:.30);
      if(alpha<=.005)continue;
      const r=p.size*(1+p.age*1.75)*sx;
      ctx.save();ctx.globalAlpha=alpha;
      ctx.translate(p.x*sx,p.y*sy);ctx.rotate(p.rotate+p.age*.30);
      ctx.drawImage(this.brush,-r,-r,r*2,r*2);
      ctx.restore();
    }
    ctx.globalCompositeOperation='lighter';
    for(const p of this.embers){
      const life=1-p.age/p.life;
      if(life<=0)continue;
      ctx.strokeStyle=p.bright>.75?'rgba(255,237,143,'+(life*.86)+')':'rgba(255,107,38,'+(life*.78)+')';
      ctx.lineWidth=(.7+p.size*1.2)*life;
      ctx.lineCap='round';
      ctx.shadowColor='#ff6a23';
      ctx.shadowBlur=5+life*6;
      ctx.beginPath();
      ctx.moveTo(p.px*sx,p.py*sy);
      ctx.lineTo(p.x*sx,p.y*sy);
      ctx.stroke();
    }
    ctx.globalCompositeOperation='source-over';
    ctx.restore();
  }
}
