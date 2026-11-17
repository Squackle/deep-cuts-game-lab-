/**
 * v1.8.0 painterly graft finishing. Turns vector-drawn graft anatomy into pixel art that matches the painted Blank:
 *  1. SUPERSAMPLE at 2x and box-downsample (soft interior colour, hard alpha edge).
 *  2. FORM SHADING from each part's distance-to-edge, lit from the upper left like the painted body; drawn detail kept.
 *  3. PAINTED RAMP: 9 luminance steps, light dither only at seams, warm highlights / cool shadows.
 *  4. SEL-OUT EDGES: darkened own colour, no black ink.   5. FLESH ROOTS blend into the body underneath.
 * Deterministic; run once per composed appearance (cached by the caller).
 */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16 - 0.5);
const h2 = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; }
function hsl2rgb(h, s, l) { h = ((h % 360) + 360) % 360; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return [f(0), f(8), f(4)].map(v => Math.round(Math.max(0, Math.min(1, v)) * 255)); }
export function supersample(w, h, draw, doc = document) {
  const big = doc.createElement('canvas'); big.width = w * 2; big.height = h * 2; const bg = big.getContext('2d', { willReadFrequently: true });
  bg.scale(2, 2); draw(bg);
  const src = bg.getImageData(0, 0, w * 2, h * 2).data, out = doc.createElement('canvas'); out.width = w; out.height = h;
  const og = out.getContext('2d', { willReadFrequently: true }), im = og.createImageData(w, h), d = im.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const i = ((y * 2 + dy) * w * 2 + x * 2 + dx) * 4, al = src[i + 3]; r += src[i] * al; g += src[i + 1] * al; b += src[i + 2] * al; a += al; }
    if (a < 2 * 255) continue;
    const i = (y * w + x) * 4; d[i] = r / a; d[i + 1] = g / a; d[i + 2] = b / a; d[i + 3] = 255;
  }
  og.putImageData(im, 0, 0); return out;
}
export function paintLayer(layer, body = null) {
  const w = layer.width, h = layer.height, g = layer.getContext('2d', { willReadFrequently: true }), im = g.getImageData(0, 0, w, h), d = im.data;
  const bd = body ? body.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data : null;
  const A = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) A[i] = d[i * 4 + 3] > 127 ? 1 : 0;
  const INF = 99, dist = new Float32Array(w * h).fill(INF);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!A[i]) { dist[i] = 0; continue; }
    let v = INF; if (x > 0) v = Math.min(v, dist[i - 1] + 1); if (y > 0) v = Math.min(v, dist[i - w] + 1); if (x > 0 && y > 0) v = Math.min(v, dist[i - w - 1] + 1.4); if (x < w - 1 && y > 0) v = Math.min(v, dist[i - w + 1] + 1.4);
    dist[i] = x === 0 || y === 0 || x === w - 1 || y === h - 1 ? 1 : v; }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!A[i]) continue;
    let v = dist[i]; if (x < w - 1) v = Math.min(v, dist[i + 1] + 1); if (y < h - 1) v = Math.min(v, dist[i + w] + 1); if (x < w - 1 && y < h - 1) v = Math.min(v, dist[i + w + 1] + 1.4); if (x > 0 && y < h - 1) v = Math.min(v, dist[i + w - 1] + 1.4); dist[i] = v; }
  const H = i => Math.sqrt(Math.min(dist[i], 5) / 5);
  const near = new Float32Array(w * h).fill(9);
  if (bd) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!A[i]) continue;
    let best = 9; for (let dy = -3; dy <= 3 && best > 0; dy++) for (let dx = -3; dx <= 3; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const j = (yy * w + xx) * 4; if (bd[j + 3] > 127 && !A[yy * w + xx]) { const dd = Math.hypot(dx, dy); if (dd < best) best = dd; } } near[i] = best; }
  const out = new Uint8ClampedArray(d);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, p = i * 4; if (!A[i]) continue;
    const nx = H(i + 1) - H(i - 1), ny = H(i + w) - H(i - w);
    const shade = Math.max(0, Math.min(1, 0.55 - nx * 0.9 - ny * 0.9 + H(i) * 0.18));
    let [hh, ss, ll] = rgb2hsl(d[p], d[p + 1], d[p + 2]);
    ll = ll * 0.55 + (0.18 + shade * 0.62) * 0.45 + (h2(x >> 1, y >> 1) - 0.5) * 0.05;
    const step = Math.round(Math.max(0, Math.min(1, ll)) * 8 + BAYER[(y & 3) * 4 + (x & 3)] * 0.32) / 8;
    hh += (step - 0.5) * 18; ss = Math.min(1, ss * (0.85 + (0.5 - Math.abs(step - 0.5)) * 0.5));
    let c = hsl2rgb(hh, ss, Math.max(0.05, Math.min(0.93, step)));
    if (dist[i] <= 1.01) { const shadowSide = A[i + 1] === 0 || A[i + w] === 0; const k = shadowSide ? 0.42 : 0.62; c = c.map(v => Math.round(v * k)); }   // sel-out
    if (bd && near[i] < 3) { const k = (1 - near[i] / 3) * 0.6; c = c.map((v, ch) => Math.round(v * (1 - k) + bd[p + ch] * k)); }                  // flesh roots
    out[p] = c[0]; out[p + 1] = c[1]; out[p + 2] = c[2];
  }
  im.data.set(out); g.putImageData(im, 0, 0); return layer;
}
