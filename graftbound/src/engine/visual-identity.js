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
export function visualForRun(run) {
  const n = run?.visual?.skinTone;
  return { skinTone: Number.isInteger(n) && n >= 0 && n < SKIN_PALETTES.length
    ? n : skinToneForSeed(run?.seed || 0) };
}
