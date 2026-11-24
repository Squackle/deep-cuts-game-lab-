/**
 * Native 128px anatomical attachments for the painterly Blank base.
 *
 * These are drawn into sprite atlases only when the saved visual state changes.
 * They share the source artwork's seven authored pose anchors, instead of doubling
 * the old 64px geometric overlays and obscuring the body.
 *
 * Original effects; zero simulation dependencies and no random numbers.
 */
import { BENCHMARK_STATES, poseFor } from './raster-benchmarks.js';
import { SKIN_PALETTES } from '../engine/visual-identity.js';

export const BLANK_NATIVE_FRAME = 128;

// Coordinates measured against assets/hd2d/benchmarks/blank-poses.png.
// Each anchor belongs to an ACTUAL painted pose (six front poses + one rear).
const POSES = Object.freeze([
  {head:[64,25],face:[68,37],neck:[62,40],chest:[62,53],back:[61,54],hip:[63,78],leftHand:[43,74],rightHand:[83,75],leftFoot:[43,116],rightFoot:[89,115]},
  {head:[64,25],face:[68,37],neck:[62,40],chest:[62,53],back:[61,54],hip:[63,78],leftHand:[43,74],rightHand:[83,75],leftFoot:[43,116],rightFoot:[89,115]},
  {head:[67,24],face:[71,36],neck:[66,41],chest:[65,52],back:[64,52],hip:[65,78],leftHand:[46,67],rightHand:[88,67],leftFoot:[42,116],rightFoot:[88,113]},
  {head:[69,22],face:[73,35],neck:[67,41],chest:[67,52],back:[66,52],hip:[66,78],leftHand:[46,68],rightHand:[88,68],leftFoot:[42,116],rightFoot:[89,112]},
  {head:[67,25],face:[72,38],neck:[65,42],chest:[65,54],back:[64,54],hip:[65,79],leftHand:[49,40],rightHand:[90,65],leftFoot:[41,118],rightFoot:[94,112]},
  {head:[71,25],face:[75,38],neck:[69,42],chest:[69,54],back:[67,53],hip:[67,78],leftHand:[42,53],rightHand:[109,48],leftFoot:[40,117],rightFoot:[92,113]},
  {head:[72,25],face:[76,38],neck:[69,43],chest:[68,54],back:[67,54],hip:[67,79],leftHand:[48,76],rightHand:[88,77],leftFoot:[50,116],rightFoot:[90,115]}
].map(x=>Object.freeze(x)));

const c={ink:'#3b2419',deep:'#493a38',bronze:'#855f4a',horn:'#e5d4b1',
  hornLight:'#fff0cc',scale:'#5a746e',scaleLight:'#a0baac',
  wing:'#895352',wingLight:'#d49780',feather:'#d8c7b0',featherHi:'#fff0d1',
  bark:'#76513a',barkHi:'#b58d62',leaf:'#64874a',leafHi:'#b6d58c',
  fur:'#a98158',furHi:'#d9b78c',metal:'#5d7687',steel:'#bbcbd1',
  steelHi:'#f7ebd2',gold:'#d5ab62',venom:'#ab83cd'};
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
/** v1.6.0: grafted flesh (sockets, wing roots, tail roots, reshaped hands) uses the adventure's generated skin palette. */
let SK={light:'#e8bc91',mid:'#c78e62',dark:'#81583e'};
export function setGraftSkin(pattern,tone=0){const t=pattern?.tones?.[0]??tone,p=SKIN_PALETTES[((t%SKIN_PALETTES.length)+SKIN_PALETTES.length)%SKIN_PALETTES.length];SK={light:p[0],mid:p[1],dark:p[2]};}
const hexMix=(a,b,k)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-k)+parseInt(b.slice(i,i+2),16)*k).toString(16).padStart(2,'0')).join('');
/** A fleshy socket where a graft meets the body: skin-toned mound with a dark crease, so parts grow OUT of the body. */
function socket(g,x,y,rx,ry,tint=null){const base=tint?hexMix(SK.mid,tint,0.35):SK.mid;
  oval(g,x,y+1,rx+1,ry+1,SK.dark,null);oval(g,x,y,rx,ry,base,null);oval(g,x-rx*0.3,y-ry*0.35,rx*0.45,ry*0.4,SK.light,null);
  g.strokeStyle='rgba(48,39,35,.55)';g.lineWidth=1;g.beginPath();g.ellipse(x,y,rx,ry,0,0.15*Math.PI,0.85*Math.PI);g.stroke();}
const level=n=>clamp(Number(n)||0,0,3);

export function blankNativeAnchor(state,frame,view){
  const pose=POSES[poseFor(state,frame,view)];
  if(view!==1)return pose;
  const sway=state==='walk'?[-1,1,2,-1][frame]:state==='attack'?[0,1,3,1][frame]:state==='hurt'?[0,-2,1,0][frame]:0;
  const rise=state==='walk'?[0,-2,-1,0][frame]:0;
  return Object.fromEntries(Object.entries(pose).map(([k,[x,y]])=>[k,[x+sway,y+rise]]));
}
function line(g,pts,col,width=1){
  g.beginPath();g.moveTo(...pts[0]);for(const p of pts.slice(1))g.lineTo(...p);
  g.lineJoin='round';g.lineCap='round';g.lineWidth=width;g.strokeStyle=col;g.stroke();
}
function shape(g,pts,fill,edge=c.ink,thick=1){
  g.beginPath();g.moveTo(...pts[0]);for(const p of pts.slice(1))g.lineTo(...p);g.closePath();
  g.fillStyle=fill;g.fill();if(edge){g.lineWidth=thick;g.strokeStyle=edge;g.stroke();}
}
function oval(g,x,y,rx,ry,col,edge=null,width=1){
  g.beginPath();g.ellipse(x,y,rx,ry,0,0,2*Math.PI);
  g.fillStyle=col;g.fill();if(edge){g.strokeStyle=edge;g.lineWidth=width;g.stroke();}
}
function gloss(g,x,y,r,color1,color2){
  const ramp=g.createRadialGradient(x-r*.3,y-r*.45,0,x,y,r);
  ramp.addColorStop(0,color1);ramp.addColorStop(1,color2);return ramp;
}
function blade(g,start,tip,w){
  const [x,y]=start,[tx,ty]=tip,dx=tx-x,dy=ty-y,dist=Math.hypot(dx,dy)||1;
  const px=-dy/dist*w,py=dx/dist*w;
  shape(g,[[x-px,y-py],[tx,ty],[x+px,y+py]],gloss(g,x,y,dist,c.hornLight,c.bronze),c.deep,.9);
  line(g,[[x,y],[tx,ty]],c.hornLight,1);
}
// v1.5.0 silhouette-scale anatomy: parts are sized to change the OUTLINE of the 128px body (readable at game zoom),
// with 2px ink edges and a lit rim. Tier (1..3) grows each part. Deterministic; no RNG.
function wings(g,A,kind,tier,view,state,frame,trim=null){
  const [bx,by]=A.back, flap=state==='walk'?[0,3,5,2][frame]:state==='cast'?[3,6,8,4][frame]:state==='attack'?[0,-4,-6,-2][frame]:[0,1,2,1][frame];
  const span=Math.min(22+tier*7,bx-6,122-bx), lift=Math.min(34+tier*5,by-6);   // v1.8.0: proportioned to the painted body   // stays inside its 128px frame
  for(const side of [-1,1]){
    const root=[bx+side*4,by-2], tip=[bx+side*span,by-lift-flap], elbow=[bx+side*(span*0.45),by-lift*0.72-flap*0.5];
    const edge=kind==='feather'?c.feather:c.wing, hi=kind==='feather'?c.featherHi:c.wingLight;
    g.beginPath();g.moveTo(...root);g.quadraticCurveTo(elbow[0],elbow[1]-6,tip[0],tip[1]);
    const n=kind==='feather'?5:4;
    for(let i=0;i<=n;i++){const t=i/n, x=tip[0]+(root[0]-tip[0])*t*0.9+side*(1-t)*6, y=tip[1]+(by+14-tip[1])*Math.sin(t*Math.PI/2);
      if(kind==='feather')g.lineTo(x+side*4,y+6);else g.quadraticCurveTo(x+side*7,y-3,x,y+(i%2?3:0));}
    g.lineTo(root[0],by+12);g.closePath();
    { const lg=g.createLinearGradient(root[0],root[1],tip[0],tip[1]); lg.addColorStop(0,hexMix(SK.mid,edge,0.25)); lg.addColorStop(0.28,hexMix(SK.mid,hi,0.7)); lg.addColorStop(1,edge);
      g.fillStyle=lg;g.fill();g.lineWidth=2.4;g.strokeStyle=c.ink;g.stroke(); }
    if(trim==='feather')for(let i=1;i<=4;i++){const t=i/5,x=tip[0]+(root[0]-tip[0])*t*0.85,y=tip[1]+(by+12-tip[1])*Math.sin(t*Math.PI/2);shape(g,[[x,y],[x+side*3,y+9],[x-side*2,y+7]],c.featherHi,c.ink,1);}
    if(trim==='membrane')line(g,[elbow,[elbow[0]+side*span*0.25,by-6]],c.deep,2.2);
    line(g,[root,elbow,tip],kind==='feather'?c.featherHi:c.deep,3);
    socket(g,root[0]+side*1.5,root[1]+2,2.6+tier*0.5,1.8,kind==='feather'?c.feather:c.wing);   // scapula: the wing bone rises out of the shoulder blade
    if(kind!=='feather')for(let i=1;i<=3;i++)line(g,[elbow,[tip[0]+(root[0]-tip[0])*i/4,by+8-i*2]],c.deep,1.6);
    else for(let i=1;i<=4;i++)line(g,[[elbow[0]+side*i*3,elbow[1]+i*6],[elbow[0]+side*(i*3+8),elbow[1]+i*6+6]],c.featherHi,1.4);
  }
}
/** Attach tails to the lumbar spine, above the pelvis. Interpolate each authored pose's
 * back/hip anchors so swaying and attacking keep the base attached to the lower back. */
export function blankNativeTailRoot(A){
  const [bx,by]=A.back,[hx,hy]=A.hip;
  return [Math.round(bx+(hx-bx)*0.45),Math.round(by+(hy-by)*0.48)];
}
function tail(g,A,kind,tier,view,frame){
  const [hx,hy]=blankNativeTailRoot(A),sign=view===1?-1:1, swish=[0,2,4,2][frame]||0, len=Math.min(34+tier*8,(sign>0?120-hx:hx-8)-8);
  g.beginPath();g.moveTo(hx+sign*2,hy-4);
  g.bezierCurveTo(hx+sign*(len*0.6),hy+2,hx+sign*(len*0.9),hy+22,hx+sign*len,hy+30-swish);
  g.lineTo(hx+sign*(len+7),hy+34-swish);
  g.bezierCurveTo(hx+sign*(len*0.82),hy+30,hx+sign*(len*0.5),hy+14,hx+sign*2,hy+8);g.closePath();
  { const tc=kind==='fur'?c.fur:c.scale, lg=g.createLinearGradient(hx,hy,hx+sign*len,hy+30); lg.addColorStop(0,SK.mid); lg.addColorStop(0.3,hexMix(SK.mid,tc,0.6)); lg.addColorStop(1,tc);
    g.fillStyle=lg;g.fill();g.lineWidth=2.2;g.strokeStyle=c.ink;g.stroke(); }
  socket(g,hx+sign*3,hy+1,3+tier*0.6,2.2,kind==='fur'?c.fur:c.scale);   // tail root grows from the lumbar lower back, not the buttocks
  for(let i=1;i<6;i++){const x=hx+sign*(len*i/6),y=hy+4+i*4.5;line(g,[[x,y-3],[x+sign*3,y+3]],kind==='fur'?c.furHi:c.scaleLight,1.6);}
  if(kind==='serpent'||kind==='scaled')blade(g,[hx+sign*(len+2),hy+30-swish],[hx+sign*(len+12),hy+26-swish],5);
}
function treeSurface(g,A){
  const [x,y]=A.chest;
  for(let i=0;i<7;i++){
    const dx=((i*11)%25)-12,dy=((i*7)%25)-10;
    line(g,[[x+dx,y+dy],[x+dx+(i%3)-1,y+dy+6]],c.bark,2);
    line(g,[[x+dx+.5,y+dy],[x+dx+.5,y+dy+3]],c.barkHi,.9);
  }
}
const BONE={hi:'#d9c3a4',mid:'#a88c6c',low:'#6e5642'};   // v1.8.0: keratin plates tinted toward the skin, not white armour
function armoredChest(g,A,tier){   // v1.6.0: grown bone/keratin plates (biological graft), not forged steel
  const [x,y]=A.chest,w=10+tier*1.5;
  shape(g,[[x-w,y-13],[x-4,y-16],[x,y-11],[x+4,y-16],[x+w,y-13],[x+w+3,y+9],[x+6,y+18],[x-6,y+18],[x-w-3,y+9]],gloss(g,x,y-4,26,BONE.hi,BONE.mid),c.ink,2.2);
  for(const side of [-1,1])shape(g,[[x+side*(w-2),y-15],[x+side*(w+10+tier*2),y-13],[x+side*(w+12+tier*2),y-4],[x+side*(w+2),y-2]],gloss(g,x+side*(w+6),y-12,14,BONE.hi,BONE.low),c.ink,2);
  line(g,[[x-w+3,y-9],[x,y-5],[x+w-3,y-9]],BONE.hi,2);line(g,[[x,y-6],[x,y+16]],BONE.low,1.6);
  for(let i=-1;i<=1;i++)line(g,[[x-w+4,y+2+i*5],[x+w-4,y+2+i*5]],BONE.low,1);   // growth ridges
  for(const side of [-1,1])line(g,[[x+side*(w+1),y+10],[x+side*(w-3),y+17]],SK.dark,1.6);   // plates sink into the flesh at the edges
}
function shell(g,A,tier,view=1){
  // v1.7.0 carapace: plates FOLLOW the back (clipped to the torso by the compositor), with a dorsal ridge.
  const [x,y]=A.back, rx=17+tier*2, ry=24+tier*2;
  if(view!==1){for(const side of [-1,1])shape(g,[[x+side*(rx-4),y-14],[x+side*(rx+2),y-4],[x+side*(rx+1),y+12],[x+side*(rx-5),y+16]],c.scale,c.deep,1);return;}
  oval(g,x,y+3,rx,ry,gloss(g,x-6,y-10,32,c.scaleLight,c.scale),null);
  for(let r=0;r<4;r++){const yy=y-14+r*9,w=rx-3-Math.abs(r-1.5)*2;
    for(let k=-1;k<=1;k++)shape(g,[[x+k*w*0.62-w*0.3,yy],[x+k*w*0.62,yy-3],[x+k*w*0.62+w*0.3,yy],[x+k*w*0.62+w*0.26,yy+6],[x+k*w*0.62-w*0.26,yy+6]],(r+k)%2?c.scale:c.scaleLight,c.deep,1);}
  line(g,[[x,y-20],[x,y+22]],c.deep,2.4);line(g,[[x-1,y-20],[x-1,y+20]],c.scaleLight,0.8);
}
function armoredBack(g,A,tier){
  // v1.7.0 back view: overlapping bone plates down the spine + pauldrons on the shoulder line — never a chest plate on the back.
  const [x,y]=A.back;
  for(let r=0;r<4;r++){const yy=y-16+r*9,w=7+tier-Math.abs(r-1)*1.2;shape(g,[[x-w,yy],[x,yy-4],[x+w,yy],[x+w-2,yy+6],[x-w+2,yy+6]],gloss(g,x-3,yy-2,12,BONE.hi,BONE.mid),c.ink,1.2);line(g,[[x-w+2,yy+5],[x+w-2,yy+5]],BONE.low,1);}
  for(const side of [-1,1])shape(g,[[x+side*9,y-18],[x+side*(18+tier),y-17],[x+side*(19+tier),y-9],[x+side*10,y-9]],gloss(g,x+side*14,y-16,10,BONE.hi,BONE.low),c.ink,1.2);
}
function surface(g,A,m){
  const [x,y]=A.chest;
  if(m.surface==='bark')treeSurface(g,A);
  if(m.surface==='scales')for(let row=0;row<5;row++)for(let col=0;col<4;col++){
    const px=x-8+col*5+(row%2)*2,py=y-8+row*5;
    line(g,[[px-1,py],[px+2,py+2],[px+4,py]],row%2?c.scale:c.scaleLight,1.25);
  }
  if(m.surface==='chitin')for(let row=0;row<4;row++){
    oval(g,x,y-9+row*6,11,3,c.scale,c.deep,.6);
    line(g,[[x-8,y-10+row*6],[x+8,y-10+row*6]],c.steel,1.2);
  }
  if(m.surface==='fur')for(let i=0;i<12;i++){
    const dx=((i*7)%23)-11,dy=((i*5)%25)-12;
    line(g,[[x+dx,y+dy],[x+dx+(i%2?2:-2),y+dy+3]],i%3?c.fur:c.furHi,1.25);
  }
}
function faceMorph(g,A,m,view){
  const [x,y]=A.head,[fx,fy]=A.face;
  if(m.head==='feline'){
    for(const side of [-1,1]){
      shape(g,[[x+side*6,y-6],[x+side*11,y-14],[x+side*14,y-3]],c.fur,c.deep,1.2);
      shape(g,[[x+side*9,y-6],[x+side*11,y-11],[x+side*12,y-6]],c.furHi,null);
    }
    if(view!==1){oval(g,fx+2,fy+3,5,3,c.furHi);oval(g,fx+5,fy+2,1.8,1,c.deep);}
  }
  if(m.head==='draconic'){
    // v1.6.0: a heavy scaled brow ridge grown from the skull (horns come only from the horns graft)
    const ridge=hexMix(SK.dark,c.scale,0.45),ridgeHi=hexMix(SK.mid,c.scaleLight,0.5);
    for(const side of [-1,1]){line(g,[[x+side*2,y-7],[x+side*7,y-9],[x+side*11,y-6]],ridge,3.2);line(g,[[x+side*3,y-8],[x+side*7,y-10]],ridgeHi,1.2);}
    if(view!==1)for(let i=0;i<3;i++)oval(g,fx-4+i*4,fy+1+(i%2),1.4,1,ridge,null);   // cheek scales
  }
  if(m.head==='beak'&&view!==1)blade(g,[fx+3,fy+3],[fx+13,fy+6],4);
}
function horns(g,A,tier){
  // v1.6.0: horns root in bony bosses on the CROWN (never across the face) and sweep up and outward.
  const [x,y]=A.head, L=11+tier*5, by=y-10;
  for(const side of [-1,1]){
    socket(g,x+side*6,by+1,3.4+tier*0.5,2.4,c.horn);
    const b0=[x+side*3.5,by-1], b1=[x+side*7.5,by+0.5], tip=[x+side*(9+L*0.75),Math.max(3,by-L*0.85)], ctl=[x+side*(8+L*0.55),by-L*0.3];
    g.beginPath();g.moveTo(...b0);g.quadraticCurveTo(x+side*(3+L*0.3),by-L*0.7,...tip);g.quadraticCurveTo(...ctl,...b1);g.closePath();
    const lg=g.createLinearGradient(b0[0],b0[1],tip[0],tip[1]);lg.addColorStop(0,hexMix(SK.mid,c.horn,0.55));lg.addColorStop(0.35,c.horn);lg.addColorStop(1,c.hornLight);
    g.fillStyle=lg;g.fill();g.lineWidth=1.8;g.strokeStyle=c.ink;g.stroke();
    for(let k=1;k<4;k++){const t=k/4.2,px=b0[0]+(tip[0]-b0[0])*t,py=b0[1]+(tip[1]-b0[1])*t;line(g,[[px-side*1.5,py+1.5],[px+side*2,py+2.5]],c.bronze,1);}
  }
}
function antlers(g,A,tier){
  const [x,y]=A.head;
  for(const side of [-1,1]){
    socket(g,x+side*6,y-6,3.2,2.4,c.bark);   // antler pedicles
    const st=[x+side*6,y-7],top=[x+side*(20+tier*4),Math.max(2,y-26-tier*2)];
    line(g,[st,top],c.ink,6);line(g,[st,top],c.bark,4);
    for(const [a,b2] of [[0.35,[-6,-10]],[0.6,[9,-6]],[0.85,[2,-9]]]){const px=st[0]+(top[0]-st[0])*a,py=st[1]+(top[1]-st[1])*a;
      line(g,[[px,py],[px+side*b2[0],py+b2[1]]],c.ink,4);line(g,[[px,py],[px+side*b2[0],py+b2[1]]],c.barkHi,2.4);}
  }
}
function claw(g,pos,side,tier){
  // v1.6.0: the hand itself is RESHAPED — an enlarged knuckled paw in the body's own skin, ending in claws — instead of a
  // dark accessory floating over the painted hand.
  const [x,y]=pos, L=8+tier*3, r=6+tier*0.8;
  oval(g,x,y+1,r+1.2,r,SK.dark,c.ink,1.6);oval(g,x-0.8,y,r,r-1,SK.mid,null);oval(g,x-2,y-2,r*0.5,r*0.38,SK.light,null);
  for(let i=-1;i<=1;i++){line(g,[[x+i*3.4,y+r-2],[x+i*3.6,y+r+1]],SK.dark,2.2);}
  for(let i=-1;i<=1;i++){blade(g,[x+i*3.6,y+r-1],[x+side*(L*0.5)+i*4.5,y+r+L],3.8);}
}
function moss(g,A){
  const [x,y]=A.chest;
  for(let i=0;i<11;i++){
    const dx=((i*13)%30)-15,dy=((i*7)%31)-15;
    oval(g,x+dx,y+dy,1.5+(i%2),2.3,i%2?c.leaf:c.leafHi,null);
  }
}
/** v1.5.0: every absorbed creature leaves a visible stitched graft seam (up to 6), so even a vanilla graft reads. */
function graftSeams(g,A,stage){
  const spots=[[A.chest,[-10,-6],[8,-2]],[A.leftHand,[-2,-12],[4,-4]],[A.rightHand,[2,-12],[-4,-4]],[A.hip,[-12,2],[-2,6]],[A.neck,[-6,2],[6,2]],[A.hip,[4,4],[12,0]]];
  // v1.6.0: healed graft scars, not stitches. They fade as the body integrates more grafts (fully absorbed by 8).
  const a=stage>=8?0:stage>=5?0.25:0.45;if(!a)return;
  g.save();g.globalAlpha=a;
  for(let i=0;i<Math.min(4,stage);i++){const [[x,y],[ax,ay],[bx,by]]=spots[i];line(g,[[x+ax,y+ay],[x+(ax+bx)/2,y+(ay+by)/2+1],[x+bx,y+by]],SK.dark,1.4);}
  g.restore();
}
/** v1.7.0 part filter: 'conform' paints only torso-conforming anatomy (shell, bone plates) so the compositor can clip
 *  it to the torso silhouette; 'rest' paints everything else; null paints all (legacy/tests). */
let PART_FILTER=null;export const setPartFilter=f=>{PART_FILTER=f;};
const want=kind=>!PART_FILTER||PART_FILTER===kind;
// Six original lineage accents, attached to the current native pose.
function pilotMark(g,A,mark,view,frame){
 const [nx,ny]=A.neck,[x,y]=A.chest,[bx,by]=A.back;
 if(mark==='goldFeathers'){
  for(const side of [-1,1])for(let i=0;i<3;i++){const u=bx+side*(13+i*4),v=by-12+i*5;shape(g,[[u,v],[u+side*13,v-10],[u+side*7,v+9]],'#eed9a3','#997e50',1);}
 }else if(mark==='cloudCrest'){
  for(let i=-1;i<=1;i++)oval(g,nx+i*7,ny-5-Math.abs(i)*2,6,3,'#bfdce8','#5e869e',1);
 }else if(mark==='pirateRidge'){
  for(const side of [-1,1])shape(g,[[x+side*8,y-14],[x+side*18,y-6],[x+side*14,y+5],[x+side*9,y+4]],'#716047','#3d3936',1.2);
  oval(g,x,y+3,4,3,'#d0aa66','#594a33',1);
 }else if(mark==='bloodMantle'){
  for(const side of [-1,1])shape(g,[[x+side*4,y-13],[x+side*20,y-9],[x+side*16,y+7],[x+side*6,y+4]],'#732c43','#3b2635',1.3);
 }else if(mark==='swiftBands'){
  for(const [u,v] of [A.leftHand,A.rightHand]){line(g,[[u-4,v-6],[u+4,v-6]],'#b86738',4);line(g,[[u-4,v-7],[u+4,v-7]],'#f3c384',1.1);}
 }else if(mark==='goblinCrest'){
  const [u,v]=A.head;for(let i=-1;i<=1;i++)shape(g,[[u+i*5,v-5],[u+i*6,v-18+Math.abs(i)*3],[u+i*5+4,v-5]],'#a8844e','#584633',1);
 }else if(mark==='leafCollar'){
  for(const side of [-1,1])for(let i=0;i<3;i++){const u=nx+side*(4+i*4),v=ny+5+i*2;shape(g,[[u,v],[u+side*7,v-7],[u+side*9,v+2],[u+side*3,v+5]],i===1?'#9cbd70':'#466f47',c.deep,1);}
 }else if(mark==='batRibs'){
  for(const side of [-1,1]){const root=[bx+side*11,by-8],tip=[bx+side*(29+frame%2*2),by-25];line(g,[root,tip,[bx+side*36,by+2]],'#75445f',2.7);line(g,[root,[bx+side*23,by+9]],'#c88ca5',1.7);}
 }else if(mark==='obsidianMantle'){
  for(const side of [-1,1])shape(g,[[x+side*5,y-15],[x+side*19,y-9],[x+side*14,y+3],[x+side*8,y+6]],'#413447','#241e2b',1.5);
  oval(g,x,y-9,3,3,'#977ca8','#302436',1);
 }else if(mark==='emberThroat'){
  for(let i=0;i<3;i++)oval(g,nx,ny+3+i*4,5-i,2.4,i===0?'#ffe3a1':'#e37737','#6d322b',1.1);
 }else if(mark==='palePlume'){
  for(const side of [-1,1])for(let i=0;i<4;i++){const u=bx+side*(12+i*4),v=by-9+i*4;shape(g,[[u,v],[u+side*12,v-8],[u+side*8,v+7]],'#ead6d4','#876f88',.8);}
 }else if(mark==='rootArmor'){
  for(const side of [-1,1]){const [hx,hy]=A.hip;line(g,[[x+side*8,y-12],[x+side*13,y+7],[hx+side*9,hy+5]],'#594333',5);line(g,[[x+side*8,y-12],[x+side*13,y+7],[hx+side*9,hy+5]],'#b79566',1.7);}
 }
}
function paintGraftPose(g,app,A,view,state,frame,pass){
  const t=app?.anatomy?.features||{},m=app?.anatomy?.morph||{};
  const hasEvolution=(app?.anatomy?.stage||0)>0;
  if(!hasEvolution&&!Object.values(t).some(Boolean))return;
  // v1.6.0 layering rules: from the FRONT, dorsal anatomy sits behind the body; from the BACK we look at the spine,
  // so wings, tail, shell and spines are painted over the body where they visibly grow out of it.
  const dorsal=(view===1)===(pass==='front');
  if(dorsal){
    if(t.wings&&want('rest'))wings(g,A,m.wingKind,level(t.wings),view,state,frame,m.wingTrim);
    if(t.tail&&want('rest'))tail(g,A,m.tailKind,level(t.tail),view,frame);
    if(t.shell&&want('conform'))shell(g,A,level(t.shell),view);
    if(t.spikes&&want('rest')){const [x,y]=A.back,L=16+level(t.spikes)*5;for(let i=-2;i<=2;i++){socket(g,x+i*6,y-9,3,2.2);blade(g,[x+i*6,y-10],[x+i*10,y-10-L+Math.abs(i)*4],5);}}
  }
  if(pass==='behind')return;
  if(PART_FILTER==='conform'){if(t.armor)(view===1?armoredBack:armoredChest)(g,A,level(t.armor));return;}
  // front view: the roots of dorsal anatomy are visible above/around the body outline
  if(view!==1&&t.wings)for(const side of [-1,1])socket(g,A.chest[0]+side*12,A.chest[1]-12,3+level(t.wings)*0.6,2.4,m.wingKind==='feather'?c.feather:c.wing);
  // v1.5.0: body surface is now re-skinned through the skin mask in evolution-visuals.js (paintSurfaceSkin).
  if(hasEvolution)faceMorph(g,A,m,view);
  if(t.armor&&!PART_FILTER)(view===1?armoredBack:armoredChest)(g,A,level(t.armor));
  if(t.horns)horns(g,A,level(t.horns));
  if(t.antlers)antlers(g,A,level(t.antlers));
  if(t.crown){const [x,y]=A.head;for(let i=-2;i<=2;i++)blade(g,[x+i*4,y-7],[x+i*5,y-15+(i%2)*2],2);}
  if(t.claws)for(const p of [A.leftHand,A.rightHand])claw(g,p,view===1?-1:1,level(t.claws));
  if(t.blades){const L=18+level(t.blades)*4;blade(g,A.leftHand,[A.leftHand[0]-L*0.7,A.leftHand[1]-L],5);blade(g,A.rightHand,[A.rightHand[0]+L*0.7,A.rightHand[1]-L],5);}
  if(t.beak&&view!==1)blade(g,[A.face[0]+2,A.face[1]+3],[A.face[0]+13,A.face[1]+6],4);
  if(t.tusks&&view!==1)for(const side of [-1,1])blade(g,[A.face[0]+side*4,A.face[1]+5],[A.face[0]+side*7,A.face[1]-3],2);
  if(t.moss)moss(g,A);
  if(t.eyes&&view!==1){const [x,y]=A.head;oval(g,x+5,y-5,2,1,c.venom);}
  if(t.venom)for(const p of [A.leftHand,A.rightHand]){oval(g,p[0],p[1]+2,4,5,c.venom,c.ink,1.2);oval(g,p[0]-1,p[1],1.4,1.6,'#f0e2ff');}
  graftSeams(g,A,app?.anatomy?.stage||0);
  for(const mark of app.pilotMarks||[])pilotMark(g,A,mark,view,frame);
  if(t.tendrils){const [x,y]=A.hip;for(let i=-1;i<=1;i++){line(g,[[x+i*6,y],[x+i*12,y+16],[x+i*18,y+26]],c.ink,5);line(g,[[x+i*6,y],[x+i*12,y+16],[x+i*18,y+26]],c.venom,3);}}
}
export function drawNativeBlankGraftSheet(g,app,pass){
  if(pass!=='behind'&&pass!=='front')throw new Error('Invalid Blank graft layer');
  for(let view=0;view<2;view++)for(const [state,meta] of Object.entries(BENCHMARK_STATES)){
    for(let frame=0;frame<meta.frames;frame++){
      g.save();g.translate(frame*BLANK_NATIVE_FRAME,(view*5+meta.row)*BLANK_NATIVE_FRAME);
      // Keep large anatomy on its own frame: never bleed pixels into the neighboring pose.
      g.beginPath();g.rect(0,0,BLANK_NATIVE_FRAME,BLANK_NATIVE_FRAME);g.clip();
      paintGraftPose(g,app,blankNativeAnchor(state,frame,view),view,state,frame,pass);
      g.restore();
    }
  }
}
// Equipment remains separate from permanent grafts and uses the same pose anchors.
const GEAR={
  'mtg:skullclamp':'clamp','mtg:shadowspear':'shadowSpear',
  'mtg:accorder-s-shield':'shield','mtg:basilisk-collar':'collar',
  'mtg:swiftfoot-boots':'boots','mtg:mask-of-memory':'mask',
  'mtg:moonsilver-spear':'spear'
};
export const nativeBlankGearKinds=ids=>[...new Set((ids||[]).map(id=>GEAR[id]).filter(Boolean))];
function paintGearPose(g,A,view,state,frame,kind){
  const [hx,hy]=A.head,[fx,fy]=A.face,[nx,ny]=A.neck;
  if(kind==='clamp'){
    const y=hy-12;
    shape(g,[[hx-14,y+12],[hx-15,y+1],[hx-8,y-6],[hx+8,y-6],[hx+15,y+1],[hx+14,y+12],[hx+8,y+12],[hx+8,y],[hx-8,y],[hx-8,y+12]],'#444c58',c.deep,1.6);
    line(g,[[hx-9,y-3],[hx+9,y-3]],c.steelHi,1.8);oval(g,hx,y-5,2.6,2.6,c.gold,c.deep,1);return;
  }
  if(kind==='shadowSpear'){
    const [x,y]=A.rightHand,tip=[Math.min(110,x+(state==='attack'?27:8)),Math.max(20,y-42)];
    line(g,[[x-4,y+16],tip],c.bronze,3.6);
    shape(g,[[tip[0],tip[1]-13],[tip[0]+7,tip[1]],[tip[0]+1,tip[1]+10],[tip[0]-7,tip[1]+2]],'#30243e',c.gold,1.4);
    line(g,[[tip[0],tip[1]-8],[tip[0],tip[1]+5]],'#b19af0',1.7);return;
  }
  if(kind==='boots'){
    for(const p of [A.leftFoot,A.rightFoot]){
      const [x,y]=p;
      shape(g,[[x-7,y-8],[x+5,y-8],[x+8,y-1],[x+8,y+2],[x-8,y+2]],gloss(g,x,y-6,15,c.furHi,c.bronze),c.deep,1);
      line(g,[[x-6,y-7],[x+5,y-7]],c.gold,1.8);
      line(g,[[x-8,y+1],[x+8,y+1]],c.steelHi,1.4);
    }return;
  }
  if(kind==='collar'){
    shape(g,[[nx-7,ny-2],[nx+7,ny-2],[nx+8,ny+4],[nx-8,ny+4]],c.deep,c.bronze,1);
    line(g,[[nx-7,ny-1],[nx+7,ny-1]],c.gold,2);
    for(let i=-2;i<=2;i++)blade(g,[nx+i*3,ny+3],[nx+i*3,ny+8],1.3);
    return;
  }
  if(kind==='mask'){
    shape(g,[[fx-8,fy-6],[fx+7,fy-8],[fx+9,fy+3],[fx+1,fy+10],[fx-8,fy+4]],
      gloss(g,fx,fy,16,c.steelHi,c.metal),c.deep,1.5);
    line(g,[[fx-6,fy-1],[fx-2,fy-1]],c.deep,2);line(g,[[fx+2,fy-2],[fx+6,fy-2]],c.deep,2);
    line(g,[[fx,fy+2],[fx,fy+8]],c.gold,1);
    return;
  }
  if(kind==='shield'){
    const [x,y]=A.leftHand;
    shape(g,[[x-13,y-13],[x-3,y-17],[x+7,y-11],[x+8,y+4],[x-3,y+16],[x-14,y+7]],
      gloss(g,x-3,y,28,c.steelHi,c.metal),c.deep,1.8);
    line(g,[[x-5,y-12],[x-4,y+12]],c.steelHi,1.6);
    line(g,[[x-10,y-1],[x+5,y-3]],c.gold,1);
    oval(g,x-3,y,3.5,3.5,c.gold,c.deep,1);
    return;
  }
  if(kind==='spear'){
    const [x,y]=A.rightHand;
    const thrust=state==='attack'&&frame>=2;
    // The far-reaching right-hand punch pose approaches the atlas edge. Keep
    // the spear tip and crossguard within its cell while retaining the grip.
    const tip=[Math.min(114,x+(thrust?28:8)),Math.max(17,y-(thrust?20:48))];
    line(g,[[x-5,y+16],tip],c.bronze,3.6);
    line(g,[[x-4,y+16],[tip[0]+.7,tip[1]]],c.gold,1);
    blade(g,[tip[0]-4,tip[1]+8],[tip[0]+4,tip[1]-13],4);
    line(g,[[tip[0]-7,tip[1]+7],[tip[0]+5,tip[1]+5]],c.gold,2);
  }
}
export function drawNativeBlankGearSheet(g,ids=[]){
  const kinds=nativeBlankGearKinds(ids);
  for(let view=0;view<2;view++)for(const [state,meta] of Object.entries(BENCHMARK_STATES))
    for(let frame=0;frame<meta.frames;frame++){
      g.save();g.translate(frame*BLANK_NATIVE_FRAME,(view*5+meta.row)*BLANK_NATIVE_FRAME);
      g.beginPath();g.rect(0,0,BLANK_NATIVE_FRAME,BLANK_NATIVE_FRAME);g.clip();
      const A=blankNativeAnchor(state,frame,view);
      for(const kind of kinds)paintGearPose(g,A,view,state,frame,kind);
      g.restore();
    }
}
export const __paintForPreview=(g,app,A,view,state,frame,pass)=>paintGraftPose(g,app,A,view,state,frame,pass);
