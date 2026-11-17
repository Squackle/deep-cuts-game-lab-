/**
 * v1.6.0 body-region model for the Blank. Every pixel of a frame is assigned to head / torso / arms / legs using the
 * pose's own anatomy anchors, so skin tones and graft surfaces follow the BODY through every animation frame instead of
 * being painted at fixed sheet coordinates. Pure math (no DOM); shared by the skin and surface compositors.
 */
export const REGIONS = Object.freeze(['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg']);
export const R = Object.freeze(Object.fromEntries(REGIONS.map((r, i) => [r, i])));
const segDist = (px, py, [ax, ay], [bx, by]) => { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)); return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
/** Region index at (x,y) for anchors A (frame-local pixels). `k` = anchor scale (1 for 128px, 0.5 for 64px frames). */
export function regionAt(A, x, y, k = 1) {
  const S = p => [p[0] * k, p[1] * k], head = S(A.head), neck = S(A.neck), chest = S(A.chest), hip = S(A.hip);
  const sh = side => [chest[0] + side * 11 * k, chest[1] - 8 * k], hp = side => [hip[0] + side * 6 * k, hip[1]];
  const d = [
    Math.hypot(x - head[0], y - head[1]) - 13 * k,
    Math.min(segDist(x, y, neck, hip), segDist(x, y, chest, hip)) - 12 * k,
    segDist(x, y, sh(-1), S(A.leftHand)) - 5 * k,
    segDist(x, y, sh(1), S(A.rightHand)) - 5 * k,
    segDist(x, y, hp(-1), S(A.leftFoot)) - 6 * k,
    segDist(x, y, hp(1), S(A.rightFoot)) - 6 * k,
  ];
  let best = 0; for (let i = 1; i < d.length; i++) if (d[i] < d[best]) best = i;
  return best;
}
/** Smooth deterministic value noise (for the 'patches' skin style). */
const h2 = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
export function valueNoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
/** Second-tone weight (0/1 before smoothing) for a skin style at a pixel in region r. The face is always tone A. */
export function styleWeight(style, r, x, y, A, k = 1) {
  switch (style) {
    case 'limbs': return r >= R.leftArm ? 1 : 0;
    case 'mantle': return r === R.torso && y < (A.hip[1] - 6) * k ? 1 : r === R.leftArm || r === R.rightArm ? (y < (A.chest[1] + 6) * k ? 1 : 0) : 0;
    case 'split': return r === R.leftArm || r === R.leftLeg ? 1 : r === R.torso ? (x + Math.sin(y * 0.35 / k) * 2 * k < A.chest[0] * k ? 1 : 0) : 0;
    case 'patches': return r === R.head ? 0 : valueNoise(x / (13 * k), y / (13 * k)) > 0.56 ? 1 : 0;
    default: return 0;
  }
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
/** Box-smooth a 0/1 field and re-threshold with an ordered dither: a crisp 2–3 px pixel-art transition band. */
export function ditherSmooth(field, w, h, rad = 2) {
  const I = new Float32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) I[(y + 1) * (w + 1) + x + 1] = field[y * w + x] + I[y * (w + 1) + x + 1] + I[(y + 1) * (w + 1) + x] - I[y * (w + 1) + x];
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const x0 = Math.max(0, x - rad), y0 = Math.max(0, y - rad), x1 = Math.min(w, x + rad + 1), y1 = Math.min(h, y + rad + 1);
    const s = I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0];
    out[y * w + x] = s / ((x1 - x0) * (y1 - y0)) > BAYER[(y & 3) * 4 + (x & 3)] ? 1 : 0;
  }
  return out;
}
