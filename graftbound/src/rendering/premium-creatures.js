/** v1.3 Milestone A — ORIGINAL hand-authored 64px pixel sprites (no card art, no image download).
 * Runtime authored source allows Game Lab to load the same sprites without shipping binary Git assets.
 * Every frame shares anatomy proportions; only material-tagged skin can change tone. */
import { SKIN_PALETTES } from '../engine/visual-identity.js';
const SIZE = 64, COLS = 4, ROWS = 10;
const ink = '#23292b';
function px(c,x,y,w=1,h=1,color=ink){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function disk(c,x,y,rx,ry,palette,mask=null){
  for(let iy=Math.ceil(y-ry);iy<=Math.floor(y+ry);iy++)for(let ix=Math.ceil(x-rx);ix<=Math.floor(x+rx);ix++){
    const nx=(ix+.5-x)/rx,ny=(iy+.5-y)/ry,v=nx*nx+ny*ny;
    if(v>1)continue;
    const n=Math.sqrt(Math.max(0,1-v)),l=nx*-.27+ny*-.38+n*.91;
    const ramp=palette[Math.max(0,Math.min(palette.length-1,Math.floor((l+.25)*palette.length*.58)))];
    px(c,ix,iy,1,1,ramp);
    if(mask)px(mask,ix,iy,1,1,'#ffffff');
  }
}
function line(c,x0,y0,x1,y1,color,width=1){
  const n=Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0)));
  for(let i=0;i<=n;i++){const t=i/Math.max(n,1);px(c,x0+(x1-x0)*t,y0+(y1-y0)*t,width,width,color);}
}
function polygon(c,points,color,edge=ink){
  let low=Math.floor(Math.min(...points.map(p=>p[1]))),high=Math.ceil(Math.max(...points.map(p=>p[1])));
  for(let y=low;y<=high;y++){
    let xs=[];for(let i=0;i<points.length;i++){
      const [x0,y0]=points[i],[x1,y1]=points[(i+1)%points.length];
      if((y+.5>=Math.min(y0,y1))&&(y+.5<Math.max(y0,y1))&&y1!==y0)xs.push(x0+(y+.5-y0)*(x1-x0)/(y1-y0));
    }
    xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)for(let x=Math.ceil(xs[i]);x<xs[i+1];x++)px(c,x,y,1,1,color);
  }
  if(edge)for(let i=0;i<points.length;i++)line(c,...points[i],...points[(i+1)%points.length],edge);
}
export function drawHero(g,m,view,anim,frame){
  const back=!!view,walk=anim===1,attack=anim===2,cast=anim===3,hurt=anim===4;
  const bob=walk?([0,1,0,1][frame]):anim===0?([0,0,1,1][frame]):0;
  const lean=attack?([1,-2,-3,0][frame]):hurt?2:0;
  const x=lean, y=bob;
  const skin=['#423b3b','#9b8d80','#c7b7a4','#e2d1b8','#f5e8cb'];
  const feet=[walk?[-2,0,2,0][frame]:0,walk?[2,0,-2,0][frame]:0];
  // An unarmored, nonhuman Blank: bare legs, ankles and splayed toes.
  // All exposed tissue is tagged in the skin mask, so deterministic saved tones
  // apply to the whole body rather than leaving fixed-color trousers or boots.
  for(let i=0;i<2;i++){
    const side=i?1:-1,step=feet[i],legX=32+side*6+x+step*.38;
    disk(g,legX,47+y,4.9,8.1,skin,m);
    disk(g,legX+side*.2,53+y+step*.2,3.5,6.3,skin,m);
    disk(g,legX+side*1.15+step*.65,58+y,5.3,2.6,skin,m);
    // Individual rounded toes create a barefoot silhouette at gameplay zoom.
    for(let toe=0;toe<3;toe++){
      const toeX=legX+side*(2.6+toe*1.15)+step*.65;
      disk(g,toeX,59+y,1.25,1.35,skin,m);
      px(g,toeX,59+y,1,1,skin[4]);
    }
  }
  // The pelvis remains skin; the cloth wrap is painted AFTER the body and
  // excluded from the skin mask, making Equipment and grafted armor independent.
  disk(g,32+x,44+y,11,7,skin,m);
  // Articulated bare shoulders, arms and hands — no sleeves or bracers.
  for(const side of [-1,1]){
    const sx=32+side*13+x,startY=31+y;
    const lifted=cast&&side===1?-12:attack&&side===-1?-7:0;
    const endX=sx+side*2-(attack&&side===-1?8:0),endY=42+y+lifted;
    disk(g,sx,startY+2,5,6.5,skin,m);
    const mx=(sx+endX)/2,my=(startY+endY)/2;
    disk(g,mx,my,4.5,Math.max(5,Math.abs(endY-startY)/2+3),skin,m);
    disk(g,endX,endY,4.5,4.1,skin,m);
    for(let finger=0;finger<3;finger++)disk(g,endX+side*(1+finger*.9),endY+2.6,1,1.5,skin,m);
  }
  // Bare chest and abdomen, with subdued sculpted anatomy rather than a
  // starting vest, plated torso, shoulder guards or symbolic armor insignia.
  disk(g,32+x,35+y,12,10.5,skin,m);
  disk(g,32+x,40+y,9,7,skin,m);
  // Thin low-contrast anatomy details; these are organic shading, not armor.
  for(const side of [-1,1]){
    line(g,32+side*2+x,34+y,32+side*9+x,35+y,skin[1],1);
    px(g,32+side*7+x,36+y,1,1,skin[2]);
  }
  line(g,32+x,37+y,32+x,42+y,skin[1],1);
  px(g,29+x,41+y,2,1,skin[2]);px(g,34+x,41+y,2,1,skin[2]);
  // Only clothing: a tied, warm-brown cloth groin wrap. Clear its pixels from
  // the skin material mask so tone changes never recolor this fabric.
  const apron=[[23+x,42+y],[41+x,42+y],[40+x,47+y],[37+x,51+y],[34+x,54+y],[29+x,52+y],[26+x,55+y],[23+x,51+y]];
  const wrap=[[22+x,41+y],[42+x,41+y],[40+x,44+y],[24+x,44+y]];
  // Remove mask only under the exact garment silhouette; exposed thighs on
  // either side remain skin-masked (a rectangular cutout would erase them).
  m.save();m.globalCompositeOperation='destination-out';
  polygon(m,apron,'#ffffff',null);polygon(m,wrap,'#ffffff',null);
  m.restore();
  polygon(g,apron,'#7c5743');
  polygon(g,[[24+x,43+y],[40+x,43+y],[38+x,48+y],[34+x,51+y],[29+x,49+y],[26+x,53+y],[24+x,49+y]],'#a67b5a',null);
  polygon(g,wrap,'#4a332b');
  line(g,24+x,42+y,40+x,42+y,'#d2a477',1);
  // Fold and uneven hem: cloth, not leather armor or a rigid belt.
  line(g,31+x,45+y,30+x,51+y,'#6a4437',1);
  line(g,37+x,45+y,35+x,51+y,'#d0a47d',1);
  px(g,38+x,43+y,3,2,'#c39468');
  px(g,40+x,44+y,2,3,'#79513e');
  // Narrow neck and smooth organic head: no hair, armor, snout, scales, horns, or species traits.
  disk(g,32+x,26+y,5,5,skin,m);
  disk(g,32+x,17+y,9,11,skin,m);
  disk(g,32+x-5,20+y,2,3,['#6b5750','#b9a28a','#e6d0ae']);
  if(!back){
    // Distinct but understated face; no human nose or hair, an intentionally blank vessel.
    px(g,27+x,17+y,4,2,ink);px(g,34+x,17+y,4,2,ink);
    px(g,28+x,17+y,2,1,'#f2d895');px(g,35+x,17+y,2,1,'#f2d895');
    px(g,31+x,22+y,3,1,'#806e64');px(g,32+x,23+y,2,1,'#c4a88a');
    px(g,28+x,11+y,7,1,skin[4]);
  }else{
    px(g,30+x,12+y,5,2,skin[3]);
    px(g,30+x,22+y,5,1,skin[1]);
  }
  // Delicate skin shadows below cheek and shoulders, deliberately human-shaped not human.
  px(g,26+x,24+y,2,1,skin[1]);px(g,37+x,23+y,2,1,skin[2]);
  if(hurt){px(g,27+x,18+y,4,1,ink);px(g,34+x,18+y,4,1,ink)}
}
function drawSoldier(g,m,view,anim,frame){
  const back=!!view,walk=anim===1,attack=anim===2,cast=anim===3,bob=walk?(frame%2):anim===0?([0,0,1,1][frame]):0;
  const skin=['#422e2b','#85533e','#b17c5d','#d7a484','#efd1aa'];
  const iron=['#1b2530','#3e4c5a','#748999','#a8b9bc','#e0dad1'];
  const sx=32,yy=bob;
  // Layered leather boots and mail-trimmed leggings.
  for(const dx of [-5,5]){
    disk(g,sx+dx,49+yy,4,9,['#24272c','#3f4549','#6c7375','#9ca39b']);
    px(g,sx+dx-5,56+yy,10,3,'#292527');px(g,sx+dx-4,55+yy,8,1,'#9c8262');
  }
  // Shoulder and elbow mail; deliberate tiny alternating chain links rather than solid gray.
  for(const d of [-13,13]){
    disk(g,sx+d,34+yy,5,7,iron);
    disk(g,sx+d+(d<0?-2:2),41+yy,3,5,iron);
    for(let row=31;row<46;row+=3)for(let col=-2;col<=2;col+=3)px(g,sx+d+col+(row%2),row+yy,1,1,'#d9d7c5');
  }
  polygon(g,[[24,28+yy],[40,28+yy],[42,44+yy],[22,44+yy]],'#273441');
  polygon(g,[[26,29+yy],[38,29+yy],[40,43+yy],[24,43+yy]],'#82929b');
  // White-and-blue practical tabard, cinched belt, minimal heraldry.
  polygon(g,[[28,31+yy],[36,31+yy],[37,46+yy],[27,46+yy]],'#e6ddc3');
  line(g,32,31+yy,32,45+yy,'#426582',2);
  px(g,27,41+yy,10,2,'#534639');px(g,30,41+yy,4,2,'#d2b779');
  for(let row=30;row<43;row+=3){px(g,24,row+yy,2,1,'#ccd8d6');px(g,38,row+yy,2,1,'#d4dfd8')}
  // Shield deliberately ABSENT: one-handed sword on the right, free left hand.
  disk(g,19,44+yy,3,4,skin,m);
  const swordRaised=attack && frame<3;
  const bladeX=swordRaised?50:48,bladeY=swordRaised?8:12;
  line(g,44,40+yy,bladeX,bladeY,'#1d2831',5);
  line(g,44,40+yy,bladeX,bladeY,'#d5dee0',3);
  line(g,bladeX,bladeY+3,bladeX,bladeY-3,'#f3edd2',1);
  line(g,40,30+yy,46,41+yy,'#5a6978',6);
  disk(g,46,39+yy,3,4,skin,m);
  line(g,41,36+yy,49,37+yy,'#a48a67',2);
  px(g,45,37+yy,3,2,'#e7cd85');
  // Neck, face, small rounded helm and readable chainmail coif.
  disk(g,32,25+yy,5,5,skin,m);
  disk(g,32,17+yy,8,9,skin,m);
  for(let row=22;row<28;row+=2){px(g,25,row+yy,3,1,'#aab5b7');px(g,37,row+yy,2,1,'#84949c')}
  polygon(g,[[23,16+yy],[25,10+yy],[30,7+yy],[36,7+yy],[41,11+yy],[42,17+yy]],'#283747');
  polygon(g,[[25,14+yy],[28,10+yy],[37,10+yy],[40,15+yy]],'#889fa8');
  line(g,30,8+yy,35,8+yy,'#e8e2cd');
  px(g,23,17+yy,19,2,'#2d3e48');
  px(g,30,9+yy,4,7,'#b4c6c1');
  if(!back){px(g,27,20+yy,2,1,ink);px(g,35,20+yy,2,1,ink);px(g,30,24+yy,5,1,skin[1]);}
}
function sheet(draw){
  const canvas=document.createElement('canvas'),mask=document.createElement('canvas');
  canvas.width=mask.width=SIZE*COLS;canvas.height=mask.height=SIZE*ROWS;
  const c=canvas.getContext('2d'),m=mask.getContext('2d',{willReadFrequently:true});c.imageSmoothingEnabled=false;m.imageSmoothingEnabled=false;
  for(let view=0;view<2;view++)for(let anim=0;anim<5;anim++)for(let f=0;f<COLS;f++){
    c.save();m.save();c.translate(f*SIZE,(view*5+anim)*SIZE);m.translate(f*SIZE,(view*5+anim)*SIZE);
    draw(c,m,view,anim,f);c.restore();m.restore();
  }
  return [canvas,mask];
}
export function recolorSkin(canvas,mask,tone=0){
  const output=document.createElement('canvas');output.width=canvas.width;output.height=canvas.height;
  const c=output.getContext('2d',{willReadFrequently:true});c.drawImage(canvas,0,0);
  const img=c.getImageData(0,0,output.width,output.height),data=img.data;
  const maskData=mask.getContext('2d',{willReadFrequently:true}).getImageData(0,0,mask.width,mask.height).data;
  const ramp=SKIN_PALETTES[((tone%SKIN_PALETTES.length)+SKIN_PALETTES.length)%SKIN_PALETTES.length].map(x=>[1,3,5].map(k=>parseInt(x.slice(k,k+2),16)));
  for(let i=0;i<data.length;i+=4){if(maskData[i+3]<128)continue;
    const lum=(data[i]*.3+data[i+1]*.59+data[i+2]*.11)/255;
    const idx=Math.min(1.999,Math.max(0,lum*2.25-0.25));const a=Math.floor(idx),t=idx-a;
    // Palette ordered light/mid/dark; map bright source pixels to light values.
    const lo=ramp[2-a],hi=ramp[1-a];
    for(let k=0;k<3;k++)data[i+k]=Math.round(lo[k]*(1-t)+hi[k]*t);
  }
  c.putImageData(img,0,0);return output;
}
export function installPremiumModels(images,manifest){
  if(typeof document==='undefined')return;
  const [hero,heroMask]=sheet(drawHero),[soldier,soldierMask]=sheet(drawSoldier);
  images.blank=hero;images['blank:mask']=heroMask;
  images.mtg_friendlySoldier=soldier;images['mtg_friendlySoldier:skinMask']=soldierMask;
  manifest.sprites.blank={...manifest.sprites.blank,w:SIZE,h:SIZE,pivotY:SIZE-4,premium:true};
  manifest.sprites.mtg_friendlySoldier={w:SIZE,h:SIZE,pivotY:SIZE-4,premium:true,generated:true};
}
export const premiumSpriteFrameSize=SIZE;
