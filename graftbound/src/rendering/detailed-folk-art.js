/**
 * v1.5.0 native 96px anatomy studies for the creatures that were still drawn from 28–68px placeholder rigs
 * (goblins, Elvish Archers, Thermo-Alchemist, Blightcaster, Rageblood Shaman, Spikeshot, Fallen Shinobi,
 * Faerie Duelist, Squirrel). Same frame size, pivot, lighting and 2-view x 6-state motion system as the existing
 * detailed humanoid/beast studies, so every major creature now shares one pixel density and finish.
 *
 * Original artwork drawn with canvas primitives. No Magic card illustrations, no network, no gameplay RNG.
 */
import { creaturePose } from './creature-motion.js';

export const FOLK_FRAME = 96;
export const FOLK_STUDY_FEATURES = Object.freeze([
  'torchgoblin', 'friendlyGoblin', 'bow', 'alchemist', 'blightcaster', 'minotaur', 'spikeshot', 'shinobi', 'duelist', 'friendlySquirrel'
]);
/** Body build per identity: s = overall height scale about the feet, w = shoulder width multiplier. */
const BUILD = Object.freeze({
  torchgoblin: { s: 0.8, w: 0.95 }, friendlyGoblin: { s: 0.8, w: 0.95 }, spikeshot: { s: 0.82, w: 1 },
  bow: { s: 1.02, w: 0.88 }, alchemist: { s: 0.94, w: 1 }, blightcaster: { s: 1.0, w: 1 },
  minotaur: { s: 1.06, w: 1.32 }, shinobi: { s: 1.0, w: 0.96 }, duelist: { s: 0.78, w: 0.82 }, friendlySquirrel: { s: 0.74, w: 0.9 },
});
const INK = '#26221f', SHADOW = 'rgba(20,18,16,.28)';
const pt = (x, y) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
const line = (g, pts, color, width = 1.5) => { g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = color; g.stroke(); };
const shape = (g, pts, fill, edge = INK, width = 1.3) => { g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath(); g.fillStyle = fill; g.fill(); if (edge) { g.lineWidth = width; g.strokeStyle = edge; g.stroke(); } };
const ell = (g, x, y, rx, ry, fill, edge = INK, width = 1) => { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, 2 * Math.PI); g.fillStyle = fill; g.fill(); if (edge) { g.strokeStyle = edge; g.lineWidth = width; g.stroke(); } };
const ramp = (g, x, y, r, hi, mid, low) => { const z = g.createRadialGradient(x - r * .3, y - r * .43, 0, x, y, r); z.addColorStop(0, hi); z.addColorStop(.55, mid); z.addColorStop(1, low); return z; };
const limb = (g, a, b, mid, light, width = 6) => { line(g, [a, b], INK, width + 2); line(g, [a, b], mid, width); line(g, [[a[0] - 1, a[1] - 1], [b[0] - 1, b[1] - 1]], light, Math.max(1, width * .25)); };

/** Pose anchors from view/state/frame only (deterministic). */
export function folkRigPose(feature, state, frame, view = 0) {
  if (!FOLK_STUDY_FEATURES.includes(feature)) return null;
  const p = creaturePose(feature, state, frame, view === 1);
  const B = BUILD[feature], W = B.w;
  const breath = state === 0 ? [0, -1, -2, -1][frame] : 0, c = p.collapse, sway = p.advance * .28;
  const sx = x => 48 + (x - 48) * W;
  return { ...p, back: view === 1, B,
    torsoY: 49 + breath * .3 + c * .4 + p.bob * .25,
    head: pt(48 + sway, 24 + p.head + breath + c * .44), hip: pt(48 + sway, 66 + c * .36),
    leftShoulder: pt(sx(37) + sway, 40 + c * .32), rightShoulder: pt(sx(60) + sway, 40 + c * .32),
    leftElbow: pt(sx(31) + sway + p.farStep, 52 + c * .42), leftHand: pt(sx(28) + sway + p.farStep, 65 + c * .32),
    rightElbow: pt(sx(67) + sway + p.strike * .3, 50 - p.strike * .32 + c * .42), rightHand: pt(sx(70) + sway + p.strike * .6, 62 - p.strike * .85 + c * .36),
    leftKnee: pt(41 - p.nearStep * 2, 74 - Math.abs(p.nearStep) * 2), rightKnee: pt(56 - p.farStep * 2, 74 - Math.abs(p.farStep) * 2),
    leftFoot: pt(39 - p.nearStep * 4, 84 - Math.abs(p.nearStep) * 2 - c * .2), rightFoot: pt(57 - p.farStep * 4, 84 - Math.abs(p.farStep) * 2 - c * .2) };
}
function legs(g, A, mid, light, boot) {
  for (const [hip, knee, foot] of [[pt(A.hip[0] - 6, A.hip[1]), A.leftKnee, A.leftFoot], [pt(A.hip[0] + 6, A.hip[1]), A.rightKnee, A.rightFoot]]) {
    limb(g, hip, knee, mid, light, 6); limb(g, knee, foot, mid, light, 5); ell(g, foot[0] + 1, foot[1], 5.5, 3.2, boot, INK, .9);
  }
}
function arms(g, A, mid, light, hand) {
  for (const [s, e, h] of [[A.leftShoulder, A.leftElbow, A.leftHand], [A.rightShoulder, A.rightElbow, A.rightHand]]) { limb(g, s, e, mid, light, 5.5); limb(g, e, h, mid, light, 4.6); ell(g, h[0], h[1], 3.4, 3.3, hand, INK, .8); }
}
function torso(g, A, fill, w = 1) {
  const y = A.torsoY, l = 48 - 12 * w * A.B.w, r = 48 + 13 * w * A.B.w;
  shape(g, [[l, y - 10], [48, y - 15], [r, y - 10], [r + 3, y + 10], [r - 4, y + 19], [l + 4, y + 19], [l - 3, y + 10]], fill, INK, 1.6);
}
function face(g, A, skin, eye, { ears = 0, big = 1 } = {}) {
  const [x, y] = A.head, R = 11 * big;
  for (const side of [-1, 1]) if (ears) shape(g, [[x + side * (R - 3), y - 2], [x + side * (R + ears), y - 7], [x + side * (R - 1), y + 4]], skin, INK, 1.3);
  ell(g, x, y, R, R * .95, ramp(g, x - 3, y - 4, R * 1.5, '#fff1d6', skin, '#3a2a20'), INK, 1.6);
  if (A.back) { g.save(); g.beginPath(); g.ellipse(x, y, R, R * .95, 0, 0, 2 * Math.PI); g.clip(); ell(g, x, y - R * .25, R * 1.05, R * .85, 'rgba(45,32,24,.55)', null); g.restore(); }
  if (!A.back) { ell(g, x + 4, y - 1, 1.8, 1.8, eye, null); ell(g, x - 3, y - 1, 1.8, 1.8, eye, null); line(g, [[x - 2, y + 5], [x + 4, y + 5]], INK, 1); }
}
function flame(g, x, y, k = 1, t = 0) {
  const f = [0, 1.5, 3, 1.5][t] || 0;
  shape(g, [[x - 5 * k, y], [x - 3 * k, y - 8 * k - f], [x, y - 14 * k - f], [x + 3 * k, y - 8 * k - f], [x + 5 * k, y]], '#ff8a2a', '#5a1d0c', 1);
  shape(g, [[x - 2.4 * k, y - 1], [x, y - 8 * k - f], [x + 2.4 * k, y - 1]], '#ffe58a', null);
}
const FEATURE_DRAW = {
  torchgoblin(g, A, P, st, fr) {   // Mudbutton Torchrunner: torch-carrying goblin in a scrap harness
    legs(g, A, P.mid, P.light, '#3c2a1c'); torso(g, A, ramp(g, 46, A.torsoY - 3, 26, P.light, P.mid, P.dark));
    shape(g, [[38, A.torsoY + 8], [58, A.torsoY + 8], [61, A.torsoY + 22], [35, A.torsoY + 22]], '#5c3a22'); line(g, [[38, A.torsoY - 6], [58, A.torsoY + 8]], '#8b6b3a', 3);
    arms(g, A, P.mid, P.light, P.light); const h = A.rightHand; line(g, [[h[0], h[1] + 5], [h[0] + 2, h[1] - 9]], '#5b3a1f', 3.2); flame(g, h[0] + 2, h[1] - 9, 1, fr);
    face(g, A, P.mid, '#ffd23a', { ears: 9, big: 1.12 }); if (!A.back) for (let i = 0; i < 3; i++) line(g, [[A.head[0] - 2 + i * 2.5, A.head[1] + 5], [A.head[0] - 2 + i * 2.5, A.head[1] + 7]], '#fff7dc', 1);
  },
  friendlyGoblin(g, A, P) {        // Goblin token: cap, spear and patched tunic
    legs(g, A, P.mid, P.light, '#3c2a1c'); torso(g, A, '#6f5a33'); for (let i = 0; i < 3; i++) shape(g, [[41 + i * 5, A.torsoY - 2 + i * 4], [45 + i * 5, A.torsoY - 2 + i * 4], [45 + i * 5, A.torsoY + 2 + i * 4], [41 + i * 5, A.torsoY + 2 + i * 4]], '#9a7a44', INK, .7);
    const h = A.rightHand; line(g, [[h[0] - 1, h[1] + 16], [h[0] + 3, h[1] - 22]], INK, 3.6); line(g, [[h[0] - 1, h[1] + 16], [h[0] + 3, h[1] - 22]], '#8a6238', 2); shape(g, [[h[0] + 3, h[1] - 30], [h[0] + 6, h[1] - 21], [h[0], h[1] - 21]], '#cfd6dc');
    arms(g, A, P.mid, P.light, P.light); face(g, A, P.mid, '#ffe066', { ears: 9, big: 1.1 });
    const [x, y] = A.head; shape(g, [[x - 11, y - 5], [x - 2, y - 17], [x + 11, y - 6]], '#b4432c', INK, 1.3);
  },
  spikeshot(g, A, P, st, fr) {     // Spikeshot Goblin: shoulder-mounted spike launcher
    legs(g, A, P.mid, P.light, '#2e2219'); torso(g, A, ramp(g, 46, A.torsoY - 3, 26, '#d9a46b', '#8a5634', '#3b2214'));
    line(g, [[38, A.torsoY - 8], [60, A.torsoY + 10]], '#3a2a1e', 3.4);
    arms(g, A, P.mid, P.light, P.light); const h = A.rightHand;
    shape(g, [[h[0] - 10, h[1] - 6], [h[0] + 14, h[1] - 10], [h[0] + 15, h[1] - 4], [h[0] - 9, h[1] + 1]], '#5d6670', INK, 1.4);
    for (let i = 0; i < 3; i++) shape(g, [[h[0] + 14, h[1] - 9 + i * 2], [h[0] + 21 + (st === 2 ? fr * 3 : 0), h[1] - 8 + i * 2], [h[0] + 14, h[1] - 7 + i * 2]], '#e7eef2', INK, .6);
    face(g, A, P.mid, '#ff6a2a', { ears: 8, big: 1.08 }); const [x, y] = A.head; ell(g, x + 3, y - 2, 4.5, 3.4, '#d9b44a', INK, 1); ell(g, x + 3, y - 2, 2.3, 1.8, '#5ac8ff', null);
  },
  bow(g, A, P, st, fr) {           // Elvish Archers: slender hooded elf, longbow, quiver
    shape(g, [[52, A.torsoY - 14], [58, A.torsoY - 16], [61, A.torsoY + 6], [55, A.torsoY + 8]], '#5c3d22', INK, 1.1);
    for (let i = 0; i < 3; i++) line(g, [[54 + i * 2, A.torsoY - 15], [55 + i * 2, A.torsoY - 21]], '#e8e0c8', 1.2);
    legs(g, A, '#3c4f33', '#6f8a54', '#3b2a1b');
    shape(g, [[36, A.torsoY - 12], [60, A.torsoY - 12], [64, A.torsoY + 24], [32, A.torsoY + 24]], ramp(g, 46, A.torsoY, 30, P.light, P.mid, P.dark), INK, 1.5);
    line(g, [[40, A.torsoY + 10], [56, A.torsoY + 10]], '#b08a4a', 2.4);
    arms(g, A, P.mid, P.light, '#f1d9b6');
    const h = A.leftHand, draw = st === 2 ? [0, 3, 6, 0][fr] : 0;
    g.beginPath(); g.moveTo(h[0] - 2, h[1] - 26); g.quadraticCurveTo(h[0] - 12, h[1], h[0] - 2, h[1] + 26); g.lineWidth = 4.2; g.strokeStyle = INK; g.stroke(); g.lineWidth = 2.6; g.strokeStyle = '#a77b44'; g.stroke();
    line(g, [[h[0] - 2, h[1] - 26], [h[0] + 4 + draw, h[1]], [h[0] - 2, h[1] + 26]], '#efe7cf', 1);
    face(g, A, '#efd3b0', '#2f7a4a', { ears: 10, big: .95 });
    const [x, y] = A.head; shape(g, [[x - 13, y + 2], [x - 10, y - 12], [x, y - 17], [x + 10, y - 12], [x + 13, y + 2], [x + 8, y - 6], [x - 8, y - 6]], P.mid, INK, 1.4);
  },
  alchemist(g, A, P, st, fr) {     // Thermo-Alchemist: goggled robed brewer with a glowing flask
    legs(g, A, '#4a3a33', '#7b6355', '#2e2420');
    shape(g, [[35, A.torsoY - 12], [61, A.torsoY - 12], [66, A.torsoY + 28], [30, A.torsoY + 28]], ramp(g, 46, A.torsoY, 32, P.light, P.mid, P.dark), INK, 1.6);
    shape(g, [[41, A.torsoY - 10], [55, A.torsoY - 10], [57, A.torsoY + 24], [39, A.torsoY + 24]], '#d7c9a6', INK, 1);
    for (let i = 0; i < 4; i++) ell(g, 44 + i * 3, A.torsoY + 4, 1.2, 2.6, ['#f26b2b', '#5ad1a4', '#e5c34a', '#b06ae0'][i], INK, .5);
    arms(g, A, P.mid, P.light, '#e8c49a'); const h = A.rightHand, glow = [0, 1, 2, 1][fr];
    ell(g, h[0] + 1, h[1] - 4, 5 + glow * .4, 6 + glow * .4, 'rgba(255,170,60,.35)', null); ell(g, h[0] + 1, h[1] - 4, 4.2, 5, '#ff9a3a', INK, 1.2); line(g, [[h[0] + 1, h[1] - 9], [h[0] + 1, h[1] - 13]], INK, 2.6);
    face(g, A, '#e8c49a', INK, { big: 1 }); const [x, y] = A.head;
    if (!A.back) { line(g, [[x - 11, y - 3], [x + 11, y - 3]], '#3b2f2a', 2.6); ell(g, x - 4, y - 2, 3.4, 3, '#ffcf6a', INK, 1.1); ell(g, x + 5, y - 2, 3.4, 3, '#ffcf6a', INK, 1.1); }
    shape(g, [[x - 12, y - 6], [x - 9, y - 13], [x + 9, y - 13], [x + 12, y - 6]], '#6a4a3a', INK, 1.2);
  },
  blightcaster(g, A, P, st, fr) {  // Blightcaster: deep hood, skeletal hand, glowing blight staff
    const h = A.leftHand; line(g, [[h[0], h[1] + 22], [h[0] + 2, h[1] - 34]], INK, 4); line(g, [[h[0], h[1] + 22], [h[0] + 2, h[1] - 34]], '#3a2a3e', 2.4);
    const g1 = [0, 1.5, 3, 1.5][fr]; ell(g, h[0] + 2, h[1] - 37, 6 + g1 * .5, 6 + g1 * .5, 'rgba(170,110,255,.35)', null); ell(g, h[0] + 2, h[1] - 37, 3.8, 4.6, '#c58cff', INK, 1.1);
    shape(g, [[34, A.torsoY - 14], [62, A.torsoY - 14], [70, A.torsoY + 36], [26, A.torsoY + 36]], ramp(g, 46, A.torsoY, 34, P.light, P.mid, P.dark), INK, 1.7);
    for (let i = 0; i < 4; i++) shape(g, [[28 + i * 11, A.torsoY + 36], [33 + i * 11, A.torsoY + 30], [38 + i * 11, A.torsoY + 36]], P.dark, INK, .8);
    line(g, [[48, A.torsoY - 10], [48, A.torsoY + 30]], P.light, 1.4);
    arms(g, A, P.mid, P.light, '#d8d2c0'); const r = A.rightHand; for (let i = -1; i <= 1; i++) line(g, [[r[0], r[1]], [r[0] + 4, r[1] - 5 + i * 3]], '#ece6d4', 1.2);
    const [x, y] = A.head; shape(g, [[x - 13, y + 9], [x - 12, y - 8], [x, y - 17], [x + 12, y - 8], [x + 13, y + 9]], P.mid, INK, 1.6);
    ell(g, x + 1, y + 1, 8, 8, '#120a18', null); if (!A.back) { ell(g, x - 2, y, 1.6, 1.2, '#d6a0ff', null); ell(g, x + 4, y, 1.6, 1.2, '#d6a0ff', null); }
  },
  minotaur(g, A, P, st, fr) {      // Rageblood Shaman: bull-headed, horned, war-painted, totem axe
    legs(g, A, P.mid, P.light, '#2a1c16'); for (const f of [A.leftFoot, A.rightFoot]) shape(g, [[f[0] - 4, f[1] + 3], [f[0], f[1] - 3], [f[0] + 5, f[1] + 3]], '#2a1c16');
    torso(g, A, ramp(g, 46, A.torsoY - 3, 34, P.light, P.mid, P.dark), 1.15);
    line(g, [[40, A.torsoY - 6], [44, A.torsoY + 6]], '#ffd18a', 2); line(g, [[56, A.torsoY - 6], [52, A.torsoY + 6]], '#ffd18a', 2);
    shape(g, [[36, A.torsoY + 12], [60, A.torsoY + 12], [62, A.torsoY + 24], [34, A.torsoY + 24]], '#3d2a20');
    arms(g, A, P.mid, P.light, P.mid); const h = A.rightHand;
    line(g, [[h[0], h[1] + 14], [h[0] + 3, h[1] - 24]], INK, 4.4); line(g, [[h[0], h[1] + 14], [h[0] + 3, h[1] - 24]], '#6b4a2c', 2.8);
    shape(g, [[h[0] + 3, h[1] - 24], [h[0] + 15, h[1] - 30], [h[0] + 17, h[1] - 14], [h[0] + 4, h[1] - 16]], '#c9d0d4', INK, 1.3);
    const [x, y] = A.head;
    for (const side of [-1, 1]) { g.beginPath(); g.moveTo(x + side * 7, y - 5); g.quadraticCurveTo(x + side * 22, y - 8, x + side * 20, y - 22); g.quadraticCurveTo(x + side * 16, y - 10, x + side * 6, y + 1); g.closePath(); g.fillStyle = '#efe1bf'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = INK; g.stroke(); }
    ell(g, x, y, 11.5, 11, ramp(g, x - 3, y - 4, 18, P.light, P.mid, P.dark), INK, 1.6);
    if (!A.back) { ell(g, x + 1, y + 6, 7, 4.6, '#d79a7a', INK, 1); ell(g, x - 2, y + 6, 1, 1, INK, null); ell(g, x + 4, y + 6, 1, 1, INK, null); ell(g, x - 4, y - 2, 1.6, 1.6, '#ffdc5a', null); ell(g, x + 5, y - 2, 1.6, 1.6, '#ffdc5a', null); line(g, [[x - 7, y - 6], [x + 7, y - 6]], '#c43a2a', 1.6); }
  },
  shinobi(g, A, P, st, fr) {       // Fallen Shinobi: undead ninja, wraps, scarf, katana
    legs(g, A, '#22283a', '#46506e', '#141824'); torso(g, A, ramp(g, 46, A.torsoY - 3, 28, P.light, P.mid, P.dark));
    line(g, [[38, A.torsoY - 10], [60, A.torsoY + 12]], '#1a1f2c', 4); line(g, [[36, A.torsoY + 12], [60, A.torsoY + 12]], '#7a2b3a', 3.4);
    const sc = [0, 2, 4, 2][fr]; shape(g, [[42, A.torsoY - 15], [32 - sc, A.torsoY - 10], [28 - sc, A.torsoY - 2], [38, A.torsoY - 9]], '#7a2b3a', INK, 1.1);
    arms(g, A, P.mid, P.light, '#9bb0a0'); const h = A.rightHand;
    line(g, [[h[0] - 2, h[1] + 4], [h[0] + 6, h[1] - 28]], INK, 3.6); line(g, [[h[0] - 2, h[1] + 4], [h[0] + 6, h[1] - 28]], '#dfe7ee', 2); line(g, [[h[0] - 4, h[1] - 1], [h[0] + 3, h[1] + 1]], '#c9a24a', 2.4);
    face(g, A, '#7f9a8c', '#e04a5a'); const [x, y] = A.head;
    shape(g, [[x - 11, y + 1], [x + 11, y + 1], [x + 10, y + 10], [x - 10, y + 10]], P.mid, INK, 1.2); shape(g, [[x - 11, y - 4], [x - 10, y - 11], [x + 10, y - 11], [x + 11, y - 4]], P.mid, INK, 1.2);
  },
  duelist(g, A, P, st, fr) {       // Faerie Duelist: tiny fencer with translucent wings and rapier
    const w = [0, 3, 6, 3][fr];
    for (const side of [-1, 1]) { shape(g, [[48 + side * 3, A.torsoY - 8], [48 + side * (26 + w), A.torsoY - 26], [48 + side * (22 + w), A.torsoY - 4]], 'rgba(200,190,255,.55)', '#5a4a9a', 1.2); shape(g, [[48 + side * 3, A.torsoY - 2], [48 + side * (18 + w * .6), A.torsoY + 10], [48 + side * 8, A.torsoY + 12]], 'rgba(220,210,255,.5)', '#5a4a9a', 1); }
    legs(g, A, '#2e3360', '#5a62a8', '#1c1f3a'); torso(g, A, ramp(g, 46, A.torsoY - 3, 24, P.light, P.mid, P.dark));
    line(g, [[48, A.torsoY - 12], [48, A.torsoY + 16]], '#f2e6ff', 1.4); arms(g, A, P.mid, P.light, '#f2dcc8');
    const h = A.rightHand; line(g, [[h[0], h[1]], [h[0] + 18 + (st === 2 ? fr * 2 : 0), h[1] - 20]], '#eef3f8', 1.6); ell(g, h[0], h[1], 3, 2.4, '#d6b25a', INK, .8);
    face(g, A, '#f2dcc8', '#6a4ad8', { ears: 6, big: 1.05 }); const [x, y] = A.head; for (let i = -1; i <= 1; i++) shape(g, [[x + i * 6 - 4, y - 8], [x + i * 6, y - 15], [x + i * 6 + 4, y - 8]], '#c6a0ff', INK, .9);
  },
  friendlySquirrel(g, A, P, st, fr) {   // Squirrel: upright, huge curled tail, acorn
    const t = [0, 2, 3, 1][fr], [hx, hy] = A.hip;
    g.beginPath(); g.moveTo(hx - 4, hy + 4); g.bezierCurveTo(hx - 30, hy + 2, hx - 36, hy - 40 - t, hx - 14, hy - 46 - t); g.bezierCurveTo(hx - 2, hy - 48 - t, hx - 4, hy - 30, hx - 16, hy - 32);
    g.bezierCurveTo(hx - 22, hy - 20, hx - 16, hy - 4, hx - 2, hy - 2); g.closePath(); g.fillStyle = ramp(g, hx - 22, hy - 26, 30, P.light, P.mid, P.dark); g.fill(); g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke();
    for (let i = 0; i < 5; i++) line(g, [[hx - 26 + i * 2, hy - 30 - i * 3], [hx - 22 + i * 2, hy - 34 - i * 3]], P.light, 1.2);
    legs(g, A, P.mid, P.light, P.dark); ell(g, 48, A.torsoY + 6, 13 * A.B.w, 17, ramp(g, 46, A.torsoY, 24, P.light, P.mid, P.dark), INK, 1.6); ell(g, 49, A.torsoY + 9, 7, 11, '#f7e3c0', null);
    arms(g, A, P.mid, P.light, P.mid); const h = A.rightHand; ell(g, h[0], h[1] - 2, 4, 4.6, '#b07a3a', INK, 1); shape(g, [[h[0] - 4, h[1] - 4], [h[0] + 4, h[1] - 4], [h[0], h[1] - 9]], '#6b4a24', INK, .8);
    face(g, A, P.mid, INK, { ears: 6, big: 1 }); if (!A.back) { ell(g, A.head[0] + 6, A.head[1] + 3, 3.4, 2.6, '#f7e3c0', null); ell(g, A.head[0] + 8, A.head[1] + 2, 1.2, 1, INK, null); }
  },
};
export function drawFolkStudyFrame(g, feature, view, state, frame, palette) {
  const A = folkRigPose(feature, state, frame, view);
  if (!A) throw new Error('Unsupported native folk study ' + feature);
  if (!palette?.dark || !palette?.mid || !palette?.light) throw new Error('Missing anatomy material palette');
  g.save(); g.beginPath(); g.rect(0, 0, FOLK_FRAME, FOLK_FRAME); g.clip(); g.lineJoin = 'round'; g.lineCap = 'round';
  ell(g, 48, 88, 18 * A.B.w, 3.4, SHADOW, null);
  g.translate(48, 88); g.scale(A.B.s, A.B.s); g.translate(-48, -88);   // scale about the feet: one pivot for every creature
  if (A.tilt) { g.translate(48, 88); g.rotate(A.tilt * Math.PI / 180 * .5); g.translate(-48, -88); }
  FEATURE_DRAW[feature](g, A, palette, state, frame);
  g.restore();
}
