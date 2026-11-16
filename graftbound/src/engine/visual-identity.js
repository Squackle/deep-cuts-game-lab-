/** Cosmetic identity is derived from the saved adventure seed, never combat RNG. */
export const SKIN_PALETTES = Object.freeze([
  ['#eed9bd','#d2ac88','#9e755b'], ['#f0cfaa','#d2a078','#956849'],
  ['#e8bc91','#c78e62','#81583e'], ['#dfad84','#b87d58','#704c38'],
  ['#d29c75','#aa704f','#654434'], ['#c58d66','#976344','#563a2d'],
  ['#b97b58','#855339','#4c3229'], ['#ad7553','#7d4e37','#442d24'],
  ['#996448','#69432f','#382722'], ['#85563c','#593b2e','#30231f'],
  ['#764a33','#493123','#271e1c'], ['#64402d','#3c291f','#211b1a'],
]);
export function skinToneForSeed(seed = 0, unitId = 1) {
  let x = ((seed >>> 0) ^ Math.imul((unitId >>> 0), 0x9e3779b1) ^ 0xa4f2bb21) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b); x ^= x >>> 16;
  return (x >>> 0) % SKIN_PALETTES.length;
}
/** v1.6.0 procedural skin pattern, chosen ONCE at adventure creation and saved in run.visual.
 *  'single' = one coherent tone (the original look). 'mixed' = two harmonious tones 2–5 palette steps apart, laid out
 *  by a body-region style (never per-pixel noise): limbs | mantle | split | patches. The face stays one tone. */
export const SKIN_STYLES = Object.freeze(['limbs', 'mantle', 'split', 'patches']);
const mix32 = x => { x >>>= 0; x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15; x = Math.imul(x, 0x846ca68b); x ^= x >>> 16; return x >>> 0; };
export function skinPatternForSeed(seed = 0) {
  const base = skinToneForSeed(seed), h = mix32((seed >>> 0) ^ 0x51c3a7e9);
  if (h % 100 >= 48) return { mode: 'single', tones: [base] };
  const step = 2 + (h >>> 8) % 4, dir = base + step < SKIN_PALETTES.length && ((h >>> 12) & 1 || base - step < 0) ? 1 : -1;
  return { mode: 'mixed', tones: [base, base + dir * step], style: SKIN_STYLES[(h >>> 16) % SKIN_STYLES.length] };
}
export function validSkinPattern(p) {
  const ok = t => Number.isInteger(t) && t >= 0 && t < SKIN_PALETTES.length;
  return !!p && (p.mode === 'single' ? p.tones?.length === 1 && ok(p.tones[0]) : p.mode === 'mixed' && p.tones?.length === 2 && p.tones.every(ok) && SKIN_STYLES.includes(p.style));
}
export function visualForRun(run) {
  const n = run?.visual?.skinTone;
  const skinTone = Number.isInteger(n) && n >= 0 && n < SKIN_PALETTES.length ? n : skinToneForSeed(run?.seed || 0);
  // Saves from before v1.6.0 have no pattern: they keep their original single tone forever.
  const p = run?.visual?.skinPattern;
  return { skinTone, skinPattern: validSkinPattern(p) && p.tones[0] === skinTone ? p : { mode: 'single', tones: [skinTone] } };
}
