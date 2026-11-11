// Deterministic, serializable PRNG (mulberry32). State is a plain object so it survives JSON saves.
export function makeRng(seed) { return { s: (seed >>> 0) || 1 }; }
export function next(r) {
  r.s = (r.s + 0x6D2B79F5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const int = (r, n) => Math.floor(next(r) * n);
export const pick = (r, arr) => arr[int(r, arr.length)];
export function shuffle(r, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = int(r, i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h || 1;
}
