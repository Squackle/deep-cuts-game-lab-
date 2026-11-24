/**
 * Original 96px cached RGBA runtime study for fungal Saproling summons.
 * The approved painterly Squirrel raster is installed later by the authoritative
 * benchmark pipeline and MUST NOT be replaced by a procedural token model.
 *
 * Each frame is based on state, frame and direction only; no gameplay RNG.
 * Art-quality signoff against the owner-approved HD-2D references is pending.
 */
import {creaturePose} from './creature-motion.js';
export const TOKEN_FRAME=96;
export const TOKEN_STUDY_FEATURES=Object.freeze(['saproling']);
const INK='#2d2927',CREAM='#f6ddaf',MOSS='#4d6e43';
const line=(g,pts,paint,width=1.2)=>{
  g.beginPath();g.moveTo(...pts[0]);for(const p of pts.slice(1))g.lineTo(...p);
  g.lineJoin='round';g.lineCap='round';g.lineWidth=width;g.strokeStyle=paint;g.stroke();
};
const poly=(g,pts,fill,edge=INK,width=1.1)=>{
  g.beginPath();g.moveTo(...pts[0]);for(const p of pts.slice(1))g.lineTo(...p);
  g.closePath();g.fillStyle=fill;g.fill();
  if(edge){g.lineWidth=width;g.strokeStyle=edge;g.stroke();}
};
const ell=(g,x,y,rx,ry,fill,edge=INK,width=1)=>{
  g.beginPath();g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);
  g.fillStyle=fill;g.fill();if(edge){g.lineWidth=width;g.strokeStyle=edge;g.stroke();}
};
const grad=(g,x,y,r,hi,mid,dark)=>{
  const v=g.createRadialGradient(x-r*.33,y-r*.45,0,x,y,r);
  v.addColorStop(0,hi);v.addColorStop(.55,mid);v.addColorStop(1,dark);return v;
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function tokenRigPose(feature,state,frame,view=0){
  if(!TOKEN_STUDY_FEATURES.includes(feature))return null;
  if(view!==0&&view!==1)throw Error('Token study supports two authored views');
  const m=creaturePose(feature,state,frame,view===1);
  const bob=state===0?[0,-1,-2,-1][frame]:m.bob*.25;
  const squash=state===5?m.collapse*.56:0;
  return {...m,back:view===1,bob,squash,
    footStep:state===1?m.nearStep:state===2?m.strike*.2:0,
    capSway:state===0?[0,1,2,1][frame]:state===1?m.nearStep*1.2:
      state===2?m.strike*.25:state===4?m.tilt*.3:state===5?m.collapse*.35:0,
    rootLift:state===1?Math.abs(m.nearStep)*2.2:state===2?m.strike*.35:0,
    sporeBurst:state===3?m.strike:state===2?m.strike*.33:0
  };
}
function saproling(g,p,c,state,frame){
  const {dark,mid,light}=c,shift=p.capSway;
  const sink=p.squash*.45,coreY=57+p.bob*.3+sink;
  // Roots emerge directly from the stalk. Walk gait bends these attachments,
  // and the defeat animation folds the whole mushroom instead of dropping a still.
  for(let i=-2;i<=2;i++){
    const x=48+i*3.3,step=(i%2?-1:1)*p.footStep,tipX=48+i*6.8+step*2.3;
    const tipY=83-p.rootLift*(i%2?1:.6)+sink*.15;
    line(g,[[x,coreY+10],[tipX,tipY]],INK,4.8);
    line(g,[[x,coreY+10],[tipX,tipY]],i%2?MOSS:mid,3.1);
    poly(g,[[tipX-3,tipY-1],[tipX+4,tipY-1],[tipX+5,tipY+3],[tipX-4,tipY+3]],dark,INK,.6);
  }
  // Organic bell/stalk is vertically continuous with the cap gills.
  poly(g,[[39,45+p.bob*.2],[57,45+p.bob*.2],[62,61+sink],
    [57,75+sink],[40,75+sink],[34,62+sink]],
    grad(g,41,53,27,light,mid,dark),INK,1.45);
  for(let i=0;i<7;i++){
    const x=39+i*3.2;
    line(g,[[x,51+p.bob*.2],[x+(i%2?2:-1),64+sink*.7]],
      i%2?light:dark,1.1);
  }
  // Shoulder-length mycelial arms and fungus claws, no human hands.
  for(const side of [-1,1]){
    const root=[48+side*10,54],ext=state===2?p.strike:state===3?p.sporeBurst*.4:0;
    const end=[48+side*(25+ext*.5),62-ext*.4+sink*.4];
    line(g,[root,[48+side*17,58],[...end]],INK,6.5);
    line(g,[root,[48+side*17,58],end],mid,4.5);
    for(let j=-1;j<=1;j++)line(g,[end,[end[0]+side*(4+j),end[1]+j*3]],
      light,1.5);
  }
  // Broad textured mushroom cap, rooted to the stalk (not a pasted circle).
  const capX=48+shift*.45,capY=38+p.bob*.5+sink*.3,capWide=27+p.sporeBurst*.2;
  ell(g,capX,capY+9,capWide-3,9,grad(g,capX-4,capY+3,29,CREAM,light,dark),INK,1.2);
  for(let j=-6;j<=6;j++){
    const x=capX+j*3.2;
    line(g,[[x,capY+6],[x+j*.28,capY+13]],j%2?MOSS:dark,.8);
  }
  g.beginPath();
  g.moveTo(capX-capWide,capY+7);
  g.bezierCurveTo(capX-capWide+4,capY-6,capX-15,capY-16,capX,capY-17);
  g.bezierCurveTo(capX+16,capY-17,capX+capWide-4,capY-6,capX+capWide,capY+7);
  g.closePath();g.fillStyle=grad(g,capX-8,capY-6,36,light,mid,dark);
  g.fill();g.lineWidth=1.7;g.strokeStyle=INK;g.stroke();
  // Distinct spores/lichen form hand-authored patches, not noise/dithering.
  for(let i=0;i<8;i++){
    const x=capX-18+(i*7)%36,y=capY-4+(i*3)%9;
    ell(g,x,y,2+(i%3)*.5,1.5+i%2,i%3?light:CREAM,null);
  }
  if(c.verdant){
    // Verdant Force's green token: three leaflets grow out of the cap, not a recolored generic sprout.
    const root=[capX+1,capY-14];
    for(const side of [-1,1]){
      const tip=[root[0]+side*16,root[1]-7+p.capSway*.12];
      poly(g,[root,[root[0]+side*5,root[1]-9],tip,[root[0]+side*10,root[1]+1]],side<0?'#a6c961':'#76a94c','#38513a',1);
      line(g,[root,tip],'#e1e8a2',.8);
    }
    poly(g,[root,[root[0]-4,root[1]-9],[root[0]+2,root[1]-15],[root[0]+7,root[1]-8]],'#b6d779','#38513a',1);
  }
  if(!p.back){
    ell(g,43,56+sink,2.4,2.3,INK,null);ell(g,55,56+sink,2.4,2.3,INK,null);
    ell(g,43.5,55.3+sink,.7,.8,CREAM,null);
    line(g,[[46,65+sink],[51,65+sink]],dark,1.3);
  }else{
    for(let i=-1;i<=1;i++)line(g,[[48+i*4,53+sink],[48+i*4,64+sink]],light,1.2);
  }
  // Casting exhales a timed crown of spores. No gameplay effects are created.
  if(state===3||state===2){
    for(let i=0;i<6;i++){
      const a=(i/5)*Math.PI;
      const d=4+p.sporeBurst*.72;
      const x=capX+Math.cos(a)*d*2.9,y=capY-15-Math.sin(a)*d;
      ell(g,clamp(x,5,90),clamp(y,5,90),1.4+(i%2)*.4,1.4,CREAM,null);
    }
  }
}
export function drawTokenStudyFrame(g,feature,view,state,frame,palette){
  const p=tokenRigPose(feature,state,frame,view);
  if(!p)throw Error('Unsupported native token '+feature);
  if(!palette?.dark||!palette?.mid||!palette?.light)throw Error('Missing token material palette');
  g.save();g.beginPath();g.rect(0,0,TOKEN_FRAME,TOKEN_FRAME);g.clip();
  g.lineJoin='round';g.lineCap='round';
  ell(g,49,88,26,3.1,'rgba(24,18,18,.30)',null);
  saproling(g,p,palette,state,frame);
  g.restore();
}
