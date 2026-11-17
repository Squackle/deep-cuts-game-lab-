/**
 * v1.6.0 Black (umbral) spell visuals: spectral hands emerging from charcoal mist.
 *
 * Additive particles can only ADD light, so true shadow needs alpha-tested pixel sprites. This module generates a small
 * original pixel-art atlas once (smoke puffs, wisps and seven spectral-hand poses) and four effect sequences:
 *   Murder (removal)   — mist gathers above the foe; a hand descends, grips and crushes.
 *   Disfigure (wither) — a hand clutches and twists; withering motes fall.
 *   Drain Life         — a hand grips and drags crimson life back to the caster.
 *   Infest (area)      — ground mist with small clawing hands rising across the 3x3 area.
 * Each effect resolves at its IMPACT moment (the grip/crush) so the engine's already-resolved damage plays in sync.
 * Presentation only: no gameplay state is read or written.
 */
export const SHADOW_CELL = 48, SHADOW_COLS = 8;
export const SHADOW_PALETTE = Object.freeze(['#07060a', '#110d15', '#1c1622', '#2a2231', '#3d3345', '#544860', '#4a1a52', '#6d2a78', '#6b1424', '#a02a44', '#d9607e']);
/** Atlas frame coordinates [col,row]. Row 0: mist; row 1: hand poses. */
export const SHADOW_FRAMES = Object.freeze({
  puff: [[0, 0], [1, 0], [2, 0], [3, 0]], wisp: [[4, 0], [5, 0]], mote: [6, 0],
  handEmerge: [0, 1], handOpen: [1, 1], handCurl: [2, 1], handGrasp: [3, 1], handClench: [4, 1], handPull: [5, 1], handFade: [6, 1],
});
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const PAL = SHADOW_PALETTE.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
const nearest = (r, g, b) => { let best = 0, bd = 1e9; PAL.forEach((p, i) => { const d = (p[0] - r) ** 2 + (p[1] - g) ** 2 * 1.2 + (p[2] - b) ** 2; if (d < bd) { bd = d; best = i; } }); return PAL[best]; };
/** Deterministic hash for organic-but-stable mist shapes (never Math.random: the atlas must be identical every load). */
const hash = (x, y, s) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };

function puff(g, cx, cy, r, seed) {
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * Math.PI * 2 + seed, d = r * (0.25 + 0.35 * hash(k, seed, 1)), rr = r * (0.42 + 0.3 * hash(k, seed, 2));
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.7;
    const gr = g.createRadialGradient(x - rr * 0.3, y - rr * 0.4, 0, x, y, rr);
    gr.addColorStop(0, 'rgba(84,72,96,0.95)'); gr.addColorStop(0.55, 'rgba(42,34,49,0.9)'); gr.addColorStop(1, 'rgba(17,13,21,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = 'rgba(109,42,120,0.55)'; g.beginPath(); g.arc(cx + r * 0.2, cy - r * 0.35, r * 0.18, 0, Math.PI * 2); g.fill();   // violet glint
}
function wisp(g, cx, cy, h, seed) {
  g.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    g.strokeStyle = k ? 'rgba(61,51,69,0.85)' : 'rgba(109,42,120,0.75)'; g.lineWidth = 4 - k;
    g.beginPath(); g.moveTo(cx, cy);
    for (let t = 1; t <= 6; t++) g.lineTo(cx + Math.sin(t * 1.3 + seed + k) * 5, cy - h * t / 6);
    g.stroke();
  }
}
/** A spectral hand pointing DOWN (it descends onto the target). curl: 0 open .. 1 fist. */
function hand(g, cx, cy, curl, { pull = 0, fade = 0 } = {}) {
  const BODY = '#2a2231', DARK = '#16121a', LIT = '#544860', VIO = '#6d2a78', CRIM = '#a02a44', GLOW = '#d9607e';
  // ragged smoky forearm: overlapping puffs that thin out upward (no hard outline)
  for (let k = 0; k < 6; k++) { const y = cy - 6 - k * 4.2, w = 8.5 - k * 0.9 + (k % 2) * 1.2;
    g.fillStyle = k > 3 ? 'rgba(42,34,49,0.55)' : BODY; g.beginPath(); g.ellipse(cx + Math.sin(k * 1.7) * 1.4, y, w, 3.4, 0, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = VIO; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - 2, cy - 26); g.quadraticCurveTo(cx + 3, cy - 18, cx - 1, cy - 8); g.stroke();   // wavering violet vein
  // palm (back of the hand faces the viewer)
  g.fillStyle = BODY; g.beginPath(); g.moveTo(cx - 9, cy - 7); g.lineTo(cx + 9, cy - 7); g.lineTo(cx + 10, cy + 3); g.lineTo(cx - 10, cy + 3); g.closePath(); g.fill();
  g.fillStyle = LIT; g.fillRect(cx - 7, cy - 6, 5, 2); g.fillRect(cx - 8, cy - 4, 2, 5);  // upper-left light
  g.fillStyle = DARK; g.fillRect(cx + 5, cy - 4, 3, 7);                                    // right-side shadow
  const side = ox => (ox < 0 ? -1 : 1);
  const fingers = [[-7.5, -0.55, 15], [-2.6, -0.16, 18], [2.6, 0.16, 17.5], [7.5, 0.55, 14.5]];
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [ox, spread, len] of fingers) {
    let x = cx + ox, y = cy + 2, th = spread * (1 - curl * 0.75); const pts = [[x, y]]; const segs = [0.4, 0.33, 0.27];
    segs.forEach((f, j) => { th += -side(ox) * curl * [0.35, 0.85, 1.05][j]; const L = len * f * (1 - curl * 0.18); x += Math.sin(th) * L; y += Math.cos(th) * L; pts.push([x, y]); });
    [[3.6, DARK], [2.6, BODY]].forEach(([w, c]) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(...pts[0]); for (const q of pts.slice(1)) g.lineTo(...q); g.stroke(); });
    g.strokeStyle = LIT; g.lineWidth = 0.9; g.beginPath(); g.moveTo(pts[0][0] - 0.9, pts[0][1]); g.lineTo(pts[1][0] - 0.9, pts[1][1]); g.stroke();
    for (const q of pts.slice(1, 3)) { g.fillStyle = VIO; g.fillRect(Math.round(q[0]) - 1, Math.round(q[1]) - 1, 2, 2); }   // knuckles
    const [tx, ty] = pts[3], [px, py] = pts[2], dx = tx - px, dy = ty - py, m = Math.hypot(dx, dy) || 1;
    g.fillStyle = CRIM; g.beginPath(); g.moveTo(tx - dy / m * 1.6, ty + dx / m * 1.6); g.lineTo(tx + dx / m * 4.2, ty + dy / m * 4.2); g.lineTo(tx + dy / m * 1.6, ty - dx / m * 1.6); g.closePath(); g.fill();
    g.fillStyle = GLOW; g.fillRect(Math.round(tx + dx / m * 2), Math.round(ty + dy / m * 2), 1, 1);
  }
  // thumb from the left of the palm, closing across with curl
  { const b0 = [cx - 9, cy - 3], th = -1.05 + curl * 1.5, j1 = [b0[0] + Math.sin(th) * 6, b0[1] + Math.cos(th) * 6], j2 = [j1[0] + Math.sin(th + 0.5 + curl) * 5, j1[1] + Math.cos(th + 0.5 + curl) * 5];
    [[3.4, DARK], [2.4, BODY]].forEach(([w, c]) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(...b0); g.lineTo(...j1); g.lineTo(...j2); g.stroke(); });
    g.fillStyle = CRIM; g.fillRect(Math.round(j2[0]) - 1, Math.round(j2[1]) - 1, 2, 2); }
  if (curl > 0.85) { g.fillStyle = 'rgba(217,96,126,0.95)'; g.beginPath(); g.arc(cx, cy + 9, 2.4, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff0f4'; g.fillRect(cx - 1, cy + 8, 1, 1); }   // crushed ember of life
  if (pull) for (let k = 0; k < 4; k++) { g.strokeStyle = k % 2 ? CRIM : VIO; g.lineWidth = 1.3; g.beginPath(); g.moveTo(cx - 6 + k * 4, cy + 12); g.quadraticCurveTo(cx - 8 + k * 4, cy + 16, cx - 5 + k * 4, cy + 21); g.stroke(); }
  if (fade) { g.globalCompositeOperation = 'destination-out'; for (let k = 0; k < 60; k++) { g.fillStyle = '#000'; g.fillRect(cx - 14 + hash(k, 3, 9) * 28, cy - 26 + hash(k, 5, 9) * 46, 2, 2); } g.globalCompositeOperation = 'source-over'; }
}
/** Quantize to the palette and turn soft alpha into a stable ordered dither (the sprite shader alpha-tests at 0.5). */
function pixelize(g, w, h) {
  const im = g.getImageData(0, 0, w, h), d = im.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, a = d[i + 3] / 255;
    if (a < 0.06 || a < BAYER[(y & 3) * 4 + (x & 3)] * 0.9) { d[i + 3] = 0; continue; }
    const c = nearest(d[i] / Math.max(a, 0.01), d[i + 1] / Math.max(a, 0.01), d[i + 2] / Math.max(a, 0.01)); d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
}
/** Builds the atlas canvas (browser only). Deterministic: identical pixels on every load. */
export function makeShadowAtlas(doc = document) {
  const C = SHADOW_CELL, c = doc.createElement('canvas'); c.width = C * SHADOW_COLS; c.height = C * 2;
  const g = c.getContext('2d', { willReadFrequently: true });
  SHADOW_FRAMES.puff.forEach(([x], k) => puff(g, x * C + C / 2, C / 2 + 4, 15 + k * 1.5, k * 1.7));
  SHADOW_FRAMES.wisp.forEach(([x], k) => wisp(g, x * C + C / 2, C - 6, 34, k * 2.1));
  { const [x] = SHADOW_FRAMES.mote; g.fillStyle = 'rgba(160,42,68,1)'; g.beginPath(); g.arc(x * C + C / 2, C / 2, 4, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(217,96,126,1)'; g.fillRect(x * C + C / 2 - 1, C / 2 - 2, 2, 2); }
  const poses = [['handEmerge', 0.1, {}], ['handOpen', 0, {}], ['handCurl', 0.45, {}], ['handGrasp', 0.75, {}], ['handClench', 1, {}], ['handPull', 0.9, { pull: 1 }], ['handFade', 0.6, { fade: 1 }]];
  for (const [name, curl, o] of poses) { const [x, y] = SHADOW_FRAMES[name]; g.save(); g.beginPath(); g.rect(x * C, y * C, C, C); g.clip();
    if (name === 'handEmerge') { hand(g, x * C + C / 2, y * C + 28, curl, o); puff(g, x * C + C / 2, y * C + 14, 14, 4.2); }
    else hand(g, x * C + C / 2, y * C + 24, curl, o);
    g.restore(); }
  pixelize(g, c.width, c.height);
  return c;
}

/** Tolerates renderers without the shadow layer (headless tests, legacy scene): the cast still resolves on time. */
const addS = (sc, o) => (sc.addShadow ? sc.addShadow(o) : null);
const sleep = (sc, ms) => new Promise(r => setTimeout(r, sc.speed >= 50 ? 0 : ms / Math.max(0.1, sc.speed)));
const R = k => Math.sin(k * 12.9898) * 0.5;   // deterministic jitter per index (presentation stays identical per cast)
function gather(sc, at, n, radius = 0.55, height = 0.95) {
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2;
    addS(sc, { frames: [SHADOW_FRAMES.puff[i % 4]], pos: [at[0] + Math.cos(a) * radius, at[1] + height + R(i) * 0.15, at[2] + Math.sin(a) * radius], size: 0.42 + 0.06 * (i % 3), life: 1.2, vel: [-Math.cos(a) * radius * 0.7, 0.05, -Math.sin(a) * radius * 0.7], fadeIn: 0.18, fadeOut: 0.5 }); }
}
/** Shared grasp: mist gathers over `to`, a hand descends, then poses play. Resolves at the grip. */
/** v1.7.0 four readable stages: (1) GATHER — charcoal mist converges above the target; (2) INTENSIFY — the cloud
 *  thickens and darkens with a violet core; (3) EMERGE + STRIKE — the hand pushes out of that cloud and grips;
 *  (4) DISSIPATE. The promise resolves at the grip, so the engine's already-resolved damage plays in sync. */
export const GRASP_STAGES = Object.freeze({ gather: 420, intensify: 320, descend: 0.32 });
async function grasp(sc, { from, to, target, finale = 'handClench', light = [0.75, 0.12, 0.25], hold = 0.7 }) {
  const reduced = sc.reduced, cloud = [to[0], to[1] + 1.0, to[2]];
  if (from && sc.projectile) await sc.projectile(from, cloud, [0.2, 0.12, 0.24], 0.24, 0.12, { size: 20 });
  gather(sc, to, reduced ? 3 : 8, 0.62, 1.0);   // 1 · gather
  addS(sc, { frames: [SHADOW_FRAMES.wisp[0], SHADOW_FRAMES.wisp[1]], fps: 6, pos: [to[0], to[1] + 0.2, to[2]], size: 0.6, life: 1.6, vel: [0, 0.18, 0], fadeIn: 0.2, fadeOut: 0.6 });
  await sleep(sc, GRASP_STAGES.gather);
  for (let i = 0; i < (reduced ? 2 : 5); i++) addS(sc, { frames: [SHADOW_FRAMES.puff[(i + 2) % 4]], pos: [cloud[0] + R(i + 11) * 0.18, cloud[1] + R(i + 5) * 0.08, cloud[2] + R(i + 7) * 0.18], size: 0.5 + i * 0.07, life: 1.5, vel: [0, 0, 0], fadeIn: 0.15, fadeOut: 0.5, delay: i * 0.05 });   // 2 · intensify
  sc.light && sc.light(cloud, [0.45, 0.12, 0.55], 1.6, 0.6, 1.1);
  await sleep(sc, GRASP_STAGES.intensify);
  const top = cloud[1] + 0.05, grip = to[1] + 0.12, descend = GRASP_STAGES.descend;   // 3 · emerge from the cloud and strike
  addS(sc, { seq: [{ at: 0, frame: SHADOW_FRAMES.handEmerge }, { at: 0.14, frame: SHADOW_FRAMES.handOpen }, { at: descend * 0.8, frame: SHADOW_FRAMES.handGrasp }, { at: descend + 0.08, frame: SHADOW_FRAMES[finale] }, { at: descend + hold, frame: SHADOW_FRAMES.handFade }],
    pos: [to[0], top, to[2]], size: 0.95, life: descend + hold + 0.35, vel: [0, (grip - top) / descend, 0], stopAt: descend, fadeIn: 0.12, fadeOut: 0.3 });
  await sleep(sc, descend * 1000);
  if (target != null) sc.hit(target, [0.3, 0.06, 0.16], true);
  sc.light([to[0], to[1] + 0.3, to[2]], light, 2.4, 0.5, 1.6); sc.shake?.(reduced ? 0 : 0.05);
  for (let i = 0; i < (reduced ? 2 : 5); i++) addS(sc, { frames: [SHADOW_FRAMES.puff[i % 4]], pos: [to[0] + R(i + 3) * 0.6, to[1] - 0.1, to[2] + R(i + 7) * 0.6], size: 0.36, life: 0.9, vel: [R(i) * 0.4, 0.35, R(i + 1) * 0.4], fadeIn: 0.05, fadeOut: 0.6 });   // 4 · dissipate
}
export async function shadowMurder(sc, { from, to, target }) { await grasp(sc, { from, to, target, finale: 'handClench' }); }
export async function shadowDisfigure(sc, { from, to, target }) {
  await grasp(sc, { from, to, target, finale: 'handCurl', light: [0.45, 0.16, 0.55], hold: 0.55 });
  for (let i = 0; i < (sc.reduced ? 2 : 6); i++) addS(sc, { frames: [SHADOW_FRAMES.mote], pos: [to[0] + R(i + 2) * 0.5, to[1] + 0.5, to[2] + R(i + 5) * 0.5], size: 0.16, life: 0.8, vel: [0, -0.6, 0], fadeIn: 0.05, fadeOut: 0.4 });
}
export async function shadowDrain(sc, { from, to, target }) {
  await grasp(sc, { from, to, target, finale: 'handPull', hold: 0.15 });
  if (!from) return;
  // after the grip resolves, the hand drags crimson life back to the caster (lingering, non-blocking)
  const dur = 0.55, d = [from[0] - to[0], from[1] - to[1], from[2] - to[2]];
  addS(sc, { frames: [SHADOW_FRAMES.handPull], pos: [to[0], to[1] + 0.12, to[2]], size: 0.85, life: dur + 0.2, vel: d.map(v => v / dur), stopAt: dur, fadeIn: 0, fadeOut: 0.25 });
  for (let i = 0; i < (sc.reduced ? 3 : 8); i++) addS(sc, { frames: [SHADOW_FRAMES.mote], pos: [to[0], to[1] + 0.25 + i * 0.03, to[2]], size: 0.14, life: dur + 0.1, delay: i * 0.05, vel: d.map(v => v / dur), fadeIn: 0.02, fadeOut: 0.2 });
  sc.fx.swirl(from, () => from, [0.85, 0.15, 0.3], sc.reduced ? 6 : 16, 0.5);
}
export async function shadowInfest(sc, { from, to, tiles = [] }) {
  if (from && sc.projectile) await sc.projectile(from, [to[0], 0.5, to[2]], [0.2, 0.12, 0.24], 0.24, 0.2, { size: 22 });
  const area = tiles.length ? tiles : [to];
  area.forEach((t, i) => { addS(sc, { frames: [SHADOW_FRAMES.puff[i % 4]], pos: [t[0] + R(i) * 0.2, 0.0, t[2] + R(i + 9) * 0.2], size: 0.55, life: 1.3, vel: [0, 0.12, 0], fadeIn: 0.25, fadeOut: 0.6 }); });
  await sleep(sc, 260);
  area.forEach((t, i) => { if (sc.reduced && i % 2) return;
    addS(sc, { seq: [{ at: 0, frame: SHADOW_FRAMES.handOpen }, { at: 0.25, frame: SHADOW_FRAMES.handGrasp }, { at: 0.45, frame: SHADOW_FRAMES.handFade }], flipY: true, pos: [t[0] + R(i + 4) * 0.25, -0.25, t[2] + R(i + 6) * 0.25], size: 0.48, life: 0.7, vel: [0, 0.8, 0], stopAt: 0.3, fadeIn: 0.08, fadeOut: 0.25 }); });
  await sleep(sc, 300);
  sc.light([to[0], 0.3, to[2]], [0.5, 0.15, 0.5], 2.6, 0.5, 1.2);
}

/** v1.7.0 skeleton defeat: an original pixel bone pile (frame 0: tumbling bones, frame 1: settled pile). */
export const BONE_CELL = 48;
export function makeBoneAtlas(doc = document) {
  const C = BONE_CELL, c = doc.createElement('canvas'); c.width = C * 2; c.height = C; const g = c.getContext('2d');
  const INK = '#2d2620', BONE = '#e9dcbc', SH = '#b3a27f', HI = '#fff6e2';
  const bone = (x, y, len, ang) => { g.save(); g.translate(x, y); g.rotate(ang);
    g.fillStyle = INK; g.fillRect(-len / 2 - 1, -2, len + 2, 4); g.beginPath(); g.arc(-len / 2, 0, 3, 0, 7); g.arc(len / 2, 0, 3, 0, 7); g.fill();
    g.fillStyle = BONE; g.fillRect(-len / 2, -1, len, 2); g.beginPath(); g.arc(-len / 2, 0, 2, 0, 7); g.arc(len / 2, 0, 2, 0, 7); g.fill();
    g.fillStyle = HI; g.fillRect(-len / 2 + 2, -1, len - 4, 1); g.restore(); };
  const skull = (x, y) => { g.fillStyle = INK; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.fillStyle = BONE; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill();
    g.fillStyle = SH; g.fillRect(x - 4, y + 2, 8, 2); g.fillStyle = INK; g.fillRect(x - 3, y - 1, 2, 2); g.fillRect(x + 1, y - 1, 2, 2); g.fillRect(x - 1, y + 2, 2, 2); };
  [[16, 22, 14, 0.9], [30, 18, 12, -0.6], [22, 30, 16, 0.2], [33, 30, 10, 1.4]].forEach(b => bone(...b)); skull(24, 12);
  g.save(); g.translate(C, 0);
  [[14, 36, 16, 0.15], [32, 37, 14, -0.2], [22, 40, 18, 0.05], [27, 33, 12, 1.1], [18, 32, 10, -1.0], [35, 41, 8, 0.6]].forEach(b => bone(...b)); skull(25, 31);
  g.fillStyle = 'rgba(45,38,32,0.45)'; g.fillRect(10, 44, 30, 2); g.restore();
  return c;
}

/** v1.8.0 toxic smoke: six original pixel-art cloud VOLUMES (64 px): a few large soft billows with a noise-eroded wispy
 *  silhouette, shaded from the upper left with an 8-colour murky poison palette and an ordered-dither fringe.
 *  Deterministic (no Math.random). */
export const TOXIC_CELL = 64, TOXIC_FRAMES = 6;
export const TOXIC_PALETTE = Object.freeze(['#0a170c', '#122319', '#19331d', '#224622', '#2f5c28', '#40752f', '#5a8f38', '#82ad4c']);
export function makeToxicAtlas(doc = document) {
  const C = TOXIC_CELL, c = doc.createElement('canvas'); c.width = C * TOXIC_FRAMES; c.height = C;
  const g = c.getContext('2d', { willReadFrequently: true }), im = g.createImageData(c.width, C), d = im.data;
  const pal = TOXIC_PALETTE.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const noise = (x, y, f) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, h = (a, b) => hash(a, b, f + 9);
    return h(xi, yi) * (1 - fx) * (1 - fy) + h(xi + 1, yi) * fx * (1 - fy) + h(xi, yi + 1) * (1 - fx) * fy + h(xi + 1, yi + 1) * fx * fy; };
  for (let f = 0; f < TOXIC_FRAMES; f++) {
    const balls = Array.from({ length: 5 }, (_, k) => { const a = k * 2.399 + f * 1.3, r = k ? 13 + hash(f, k, 3) * 8 : 20;
      return { x: 32 + (k ? Math.cos(a) * (9 + hash(f, k, 1) * 8) : 0), y: 37 + (k ? Math.sin(a) * (5 + hash(f, k, 2) * 5) - 3 : 0), r }; });
    for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
      let field = 0, bx = 32, by = 37, br = 20, best = -9;
      for (const b of balls) { const v = 1 - Math.hypot(x - b.x, (y - b.y) * 1.2) / b.r; field += Math.max(0, v); if (v > best) { best = v; bx = b.x; by = b.y; br = b.r; } }
      field += (noise(x / 6, y / 6, f) - 0.5) * 0.55;
      if (field <= 0.08) continue;
      const edge = Math.min(1, (field - 0.08) / 0.42), bay = BAY[(y & 3) * 4 + (x & 3)];
      if (edge < 1 && edge < bay) continue;
      const nx = (x - bx) / br, ny = (y - by) / br, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const lit = Math.max(0, -0.5 * nx - 0.62 * ny + 0.6 * nz), under = Math.max(0, (y - 42) / 20);
      let k = 1.4 + lit * 4.2 + edge * 0.6 - under * 2 + (noise(x / 3, y / 3, f + 3) - 0.5) * 1.1 + (bay - 0.5) * 0.7;
      k = Math.max(0, Math.min(pal.length - 1, Math.round(k)));
      const i = (y * c.width + f * C + x) * 4; d[i] = pal[k][0]; d[i + 1] = pal[k][1]; d[i + 2] = pal[k][2]; d[i + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0); return c;
}
