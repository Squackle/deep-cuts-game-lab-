/**
 * v1.7.0 deterministic creature variants (presentation only).
 * Wolves get one of several believable fur palettes chosen from (adventure seed, unit uid); the pack leader that
 * summons wolves (Nightpack Ambusher) always wears a distinct charcoal-and-silver coat with ember eyes.
 * Fur pixels are found by hue/saturation (warm browns of the study art) and re-mapped with their lightness kept, so the
 * painted shading survives. No Math.random: same uid+seed → same coat.
 */
export const WOLF_COATS = Object.freeze([
  { name: 'timber', hue: null },
  { name: 'grey', hue: 210, sat: 0.08, light: 1.05 },
  { name: 'arctic', hue: 40, sat: 0.10, light: 1.32 },
  { name: 'russet', hue: 16, sat: 0.62, light: 0.95 },
  { name: 'shadow', hue: 230, sat: 0.12, light: 0.62 },
]);
export const LEADER_COAT = Object.freeze({ name: 'packLeader', hue: 220, sat: 0.10, light: 0.5, silver: true, emberEyes: true });
export const WOLF_KEYS = Object.freeze(new Set(['mtg_wolf', 'mtg_hound']));
export const LEADER_KEYS = Object.freeze(new Set(['mtg_alpha']));
const mix32 = x => { x >>>= 0; x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15; x = Math.imul(x, 0x846ca68b); x ^= x >>> 16; return x >>> 0; };
export const wolfCoatFor = (seed, uid) => WOLF_COATS[mix32((seed >>> 0) ^ Math.imul(uid >>> 0, 0x9e3779b1)) % WOLF_COATS.length];
function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; }
function hsl2rgb(h, s, l) { const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return [f(0), f(8), f(4)].map(v => Math.round(Math.max(0, Math.min(1, v)) * 255)); }
/** Pure pixel pass (exported for tests). Returns a NEW Uint8ClampedArray. */
export function recoatPixels(data, coat) {
  const out = new Uint8ClampedArray(data); if (!coat || coat.hue == null) return out;
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] < 128) continue;
    const [h, s, l] = rgb2hsl(out[i], out[i + 1], out[i + 2]);
    if (coat.emberEyes && s > 0.55 && l > 0.55 && (h < 60 || h > 330)) { out.set([255, 120, 40], i); continue; }
    if (!(h >= 8 && h <= 50 && s >= 0.18 && l >= 0.08 && l <= 0.88)) continue;
    let L = Math.max(0.04, Math.min(0.94, l * coat.light));
    if (coat.silver && l > 0.55) L = Math.min(0.92, 0.55 + (l - 0.55) * 1.6);
    out.set(hsl2rgb(coat.hue, coat.sat, L), i);
  }
  return out;
}
const cache = new Map();
export function recoatSheet(img, coat, key) {
  const ck = key + ':' + coat.name; if (cache.has(ck)) return cache.get(ck);
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0); const im = g.getImageData(0, 0, c.width, c.height); im.data.set(recoatPixels(im.data, coat)); g.putImageData(im, 0, 0);
  cache.set(ck, c); return c;
}
