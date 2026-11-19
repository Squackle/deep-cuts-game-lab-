// Lightweight, self-contained Canvas 2D backdrop for the Pyroclasm study.
// It implements only the Scene methods this visual fixture calls. No WebGL,
// creature-atlas downloads, engine state, saved runs or game-rule changes.
// The real 3D scene remains unchanged on capable desktop devices.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const noise=(a,b,s=0)=>{
  let v=Math.imul(a+23,374761393)+Math.imul(b+17,668265263)+Math.imul(s+43,2246822519);
  v=Math.imul(v^(v>>>13),1274126177);
  return ((v^(v>>>16))>>>0)/4294967296;
};
function polygon(ctx,points,fill,stroke=null,width=1){
  ctx.beginPath();
  ctx.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
  ctx.closePath();
  ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke();}
}
export class CanvasBattleScene {
  constructor(canvas) {
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d',{alpha:false});
    if(!this.ctx)throw new Error('2D canvas not available');
    this.w=8;this.h=8;
    this.cam={mode:'canvas-2d'};
    this.units=new Map();
    this.zoom=1;this.reduced=false;this.time=0;
    this.mode='canvas-2d';
    this.theme='warrens';
  }
  setQuality(){ /* The CPU backdrop is intentionally low-power at every setting. */ }
  loadArena(battle,seed,theme='warrens'){
    this.w=battle.w||8;this.h=battle.h||8;
    this.theme=theme;this.units.clear();this.time=0;
  }
  world(x,y){return [x-this.w/2+.5,0,y-this.h/2+.5];}
  project([x,y,z]){
    const w=this.canvas.clientWidth||360,h=this.canvas.clientHeight||440;
    const scale=Math.min(w/15,h/10.2)*clamp(this.zoom,.8,1.24);
    return {
      x:w*.5+(x-z)*scale*.77,
      y:h*.52+(x+z)*scale*.51-y*scale*1.13
    };
  }
  addUnit(u,spriteKey){
    const unit={uid:u.uid,side:u.side,key:spriteKey,pos:this.world(u.x,u.y),
      dir:u.side==='enemy'?[0,1]:[0,-1],anim:'idle',animT:0,castLift:0,
      flash:0,hover:0,dead:false};
    this.units.set(u.uid,unit);
    return unit;
  }
  removeUnit(uid){this.units.delete(uid);}
  play(uid,anim){const u=this.units.get(uid);if(u){u.anim=anim;u.animT=0;}}
  heightOf(u){return u.key==='grub'?.6:u.key==='hound'?.86:1.12;}
  headPos(uid){
    const u=this.units.get(uid);if(!u)return [0,0,0];
    return [u.pos[0],this.heightOf(u)+(u.castLift||0)+.12,u.pos[2]];
  }
  centerPos(uid){
    const u=this.units.get(uid);if(!u)return [0,0,0];
    return [u.pos[0],this.heightOf(u)*.54,u.pos[2]];
  }
  hit(uid){const u=this.units.get(uid);if(u)u.flash=.42;}
  light(){/* Fire and hit light are already drawn by the overlay. */}
  shake(){/* Do not shake a narrow mobile viewport. */}
  _resize(){
    const w=Math.max(1,Math.round(this.canvas.clientWidth||360));
    const h=Math.max(1,Math.round(this.canvas.clientHeight||440));
    const dpr=Math.min(1.5,window.devicePixelRatio||1);
    const px=Math.round(w*dpr),py=Math.round(h*dpr);
    if(this.canvas.width!==px||this.canvas.height!==py){
      this.canvas.width=px;this.canvas.height=py;
    }
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
    return [w,h];
  }
  _boardCorners(y=0){
    return [
      this.project(this.world(-.5,-.5).map((v,i)=>i===1?y:v)),
      this.project(this.world(this.w-.5,-.5).map((v,i)=>i===1?y:v)),
      this.project(this.world(this.w-.5,this.h-.5).map((v,i)=>i===1?y:v)),
      this.project(this.world(-.5,this.h-.5).map((v,i)=>i===1?y:v))
    ];
  }
  _board(){
    const c=this.ctx,[w,h]=[this.canvas.clientWidth||360,this.canvas.clientHeight||440];
    c.fillStyle='#0d1414';c.fillRect(0,0,w,h);
    const ambient=c.createRadialGradient(w*.5,h*.53,9,w*.5,h*.53,Math.max(w,h)*.65);
    ambient.addColorStop(0,'#343125');ambient.addColorStop(.63,'#1e211c');
    ambient.addColorStop(1,'#0d1615');
    c.fillStyle=ambient;c.fillRect(0,0,w,h);
    // A restrained lava-lit chasm keeps the silhouette of the raised board
    // readable on narrow screens while preserving the 8x8 tile footprint.
    const outer=this._boardCorners(-.20).map(p=>({x:p.x,y:p.y+9}));
    polygon(c,outer,'#090b0b','#a44622',4);
    const corners=this._boardCorners();
    polygon(c,corners,'#392e25','#b47b42',2.4);
    for(let y=0;y<this.h;y++)for(let x=0;x<this.w;x++){
      const quad=[
        this.project(this.world(x-.5,y-.5)),
        this.project(this.world(x+.5,y-.5)),
        this.project(this.world(x+.5,y+.5)),
        this.project(this.world(x-.5,y+.5))
      ];
      const k=noise(x,y,14);
      const base=(x+y)%2?'#40392f':'#4b4134';
      polygon(c,quad,base,k>.86?'#a17c4a':'#685947',.65);
      if(k>.82){
        const p=this.project(this.world(x,y));
        c.fillStyle=k>.95?'#a56027':'#74664b';
        c.fillRect(Math.round(p.x-2),Math.round(p.y),3,1);
      }
    }
    polygon(c,corners,'rgba(0,0,0,0)','#b28e54',1.3);
    // Soft ground lights reflect the fire without drawing outside the arena.
    for(let y=0;y<3;y++){
      const x=(y*3+1)%8;
      const p=this.project(this.world(x,(y*2+1)%8));
      c.globalAlpha=.16;
      c.fillStyle='#ef8736';c.fillRect(Math.round(p.x-3),Math.round(p.y-1),6,2);
    }
    c.globalAlpha=1;
  }
  _unit(v){
    const c=this.ctx,p=this.project(v.pos);
    const scale=Math.max(1.15,Math.min(2.1,(this.canvas.clientWidth||360)/230));
    const kind=v.key;
    const foe=v.side==='enemy';
    const primary=foe?'#a45a48':'#557c8f';
    const highlight=foe?'#e6a18a':'#aed6da';
    const dark='#1b2021';
    const r=(x,y,w,h,color)=>{
      c.fillStyle=color;
      c.fillRect(Math.round(p.x+x*scale),Math.round(p.y+y*scale),Math.ceil(w*scale),Math.ceil(h*scale));
    };
    c.save();
    c.globalAlpha=.59;c.fillStyle='#080b0c';
    c.beginPath();c.ellipse(p.x,p.y+2*scale,6.7*scale,2.2*scale,0,0,Math.PI*2);c.fill();
    c.globalAlpha=1;
    if(kind==='hound'||kind==='grub'){
      r(-7,-9,13,6,dark);
      r(-6,-10,11,5,primary);
      r(4,-12,4,6,dark);
      r(5,-11,3,4,highlight);
      r(-6,-4,3,5,dark);r(3,-4,3,5,dark);
      if(kind==='hound'){r(-9,-9,4,2,primary);r(6,-14,2,3,dark);}
      else {r(-5,-11,3,2,highlight);r(1,-11,3,2,highlight);}
    }else{
      const cape=kind==='hexer'?'#553f68':kind==='warden'?'#596159':'#4a5764';
      r(-6,-16,12,15,dark);
      r(-5,-15,10,13,cape);
      r(-3,-21,7,6,dark);
      r(-2,-20,5,4,kind==='hexer'?'#c29abd':'#cfb68f');
      r(-5,-14,3,11,primary);r(3,-14,3,11,primary);
      r(-4,-2,3,5,dark);r(2,-2,3,5,dark);
      if(kind==='blank'){
        r(-8,-18,3,9,highlight);r(6,-18,3,9,highlight);
        r(-6,-23,2,5,highlight);r(6,-23,2,5,highlight);
      }else if(kind==='warden'){
        r(-8,-12,4,7,'#818478');r(5,-12,4,7,'#818478');
      }else if(kind==='hexer'){
        r(-5,-25,11,3,cape);
      }
    }
    if(v.flash>0){
      c.globalAlpha=Math.min(.6,v.flash*1.5);
      c.fillStyle='#ffbc67';
      c.fillRect(Math.round(p.x-10*scale),Math.round(p.y-27*scale),Math.round(20*scale),Math.round(29*scale));
    }
    c.restore();
  }
  frame(dt=0){
    this.time+=Math.max(0,dt);
    this._resize();
    this._board();
    const units=[...this.units.values()].sort((a,b)=>(a.pos[0]+a.pos[2])-(b.pos[0]+b.pos[2]));
    for(const u of units){
      u.animT+=dt;
      u.flash=Math.max(0,u.flash-dt);
      this._unit(u);
    }
  }
}
