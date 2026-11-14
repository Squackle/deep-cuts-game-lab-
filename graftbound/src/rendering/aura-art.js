/** Visual-only persistent overlays driven by authoritative unit.auras. */
const COLORS=Object.freeze({
 'mtg:gift-of-immortality':'#f5d487','mtg:rancor':'#8fbf61',
 'mtg:hyena-umbra':'#f1e3bb','mtg:pacifism':'#b7bfee','mtg:one-with-the-wind':'#77c4e7',
});
export const auraColor=(ids)=>ids?.find(id=>COLORS[id])?COLORS[ids.find(id=>COLORS[id])]:null;
function pixel(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
function line(g,x0,y0,x1,y1,c){let n=Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0)));for(let i=0;i<=n;i++){let t=i/Math.max(n,1);pixel(g,x0+(x1-x0)*t,y0+(y1-y0)*t,1,1,c);}}
/** Supports 48,64,96px frames and arbitrary sprite atlas directions/rows. */
export function composeAuraSheet(source,frame,auras=[],cols=4){
 if(!auras?.some(a=>COLORS[a]))return source;
 const c=document.createElement('canvas');c.width=source.width;c.height=source.height;
 const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(source,0,0);
 const rows=Math.round(source.height/frame),scale=frame/64;
 for(let row=0;row<rows;row++)for(let f=0;f<cols;f++){
  const x=f*frame,y=row*frame,phase=(f+row)%4;
  g.save();g.translate(x,y);g.scale(scale,scale);
  for(const aura of auras){const col=COLORS[aura];if(!col)continue;
   if(aura==='mtg:gift-of-immortality'){
    for(let i=0;i<5;i++){const px=19+i*6,py=13+((i+phase)%3)*12;pixel(g,px,py,2,3,col);pixel(g,px-1,py+1,4,1,col);}
    for(let i=0;i<3;i++)pixel(g,28+i*4,38,2,2,col);
   }else if(aura==='mtg:rancor'){
    for(let i=0;i<5;i++){let px=22+((i*7)%24),py=20+((i*11+phase*2)%32);pixel(g,px,py,2,4,col);pixel(g,px-1,py+2,4,1,col);}
   }else if(aura==='mtg:hyena-umbra'){
    for(let i=0;i<6;i++){const a=(i+phase*.2)*Math.PI/3,px=32+Math.cos(a)*19,py=33+Math.sin(a)*24;
     pixel(g,px,py,3,3,col);}
   }else if(aura==='mtg:pacifism'){
    line(g,19,35,46,37,col);line(g,18,40,45,42,col);
    for(let i=0;i<3;i++)pixel(g,23+i*8,34+i%2*3,2,2,'#fff9e9');
   }else if(aura==='mtg:one-with-the-wind'){
    for(let i=0;i<4;i++){const py=16+i*11,shift=(phase+i)%4;
      line(g,13+shift*2,py,22+shift*2,py-4,col);line(g,44-shift*2,py+4,54-shift*2,py-1,col);
    }
   }
  }g.restore();
 }
 return c;
}
