/** v1.3 fully composited original 64px anatomy: full physical coexistence rather than single-slot 48px overlays. */
import { PALETTE } from '../engine/appearance.js';
import { recolorSkin } from './premium-creatures.js';
import { drawGraftSheet } from './graft-morphology.js';
const memo=new WeakMap();
export function composePlayerSheet(assets, app) {
 const base=assets.images.blank,mask=assets.images['blank:mask'];
 const key=JSON.stringify([app.skinTone,app.tintMix,app.dominant,app.anatomy?.features,app.anatomy?.morph,app.markings]);
 let cache=memo.get(base);if(!cache){cache=new Map();memo.set(base,cache);}
 if(cache.has(key))return cache.get(key);
 const c=document.createElement('canvas');c.width=base.width;c.height=base.height;
 const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;
 const paintGrafts=(pass)=>{g.save();g.scale(base.width/(64*4),base.height/(64*10));drawGraftSheet(g,app,pass);g.restore();};
 paintGrafts('behind');
 const b=recolorSkin(base,mask,app.skinTone??0),bx=b.getContext('2d',{willReadFrequently:true});
 if(app.tintMix>0){
  const bd=bx.getImageData(0,0,b.width,b.height),md=mask.getContext('2d',{willReadFrequently:true}).getImageData(0,0,b.width,b.height).data;
  const d=bd.data,tint=PALETTE[app.dominant]||PALETTE.parchment;
  for(let i=0;i<d.length;i+=4){if(md[i+3]<128)continue;
   const lum=(d[i]*.3+d[i+1]*.59+d[i+2]*.11)/255;
   for(let k=0;k<3;k++)d[i+k]=Math.round(d[i+k]*(1-app.tintMix)+Math.min(255,tint[k]*lum*1.55*255)*app.tintMix);
  }bx.putImageData(bd,0,0);
 }
 g.drawImage(b,0,0);paintGrafts('front');
 if(cache.size>=18)cache.delete(cache.keys().next().value);cache.set(key,c);
 return c;
}