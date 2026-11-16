/**
 * v1.6.0 Exile portal: a small pixel-art vortex with a deep black core, layered violet energy arms, an elliptical rim
 * and a few drifting motes falling inward.
 *
 * - ONE persistent canvas for the page's lifetime. HUD rebuilds move the same node into the new zone button, so the
 *   animation can never restart on a new turn or refresh.
 * - Phase comes from wall time (performance.now), independent of turns and of the animation-speed setting.
 * - Pauses while the page is hidden (no rAF work); reduced motion draws a near-still frame at a very slow drift.
 * Pure presentation: never reads or writes battle state.
 */
export const PORTAL_W = 31, PORTAL_H = 44;
// Ordered palette, dark -> bright. Quantizing to it (with a 4x4 Bayer dither) keeps the result crisp pixel art.
export const PORTAL_PALETTE = Object.freeze(['#000000', '#0b0612', '#1a0b2c', '#2d1250', '#4a1d7e', '#6c31b0', '#9659de', '#c79cff', '#efe2ff']);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16 - 0.5);
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const PAL = PORTAL_PALETTE.map(rgb);

/** Brightness (0..1) of the vortex at normalized coords (u,v in -1..1) and phase t (radians). Exported for tests. */
export function portalIntensity(u, v, t) {
  const r = Math.hypot(u, v), a = Math.atan2(v, u);
  if (r > 1) return -1;                                       // outside the ellipse: transparent
  if (r < 0.22) return 0;                                      // the deep black core
  const rim = Math.max(0, 1 - Math.abs(r - 0.94) / 0.06);      // elliptical rim
  const horizon = Math.max(0, 1 - Math.abs(r - 0.27) / 0.05);  // thin glowing edge around the void
  const arms = Math.pow(0.5 + 0.5 * Math.sin(3 * a + 8 * (1 - r) - t), 2.2);   // three crisp swirling arms, wound inward
  const inner = 0.5 + 0.5 * Math.sin(5 * a - 12 * r + t * 1.7);               // faster counter-layer for depth
  const depth = Math.pow((r - 0.22) / 0.78, 0.7);                             // darker toward the core
  return Math.min(1, depth * (0.85 * arms + 0.18 * inner) + rim * 0.68 + horizon * 0.62);
}
/** Deterministic inward-drifting motes for a given phase. */
export function portalMotes(t, n = 6) {
  return Array.from({ length: n }, (_, i) => { const k = ((t * 0.06 + i / n) % 1 + 1) % 1, a = i * 2.39996 + t * 0.35 + k * 4;
    return { u: Math.cos(a) * (1 - k) * 0.95, v: Math.sin(a) * (1 - k) * 0.95, glow: 1 - k }; });
}

let canvas = null, ctx = null, img = null, raf = 0, reduced = false;
const ROT_PER_SEC = 0.55;          // slow, calm rotation (radians of phase per second)
function draw(now) {
  const t = (now / 1000) * (reduced ? 0.06 : ROT_PER_SEC);
  const d = img.data;
  for (let y = 0; y < PORTAL_H; y++) for (let x = 0; x < PORTAL_W; x++) {
    const u = (x + 0.5 - PORTAL_W / 2) / (PORTAL_W / 2), v = (y + 0.5 - PORTAL_H / 2) / (PORTAL_H / 2);
    const i = (y * PORTAL_W + x) * 4, k = portalIntensity(u, v, t);
    if (k < 0) { d[i + 3] = 0; continue; }
    const q = Math.max(0, Math.min(PAL.length - 1, Math.round(k * (PAL.length - 1) + BAYER[(y & 3) * 4 + (x & 3)] * 0.9)));
    const c = PAL[q]; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  for (const m of portalMotes(t)) {
    if (Math.hypot(m.u, m.v) < 0.3) continue;   // motes vanish at the event horizon
    const x = Math.round((m.u + 1) * PORTAL_W / 2 - 0.5), y = Math.round((m.v + 1) * PORTAL_H / 2 - 0.5);
    if (x < 0 || y < 0 || x >= PORTAL_W || y >= PORTAL_H) continue;
    const i = (y * PORTAL_W + x) * 4; if (!d[i + 3]) continue; const c = PAL[m.glow > 0.55 ? 8 : 7];
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
  }
  ctx.putImageData(img, 0, 0);
}
function loop(now) { raf = 0; if (document.hidden || !canvas.isConnected) return; draw(now); raf = requestAnimationFrame(loop); }
function wake() { if (!raf && canvas && !document.hidden && canvas.isConnected) raf = requestAnimationFrame(loop); }

/** The single persistent portal canvas. Calling again returns the SAME node (and resumes drawing if attached). */
export function exilePortalCanvas() {
  if (typeof document === 'undefined') return null;
  if (!canvas) {
    canvas = document.createElement('canvas'); canvas.width = PORTAL_W; canvas.height = PORTAL_H;
    canvas.className = 'gb-exile-canvas'; canvas.setAttribute('aria-hidden', 'true');
    ctx = canvas.getContext('2d'); img = ctx.createImageData(PORTAL_W, PORTAL_H);
    const mq = matchMedia('(prefers-reduced-motion: reduce)'); reduced = mq.matches;
    mq.addEventListener?.('change', e => { reduced = e.matches; });
    document.addEventListener('visibilitychange', wake);
    draw(performance.now());
  }
  queueMicrotask(wake);
  return canvas;
}
