/**
 * Original cached 96px creature animation for elemental, spectral bird, aquatic
 * tentacle and angel identities. All are distinct native RGBA anatomy studies.
 * Drawing occurs at atlas-load only; none of this runs per simulation tick.
 * Six states x four authored frames x front/back; immutable simulation RNG.
 * Premium hand-painted source-reference approval remains separate/unverified.
 */
import {creaturePose} from './creature-motion.js';

export const MAGIC_FRAME = 96;
export const MAGIC_STUDY_FEATURES = Object.freeze([
  'friendlyElemental','friendlyBirdIllusion','friendlyTentacle','angel'
]);
const INK='#232734',GLOW='#fff0c8',BLUE='#81dcef',SHADOW='rgba(20,22,33,.26)';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const r=(v)=>Math.round(v*10)/10;
const line=(g,points,ink,width=1)=>{
  g.beginPath();g.moveTo(...points[0]);for(const p of points.slice(1))g.lineTo(...p);
  g.lineJoin='round';g.lineCap='round';g.lineWidth=width;g.strokeStyle=ink;g.stroke();
};
const ellipse=(g,x,y,rx,ry,color,stroke=INK,width=1)=>{
  g.beginPath();g.ellipse(x,y,Math.max(.2,rx),Math.max(.2,ry),0,0,Math.PI*2);
  g.fillStyle=color;g.fill();
  if(stroke){g.lineWidth=width;g.strokeStyle=stroke;g.stroke();}
};
const polygon=(g,p,color,stroke=INK,width=1)=>{
  g.beginPath();g.moveTo(...p[0]);for(const q of p.slice(1))g.lineTo(...q);
  g.closePath();g.fillStyle=color;g.fill();if(stroke){g.lineWidth=width;g.strokeStyle=stroke;g.stroke();}
};
const gradient=(g,x,y,radius,a,b,c)=>{
  const z=g.createRadialGradient(x-radius*.3,y-radius*.4,0,x,y,radius);
  z.addColorStop(0,a);z.addColorStop(.55,b);z.addColorStop(1,c);return z;
};
export function magicRigPose(feature,state,frame,view=0) {
  if(!MAGIC_STUDY_FEATURES.includes(feature))return null;
  if(![0,1].includes(view)||!Number.isInteger(state)||state<0||state>5||
    !Number.isInteger(frame)||frame<0||frame>3)throw Error('Invalid native magic pose');
  const m=creaturePose(feature,state,frame,view===1);
  if(!m)throw Error('Missing magic creature motion family');
  const idle=[0,-1,-2,-1][frame];
  const walk=state===1,attack=state===2,cast=state===3,hurt=state===4,defeat=state===5;
  const sink=defeat?[0,1,5,9][frame]:0;
  const thrust=attack?[0,2,7,2][frame]:0;
  const charge=cast?[0,2,6,1][frame]:0;
  return {
    ...m,back:view===1,state,frame,idle,sink,thrust,charge,
    // The elemental is a layered flame body, not a recolored humanoid.
    flameFlicker:walk?[0,2,4,1][frame]:cast?[0,2,6,2][frame]:
      attack?[0,3,7,1][frame]:hurt?[0,-2,-4,-1][frame]:
      defeat?[0,-3,-7,-11][frame]:[0,2,4,1][frame],
    flameArc:attack?[0,4,9,2][frame]:cast?[0,3,7,1][frame]:0,
    // Bird wings are rooted to the sternum and contain distinct feathers.
    wingSpread:walk?[2,6,10,4][frame]:attack?[0,4,11,3][frame]:
      cast?[0,5,9,4][frame]:hurt?[0,-2,-5,-2][frame]:
      defeat?[0,-3,-8,-12][frame]:[0,2,4,1][frame],
    wingPitch:walk?[0,-2,-5,-1][frame]:attack?[0,-2,-7,-1][frame]:
      defeat?[0,2,7,11][frame]:[0,-1,-2,-1][frame],
    // The tentacle creature has individual flexible arms and suction cups.
    coil:walk?[0,3,-2,1][frame]:attack?[0,2,8,2][frame]:
      cast?[0,-2,-6,-1][frame]:hurt?[0,2,5,1][frame]:[0,-1,-3,-1][frame],
    tentacleLunge:thrust,
    // Angel limbs/wing membranes and halo support a flying humanoid body.
    haloLift:cast?[0,2,5,1][frame]:attack?[0,1,4,1][frame]:
      defeat?[0,1,4,8][frame]:[0,1,2,1][frame],
    swordReach:attack?[0,4,9,2][frame]:cast?[0,2,5,1][frame]:0
  };
}
function shadow(g,rx=21){ellipse(g,48,89,rx,3.1,SHADOW,null);}
function elemental(g,p,{dark,mid,light}) {
  const y=p.sink*.7+p.idle*.2;
  // Each flame remains rooted in the central chest/core as it arcs outward.
  for(let i=-3;i<=3;i++){
    const x=48+i*5,top=clamp(19+Math.abs(i)*3-p.flameFlicker*.6,7,37);
    polygon(g,[[x-7,69+y],[x-10,47+y],[x-5,35+y],
      [x+i*.3,top+y*.2],[x+7,41+y],[x+9,70+y]],
      i%2?mid:dark,INK,1.25);
    polygon(g,[[x-3,64+y],[x-5,48+y],[x,top+12+y*.2],[x+4,52+y],
      [x+3,65+y]],i%2?light:mid,null);
  }
  // A distinct hand-like torch whirl for attack and casting, not damage timing.
  for(const side of [-1,1]){
    const base=[48+side*13,55+y],tip=[48+side*(24+p.flameArc*.35),42+y-p.flameArc*.5];
    line(g,[base,tip],INK,9);line(g,[base,tip],mid,6);
    ellipse(g,tip[0],tip[1],4+p.charge*.1,6+p.charge*.12,light,mid,.7);
  }
  const trunk=gradient(g,43,51+y,26,light,mid,dark);
  ellipse(g,48,54+y,16,21-p.sink*.4,trunk,INK,1.4);
  polygon(g,[[44,61+y],[38,50+y],[45,38+y],[48,43+y],[53,35+y],[59,51+y],[54,66+y]],
    gradient(g,43,47+y,23,GLOW,light,mid),null);
  ellipse(g,48,62+y,5+p.charge*.2,9+p.charge*.15,GLOW,mid,.7);
  if(!p.back){
    ellipse(g,42,47+y,2.4,2.2,INK,null);
    ellipse(g,54,47+y,2.4,2.2,INK,null);
  }
  // Anchored ember trail under the body during collapse.
  for(let i=0;i<5;i++){
    const x=34+i*7,yy=80+(i%2)*2+p.sink*.3;
    ellipse(g,x,Math.min(88,yy),1.4+(i%2)*.4,2,light,null);
  }
}
function bird(g,p,{dark,mid,light}){
  const y=48+p.idle*.25+p.sink*.55,spread=p.wingSpread;
  // Leading wing ribs remain connected to the shoulders in all states.
  for(const side of [-1,1]){
    const root=[48+side*6,y-10],elbow=[48+side*(21+spread*.25),y-19+p.wingPitch*.3];
    const tip=[clamp(48+side*(32+spread*.55),7,89),
      clamp(y-26+p.wingPitch,7,77)];
    polygon(g,[root,elbow,tip,[tip[0]-side*4,tip[1]+19],
      [48+side*16,y+7]],gradient(g,tip[0],tip[1]+5,33,light,mid,dark),INK,1.6);
    line(g,[root,elbow,tip],light,2.2);
    for(let i=0;i<5;i++){
      const q=[48+side*(20+spread*.15+i*2.5),
        y-8+i*2.3+p.wingPitch*.3];
      line(g,[elbow,q],i%2?mid:light,1.3);
    }
  }
  // Tail feather fan, body keel and hooked beak remain bird-appropriate.
  for(let i=-2;i<=2;i++){
    const x=48+i*4;
    polygon(g,[[48,y+7],[x+2,y+25+p.sink*.14],[x-2,y+24+p.sink*.14]],
      i%2?mid:dark,INK,.5);
  }
  ellipse(g,48,y-2,9.8,15,gradient(g,45,y-8,23,light,mid,dark),INK,1.3);
  ellipse(g,49,y-19,9,8,gradient(g,46,y-22,16,GLOW,light,mid),INK,1.1);
  polygon(g,[[55,y-20],[64+p.thrust*.25,y-18],
    [55,y-14]],GLOW,mid,1);
  if(!p.back){
    ellipse(g,52,y-21,1.6,1.8,INK,null);
    ellipse(g,52.5,y-21.4,.4,.5,GLOW,null);
  }
  for(const side of [-1,1]){
    const x=48+side*5;
    line(g,[[x,y+7],[x+side*3,y+18]],dark,2.5);
  }
  // Flight is grounded by a shadow at its tile; the sprite retains tile scale.
}
function tentacle(g,p,{dark,mid,light}){
  const sink=p.sink*.5,cy=58+sink,coil=p.coil;
  // Arm roots are distributed around an organic radial torso.
  for(let i=-3;i<=3;i++){
    const rootX=48+i*3.5,side=i<0?-1:1;
    const tipX=clamp(48+i*6.5+side*(i%2?coil:-coil)*.7+
      side*p.tentacleLunge*(i===3||i===-3?.45:.15),8,88);
    const tipY=clamp(40+Math.abs(i)*5+(i%2?coil:-coil)*.6+sink*.4,13,81);
    const control=[48+i*7,25+Math.abs(i)*5+(i%2?coil:-coil)];
    g.beginPath();g.moveTo(rootX,cy);
    g.quadraticCurveTo(control[0],control[1],tipX,tipY);
    g.lineCap='round';g.lineWidth=9-Math.abs(i)*.55;g.strokeStyle=INK;g.stroke();
    g.lineWidth=6-Math.abs(i)*.5;g.strokeStyle=i%2?mid:dark;g.stroke();
    g.beginPath();g.moveTo(rootX-.8,cy-1);
    g.quadraticCurveTo(control[0]-1.5,control[1]-1.5,tipX-1,tipY);
    g.lineWidth=2;g.strokeStyle=light;g.stroke();
    for(let j=0;j<3;j++){
      const u=.37+j*.18;
      const x=(1-u)*(1-u)*rootX+2*(1-u)*u*control[0]+u*u*tipX;
      const y=(1-u)*(1-u)*cy+2*(1-u)*u*control[1]+u*u*tipY;
      ellipse(g,x+side*2.5,y+1.7,1.25,1.5,light,dark,.6);
    }
  }
  ellipse(g,48,cy+6,17,12,gradient(g,41,cy+1,30,light,mid,dark),INK,1.5);
  ellipse(g,48,cy+5,7+p.charge*.35,6+p.charge*.3,dark,light,1);
  if(!p.back){
    ellipse(g,44,cy+4,2,2,BLUE,INK,.6);
    ellipse(g,53,cy+4,2,2,BLUE,INK,.6);
  }
  for(let i=-2;i<=2;i++)
    line(g,[[48+i*4,cy+12],[48+i*6,83-sink*.1]],i%2?mid:dark,2.3);
}
function angel(g,p,{dark,mid,light}){
  const y=47+p.idle*.25+p.sink*.4,spread=p.wingSpread*.48;
  // Feathered wings emerge from both shoulders, never separate sprites.
  for(const side of [-1,1]){
    const shoulder=[48+side*8,y-14];
    const elbow=[48+side*(20+spread*.4),y-25-spread*.25];
    const tip=[clamp(48+side*(31+spread),6,90),clamp(y-35-spread*.45,8,53)];
    polygon(g,[shoulder,elbow,tip,[tip[0]-side*3,tip[1]+22],
      [48+side*19,y+12]],gradient(g,tip[0],tip[1]+12,35,GLOW,light,mid),dark,1.3);
    line(g,[shoulder,elbow,tip],GLOW,1.7);
    for(let j=0;j<5;j++){
      const x=48+side*(19+j*2.9+spread*.2),yy=y-10+j*3;
      line(g,[elbow,[x,yy]],j%2?mid:light,1.4);
    }
  }
  // Two grounded feet and draped cloth share one hip-to-shoulder root.
  for(const side of [-1,1]){
    const hip=[48+side*5,y+15],foot=[48+side*(8+p.nearStep),80+p.sink*.2];
    line(g,[hip,foot],INK,6);line(g,[hip,foot],mid,3.8);
    ellipse(g,foot[0],foot[1]+1,3.9,2,light,INK,.65);
  }
  polygon(g,[[37,y-12],[48,y-17],[59,y-12],[62,y+11],
    [56,y+23],[39,y+23],[34,y+11]],gradient(g,41,y-9,28,GLOW,light,dark),INK,1.5);
  for(let i=-2;i<=2;i++)
    line(g,[[48+i*3,y-7],[48+i*3.5,y+17]],i%2?mid:GLOW,1.2);
  for(const side of [-1,1]){
    const root=[48+side*10,y-10],hand=[48+side*(22+p.swordReach*.3),
      y+9-p.swordReach*.62];
    line(g,[root,hand],INK,6.5);line(g,[root,hand],mid,4.4);
    ellipse(g,hand[0],hand[1],3.5,3.2,light,INK,.8);
    if(side===1){
      const bladeTip=[clamp(hand[0]+12+p.swordReach*.2,8,91),
        clamp(hand[1]-20-p.swordReach*.6,8,80)];
      line(g,[hand,bladeTip],INK,4.5);line(g,[hand,bladeTip],GLOW,2);
    }
  }
  ellipse(g,48,y-24,9.5,11,gradient(g,44,y-29,18,GLOW,light,mid),INK,1.1);
  if(!p.back){
    for(const side of [-1,1])ellipse(g,48+side*4,y-26,1.4,1.9,INK,null);
  }
  ellipse(g,48,y-39-p.haloLift*.35,11,2.9,GLOW,dark,1);
  ellipse(g,48,y-39-p.haloLift*.35,6,1.4,dark,null);
}
export function drawMagicStudyFrame(g,feature,view,state,frame,palette){
  const p=magicRigPose(feature,state,frame,view);
  if(!p)throw Error('Unsupported native magical identity '+feature);
  if(!palette?.dark||!palette?.mid||!palette?.light)throw Error('Missing native material colors');
  g.save();g.beginPath();g.rect(0,0,MAGIC_FRAME,MAGIC_FRAME);g.clip();
  g.lineJoin='round';g.lineCap='round';
  shadow(g,feature==='friendlyTentacle'?25:20);
  if(feature==='friendlyElemental')elemental(g,p,palette);
  else if(feature==='friendlyBirdIllusion')bird(g,p,palette);
  else if(feature==='friendlyTentacle')tentacle(g,p,palette);
  else angel(g,p,palette);
  g.restore();
}
