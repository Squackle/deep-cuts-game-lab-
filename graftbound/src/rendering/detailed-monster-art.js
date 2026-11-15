/**
 * Native 96px anatomical frame studies for GRAFTBOUND's actual Caterpillar,
 * Rhino, Wurm and Slug Horror encounter identities. No card art is copied.
 * All drawing happens once, into cached RGBA atlas cells at asset loading.
 * Two directions, six combat animation states, four frames/state.
 */
import {creaturePose} from './creature-motion.js';
export const MONSTER_FRAME=96;
export const MONSTER_STUDY_FEATURES=Object.freeze(['caterpillar','rhino','wurm','toxrill']);
const INK='#27262d',BONE='#f6e9be',MUD='#53483a',SLIME='#b0e6ba',DARK='#31313d';
const clamp=(x,a,b)=>Math.max(a,Math.min(x,b));
function stroke(g,p,color,width=1){
  g.beginPath();g.moveTo(...p[0]);for(const q of p.slice(1))g.lineTo(...q);
  g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.strokeStyle=color;g.stroke();
}
function bez(g,p0,p1,p2,color,width=2){
  g.beginPath();g.moveTo(...p0);g.quadraticCurveTo(...p1,...p2);
  g.lineWidth=width;g.lineCap='round';g.strokeStyle=color;g.stroke();
}
function ell(g,x,y,rx,ry,fill,edge=INK,width=1){
  g.beginPath();g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);
  g.fillStyle=fill;g.fill();if(edge){g.strokeStyle=edge;g.lineWidth=width;g.stroke();}
}
function poly(g,p,fill,edge=INK,width=1){
  g.beginPath();g.moveTo(...p[0]);for(const q of p.slice(1))g.lineTo(...q);
  g.closePath();g.fillStyle=fill;g.fill();if(edge){g.strokeStyle=edge;g.lineWidth=width;g.stroke();}
}
function grad(g,x,y,rad,a,b,c){
  const z=g.createRadialGradient(x-rad*.35,y-rad*.45,0,x,y,rad);
  z.addColorStop(0,a);z.addColorStop(.55,b);z.addColorStop(1,c);return z;
}
export function monsterRigPose(feature,state,frame,view=0){
  if(!MONSTER_STUDY_FEATURES.includes(feature))return null;
  if((view!==0&&view!==1)||!Number.isInteger(state)||state<0||state>5||
    !Number.isInteger(frame)||frame<0||frame>3)throw Error('Invalid native monster pose');
  const m=creaturePose(feature,state,frame,view===1);
  if(!m)throw Error('Missing native monster motion family');
  const walk=state===1,attack=state===2,cast=state===3,hurt=state===4,defeat=state===5;
  const breath=state===0?[0,-1,-2,-1][frame]:0;
  const sink=defeat?[0,1,5,9][frame]:0;
  return {
    ...m,back:view===1,breath,sink,
    // Larval caterpillar contracts its segments, lifts alternating prolegs.
    segmentCompression:walk?[0,2,5,1][frame]:attack?[0,2,6,1][frame]:
      cast?[0,-1,-3,-1][frame]:[0,1,2,1][frame],
    prolegStep:walk?[-2,0,3,1][frame]:attack?[0,1,3,0][frame]:0,
    feelerTilt:attack?[0,-2,-6,-1][frame]:hurt?[0,2,6,1][frame]:
      defeat?[0,2,6,9][frame]:[0,-1,-2,-1][frame],
    // The Rhino is a heavy four-legged beast, with each hip/hoof grounded.
    hoofStride:walk?[-2,1,3,0][frame]:attack?[0,1,3,0][frame]:0,
    hornThrust:attack?[0,3,8,2][frame]:cast?[0,2,4,1][frame]:0,
    shoulderRoll:walk?[0,1,3,1][frame]:hurt?[0,2,5,1][frame]:
      defeat?[0,2,5,8][frame]:[0,1,2,1][frame],
    // The Wurm has no legs; long coiled spine and jaws articulate together.
    bodyUndulation:walk?[-2,0,3,1][frame]:attack?[0,2,5,1][frame]:
      defeat?[0,1,5,9][frame]:[0,1,2,1][frame],
    neckArch:attack?[0,3,8,2][frame]:cast?[0,2,5,1][frame]:
      hurt?[0,-2,-5,-1][frame]:0,
    mawOpen:attack?[0,2,7,1][frame]:cast?[0,2,5,1][frame]:0,
    // Slug Horror retains a continuous foot/mantle and four soft eye stalks.
    slugGlide:walk?[-2,1,3,0][frame]:attack?[0,2,5,1][frame]:0,
    mantleRipple:walk?[0,2,4,1][frame]:attack?[0,3,6,2][frame]:
      cast?[0,2,6,1][frame]:defeat?[0,-1,-5,-8][frame]:[0,1,2,1][frame],
    eyeStalkFlex:attack?[0,-3,-7,-2][frame]:cast?[0,-1,-5,-1][frame]:
      hurt?[0,2,5,1][frame]:defeat?[0,3,7,10][frame]:[0,-1,-3,-1][frame],
    corrosivePulse:cast?[0,2,5,1][frame]:attack?[0,1,4,1][frame]:[0,1,2,0][frame]
  };
}
function caterpillar(g,p,c) {
  const {dark,mid,light}=c,comp=p.segmentCompression,cy=63+p.sink*.42+p.breath*.2;
  // Seven distinct overlapping tergites instead of a single elongated ellipse.
  for(let i=0;i<7;i++){
    const x=26+i*7.1+(i<4?comp*.45:-comp*.22);
    const lift=i%2?p.prolegStep:-p.prolegStep;
    bez(g,[x,cy+4],[x+lift*.32,cy+14],[x+lift*.35,82-Math.abs(lift)*.3+p.sink*.1],INK,5.2);
    bez(g,[x,cy+4],[x+lift*.32,cy+14],[x+lift*.35,82-Math.abs(lift)*.3+p.sink*.1],mid,3.1);
    ell(g,x,cy-(i===3?3:0),8.6,11-p.sink*.25,
      grad(g,x-2,cy-6,16,light,mid,dark),INK,1.15);
    bez(g,[x-2,cy-7],[x,cy],[x-1,cy+6],i%2?light:dark,1.1);
    ell(g,x+2,cy-6,2,1.4,light,null);
    ell(g,x+1,82-Math.abs(lift)*.3+p.sink*.1,3,2.2,dark,INK,.6);
  }
  const hx=75+p.hornThrust*.1+p.segmentCompression*.18,hy=cy-5+p.feelerTilt*.25;
  ell(g,hx,hy,10,10,grad(g,hx-4,hy-5,16,light,mid,dark),INK,1.4);
  if(!p.back){
    ell(g,hx+4,hy-3,2,2,INK,null);
    ell(g,hx+4.5,hy-3.5,.45,.55,BONE,null);
    bez(g,[hx+5,hy+5],[hx+11,hy+8],[hx+11,hy+4],INK,1.5);
  }
  for(const j of [-1,1])
    bez(g,[hx+j*3,hy-8],[hx+j*4,hy-17+p.feelerTilt*.3],
      [hx+j*6,clamp(hy-19+p.feelerTilt*.4,8,85)],mid,2.6);
}
function rhino(g,p,c){
  const {dark,mid,light}=c,roll=p.shoulderRoll,sink=p.sink*.35;
  // Four load-bearing legs with staggered front/rear hooves.
  for(const [x,side]of [[28,-1],[42,1],[57,-1],[70,1]]){
    const dx=(side===1?p.hoofStride:-p.hoofStride);
    const knee=[x+dx*.7,69+sink*.2-Math.abs(dx)*.5];
    const foot=[clamp(x+dx*1.5,10,86),82+sink*.15];
    stroke(g,[[x,56+sink],knee,foot],INK,9);
    stroke(g,[[x,56+sink],knee,foot],dark,6);
    ell(g,foot[0],foot[1],6,3,mid,INK,1);
    stroke(g,[[foot[0]-3,foot[1]+1],[foot[0]+3,foot[1]+1]],light,1.2);
  }
  // Massive shoulder hump, curved barrel and hide folds, heavy nose horn.
  ell(g,46,53+sink,31,21-sink*.25,grad(g,37,43+sink,39,light,mid,dark),INK,1.8);
  ell(g,39,43+roll*.25+sink,21,21,grad(g,32,36,31,light,mid,dark),INK,1.6);
  for(let i=0;i<4;i++)
    bez(g,[31+i*9,45+sink],[28+i*10,58+sink],[31+i*9,65+sink],
      i%2?light:dark,1.2);
  const reach=p.hornThrust,hx=70+reach*.5,hy=50-reach*.25+roll*.25+sink;
  ell(g,hx,hy,16,13,grad(g,hx-4,hy-4,24,light,mid,dark),INK,1.5);
  ell(g,hx+9,hy+5,9,6,mid,INK,.9);
  poly(g,[[hx+9,hy-3],[hx+12,hy-20-reach*.4],[hx+16,hy+2]],BONE,INK,1.2);
  for(const side of [-1,1])
    ell(g,hx+side*7,hy-10,3,6,mid,INK,.9);
  if(!p.back){
    ell(g,hx+6,hy-2,2,1.7,INK,null);
    ell(g,hx+12,hy+6,1.9,1.6,dark,null);
  }
}
function wurm(g,p,c){
  const {dark,mid,light}=c,coil=p.bodyUndulation,sink=p.sink*.35;
  // Grounded muscular coil with layered scaled armor, NO legs or pasted wings.
  ell(g,43,68+sink,31,16-sink*.3,INK,null);
  ell(g,42,65+sink,28,15-sink*.22,
    grad(g,34,58,39,light,mid,dark),INK,1.8);
  ell(g,36,66+sink,15,7,dark,null);
  for(let i=0;i<11;i++){
    const a=(Math.PI*.15+i*Math.PI/10);
    const x=43+Math.cos(a)*22,y=64+Math.sin(a)*10+sink;
    ell(g,x,y,3,2,i%2?mid:light,null);
  }
  // Two tapered, connected neck branches with segmented belly plates.
  const neckBase=[62,61+sink],head=[68+p.neckArch*.45,28-p.neckArch*.25+sink*.3];
  bez(g,neckBase,[84+coil*.28,47-sink*.25],head,INK,17);
  bez(g,neckBase,[84+coil*.28,47-sink*.25],head,dark,13);
  bez(g,[64,60+sink],[81+coil*.25,44],head,light,4);
  for(let i=0;i<5;i++){
    const x=65+i*2.2,y=54-i*5;
    stroke(g,[[x,y],[x+8,y-1]],mid,1.6);
  }
  ell(g,head[0],head[1],13,10,grad(g,head[0]-4,head[1]-5,19,light,mid,dark),INK,1.5);
  const maw=p.mawOpen;
  poly(g,[[head[0]+5,head[1]+1],[head[0]+17,head[1]+3],
    [head[0]+14,head[1]+6+maw*.7],[head[0]+4,head[1]+6+maw*.4]],
    DARK,INK,.8);
  for(let i=0;i<4;i++){
    const x=head[0]+7+i*2.1;
    stroke(g,[[x,head[1]+3],[x+.8,head[1]+5+maw*.4]],BONE,1.2);
  }
  for(let side of [-1,1])
    poly(g,[[head[0]+side*7,head[1]-7],
      [head[0]+side*11,head[1]-13],[head[0]+side*13,head[1]-5]],mid,INK,.7);
  if(!p.back)ell(g,head[0]+7,head[1]-2,2,1.9,INK,null);
}
function slug(g,p,c){
  const {dark,mid,light}=c,sink=p.sink*.35,wave=p.mantleRipple,advance=p.slugGlide;
  // Continuous fleshy foot with a slime trail anchored to the board.
  for(let i=0;i<9;i++){
    const x=24+i*6.5,y=82+(i%2)*.6;
    ell(g,x,y,3.7+p.corrosivePulse*.15,1.5,SLIME,null);
  }
  ell(g,48+advance*.15,69+sink,32,14-sink*.25,INK,null);
  ell(g,48+advance*.15,65+sink,30,16-sink*.22,
    grad(g,37,55,37,light,mid,dark),INK,1.6);
  // True broad slug mantle, soft neck and toxic underside, not a frog.
  ell(g,54+advance*.15,52+sink,23+wave*.18,20-sink*.35,
    grad(g,46,42,34,light,mid,dark),INK,1.6);
  ell(g,61+advance*.2,52+sink,12,13,mid,INK,1);
  for(let i=0;i<12;i++){
    const x=38+(i*11)%34,y=49+(i*7)%25+sink;
    ell(g,x,y,2.4,1.6,i%3?dark:light,null);
  }
  for(let i=-2;i<=1;i++){
    const x=59+i*5,reach=p.eyeStalkFlex;
    const tipX=x+i*1.5+reach*.25,tipY=clamp(24+(i%2)*5+reach*.65+sink*.2,7,72);
    bez(g,[x,49+sink],[x+i*4,36+sink], [tipX,tipY],INK,5);
    bez(g,[x,49+sink],[x+i*4,36+sink],[tipX,tipY],mid,3.4);
    ell(g,tipX,tipY,3,3,light,INK,.8);
    if(!p.back)ell(g,tipX+1,tipY-.5,1.1,1.2,INK,null);
  }
  for(let i=0;i<4;i++){
    const x=26+i*14,y=75+sink;
    bez(g,[x,y],[x+7,y+3],[x+13,y+1],dark,1.8);
  }
}
export function drawMonsterStudyFrame(g,feature,view,state,frame,palette){
  const p=monsterRigPose(feature,state,frame,view);
  if(!p)throw Error('Unsupported original monster '+feature);
  if(!palette?.dark||!palette?.mid||!palette?.light)throw Error('Missing monster material palette');
  g.save();g.beginPath();g.rect(0,0,MONSTER_FRAME,MONSTER_FRAME);g.clip();
  g.lineCap='round';g.lineJoin='round';
  ell(g,48,88,25,3,'rgba(20,20,22,.28)',null);
  if(feature==='caterpillar')caterpillar(g,p,palette);
  else if(feature==='rhino')rhino(g,p,palette);
  else if(feature==='wurm')wurm(g,p,palette);
  else slug(g,p,palette);
  g.restore();
}
