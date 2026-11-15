/**
 * Original 96px cached RGBA runtime token studies for Squirrels and Saprolings.
 * The Squirrel's curled fur counterweight dominates its silhouette; the
 * Saproling is a living mushroom/root creature, NOT an overpainted Grub.
 *
 * Each frame is based on state, frame and direction only; no gameplay RNG.
 * Art-quality signoff against the owner-approved HD-2D references is pending.
 */
import {creaturePose} from './creature-motion.js';
export const TOKEN_FRAME=96;
export const TOKEN_STUDY_FEATURES=Object.freeze(['friendlySquirrel','saproling']);
const INK='#2d2927',CREAM='#f6ddaf',BARK='#493627',MOSS='#4d6e43';
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
const curl=(g,from,via1,via2,to,color,width)=>{
  g.beginPath();g.moveTo(...from);g.bezierCurveTo(...via1,...via2,...to);
  g.lineCap='round';g.lineJoin='round';g.lineWidth=width;g.strokeStyle=color;g.stroke();
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function tokenRigPose(feature,state,frame,view=0){
  if(!TOKEN_STUDY_FEATURES.includes(feature))return null;
  if(view!==0&&view!==1)throw Error('Token study supports two authored views');
  const m=creaturePose(feature,state,frame,view===1);
  const bob=state===0?[0,-1,-2,-1][frame]:m.bob*.25;
  const squash=state===5?m.collapse*.56:0;
  return {...m,back:view===1,bob,squash,
    tailCurl:m.tail*.68+(state===3?m.strike*.35:0),
    headX:state===2?m.strike*.55:state===4?m.advance*.28:0,
    footStep:state===1?m.nearStep:state===2?m.strike*.2:0,
    capSway:state===0?[0,1,2,1][frame]:state===1?m.nearStep*1.2:
      state===2?m.strike*.25:state===4?m.tilt*.3:state===5?m.collapse*.35:0,
    rootLift:state===1?Math.abs(m.nearStep)*2.2:state===2?m.strike*.35:0,
    sporeBurst:state===3?m.strike:state===2?m.strike*.33:0
  };
}
function squirrel(g,p,c,state,frame){
  const {dark,mid,light}=c;
  const cx=52+p.headX,cy=58+p.bob+p.squash*.22;
  const earShift=p.head*.15,tip=p.tailCurl;
  // The LARGE, upward-curled tail is structurally attached to the hindquarters.
  // Triple-layered brush/curl establishes individual fur volume and a strong
  // chestnut-to-cream value separation rather than a generic rodent outline.
  const root=[cx-9,cy+8],lo=[27,69+p.bob*.15],turn=[13+tip*.35,51-tip*.22],
    upper=[22+tip*.4,24-tip*.22],finish=[35+tip*.15,36-tip*.38];
  curl(g,root,[25,79],[13,66],turn,INK,22);
  curl(g,turn,[9+tip*.35,32-tip*.25],[22+tip*.4,18-tip*.22],finish,INK,23);
  curl(g,root,[25,79],[13,66],turn,dark,19);
  curl(g,turn,[9+tip*.35,32-tip*.25],[22+tip*.4,18-tip*.22],finish,mid,19);
  curl(g,[30,66],[17,55],[17+tip*.3,34],[30+tip*.2,31-tip*.28],light,9);
  curl(g,[30,66],[23,57],[20+tip*.3,38],[30+tip*.2,34-tip*.28],CREAM,3.1);
  // Fur ends fall inside the 96px cell to avoid transparent atlas seams.
  for(let i=0;i<7;i++){
    const x=13+i*3.2,y=41+(i%3)*4-tip*.22;
    line(g,[[x,y],[x-2+(i%2)*4,y-3]],i%2?light:mid,1.7);
  }
  // Near/far hind paws scamper while the weight stays on the lower haunch.
  const step=p.footStep;
  for(const side of [-1,1]){
    const ox=side*5;
    const fx=cx+ox+step*(side<0?-2:2),fy=84+p.bob*.2-Math.abs(step)*2+p.squash*.12;
    line(g,[[cx+ox,cy+12],[cx+ox+step,74+p.bob],[fx,fy]],dark,6);
    ell(g,fx,fy,5.5,3.1,mid,INK,.8);
    for(let j=-1;j<=1;j++)line(g,[[fx+j*2,fy+1],[fx+j*2+.7,fy+3]],CREAM,.8);
  }
  // Compact squirrel chest, layered belly fur, forearms and shoulder tufts.
  ell(g,cx,cy+6,14.5,20,grad(g,cx-6,cy-2,24,light,mid,dark),INK,1.6);
  ell(g,cx+5,cy+8,6.9,13.1,grad(g,cx+3,cy+1,14,CREAM,light,mid),null);
  for(let k=0;k<7;k++){
    const y=cy-6+k*3.4,x=cx-12+(k%3)*.8;
    line(g,[[x,y],[x-2,y+2.6]],k%2?dark:light,1.4);
  }
  for(const side of [-1,1]){
    const shoulder=[cx+side*7,cy-6],wrist=[cx+side*9+p.strike*.13,cy+8-p.strike*.48];
    line(g,[shoulder,wrist],INK,5.7);
    line(g,[shoulder,wrist],mid,4.1);
    ell(g,wrist[0],wrist[1],3.7,3.5,light,INK,.6);
  }
  // Triangular ears emerge from skull; front/back eyes and cheek markings differ.
  const hx=cx+10,hy=cy-19+earShift;
  for(const side of [-1,1]){
    poly(g,[[hx+side*7,hy-4],[hx+side*13,hy-16],[hx+side*15,hy+2]],
      mid,INK,1.1);
    poly(g,[[hx+side*10,hy-4],[hx+side*13,hy-10],[hx+side*13,hy-1]],
      light,null);
  }
  ell(g,hx,hy,12.5,11.5,grad(g,hx-5,hy-4,18,light,mid,dark),INK,1.4);
  if(!p.back){
    ell(g,hx+6,hy+4,8.5,5.5,CREAM,null);
    ell(g,hx+11,hy+3,2.1,1.5,INK,null);
    ell(g,hx+3,hy-3,2.5,2.8,INK,null);
    ell(g,hx+3.7,hy-3.7,.72,.73,CREAM,null);
    line(g,[[hx+8,hy+8],[hx+13,hy+7]],dark,.85);
    for(const side of [-1,1])
      line(g,[[hx+9,hy+5],[hx+9+side*10,hy+4+side*2]],CREAM,.7);
  }else{
    for(let j=-1;j<=1;j++)line(g,[[hx+j*4,hy-3],[hx+j*3.5,hy+5]],light,1.15);
  }
  if(state===2 && p.strike>=2){
    line(g,[[hx+12,hy+9],[hx+17,hy+10]],INK,1.4);
    line(g,[[hx+12,hy+8],[hx+16,hy+7]],CREAM,1);
  }
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
  if(feature==='friendlySquirrel')squirrel(g,p,palette,state,frame);
  else saproling(g,p,palette,state,frame);
  g.restore();
}
