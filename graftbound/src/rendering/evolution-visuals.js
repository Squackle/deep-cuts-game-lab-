/** v1.3 fully composited original 64px anatomy: full physical coexistence rather than single-slot 48px overlays. */
import { PALETTE } from '../engine/appearance.js';
import { recolorSkin } from './premium-creatures.js';
import { drawGraftSheet } from './graft-morphology.js';
import { drawNativeBlankGraftSheet, blankNativeAnchor, setGraftSkin, setPartFilter } from './native-blank-art.js';
import { BENCHMARK_STATES } from './raster-benchmarks.js';
import { regionAt, styleWeight, ditherSmooth, R as REG } from './body-regions.js';
const memo=new WeakMap();
export function composePlayerSheet(assets, app) {
 const base=assets.images.blank,mask=assets.images['blank:mask'];
 const key=JSON.stringify([app.skinPattern,app.anatomy?.order,app.skinTone,app.tintMix,app.dominant,app.anatomy?.features,app.anatomy?.morph,app.markings,app.anatomy?.stage]);
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
 setGraftSkin(app.skinPattern,app.skinTone??0);   // grafted flesh shares the generated palette
 paintGrafts('behind');
 const b=recolorSkinPattern(base,mask,app.skinPattern,app.skinTone??0),bx=b.getContext('2d',{willReadFrequently:true});
 if(app.tintMix>0){
  const bd=bx.getImageData(0,0,b.width,b.height),md=mask.getContext('2d',{willReadFrequently:true}).getImageData(0,0,b.width,b.height).data;
  const d=bd.data,tint=PALETTE[app.dominant]||PALETTE.parchment;
  for(let i=0;i<d.length;i+=4){if(md[i+3]<128)continue;
   const lum=(d[i]*.3+d[i+1]*.59+d[i+2]*.11)/255;
   const tm=app.tintMix*0.5;   // v1.6.0: halved so the adventure's skin palette stays readable under lineage tint
   for(let k=0;k<3;k++)d[i+k]=Math.round(d[i+k]*(1-tm)+Math.min(255,tint[k]*lum*1.55*255)*tm);
  }bx.putImageData(bd,0,0);
 }
 paintSurfaceSkin(b,mask,app);
 g.drawImage(b,0,0);
 // v1.7.0: torso-conforming grafts (shell, bone plates) are clipped to the TORSO region of the body silhouette (dilated
 // 1 px), so arms stay in front of them and nothing protrudes like a backpack. Then the rest of the anatomy.
 if(native){const tmp=document.createElement('canvas');tmp.width=c.width;tmp.height=c.height;const tg=tmp.getContext('2d',{willReadFrequently:true});tg.imageSmoothingEnabled=false;
  setPartFilter('conform');drawNativeBlankGraftSheet(tg,app,'front');setPartFilter(null);
  const reg=regionField(c.width,c.height),bd=bx.getImageData(0,0,c.width,c.height).data,im=tg.getImageData(0,0,c.width,c.height),W=c.width;
  for(let i=0;i<W*c.height;i++){if(!im.data[i*4+3])continue;let inBody=false;for(const o of [0,1,-1,W,-W])if(bd[(i+o)*4+3]>127){inBody=true;break;}
   if(!inBody||reg[i]!==REG.torso)im.data[i*4+3]=0;}
  tg.putImageData(im,0,0);g.drawImage(tmp,0,0);
  setPartFilter('rest');paintGrafts('front');setPartFilter(null);}
 else paintGrafts('front');
 if(cache.size>=18)cache.delete(cache.keys().next().value);cache.set(key,c);
 return c;
}
/** v1.6.0 region field for a Blank sheet laid out as 4 columns x (2 views x 5 states) rows. Cached by size. */
const STATE_BY_ROW = Object.fromEntries(Object.entries(BENCHMARK_STATES).map(([k, m]) => [m.row, k]));
const fieldCache = new Map();
export function frameAnchors(w, h, fn) {
  const F = w / 4, rows = Math.round(h / F);
  for (let r = 0; r < rows; r++) for (let c = 0; c < 4; c++) {
    const view = r >= 5 ? 1 : 0, state = STATE_BY_ROW[r % 5] || 'idle', frames = BENCHMARK_STATES[state]?.frames || 4;
    fn({ x0: c * F, y0: r * F, F, k: F / 128, A: blankNativeAnchor(state, c % frames, view) });
  }
}
export function regionField(w, h) {
  const key = w + 'x' + h; if (fieldCache.has(key)) return fieldCache.get(key);
  const f = new Uint8Array(w * h);
  frameAnchors(w, h, ({ x0, y0, F, k, A }) => { for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) f[(y0 + y) * w + x0 + x] = regionAt(A, x + 0.5, y + 0.5, k); });
  fieldCache.set(key, f); return f;
}
/** v1.6.0 procedural mixed skin. Two full palette recolors are blended by a body-region field (dithered 2 px seams).
 *  Lighting is preserved because both tones use the same luminance ramp mapping. Single-tone patterns are unchanged. */
export function recolorSkinPattern(base, mask, pattern, fallbackTone = 0) {
  if (!pattern || pattern.mode !== 'mixed') return recolorSkin(base, mask, pattern?.tones?.[0] ?? fallbackTone);
  const a = recolorSkin(base, mask, pattern.tones[0]), b = recolorSkin(base, mask, pattern.tones[1]);
  const w = a.width, h = a.height, reg = regionField(w, h), wt = new Uint8Array(w * h);
  frameAnchors(w, h, ({ x0, y0, F, k, A }) => { for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) { const i = (y0 + y) * w + x0 + x; wt[i] = styleWeight(pattern.style, reg[i], x + 0.5, y + 0.5, A, k); } });
  const sm = ditherSmooth(wt, w, h, Math.max(1, Math.round(2 * w / 512)));
  const ax = a.getContext('2d', { willReadFrequently: true }), ad = ax.getImageData(0, 0, w, h), bd = b.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const md = mask.getContext ? mask.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data : null;
  for (let i = 0; i < w * h; i++) if (sm[i] && (!md || md[i * 4 + 3] >= 128) && reg[i] !== REG.head) for (let c = 0; c < 3; c++) ad.data[i * 4 + c] = bd[i * 4 + c];
  ax.putImageData(ad, 0, 0); return a;
}
/** Which body regions each graft surface transforms, from lineages in ABSORPTION order (deterministic).
 *  First lineage: torso (+arms from 4 grafts, +legs from 7). Second: arms (from 3). Third: legs. The face stays clear. */
export const FAMILY_SURFACE = Object.freeze({ arboreal: 'bark', insectoid: 'chitin', draconic: 'scales', serpentine: 'scales', aquatic: 'scales', feline: 'fur', ungulate: 'fur' });
export function surfacePlan(anatomy) {
  const stage = anatomy?.stage || 0; if (!stage) return [];
  let kinds = [...new Set((anatomy.order || []).map(f => FAMILY_SURFACE[f]).filter(Boolean))];
  if (!kinds.length && SURFACE_STYLE[anatomy?.morph?.surface]) kinds = [anatomy.morph.surface];
  if (!kinds.length) return [];
  const claim = new Map();
  const give = (kind, rs) => rs.forEach(r => claim.set(r, kind));
  give(kinds[0], [REG.torso, ...(stage >= 4 ? [REG.leftArm, REG.rightArm] : []), ...(stage >= 7 ? [REG.leftLeg, REG.rightLeg] : [])]);
  if (kinds[1] && stage >= 3) give(kinds[1], [REG.leftArm, REG.rightArm]);
  if (kinds[2]) give(kinds[2], [REG.leftLeg, REG.rightLeg]);
  return kinds.map(kind => ({ kind, regions: [...claim].filter(([, k]) => k === kind).map(([r]) => r) })).filter(p => p.regions.length);
}
/** v1.5.0 graft surface re-skin. The dominant graft family's surface (scales, fur, bark, chitin) is painted as a bold
 *  pixel pattern clipped to the SKIN MASK only (clothing, eyes and equipment untouched). Strength grows with the number
 *  of grafts so the Blank starts plain and later forms read as a different creature. Deterministic. */
export const SURFACE_STYLE = Object.freeze({
  scales: { a: '#3f5d57', b: '#9cc2b0', cell: 7, hue: '#5d8a72' }, fur: { a: '#6e4c2c', b: '#d6b07c', cell: 5, hue: '#a8743e' },
  bark: { a: '#4a3122', b: '#9a7650', cell: 8, hue: '#7a5636' }, chitin: { a: '#26313d', b: '#7f97a8', cell: 9, hue: '#4c6178' },
});
export const surfaceStrength = stage => stage <= 0 ? 0 : Math.min(0.78, 0.34 + stage * 0.08);
const hsh = (x, y, n) => { const v = Math.sin(x * 12.9898 + y * 78.233 + n * 37.719) * 43758.5453; return v - Math.floor(v); };
/** Texture marks for a surface, drawn as dark (multiply) and light (screen) strokes so the body's own shading survives. */
function surfaceMarks(g, kind, W, H, u) {
  const dark = (x, y, w, h) => { g.fillStyle = 'rgba(30,22,18,1)'; g.fillRect(x, y, w, h); };
  if (kind === 'scales') for (let y = 0, r = 0; y < H; y += 5 * u, r++) for (let x = (r % 2) * 3 * u; x < W; x += 6 * u) { dark(x, y + 3 * u, 4 * u, u); dark(x - u, y + 2 * u, u, u); dark(x + 4 * u, y + 2 * u, u, u); }
  else if (kind === 'fur') for (let i = 0; i < W * H / (18 * u * u); i++) { const x = Math.floor(hsh(i, 1, 3) * W / u) * u, y = Math.floor(hsh(i, 2, 5) * H / u) * u, L = (2 + Math.floor(hsh(i, 3, 7) * 3)) * u; for (let t = 0; t < L; t += u) dark(x + Math.floor(t / 2 / u) * u, y + t, u, u); }
  else if (kind === 'bark') for (let x = 0; x < W; x += 5 * u) for (let y = 0; y < H; y += u) dark(x + Math.round(Math.sin((y / u) * 0.35 + x) * 1.2) * u, y, u, u);
  else for (let y = 0; y < H; y += 7 * u) { dark(0, y + 6 * u, W, u); }   // chitin: segmented bands
}
/** v1.6.0 graft surfaces, region by region: (1) shift the hue toward the lineage colour with the 'color' blend (keeps the
 *  painted light/shadow), (2) multiply in organic texture marks, (3) dithered transition at region borders. */
export function paintSurfaceSkin(b, mask, app) {
  const k = surfaceStrength(app?.anatomy?.stage || 0), plan = surfacePlan(app?.anatomy); if (!k || !mask || !plan.length) return b;
  const W = b.width, H = b.height, reg = regionField(W, H), u = Math.max(1, Math.round(W / 512));
  const bx = b.getContext('2d');
  for (const { kind, regions } of plan) {
    const st = SURFACE_STYLE[kind]; if (!st) continue;
    const want = new Uint8Array(W * H); for (let i = 0; i < want.length; i++) want[i] = regions.includes(reg[i]) ? 1 : 0;
    const soft = ditherSmooth(want, W, H, 2 * u);
    const region = document.createElement('canvas'); region.width = W; region.height = H;
    const rg = region.getContext('2d', { willReadFrequently: true }), im = rg.createImageData(W, H);
    for (let i = 0; i < soft.length; i++) if (soft[i]) im.data[i * 4 + 3] = 255; rg.putImageData(im, 0, 0);
    rg.globalCompositeOperation = 'source-in'; rg.drawImage(mask, 0, 0);   // region ∩ skin
    const layer = (fill) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; fill(g); g.globalCompositeOperation = 'destination-in'; g.drawImage(region, 0, 0); return c; };
    const hue = layer(g => { g.fillStyle = st.hue; g.fillRect(0, 0, W, H); });
    const marks = layer(g => surfaceMarks(g, kind, W, H, u));
    bx.save(); bx.imageSmoothingEnabled = false;
    bx.globalCompositeOperation = 'source-atop';
    bx.globalAlpha = 0.25 + k * 0.5; bx.globalCompositeOperation = 'color'; bx.drawImage(hue, 0, 0);
    bx.globalAlpha = 0.18 + k * 0.32; bx.globalCompositeOperation = 'multiply'; bx.drawImage(marks, 0, 0);
    bx.restore();
  }
  return b;
}
