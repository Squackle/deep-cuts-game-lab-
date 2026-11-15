/**
 * Original 96px runtime anatomy studies for feline warriors, skeletal allies,
 * undead walkers and three distinct construct materials.
 *
 * Authored at asset-load time into transparent RGBA atlases, NOT painted inside
 * WebGL's per-frame loop. All identities retain their actual one-tile footprint.
 * The target painterly HD-2D art quality still requires owner visual acceptance.
 */
import {creaturePose} from './creature-motion.js';

export const HUMANOID_FRAME=96;
export const HUMANOID_STUDY_FEATURES=Object.freeze([
  'friendlyCatSoldier','friendlySkeleton','zombie','golem','gearhulk','titan'
]);
const INK='#292724',IVORY='#f5ebd4',BONE='#e9d6b1',BONE_SHADOW='#ac987a',
  LEATHER='#5d4434',LEATHER_HI='#ac7950',SHADOW='rgba(23,20,17,.27)';
const line=(g,pts,color,width=1.5)=>{
  g.beginPath();g.moveTo(...pts[0]);for(const p of pts.slice(1))g.lineTo(...p);
  g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.strokeStyle=color;g.stroke();
};
const shape=(g,pts,fill,edge=INK,width=1.2)=>{
  g.beginPath();g.moveTo(...pts[0]);for(const p of pts.slice(1))g.lineTo(...p);
  g.closePath();g.fillStyle=fill;g.fill();
  if(edge){g.lineWidth=width;g.strokeStyle=edge;g.stroke();}
};
const ell=(g,x,y,rx,ry,fill,edge=INK,width=1)=>{
  g.beginPath();g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,2*Math.PI);
  g.fillStyle=fill;g.fill();if(edge){g.strokeStyle=edge;g.lineWidth=width;g.stroke();}
};
const ramp=(g,x,y,r,hi,mid,low)=>{
  const z=g.createRadialGradient(x-r*.3,y-r*.43,0,x,y,r);
  z.addColorStop(0,hi);z.addColorStop(.55,mid);z.addColorStop(1,low);return z;
};
const bone=(g,a,b,width=4)=>{
  line(g,[a,b],INK,width+2);line(g,[a,b],BONE_SHADOW,width);
  line(g,[[a[0]-.35,a[1]-.5],[b[0]-.35,b[1]-.5]],BONE,width*.48);
  ell(g,a[0],a[1],width*.42,width*.44,BONE,INK,.5);
  ell(g,b[0],b[1],width*.45,width*.47,BONE,INK,.55);
};
const limb=(g,a,b,mid,light,width=6)=>{
  line(g,[a,b],INK,width+2);
  line(g,[a,b],mid,width);
  line(g,[[a[0]-1,a[1]-1],[b[0]-1,b[1]-1]],light,Math.max(1,width*.25));
};
const shadow=(g)=>ell(g,48,88,20,3.5,SHADOW,null);
const pt=(x,y)=>[Math.round(x*10)/10,Math.round(y*10)/10];
/** Renderer-side pose and attachment anchors derived ONLY from view/state/frame. */
export function humanoidRigPose(feature,state,frame,view=0){
  if(!HUMANOID_STUDY_FEATURES.includes(feature))return null;
  if(view!==0&&view!==1)throw new Error('Two authored humanoid views required');
  const p=creaturePose(feature,state,frame,view===1);
  const breath=state===0?[0,-1,-2,-1][frame]:0;
  const headBob=p.head+breath;
  const collapse=p.collapse;
  const torsoY=49+breath*.3+collapse*.4+p.bob*.25;
  const sway=p.advance*.28;
  const leftKnee=pt(41-p.nearStep*2,74-Math.abs(p.nearStep)*2);
  const rightKnee=pt(56-p.farStep*2,74-Math.abs(p.farStep)*2);
  const leftFoot=pt(39-p.nearStep*4,84-Math.abs(p.nearStep)*2-collapse*.2);
  const rightFoot=pt(57-p.farStep*4,84-Math.abs(p.farStep)*2-collapse*.2);
  const leftShoulder=pt(37+sway,40+headBob*.2+collapse*.32);
  const rightShoulder=pt(60+sway,40+headBob*.2+collapse*.32);
  const leftElbow=pt(31+sway+p.farStep,52+collapse*.42);
  const leftHand=pt(28+sway+p.farStep,65+collapse*.32);
  const rightElbow=pt(67+sway+p.strike*.3,50-p.strike*.32+collapse*.42);
  const rightHand=pt(70+sway+p.strike*.6,62-p.strike*.85+collapse*.36);
  return {...p,back:view===1,breath,torsoY,head:pt(48+sway,24+headBob+collapse*.44),
    hip:pt(48+sway,66+collapse*.36),leftShoulder,rightShoulder,leftElbow,rightElbow,
    leftHand,rightHand,leftKnee,rightKnee,leftFoot,rightFoot};
}
function cat(g,A,pal,state,frame){
  const {dark,mid,light}=pal,[cx,cy]=A.head,[hx,hy]=A.hip;
  // Large counterweight tail is rooted at the sacrum, not pasted to the sprite edge.
  g.beginPath();g.moveTo(hx-7,hy);
  g.bezierCurveTo(hx-21,hy-2,hx-23,hy-28-A.tail*.4,hx-30,hy-34-A.tail*.4);
  g.bezierCurveTo(hx-39,hy-43-A.tail*.3,hx-40,hy-27,hx-37,hy-24);
  g.lineWidth=8;g.strokeStyle=INK;g.lineCap='round';g.stroke();
  g.lineWidth=5;g.strokeStyle=mid;g.stroke();
  line(g,[[hx-32,hy-30-A.tail*.4],[hx-36,hy-30-A.tail*.5]],light,2.2);
  for(const [hip,knee,foot] of [
    [pt(hx-7,hy),A.leftKnee,A.leftFoot],[pt(hx+7,hy),A.rightKnee,A.rightFoot]]){
    limb(g,hip,knee,mid,light,6);limb(g,knee,foot,mid,light,5.5);
    ell(g,foot[0],foot[1],5.5,3.4,mid,INK,.9);
    for(let i=-1;i<=1;i++)line(g,[[foot[0]+i*2,foot[1]+1],[foot[0]+i*2+1,foot[1]+3]],light,.9);
  }
  // Fur over the chest, a leather militia jerkin and separate sword belt.
  shape(g,[[36,A.torsoY-10],[48,A.torsoY-15],[61,A.torsoY-10],[64,A.torsoY+10],
    [57,A.torsoY+19],[40,A.torsoY+19],[33,A.torsoY+10]],
    ramp(g,46,A.torsoY-3,28,light,mid,dark),INK,1.6);
  shape(g,[[40,A.torsoY-6],[49,A.torsoY-8],[58,A.torsoY-6],
    [58,A.torsoY+14],[48,A.torsoY+16],[38,A.torsoY+14]],LEATHER,INK,1.3);
  for(let i=0;i<5;i++)line(g,[[42+i*3,A.torsoY-4],[42+i*3,A.torsoY+9]],i%2?LEATHER_HI:mid,1.1);
  line(g,[[38,A.torsoY+11],[59,A.torsoY+11]],LEATHER_HI,3.5);
  ell(g,48,A.torsoY+11,2,2,IVORY,INK,.5);
  for(const [shoulder,elbow,hand] of [
    [A.leftShoulder,A.leftElbow,A.leftHand],[A.rightShoulder,A.rightElbow,A.rightHand]]){
    limb(g,shoulder,elbow,mid,light,6);
    limb(g,elbow,hand,mid,light,5);
    ell(g,hand[0],hand[1],3.6,3.5,light,INK,.8);
  }
  // Ears emerge from the skull, facing the same view in every state.
  for(const side of [-1,1]){
    shape(g,[[cx+side*7,cy-5],[cx+side*13,cy-18],[cx+side*17,cy-3]],mid,INK,1.3);
    shape(g,[[cx+side*10,cy-5],[cx+side*13,cy-13],[cx+side*14,cy-5]],LEATHER_HI,null);
  }
  ell(g,cx,cy,12.2,11.5,ramp(g,cx-3,cy-4,18,light,mid,dark),INK,1.6);
  if(!A.back){
    ell(g,cx+4,cy+5,8,4.2,IVORY,null);
    ell(g,cx+8,cy+4,1.9,1.4,INK,null);
    for(const side of [-1,1]){
      ell(g,cx+side*5,cy-3,1.6,2.1,INK,null);
      ell(g,cx+side*5-.4,cy-3.5,.45,.5,IVORY,null);
      line(g,[[cx+side*5,cy+6],[cx+side*14,cy+7]],IVORY,.7);
    }
  }else{
    for(const side of [-1,1])line(g,[[cx+side*5,cy-5],[cx+side*7,cy+3]],light,1.4);
  }
  // The one-handed militia blade follows the right gripping paw.
  const [x,y]=A.rightHand,reach=state===2?A.strike:0;
  const tip=pt(Math.min(87,x+11+reach*.5),Math.max(9,y-25-reach*.7));
  line(g,[[x-3,y+7],tip],INK,4.2);
  line(g,[[x-3,y+7],tip],LEATHER_HI,2.3);
  shape(g,[[tip[0]-4,tip[1]+7],[tip[0],tip[1]-8],[tip[0]+4,tip[1]+7]],IVORY,INK,1);
  line(g,[[x-9,y-1],[x+6,y-1]],LEATHER_HI,2.4);
}
function skeleton(g,A,pal){
  const [cx,cy]=A.head,[hx,hy]=A.hip;
  for(const [hip,knee,foot] of [[pt(hx-5,hy),A.leftKnee,A.leftFoot],[pt(hx+5,hy),A.rightKnee,A.rightFoot]]){
    bone(g,hip,knee,4.5);bone(g,knee,foot,4);
    for(let i=0;i<3;i++)line(g,[[foot[0]-3+i*2,foot[1]],[foot[0]-4+i*3,foot[1]+2]],BONE,1.3);
  }
  // Open ribcage: hollow gaps, separate clavicles, spine, and pelvis.
  for(let i=0;i<7;i++)bone(g,pt(48,A.torsoY-13+i*4.4),pt(48,A.torsoY-12+(i+1)*4.4),2.5);
  for(const side of [-1,1]){
    line(g,[[48,A.torsoY-10],[48+side*8,A.torsoY-11]],BONE,3.4);
    for(let r=0;r<4;r++){
      const y=A.torsoY-8+r*6;
      line(g,[[48,y],[48+side*(12-r*.8),y+2],[48+side*4,y+5]],BONE_SHADOW,3.5);
      line(g,[[48,y-.4],[48+side*(12-r*.8),y+1.2],[48+side*4,y+4]],BONE,2.1);
    }
  }
  shape(g,[[37,hy-2],[43,hy-5],[49,hy-1],[55,hy-5],[60,hy-2],
    [55,hy+6],[42,hy+6]],BONE_SHADOW,INK,1.2);
  for(const [shoulder,elbow,hand] of [[A.leftShoulder,A.leftElbow,A.leftHand],
    [A.rightShoulder,A.rightElbow,A.rightHand]]){
    bone(g,shoulder,elbow,4.2);bone(g,elbow,hand,3.4);
    for(let i=-1;i<=1;i++)line(g,[[hand[0],hand[1]],[hand[0]+i*2,hand[1]+5]],BONE,1.35);
  }
  ell(g,cx,cy,11.3,11,ramp(g,cx-3,cy-4,18,IVORY,BONE,BONE_SHADOW),INK,1.5);
  shape(g,[[cx-7,cy+6],[cx+7,cy+6],[cx+6,cy+12],[cx-6,cy+12]],BONE,INK,1.05);
  if(!A.back){
    for(const side of [-1,1])ell(g,cx+side*4.6,cy-1.5,3.2,3.7,INK,null);
    shape(g,[[cx-2,cy+4],[cx+2,cy+4],[cx,cy+7]],INK,null);
    for(let i=-2;i<=2;i++)line(g,[[cx+i*2.1,cy+8],[cx+i*2.1,cy+11]],INK,.65);
  }else{
    for(let i=-2;i<=2;i++)line(g,[[cx+i*3,cy-4],[cx+i*3,cy+2]],BONE_SHADOW,1.3);
  }
}
function zombie(g,A,pal,state){
  const {dark,mid,light}=pal,[cx,cy]=A.head,[hx,hy]=A.hip;
  // Asymmetric shambling stance: left arm hangs; right arm lunges.
  for(const [hip,knee,foot] of [[pt(hx-6,hy),A.leftKnee,A.leftFoot],[pt(hx+7,hy),A.rightKnee,A.rightFoot]]){
    limb(g,hip,knee,mid,light,7);limb(g,knee,foot,mid,light,6);
    ell(g,foot[0],foot[1],5.4,3.1,dark,INK,.85);
  }
  shape(g,[[35,A.torsoY-11],[49,A.torsoY-13],[62,A.torsoY-10],
    [65,A.torsoY+11],[57,A.torsoY+20],[38,A.torsoY+19],[32,A.torsoY+10]],
    ramp(g,46,A.torsoY-4,28,light,mid,dark),INK,1.8);
  // Torn tunic and exposed ribs/skin patches are material-specific.
  shape(g,[[38,A.torsoY-4],[44,A.torsoY+1],[53,A.torsoY-1],[59,A.torsoY+5],
    [54,A.torsoY+20],[40,A.torsoY+18]],dark,INK,.8);
  for(let i=0;i<6;i++){
    const x=41+(i%3)*6,y=A.torsoY+3+Math.floor(i/3)*8;
    line(g,[[x,y],[x+2,y+3]],i%2?light:mid,1.3);
  }
  limb(g,A.leftShoulder,A.leftElbow,mid,light,7);
  limb(g,A.leftElbow,A.leftHand,dark,mid,6);
  limb(g,A.rightShoulder,A.rightElbow,light,mid,6.5);
  limb(g,A.rightElbow,A.rightHand,mid,light,5.5);
  ell(g,A.leftHand[0],A.leftHand[1],4.3,3.7,dark,INK,.7);
  ell(g,A.rightHand[0],A.rightHand[1],4.5,3.7,light,INK,.7);
  // Scarred drooping head and jaw; rear view has no fake duplicated eyes.
  ell(g,cx,cy,11.5,12.1,ramp(g,cx-3,cy-5,19,light,mid,dark),INK,1.6);
  shape(g,[[cx-8,cy+6],[cx+8,cy+5],[cx+5,cy+13],[cx-5,cy+14]],mid,INK,1);
  for(let i=0;i<5;i++)line(g,[[cx-8+i*4,cy-9],[cx-9+i*4,cy-14]],dark,2);
  if(!A.back){
    ell(g,cx-4,cy-1,3,2.6,INK,null);
    ell(g,cx+5,cy,2.4,2.2,INK,null);
    line(g,[[cx-3,cy+9],[cx+5,cy+8]],INK,2.2);
    line(g,[[cx-6,cy+4],[cx-10,cy+7]],dark,1.3);
  } else line(g,[[cx-5,cy-2],[cx+4,cy+4]],dark,1.4);
}
function golem(g,A,pal,feature,state,frame){
  const {dark,mid,light}=pal,[cx,cy]=A.head,[hx,hy]=A.hip;
  const heavy=feature==='gearhulk',titan=feature==='titan';
  const plate=heavy?'#b79e76':titan?'#c3d5e0':'#95a58d';
  const inset=heavy?'#635041':titan?'#465d79':'#4e625d';
  // Four linked leg plates with explicit hip/knee bearings.
  for(const [hip,knee,foot] of [[pt(hx-10,hy),A.leftKnee,A.leftFoot],[pt(hx+10,hy),A.rightKnee,A.rightFoot]]){
    limb(g,hip,knee,dark,mid,10);
    shape(g,[[hip[0]-5,hip[1]-2],[hip[0]+5,hip[1]-2],
      [knee[0]+6,knee[1]+4],[knee[0]-6,knee[1]+4]],mid,INK,1.35);
    ell(g,knee[0],knee[1],3.5,3.5,plate,INK,1);
    limb(g,knee,foot,dark,mid,9);
    shape(g,[[foot[0]-8,foot[1]-6],[foot[0]+8,foot[1]-6],[foot[0]+9,foot[1]+2],
      [foot[0]-9,foot[1]+2]],mid,INK,1.4);
    line(g,[[foot[0]-6,foot[1]-4],[foot[0]+6,foot[1]-4]],plate,1.4);
  }
  const spread=heavy?18:14,top=A.torsoY-16;
  shape(g,[[48-spread,top],[48+spread,top],[48+spread+3,A.torsoY+9],
    [58,A.torsoY+20],[38,A.torsoY+20],[48-spread-3,A.torsoY+9]],
    ramp(g,43,A.torsoY-6,36,light,mid,dark),INK,1.8);
  // Collar, breastplate, central energy crystal and purposeful seams.
  shape(g,[[39,A.torsoY-10],[57,A.torsoY-10],[61,A.torsoY+8],
    [48,A.torsoY+13],[35,A.torsoY+8]],plate,INK,1.6);
  for(let s of [-1,1])line(g,[[48,A.torsoY-5],[48+s*11,A.torsoY+5]],inset,2);
  ell(g,48,A.torsoY+2,5.7,6.8,heavy?'#efbd7a':'#86cbd2',INK,1.4);
  ell(g,47,A.torsoY,1.5,2.3,IVORY,null);
  for(const [shoulder,elbow,hand,side] of [
    [A.leftShoulder,A.leftElbow,A.leftHand,-1],[A.rightShoulder,A.rightElbow,A.rightHand,1]]){
    // Giant shoulders, working elbow pivots, and segmented gripping fingers.
    shape(g,[[shoulder[0]-8,shoulder[1]-7],[shoulder[0]+8,shoulder[1]-7],
      [shoulder[0]+9,shoulder[1]+7],[shoulder[0]-8,shoulder[1]+7]],mid,INK,1.4);
    limb(g,shoulder,elbow,dark,mid,10);
    ell(g,elbow[0],elbow[1],4,4,plate,INK,1.2);
    limb(g,elbow,hand,dark,mid,9);
    shape(g,[[hand[0]-5,hand[1]-5],[hand[0]+5,hand[1]-5],
      [hand[0]+7,hand[1]+5],[hand[0]-6,hand[1]+6]],mid,INK,1);
    for(let i=-1;i<=1;i++)line(g,[[hand[0]+i*4,hand[1]+4],
      [hand[0]+i*4+side,hand[1]+8]],plate,1.3);
  }
  const headShape=heavy?14:titan?11:12;
  shape(g,[[cx-headShape,cy-8],[cx+headShape,cy-8],[cx+headShape-2,cy+9],
    [cx-1,cy+12],[cx-headShape+1,cy+9]],
    ramp(g,cx-4,cy-5,22,light,mid,dark),INK,1.8);
  if(!A.back){
    for(const side of [-1,1])ell(g,cx+side*5,cy,2.7,2.2,'#9ee6f0',INK,.7);
    line(g,[[cx-5,cy+7],[cx+5,cy+7]],inset,1.6);
  }else{
    for(let i=-1;i<=1;i++)line(g,[[cx+i*5,cy-5],[cx+i*5,cy+7]],plate,1.4);
  }
  if(heavy){
    // Gearhulk is gear-driven ironwork, not a simple recolored stone golem.
    for(const side of [-1,1]){
      const x=cx+side*16,y=A.torsoY-7;
      ell(g,x,y,5.5,5.5,plate,INK,1.4);
      for(let i=0;i<6;i++){const a=i*Math.PI/3;
        line(g,[[x+Math.cos(a)*5,y+Math.sin(a)*5],
          [x+Math.cos(a)*7,y+Math.sin(a)*7]],inset,1.4);}
      ell(g,x,y,2,2,inset,null);
    }
  }
  if(titan){
    // Armored sentinel/titan shoulder fins without changing gameplay occupancy.
    for(const side of [-1,1])
      shape(g,[[48+side*13,A.torsoY-12],[48+side*23,A.torsoY-24],
        [48+side*25,A.torsoY-10]],plate,INK,1.3);
  }
}
export function drawHumanoidStudyFrame(g,feature,view,state,frame,palette){
  const A=humanoidRigPose(feature,state,frame,view);
  if(!A)throw new Error('Unsupported native humanoid/construct '+feature);
  if(!palette?.dark||!palette?.mid||!palette?.light)throw new Error('Missing anatomy material palette');
  g.save();g.beginPath();g.rect(0,0,HUMANOID_FRAME,HUMANOID_FRAME);g.clip();
  g.lineJoin='round';g.lineCap='round';
  shadow(g);
  if(feature==='friendlyCatSoldier')cat(g,A,palette,state,frame);
  else if(feature==='friendlySkeleton')skeleton(g,A,palette);
  else if(feature==='zombie')zombie(g,A,palette,state);
  else golem(g,A,palette,feature,state,frame);
  g.restore();
}
