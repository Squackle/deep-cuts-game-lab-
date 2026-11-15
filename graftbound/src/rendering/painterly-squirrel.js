/**
 * GRAFTBOUND: hand-sculpted, species-specific 96px squirrel token.
 * Original scene art (not extracted Magic art), constructed at load only.
 * Each movement state has articulated paws, haunch, spine, head and tail.
 * Deliberate fur clusters replace the old Hound-based silhouette.
 *
 * Current quality status: playable first creature pass. Inspect at game zoom;
 * do not claim the full roster or owner's final reference acceptance.
 */
export const SQUIRREL_FRAME_SIZE=96;
export const SQUIRREL_ANIMS=Object.freeze({
  idle:{row:0,frames:4,fps:5,loop:true},
  walk:{row:1,frames:4,fps:11,loop:true},
  attack:{row:2,frames:4,fps:12,loop:false},
  cast:{row:3,frames:4,fps:8,loop:false},
  hurt:{row:4,frames:4,fps:9,loop:false},
  defeat:{row:5,frames:4,fps:7,loop:false}
});
export const SQUIRREL_VIEWS=Object.freeze(['front','back']);
const C={
  edge:'#30231f', deep:'#593421', ochre:'#8b4728', rust:'#b66434',
  fur:'#d78645', gold:'#eeaf63', tip:'#f6c27e', belly:'#e6d4a8',
  cream:'#f9e6be', creamShadow:'#a99175', paw:'#97502d',
  pink:'#ad796d', eye:'#191b1c', glint:'#fff4d1'
};
export function squirrelPose(state,frame){
  const f=((frame%4)+4)%4;
  const step=[-3,1,3,-1][f];
  return {
    bob: state==='walk'?[0,-2,-4,-2][f]:state==='idle'?[0,0,-1,0][f]:0,
    stride:state==='walk'?step:0,
    lunge:state==='attack'?[0,4,8,3][f]:state==='cast'?[0,-2,3,0][f]:state==='hurt'?[0,-5,-7,-3][f]:0,
    tuck:state==='defeat'?[0,.34,.7,1][f]:0,
    tail:state==='walk'?[0,-4,-7,-3][f]:state==='idle'?[0,2,5,2][f]:state==='hurt'?[6,13,9,4][f]:[1,3,6,3][f],
    head:state==='attack'?[0,2,-2,-1][f]:state==='hurt'?[0,-3,-4,-2][f]:state==='idle'?[0,-1,0,1][f]:0
  };
}
const ellipse=(g,x,y,rx,ry,fill,stroke=C.edge,w=1.2)=>{
  g.beginPath();g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);
  g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=w;g.stroke();}
};
function poly(g,points,color,stroke=C.edge,width=1){
  g.beginPath();g.moveTo(...points[0]);for(const pt of points.slice(1))g.lineTo(...pt);g.closePath();
  g.fillStyle=color;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}
}
function grad(g,x,y,r,colors){
  const z=g.createRadialGradient(x-r*.25,y-r*.4,0,x,y,r);
  for(const [offset,col] of colors)z.addColorStop(offset,col);
  return z;
}
function stroke(g,pts,col,width=1){
  g.beginPath();g.moveTo(...pts[0]);
  for(const point of pts.slice(1))g.lineTo(...point);
  g.lineCap='round';g.lineJoin='round';g.lineWidth=width;g.strokeStyle=col;g.stroke();
}
function tail(g,view,pose,defeat){
  const rear=view===1;
  g.save();g.translate(rear?51:27,71+pose.bob+defeat*7);
  g.rotate((rear?-.14:.08)+pose.tail*.012-defeat*.38);
  g.beginPath();
  g.moveTo(-1,4);
  g.bezierCurveTo(rear?-7:-9,-16,-20,-23,-22,-40);
  g.bezierCurveTo(-32,-62,-55,-65,-62,-44);
  g.bezierCurveTo(-76,-17,-55,-8,-44,-24);
  g.bezierCurveTo(-31,-42,-26,-19,-27,-3);
  g.bezierCurveTo(-20,12,-4,15,-1,4);
  g.closePath();
  g.fillStyle=grad(g,-38,-32,50,[[0,C.tip],[.25,C.gold],[.55,C.fur],[.78,C.ochre],[1,C.deep]]);
  g.fill();g.lineWidth=2;g.strokeStyle=C.edge;g.stroke();
  // A darker inner curl and shaped layered locks give the tail its squirrel silhouette.
  g.beginPath();g.moveTo(-38,-24);g.bezierCurveTo(-61,-3,-63,-25,-53,-38);
  g.bezierCurveTo(-47,-44,-38,-34,-38,-24);
  g.fillStyle=C.deep;g.fill();
  g.beginPath();g.moveTo(-44,-22);g.bezierCurveTo(-57,-12,-57,-29,-49,-34);
  g.lineWidth=3;g.strokeStyle=C.ochre;g.stroke();
  const locks=[
    [[-23,-52],[-42,-56],[-55,-47]], [[-27,-48],[-45,-51],[-56,-43]],
    [[-22,-43],[-40,-46],[-54,-38]], [[-25,-37],[-43,-42],[-54,-34]],
    [[-28,-31],[-42,-34],[-50,-28]], [[-26,-24],[-38,-27],[-46,-18]],
    [[-21,-18],[-34,-23],[-40,-11]], [[-18,-10],[-29,-15],[-31,-4]],
    [[-12,0],[-22,-8],[-24,-1]]
  ];
  locks.forEach((p,i)=>stroke(g,p,i%3===0?C.cream:C.gold,i%3===0?1.7:1.1));
  // Crisp, organized two-pixel fur tufts, not random dithering.
  for(let i=0;i<24;i++){
    const k=i%8, band=Math.floor(i/8);
    const x=-23-k*4+band*2,y=-54+k*3+band*5;
    stroke(g,[[x,y],[x-3,y-2]],band===0?C.tip:band===1?C.gold:C.fur,1.2);
  }
  g.restore();
}
function hindPaw(g,x,y,step){
  poly(g,[[x-9,y-9],[x+3,y-11],[x+9,y-1],[x+5,y+6],[x-5,y+5]],C.ochre);
  ellipse(g,x+5+step,y+5,7,3,C.paw,C.edge,1);
  for(let i=0;i<3;i++)stroke(g,[[x+5+i*2+step,y+5],[x+7+i*2+step,y+7]],C.deep,.8);
}
function frontPaw(g,x,y,step){
  stroke(g,[[x-3,y-14],[x+step*.6,y-4],[x+step,y+4]],C.deep,7.5);
  stroke(g,[[x-3,y-14],[x+step*.6,y-4]],C.fur,4.7);
  ellipse(g,x+step,y+4,5.5,3,C.rust,C.edge,1);
  for(let i=-1;i<=1;i++)stroke(g,[[x+step+i*2,y+5],[x+step+i*2+1,y+7]],C.deep,.8);
}
function body(g,p,view,state){
  const rear=view===1;
  const walk=state==='walk',attack=state==='attack';
  const stretch=walk?5:attack?3:0;
  const tuck=p.tuck;
  const bx=rear?49:49+p.lunge*.5,by=64+p.bob+tuck*14;
  if(!rear)hindPaw(g,bx-15,by+17,p.stride>0?-2:1);
  const coat=grad(g,bx-5,by-10,36,[[0,C.gold],[.23,C.fur],[.56,C.rust],[.84,C.ochre],[1,C.deep]]);
  ellipse(g,bx-stretch*.25,by,19+stretch*.55,17-tuck*6,coat,C.edge,1.7);
  // Fur shadows for a round haunch and a real hollow underneath the spine.
  ellipse(g,bx-11,by+4,10,13,C.ochre,null);
  ellipse(g,bx-13,by-4,10,9,grad(g,bx-17,by-8,16,[[0,C.fur],[1,C.rust]]),null);
  if(!rear){
    ellipse(g,bx+7,by+7,10,12-tuck*5,grad(g,bx+10,by+2,20,[[0,C.cream],[.6,C.belly],[1,C.creamShadow]]),null);
    ellipse(g,bx+11,by-3,11,8,C.rust,null);
    for(let i=0;i<10;i++){
      const x=bx-14+(i%5)*5,y=by-8+Math.floor(i/5)*13;
      stroke(g,[[x,y],[x+2,y+2]],i%3===0?C.gold:C.fur,1.1);
    }
  }else{
    for(let i=0;i<12;i++){
      const x=bx-13+(i%6)*5,y=by-9+Math.floor(i/6)*12;
      stroke(g,[[x,y],[x+1,y+2]],i%3===0?C.gold:C.fur,1.1);
    }
  }
  return {bx,by};
}
function ears(g,x,y,rear){
  for(const d of [-1,1]){
    const ex=x+(rear?d*9:d*5);
    poly(g,[[ex-5,y+1],[ex-3,y-15],[ex+2,y-21],[ex+7,y-2]],C.deep,C.edge,1.2);
    poly(g,[[ex-2,y-1],[ex,y-14],[ex+3,y-12],[ex+4,y-2]],C.pink,null);
    stroke(g,[[ex,y-13],[ex+1,y-6]],C.creamShadow,1);
  }
}
function head(g,p,view,state,root){
  const rear=view===1;
  const neck=rear?root.bx+6:root.bx+15;
  const x=rear?root.bx+6:root.bx+19+p.lunge*.22;
  const y=root.by-17+p.head-p.tuck*1.5;
  ellipse(g,neck,root.by-13,11,10,C.ochre,null);
  ears(g,x,y-1,rear);
  const face=grad(g,x-2,y-3,18,[[0,C.tip],[.26,C.gold],[.58,C.fur],[.86,C.rust],[1,C.deep]]);
  ellipse(g,x,y,11.5,11,face,C.edge,1.4);
  if(!rear){
    ellipse(g,x+7,y+5,8,5,grad(g,x+8,y+2,12,[[0,C.cream],[.6,C.belly],[1,C.creamShadow]]),null);
    ellipse(g,x+10,y+5,2.1,1.7,C.pink,C.deep,.5);
    ellipse(g,x+5,y,2.9,3.4,C.eye,C.deep,.5);
    ellipse(g,x+5.9,y-1.3,.95,1.1,C.glint,null);
    stroke(g,[[x+10,y+6],[x+16,y+7]],C.creamShadow,.6);
    stroke(g,[[x+10,y+7],[x+16,y+10]],C.creamShadow,.6);
    stroke(g,[[x-8,y+5],[x-6,y+10]],C.rust,1.1);
    if(state==='attack'){
      stroke(g,[[x+9,y+8],[x+12,y+10]],C.deep,1.3);
      ellipse(g,x+11,y+11,1.6,1.4,C.cream,null);
    }
  } else {
    ellipse(g,x+3,y-1,4,7,C.fur,null);
    stroke(g,[[x-3,y-7],[x+2,y-4]],C.gold,1);
  }
}
export function drawSquirrelFrame(g,view,state,frame){
  if(!['idle','walk','attack','cast','hurt','defeat'].includes(state))throw new Error('Unknown squirrel animation '+state);
  const p=squirrelPose(state,frame),back=view===1;
  g.save();g.lineJoin='round';g.lineCap='round';
  // Shadow is always placed at the same tactical-cell ground contact.
  ellipse(g,49,89,24,4,'rgba(19,15,13,.25)',null);
  g.save();
  if(p.tuck){g.translate(45,79);g.rotate(-p.tuck*.26);g.translate(-45,-79);}
  tail(g,view,p,p.tuck);
  const bodyPos=body(g,p,view,state);
  if(back){
    hindPaw(g,bodyPos.bx-11,bodyPos.by+16,p.stride*.5);
    frontPaw(g,bodyPos.bx+12,bodyPos.by+15,-p.stride*.5);
  } else {
    const step=state==='walk'?p.stride:state==='attack'?p.lunge*.5:0;
    frontPaw(g,bodyPos.bx+17,bodyPos.by+13,step);
    frontPaw(g,bodyPos.bx+8,bodyPos.by+16,-step*.65);
  }
  head(g,p,view,state,bodyPos);
  if(state==='cast'){
    // Casting posture: lift and tense the forepaws; no fake spell or gameplay effect.
    stroke(g,[[bodyPos.bx+14,bodyPos.by+7],[bodyPos.bx+23,bodyPos.by-7]],C.deep,5.8);
    stroke(g,[[bodyPos.bx+14,bodyPos.by+7],[bodyPos.bx+22,bodyPos.by-7]],C.gold,3);
  }
  if(state==='hurt'&&frame===2)stroke(g,[[bodyPos.bx-1,bodyPos.by+6],[bodyPos.bx-5,bodyPos.by+11]],C.deep,2);
  g.restore();g.restore();
}
/** Install after generic models; preserve all encounter rules, ally identity and saves. */
export function installPainterlySquirrel(images,manifest){
  if(typeof document==='undefined')return 0;
  const key='mtg_friendlySquirrel',prior=manifest.sprites[key];
  if(!prior||!images[key])throw new Error('Squirrel base identity missing from GRAFTBOUND roster');
  const frame=SQUIRREL_FRAME_SIZE,states=Object.keys(SQUIRREL_ANIMS).length;
  const canvas=document.createElement('canvas');canvas.width=frame*4;canvas.height=frame*states*SQUIRREL_VIEWS.length;
  const g=canvas.getContext('2d');if(!g)throw new Error('Canvas2D required for squirrel art');
  g.imageSmoothingEnabled=false;
  for(let v=0;v<SQUIRREL_VIEWS.length;v++)for(const [state,meta] of Object.entries(SQUIRREL_ANIMS))
    for(let f=0;f<4;f++){
      g.save();g.translate(f*frame,(v*states+meta.row)*frame);
      drawSquirrelFrame(g,v,state,f);g.restore();
    }
  images[key]=canvas;
  manifest.sprites[key]={
    ...prior,w:frame,h:frame,pivotY:89,
    pixelScale:(prior.h/96)*(prior.pixelScale||1),
    premium:true,artWidth:88,bleedX:3,artPack:'painterly-squirrel-v1',
    anims:SQUIRREL_ANIMS,views:SQUIRREL_VIEWS,
    identity:'squirrel',qualityStatus:'visual-review-required'
  };
  return 1;
}
