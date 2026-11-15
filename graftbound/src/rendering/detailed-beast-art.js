/**
 * Original 96px native Wolf / Direwolf / Drake RGBA animation art studies.
 * Authored once at load into cached atlases, with natural quadruped anatomy and
 * shoulder-rooted wing motion. Uses ONLY deterministic animation pose values.
 * Final premium hand-painted HD-2D acceptance remains a separate art review.
 */
import {creaturePose} from './creature-motion.js';
export const BEAST_FRAME=96;
export const BEAST_STUDY_FEATURES=Object.freeze(['wolf','direwolf','friendlyDrake']);
const INK='#242328',IVORY='#f4e9cf',SHADOW='rgba(20,16,17,.30)';
const line=(g,pts,color,width=1.4)=>{
  g.beginPath();g.moveTo(...pts[0]);for(const p of pts.slice(1))g.lineTo(...p);
  g.lineJoin='round';g.lineCap='round';g.lineWidth=width;g.strokeStyle=color;g.stroke();
};
const polygon=(g,pts,fill,stroke=INK,width=1.2)=>{
  g.beginPath();g.moveTo(...pts[0]);for(const p of pts.slice(1))g.lineTo(...p);
  g.closePath();g.fillStyle=fill;g.fill();
  if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}
};
const ell=(g,x,y,rx,ry,fill,stroke=INK,width=.9)=>{
  g.beginPath();g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,2*Math.PI);
  g.fillStyle=fill;g.fill();
  if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}
};
const shade=(g,x,y,r,light,mid,dark)=>{
  const grad=g.createRadialGradient(x-r*.34,y-r*.47,0,x,y,r);
  grad.addColorStop(0,light);grad.addColorStop(.51,mid);grad.addColorStop(1,dark);return grad;
};
const strokeJoint=(g,a,b,width,mid,light)=>{
  line(g,[a,b],INK,width+2);
  line(g,[a,b],mid,width);
  line(g,[[a[0]-.9,a[1]-.9],[b[0]-.9,b[1]-.9]],light,Math.max(1,width*.2));
};
const px=n=>Math.round(n*10)/10;
export function beastRigPose(feature,state,frame,view=0){
  if(!BEAST_STUDY_FEATURES.includes(feature))return null;
  if(view!==0&&view!==1)throw Error('Beast anatomy supports two authored views');
  const m=creaturePose(feature,state,frame,view===1);
  const slump=state===5?m.collapse*.5:0;
  const gait=state===1?m.nearStep:0,far=state===1?m.farStep:0;
  return {...m,back:view===1,slump,
    bodyLift:state===1?m.bob*.22:state===0?m.tilt*.3:state===4?m.tilt*.2:slump,
    headShift:state===2?m.strike*.47:state===3?m.head*.37:state===4?m.advance*.24:0,
    legs:[0,1,2,3].map((i)=>{
      const x=[34,44,57,65][i],s=(i===0||i===3)?gait:far;
      const knee=[px(x+s*2.7),px(72-Math.abs(s)*2+slump*.4)];
      return {i,hip:[x,59],knee,foot:[px(x+s*4),px(83-Math.abs(s)*1.9+slump*.28)]};
    })};
}
function backdrop(g){ell(g,48,89,29,3.3,SHADOW,null);}
function wolf(g,p,c,kind,state,frame){
  const {dark,mid,light}=c,large=kind==='direwolf';
  const y=p.bodyLift,advance=p.advance*.33,headShift=p.headShift;
  const bodyX=44+advance*.2,headX=68+headShift;
  // Tail is rooted behind the hip and follows actual gait/attack response.
  const tailUp=p.tail*.36,tailStart=[27,y+55],tailTip=[11,43+y-tailUp];
  line(g,[tailStart,[18,48+y-tailUp*.4],tailTip],INK,large?9:7);
  line(g,[tailStart,[18,48+y-tailUp*.4],tailTip],mid,large?6.5:5);
  line(g,[[16,47+y-tailUp*.7],tailTip],light,2.1);
  // Far-side limbs behind chest, with distinct hocks and rooted paws.
  for(const limb of p.legs.filter(a=>a.i===1||a.i===3)){
    const h=[limb.hip[0]+advance*.15,limb.hip[1]+y];
    const k=[limb.knee[0]+advance*.15,limb.knee[1]+y],f=[limb.foot[0]+advance*.15,limb.foot[1]+y];
    strokeJoint(g,h,k,large?7:6,dark,mid);strokeJoint(g,k,f,large?5.6:4.5,mid,light);
    ell(g,f[0]+1,f[1]+1,5.2,3.2,dark,INK,1);
  }
  // Shoulder hump, elongated ribcage and layered warm fur planes.
  ell(g,bodyX,51+y,large?29:26,large?18:16,
    shade(g,bodyX-7,44+y,large?34:31,light,mid,dark),INK,1.6);
  ell(g,bodyX-8,54+y,17,8,dark,null);
  for(let i=0;i<7;i++){
    const x=26+i*5+advance*.2;
    line(g,[[x,40+y-(i%2)*1],[x+2,43+y],[x+1,46+y]],
      i%3===0?light:mid,1.25);
  }
  // Heavy neck ruff distinguishes wolf from Direwolf; never an unrelated dog model.
  polygon(g,[[52,40+y],[61,35+y],[71,40+y],[76,53+y],
    [67,66+y],[56,65+y],[53,58+y],[49,53+y]],
    shade(g,60,44+y,large?26:23,light,mid,dark),INK,1.3);
  for(let i=0;i<6;i++){
    const k=i-2.5,x=56+i*3.1+headShift*.3;
    polygon(g,[[x,53+y],[x+k*.6,62+y+(i%2)*2],[x+3,56+y]],
      i%2?mid:light,null);
  }
  // Four-legged gait, near-side limbs visible IN FRONT of shoulder ruff.
  for(const limb of p.legs.filter(a=>a.i===0||a.i===2)){
    const h=[limb.hip[0]+advance*.15,limb.hip[1]+y],
      k=[limb.knee[0]+advance*.15,limb.knee[1]+y],
      f=[limb.foot[0]+advance*.15,limb.foot[1]+y];
    strokeJoint(g,h,k,large?7.5:6.5,mid,light);
    ell(g,k[0],k[1],large?4.1:3.3,3.6,mid,INK,.65);
    strokeJoint(g,k,f,large?5.8:4.8,dark,mid);
    ell(g,f[0],f[1]+1,large?6.1:5.1,3.2,mid,INK,1);
    for(let t=-1;t<=1;t++)line(g,[[f[0]+t*2.3,f[1]+1],[f[0]+t*2.3+.6,f[1]+3]],light,.8);
  }
  // Supported skull, true pointed ears and muzzle; jaw opens on attack.
  polygon(g,[[headX-11,38+y],[headX-8,23+y+p.head*.2],
    [headX-1,33+y],[headX+4,22+y+p.head*.15],[headX+9,40+y]],
    mid,INK,1.1);
  ell(g,headX,43+y+p.head*.25,large?14:12,large?13:11,
    shade(g,headX-4,39+y,19,light,mid,dark),INK,1.35);
  const jawOpen=state===2?p.strike*.62:0;
  polygon(g,[[headX+4,45+y],[headX+17,45+y-jawOpen*.15],
    [headX+19,51+y+jawOpen*.4],[headX+9,54+y+jawOpen*.22]],
    dark,INK,1);
  polygon(g,[[headX+3,43+y],[headX+16,41+y],[headX+19,46+y],
    [headX+9,48+y]],light,INK,.8);
  if(jawOpen>=2){
    for(let j=0;j<3;j++)polygon(g,[[headX+8+j*3,47+y],
      [headX+9+j*3,50+y+jawOpen*.2],[headX+11+j*3,47+y]],IVORY,null);
  }
  ell(g,headX+18,44+y,2.2,1.9,INK,null);
  if(!p.back){
    ell(g,headX+3,39+y,2.6,2,INK,null);
    ell(g,headX+3.5,38.5+y,.7,.7,IVORY,null);
    line(g,[[headX-9,46+y],[headX-4,48+y]],large?dark:mid,1.3);
  }else{
    // Back-view crown markings replace front-view eyes and muzzle markings.
    for(let i=0;i<3;i++)line(g,[[headX-6+i*4,36+y],[headX-5+i*4,44+y]],light,1.1);
  }
  if(large){
    for(let i=0;i<5;i++){
      const x=35+i*6;
      polygon(g,[[x,37+y],[x+2,29+y-(i%2)*2],[x+5,39+y]],i%2?dark:mid,null);
    }
    ell(g,headX-5,51+y,4,5,dark,null);
  }
}
function drake(g,p,c,state,frame){
  const {dark,mid,light}=c;
  const y=p.bodyLift,move=p.advance*.27,up=p.wing,headShift=p.headShift;
  const bx=47+move*.15;
  // Tapered tail is anchored at hip, with a moving tip and spade-shaped end.
  line(g,[[32,55+y],[20,64+y+p.tail*.25],[12,67+y+p.tail*.27]],INK,7);
  line(g,[[32,55+y],[20,64+y+p.tail*.25],[12,67+y+p.tail*.27]],mid,4.5);
  polygon(g,[[10,63+y+p.tail*.27],[5,69+y+p.tail*.27],[15,71+y+p.tail*.27]],
    dark,INK,1);
  // Far wing first. Shoulder pivot stays attached when wing rises.
  for(const side of [-1,1]){
    const sx=bx+side*4,tipX=bx+side*(21+up*.28);
    const tipY=23-up*.57+y*.1;
    polygon(g,[[sx,45+y],[bx+side*12,32-up*.25+y],
      [tipX,Math.max(9,tipY)],[bx+side*(27+up*.15),49+y],
      [bx+side*10,56+y]],side===-1?dark:mid,INK,1.4);
    line(g,[[sx,45+y],[tipX,Math.max(9,tipY)]],side===-1?mid:light,2);
    line(g,[[sx,45+y],[bx+side*(27+up*.15),49+y]],light,1.3);
    for(let i=1;i<=3;i++){
      const mx=bx+side*(9+i*4),my=37-up*.24+i*3+y*.4;
      line(g,[[sx,45+y],[mx,my]],i%2?dark:mid,.85);
    }
  }
  // Two four-clawed hind legs, separate knee and foot articulation.
  for(const limb of p.legs.filter(a=>a.i===1||a.i===2)){
    const h=[limb.hip[0]+move*.2,58+y],k=[limb.knee[0]+move*.2,limb.knee[1]+y],
      f=[limb.foot[0]+move*.2,limb.foot[1]+y];
    strokeJoint(g,h,k,7,dark,mid);strokeJoint(g,k,f,5,mid,light);
    ell(g,f[0],f[1],5.2,3,mid,INK,1);
    for(let t=-1;t<=1;t++)line(g,[[f[0]+t*2,f[1]],[f[0]+t*2+1,f[1]+2.8]],IVORY,.8);
  }
  ell(g,bx,54+y,23,14,shade(g,bx-5,49+y,31,light,mid,dark),INK,1.5);
  // Individually directed plate scales, not randomized pixel noise.
  for(let i=0;i<6;i++){
    const x=30+i*6;
    polygon(g,[[x,47+y],[x+3,44+y-(i%2)*2],[x+5,49+y]],
      i%2?light:mid,null);
  }
  line(g,[[bx+8,50+y],[64+headShift*.35,39+y+p.head*.2]],INK,10);
  line(g,[[bx+8,50+y],[64+headShift*.35,39+y+p.head*.2]],mid,7.2);
  const hx=70+headShift,hy=36+y+p.head*.25;
  // Scaled skull, rear horns and an articulated jaw, all following the neck.
  polygon(g,[[hx-10,hy-2],[hx-11,hy-14],[hx-4,hy-7],[hx+2,hy-17],
    [hx+6,hy-4]],dark,INK,1);
  polygon(g,[[hx-11,hy-5],[hx+5,hy-9],[hx+15,hy-3],[hx+14,hy+7],
    [hx,hy+11],[hx-13,hy+6]],
    shade(g,hx-5,hy-5,22,light,mid,dark),INK,1.3);
  const gap=state===2||state===3?p.strike*.6:0;
  polygon(g,[[hx+2,hy+5],[hx+16,hy+3],[hx+16,hy+8+gap],
    [hx+4,hy+11+gap*.5]],dark,INK,.85);
  for(let i=0;i<3;i++)polygon(g,[[hx+6+i*3,hy+5],
    [hx+7+i*3,hy+8+gap*.3],[hx+9+i*3,hy+4]],IVORY,null);
  if(!p.back){
    ell(g,hx+4,hy-4,2,2.2,'#eccd72',INK,.6);
    ell(g,hx+4.5,hy-4.5,.55,.7,INK,null);
  }else for(let i=0;i<3;i++)line(g,[[hx-6+i*4,hy-4],[hx-5+i*4,hy+4]],light,1);
  if((state===2||state===3)&&p.strike>0){
    // Spell and bite effects stay within their authored frame and don't damage.
    for(let j=0;j<3;j++)ell(g,Math.min(89,hx+16+j*2),hy+5+j%2*2,
      1.8+p.strike*.1,1.7,iF(j)?'#f1b96f':'#ffda84',null);
  }
}
function iF(x){return x%2===0;}
export function drawBeastStudyFrame(g,feature,view,state,frame,palette){
  const p=beastRigPose(feature,state,frame,view);
  if(!p)throw Error('Unsupported native beast '+feature);
  if(!palette?.dark||!palette?.mid||!palette?.light)throw Error('Missing beast material palette');
  g.save();g.beginPath();g.rect(0,0,BEAST_FRAME,BEAST_FRAME);g.clip();
  g.lineJoin='round';g.lineCap='round';backdrop(g);
  if(feature==='friendlyDrake')drake(g,p,palette,state,frame);
  else wolf(g,p,palette,feature,state,frame);
  g.restore();
}
