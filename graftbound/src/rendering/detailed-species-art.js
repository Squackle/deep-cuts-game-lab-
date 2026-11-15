/**
 * Species-specific 96px original RGBA animation studies, constructed ONCE at load.
 * Spiders have eight individually positioned legs, hornets six; snakes have none.
 * All six states and both three-quarter views share the same anatomy, palette and
 * shadow pivot. Not a replacement for individually hand-painted final art.
 */
import {creaturePose} from './creature-motion.js';

export const SPECIES_FRAME=96;
export const SPECIES_STUDY_FEATURES=Object.freeze(['spiderling','friendlySnake','friendlyHornet','stinger']);
const ink='#28252b',soil='#41352c',ivory='#f4e5c6';
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const poly=(g,pts,fill,stroke=ink,lw=1.25)=>{
  g.beginPath();g.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);
  g.closePath();g.fillStyle=fill;g.fill();
  if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke();}
};
const ell=(g,x,y,rx,ry,fill,stroke=ink,lw=1.25)=>{
  g.beginPath();g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);
  g.fillStyle=fill;g.fill();
  if(stroke){g.lineWidth=lw;g.strokeStyle=stroke;g.stroke();}
};
const line=(g,points,color,width=1.5)=>{
  g.beginPath();g.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);
  g.lineWidth=width;g.lineJoin='round';g.lineCap='round';g.strokeStyle=color;g.stroke();
};
const gradient=(g,x,y,rx,light,mid,dark)=>{
  const z=g.createRadialGradient(x-rx*.28,y-rx*.45,0,x,y,rx);
  z.addColorStop(0,light);z.addColorStop(.52,mid);z.addColorStop(1,dark);return z;
};
const curves=(g,points,color,width)=>{
  g.beginPath();g.moveTo(...points[0]);
  for(let i=1;i+2<points.length;i+=3)
    g.bezierCurveTo(...points[i],...points[i+1],...points[i+2]);
  g.lineCap='round';g.lineJoin='round';g.lineWidth=width;g.strokeStyle=color;g.stroke();
};
export function speciesRigPose(feature,state,frame,view=0){
  if(!SPECIES_STUDY_FEATURES.includes(feature))return null;
  const p=creaturePose(feature,state,frame,view===1);
  const back=view===1,step=p.nearStep,far=p.farStep;
  if(feature==='spiderling'){
    const legs=[];
    for(const side of [-1,1])for(let i=0;i<4;i++){
      const gait=((i+ (side===1?0:2))%2===0?step:far);
      const raise=state===1?Math.abs(gait)*3:state===2?Math.max(0,p.strike-3)*.35:0;
      legs.push({
        side,index:i,
        base:[48+side*(8+i*.65),54+i*2],
        joint:[48+side*(18+i*1.8),35+i*5-p.strike*.13],
        foot:[48+side*(31+i*2.5)+gait*3,73+i*2+raise-p.collapse*.55]
      });
    }
    return {...p,legs,back,headShift:p.strike*.53+p.advance*.24,bodyDrop:p.collapse*.66};
  }
  if(feature==='friendlySnake'){
    return {...p,legs:[],back,coilPulse:state===1?[0,3,0,-3][frame]:state===0?[0,1,2,1][frame]:0,
      neckBend:state===2?p.strike*.8:state===4?p.advance*.8:0,bodyDrop:p.collapse*.5};
  }
  const legs=[];
  for(const side of [-1,1])for(let i=0;i<3;i++){
    const gait=i%2===0?step:far;
    legs.push({side,index:i,
      base:[47+side*(4+i*3),56+i*2],
      joint:[47+side*(10+i*3),64+i*2],
      foot:[47+side*(15+i*2)+gait*2,78+i*2-p.collapse*.3]});
  }
  return {...p,legs,back,wingLift:state===0?[1,6,3,8][frame]:p.wing,
    antenna:state===0?[0,2,1,-1][frame]:p.head*.3,
    sting:p.strike*1.2,bodyDrop:p.collapse*.5};
}
function shadow(g){
  ell(g,48,87,34,4,'rgba(19,15,14,.28)',null);
  line(g,[[25,87],[68,87]],'rgba(230,213,179,.12)',.8);
}
function spider(g,rig,palette,state,frame){
  const {dark,mid,light}=palette,back=rig.back,drop=rig.bodyDrop,advance=rig.advance*.3;
  const headX=back?39:60;
  g.save();g.translate(advance,drop);
  // Legs behind the carapace: all eight keep their own knee + grounded tarsus.
  for(const leg of rig.legs){
    const [x,y]=leg.base,[kx,ky]=leg.joint,[fx,fy]=leg.foot;
    line(g,[[x,y],[kx,ky],[fx,fy]],ink,5);
    line(g,[[x,y],[kx,ky]],mid,3.1);
    line(g,[[kx,ky],[fx,fy]],dark,2.5);
    ell(g,kx,ky,2.6,2.3,light,ink,.75);
    ell(g,fx,fy,2.2,1.7,mid,ink,.65);
    line(g,[[fx,fy],[fx+leg.side*2.5,fy+1]],light,.9);
  }
  // Abdominal segmentation with unbroken lighting (not a recolored dog body).
  ell(g,39,57,17.5,15,gradient(g,35,51,26,light,mid,dark),ink,2);
  for(let i=0;i<5;i++){
    const px=29+i*4,py=47+(i%2)*2;
    line(g,[[px,py],[px-2,py+8]],i%2?light:dark,1.6);
  }
  for(let j=0;j<3;j++)line(g,[[29,60+j*3],[49,60+j*3]],j%2?dark:mid,1);
  const mouthY=56+rig.head*.32;
  ell(g,headX,mouthY,11.5,10.5,gradient(g,headX-3,mouthY-4,17,light,mid,dark),ink,1.7);
  for(const side of [-1,1]){
    ell(g,headX+side*4,mouthY-5,2.1,2.3,state===3?'#9bc6eb':'#e7aa6c',ink,.7);
    ell(g,headX+side*4-.5,mouthY-5.6,.55,.55,ivory,null);
    line(g,[[headX+side*4,mouthY+7],[headX+side*5,mouthY+13+rig.strike*.38]],ivory,1.6);
  }
  // Jaw hooks for the lunge; back view exposes spinnerets instead of fake eyes.
  if(back)for(let k=0;k<2;k++)ell(g,30+k*4,67,2.3,4,dark,ink,.7);
  g.restore();
}
function snake(g,rig,palette,state,frame){
  const {dark,mid,light}=palette,back=rig.back,coil=rig.coilPulse,drop=rig.bodyDrop;
  const sign=back?-1:1,move=rig.advance*.65;
  g.save();g.translate(0,drop);
  // Tail to coiled haunch to neck is one continuous anatomically connected spine.
  const pts=[[23,69],
    [9,68+coil*.2],[9,54-coil],[25,56-coil],
    [38,57+coil],[30,75],[48,74],
    [66,72],[65,54+rig.head*.2],[56,55],
    [48,57],[58,70],[69,64],
    [78,57],[66,45],[57,48]];
  curves(g,pts,ink,18);
  curves(g,pts,dark,14);
  curves(g,pts,mid,10);
  curves(g,pts,light,3.5);
  for(let i=0;i<15;i++){
    const x=18+(i*9)%48,y=62+(i*7)%11;
    line(g,[[x,y],[x+3,y+1]],i%3===0?light:dark,1.1);
  }
  const x=back?37:68+move, y=43+rig.head*.35+rig.neckBend*.18;
  // Neck is behind jaw. Tongue and fangs follow head, not world position.
  line(g,[[57,49],[x-5*sign,y+4]],ink,14);
  line(g,[[57,49],[x-5*sign,y+4]],mid,10);
  poly(g,[[x-13*sign,y-6],[x+7*sign,y-9],[x+13*sign,y-3],[x+9*sign,y+7],[x-11*sign,y+7]],
    gradient(g,x,y-3,18,light,mid,dark),ink,1.6);
  if(!back){
    ell(g,x+4,y-4,2.4,2,ink,light,.8);
    ell(g,x+4.4,y-4.5,.5,.5,ivory,null);
    ell(g,x+11,y+3,1.2,1.2,dark,null);
    if(state===2||state===3){
      line(g,[[x+12,y+4],[x+19+rig.strike,y+7]],'#d66d73',2);
      line(g,[[x+19+rig.strike,y+7],[x+23+rig.strike,y+4]],'#d66d73',1.1);
      line(g,[[x+19+rig.strike,y+7],[x+22+rig.strike,y+11]],'#d66d73',1.1);
    }
  } else{
    for(const side of [-1,1])line(g,[[x+side*5,y-6],[x+side*3,y]],light,1.2);
  }
  g.restore();
}
function hornet(g,rig,palette,state,frame){
  const {dark,mid,light}=palette,back=rig.back,drop=rig.bodyDrop;
  const headX=back?35:64,headY=45+rig.head*.25;
  g.save();g.translate(rig.advance*.23,drop);
  // Two actual paired wings with independently rotated leading edges.
  const spread=rig.wingLift*.8,flap=rig.wingLift*.45;
  for(const side of [-1,1]){
    const rootX=48+side*4,rootY=46;
    poly(g,[[rootX,rootY],[rootX+side*(12+flap),22-spread],[rootX+side*(32+flap),15-spread*.36],
      [rootX+side*(27+flap),38-spread*.15],[rootX+side*5,rootY+3]],
      'rgba(185,215,209,.88)',dark,1.4);
    line(g,[[rootX,rootY],[rootX+side*(29+flap),20-spread*.36]],ivory,1.4);
    line(g,[[rootX+side*5,42],[rootX+side*(22+flap),32-spread*.2]],mid,1.1);
  }
  // Six legs: pairs attach to thorax; feet articulate during walking.
  for(const leg of rig.legs){
    const [x,y]=leg.base,[kx,ky]=leg.joint,[fx,fy]=leg.foot;
    line(g,[[x,y],[kx,ky],[fx,fy]],ink,3.4);
    line(g,[[x,y],[kx,ky]],light,1.8);
    line(g,[[fx,fy],[fx+leg.side*2.6,fy+1]],mid,1.1);
  }
  // Abdomen points away from head and carries distinct banded exoskeleton.
  const abdomenX=back?59:34;
  ell(g,abdomenX,54,17,11,gradient(g,abdomenX-4,50,25,light,mid,dark),ink,1.7);
  for(let i=0;i<4;i++){
    const dx=-11+i*7;
    line(g,[[abdomenX+dx,46],[abdomenX+dx+3,62]],i%2===0?ink:dark,3.4);
    line(g,[[abdomenX+dx+1,47],[abdomenX+dx+4,59]],light,.9);
  }
  const end=back?76:15-rig.sting*.4;
  poly(g,[[abdomenX+(back?15:-15),53],[end,58],[abdomenX+(back?15:-15),62]],dark,ink,1.1);
  ell(g,52,49,10,10,mid,ink,1.3);
  ell(g,headX,headY,9.5,8.5,gradient(g,headX-3,headY-4,15,light,mid,dark),ink,1.5);
  const sense=rig.antenna;
  for(const side of [-1,1]){
    line(g,[[headX+side*3,headY-7],[headX+side*8,headY-16-sense],[headX+side*11,headY-20-sense]],ink,1.7);
    ell(g,headX+side*11,headY-20-sense,1.5,1.5,mid,ink,.6);
    if(!back){ell(g,headX+side*3,headY-2,1.8,2.1,ink,light,.6);}
  }
  // Mandibles and venom/sting are visual only; game rules remain authoritative.
  for(const side of [-1,1])
    line(g,[[headX+side*3,headY+6],[headX+side*5,headY+10+rig.strike*.25]],dark,2);
  g.restore();
}
export function drawSpeciesStudyFrame(g,feature,view,state,frame,palette){
  const rig=speciesRigPose(feature,state,frame,view);
  if(!rig)throw new Error('Unknown original species '+feature);
  if(!palette||!palette.dark||!palette.mid||!palette.light)throw new Error('Species palette requires dark/mid/light');
  g.save();g.beginPath();g.rect(0,0,96,96);g.clip();
  g.lineJoin='round';g.lineCap='round';
  shadow(g);
  if(feature==='spiderling')spider(g,rig,palette,state,frame);
  else if(feature==='friendlySnake')snake(g,rig,palette,state,frame);
  else hornet(g,rig,palette,state,frame);
  g.restore();
}
