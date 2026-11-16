/** v1.3 fully composited original 64px anatomy: full physical coexistence rather than single-slot 48px overlays. */
import { PALETTE } from '../engine/appearance.js';
import { recolorSkin } from './premium-creatures.js';
import { drawGraftSheet } from './graft-morphology.js';
import { drawNativeBlankGraftSheet } from './native-blank-art.js';
const memo=new WeakMap();
export function composePlayerSheet(assets, app) {
 const base=assets.images.blank,mask=assets.images['blank:mask'];
 const key=JSON.stringify([app.skinTone,app.tintMix,app.dominant,app.anatomy?.features,app.anatomy?.morph,app.markings,app.anatomy?.stage]);
 let cache=memo.get(base);if(!cache){cache=new Map();memo.set(base,cache);}
 if(cache.has(key))return cache.get(key);
 const c=document.createElement('canvas');c.width=base.width;c.height=base.height;
 const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;
 const native=assets.manifest.sprites.blank.artPack==='owner-raster-benchmarks-v1';
 const paintGrafts=(pass)=>{
  g.save();
  if(native)drawNativeBlankGraftSheet(g,app,pass);
  else {g.scale(base.width/(64*4),base.height/(64*10));drawGraftSheet(g,app,pass);}
  g.restore();
 };
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
 paintSurfaceSkin(b,mask,app);
 g.drawImage(b,0,0);paintGrafts('front');
 if(cache.size>=18)cache.delete(cache.keys().next().value);cache.set(key,c);
 return c;
}
/** v1.5.0 graft surface re-skin. The dominant graft family's surface (scales, fur, bark, chitin) is painted as a bold
 *  pixel pattern clipped to the SKIN MASK only (clothing, eyes and equipment untouched). Strength grows with the number
 *  of grafts so the Blank starts plain and later forms read as a different creature. Deterministic. */
export const SURFACE_STYLE = Object.freeze({
  scales: { a: '#3f5d57', b: '#9cc2b0', cell: 7 }, fur: { a: '#6e4c2c', b: '#d6b07c', cell: 5 },
  bark: { a: '#4a3122', b: '#9a7650', cell: 8 }, chitin: { a: '#26313d', b: '#7f97a8', cell: 9 },
});
export const surfaceStrength = stage => stage <= 0 ? 0 : Math.min(0.78, 0.34 + stage * 0.08);
export function paintSurfaceSkin(b, mask, app) {
  const kind = app?.anatomy?.morph?.surface, st = SURFACE_STYLE[kind], k = surfaceStrength(app?.anatomy?.stage || 0);
  if (!st || !k || !mask) return b;
  const p = document.createElement('canvas'); p.width = b.width; p.height = b.height;
  const g = p.getContext('2d'); g.imageSmoothingEnabled = false; const n = st.cell;
  for (let y = 0, row = 0; y < p.height; y += n, row++) for (let x = (row % 2) * (n >> 1) - n; x < p.width; x += n) {
    if (kind === 'scales') { g.fillStyle = st.a; g.fillRect(x, y, n, n); g.fillStyle = st.b; g.fillRect(x + 1, y + 1, n - 3, Math.max(1, n - 4)); g.fillStyle = '#20302c'; g.fillRect(x, y + n - 1, n, 1); }
    else if (kind === 'fur') { g.fillStyle = st.a; g.fillRect(x, y, n, n); g.fillStyle = st.b; g.fillRect(x + (row % 3), y, 1, n - 1); g.fillRect(x + 3, y + 1, 1, n - 2); }
    else if (kind === 'bark') { g.fillStyle = st.a; g.fillRect(x, y, n, n); g.fillStyle = st.b; g.fillRect(x + 2, y, 2, n - 2); g.fillStyle = '#2b1c13'; g.fillRect(x + 5, y + 2, 1, n - 3); }
    else { g.fillStyle = st.a; g.fillRect(x, y, n, n); g.fillStyle = st.b; g.fillRect(x + 1, y + 1, n - 2, 2); g.fillStyle = '#121820'; g.fillRect(x, y + n - 1, n, 1); }
  }
  g.globalCompositeOperation = 'destination-in'; g.drawImage(mask, 0, 0);   // skin pixels only
  // Overlay keeps the authored light/shadow of the body; a lighter source-atop pass shifts the hue toward the graft.
  const bx = b.getContext('2d'); bx.save(); bx.imageSmoothingEnabled = false;
  bx.globalAlpha = Math.min(1, k + 0.2); bx.globalCompositeOperation = 'overlay'; bx.drawImage(p, 0, 0);
  bx.globalAlpha = k * 0.45; bx.globalCompositeOperation = 'source-atop'; bx.drawImage(p, 0, 0); bx.restore();
  return b;
}
