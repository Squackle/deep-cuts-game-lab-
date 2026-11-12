// v0.7 universal spellcasting pipeline: GATHER → INTENSIFY → RELEASE → IMPACT, always from the caster's body.
// Pure presentation. It never reads or changes rules state: the engine has already resolved the spell, and the
// damage/heal events are played only after the promise returned here resolves (= the impact moment).
// Works with any Scene-like object (tests use a recording stub) and an optional audio object.
import { VFX } from './vfx.js';

const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const R = () => Math.random() - 0.5;

/** Per-spell charge identity. tier: 0 quick, 1 normal, 2 powerful. Times are ms at normal speed. */
export const CAST_PROFILE = {
  shock:         { col: [1, 0.95, 0.55], gather: 70,  build: 40,  tier: 0, motes: 10, arcs: 1, cue: 'crackle',        origin: 'hands' },
  lightningBolt: { col: [0.62, 0.82, 1], gather: 300, build: 220, tier: 2, motes: 60, arcs: 4, cue: 'charge',     origin: 'chest', core: true },
  flameSlash:    { col: [1, 0.5, 0.15],  gather: 200, build: 120, tier: 1, motes: 34, embers: true, cue: 'castFire', origin: 'hands' },
  chain:         { col: [0.62, 0.82, 1], gather: 200, build: 120, tier: 1, motes: 36, arcs: 3, cue: 'charge',     origin: 'chest', core: true },
  fireball:      { col: [1, 0.48, 0.14], gather: 320, build: 260, tier: 2, motes: 60, embers: true, cue: 'castFire', origin: 'mouth', core: true },
  growth:        { col: [0.5, 1, 0.4],   gather: 260, build: 110, tier: 1, motes: 44, fromGround: true, cue: 'castNature', origin: 'chest', self: true },
  drain:         { col: [0.6, 0.2, 0.55], gather: 220, build: 110, tier: 1, motes: 34, cue: 'castDark',   origin: 'chest' },
  poison:        { col: [0.55, 0.95, 0.3], gather: 220, build: 120, tier: 1, motes: 34, cue: 'castDark',   origin: 'mouth' },
  summon:        { col: [1, 0.9, 0.55],  gather: 180, build: 100, tier: 1, motes: 30, cue: 'castHoly',   origin: 'chest' },
  heal:          { col: [1, 0.88, 0.5],  gather: 240, build: 120, tier: 1, motes: 40, cue: 'castHoly',   origin: 'hands', self: true },
  salve:         { col: [0.75, 1, 0.8],  gather: 90,  build: 40,  tier: 0, motes: 14, cue: 'castHoly',   origin: 'hands', self: true },
  snakeskin:     { col: [0.52, 0.97, 0.45], gather: 170, build: 100, tier: 1, motes: 26, cue: 'castNature', origin: 'hands' },
  shield:        { col: [0.55, 0.8, 1],  gather: 200, build: 110, tier: 1, motes: 34, cue: 'castArcane', origin: 'chest', self: true },
  frost:         { col: [0.65, 0.92, 1], gather: 220, build: 120, tier: 1, motes: 36, cue: 'castFrost',  origin: 'mouth' },
  fire:          { col: [1, 0.5, 0.15],  gather: 200, build: 100, tier: 1, motes: 30, embers: true, cue: 'castFire', origin: 'hands' },
  wind:          { col: [0.85, 0.95, 1], gather: 120, build: 60,  tier: 0, motes: 16, cue: 'castArcane', origin: 'hands' },
  disfigure:     { col: [0.55, 0.25, 0.7], gather: 160, build: 90, tier: 0, motes: 22, cue: 'castDark',   origin: 'hands' },
  titanic:       { col: [0.45, 1, 0.35],  gather: 300, build: 200, tier: 2, motes: 56, fromGround: true, cue: 'castNature', origin: 'chest', self: true },
  pyroclasm:     { col: [1, 0.42, 0.1],   gather: 320, build: 260, tier: 2, motes: 60, embers: true, fromGround: true, cue: 'castFire', origin: 'chest', self: true, core: true },
};
/** v0.8 pacing: normal-speed casts are deliberately slower and more readable than v0.7 (the brief: "too fast"),
 *  while quick spells stay quick. Applied to every profile; instant mode still skips the charge entirely. */
export const PACE = { 0: 1.3, 1: 1.6, 2: 1.75 };
for (const P of Object.values(CAST_PROFILE)) { const k = PACE[P.tier]; P.gather = Math.round(P.gather * k); P.build = Math.round(P.build * k); }
const DEFAULT_PROFILE = { col: [0.85, 0.75, 1], gather: 180, build: 100, tier: 1, motes: 28, cue: 'spell', origin: 'chest' };
export const profileFor = kind => CAST_PROFILE[kind] || DEFAULT_PROFILE;
/** v0.8: visual intensity from the RESOLVED effect magnitude (damage/heal/shield the rules already applied).
 *  Bounded square-root curve: 1 → 0.6, 3 → 1.0, 6 → 1.41, 12+ → 2.0. Never linear, never above 2. */
export const intensityOf = mag => Math.min(2, Math.max(0.6, Math.sqrt(Math.max(0, mag || 0) / 3)));
export const MAX_SHAKE = 0.3;
/** Visual complexity is based on the actual GRAFTBOUND mana paid, not Magic's printed cost.
 *  A 3+ mana spell uses the grand tier. This does not change its damage or replay. */
export const visualManaTier = cost => cost >= 3 ? 3 : cost >= 2 ? 2 : 1;
/** Bounded charge stages ensure even a nominally 'big' spell is restrained if it costs 1 mana. */
export const visualChargeTimings = (P, tier) => tier === 1
  ? { gather: Math.min(P.gather, 130), build: Math.min(P.build, 65) }
  : tier === 2 ? { gather: Math.max(165, Math.min(P.gather, 265)), build: Math.max(100, Math.min(P.build, 170)) }
  : { gather: Math.max(P.gather, 340), build: Math.max(P.build, 220) }; 
export const MANA_STYLE = Object.freeze({
  1: { motes: 0.6, time: 0.75, burst: 0.38, radiance: 0.65 },
  2: { motes: 0.9, time: 1, burst: 0.8, radiance: 1 },
  3: { motes: 1.35, time: 1.16, burst: 1.4, radiance: 1.5 },
});

/** Height fraction of the sprite where magic gathers, by casting point. */
export const ORIGIN_HEIGHT = { chest: 0.48, hands: 0.42, mouth: 0.62, head: 0.88 };

/** Which casting point this creature uses. Head features (horns/antlers/crown) channel non-hand spells through the head. */
export function originPoint(v, kind) {
  const want = profileFor(kind).origin;
  if (v && v.castAt === 'head' && want !== 'hands') return 'head';
  return want;
}

/** The caster's CURRENT world-space casting point (follows hover, bob, lunge, lift and evolution size every frame). */
export function castOrigin(sc, uid, kind) {
  const v = sc.units.get(uid); if (!v) return [0, 0, 0];
  const pt = originPoint(v, kind), h = sc.heightOf(v), frac = ORIGIN_HEIGHT[pt] || 0.48;
  const bob = v.hover ? Math.sin((sc.time || 0) * 3 + v.uid) * 0.06 : 0;
  const d = v.dir || [0, -1], l = Math.hypot(d[0], d[1]) || 1, fwd = pt === 'chest' ? 0.06 : 0.14;
  const lg = v.lunge || [0, 0, 0];
  return [v.pos[0] + lg[0] + d[0] / l * fwd, v.pos[1] + (v.hover || 0) + bob + (v.castLift || 0) + h * frac, v.pos[2] + lg[2] + d[1] / l * fwd];
}

const sleep = (sc, ms) => new Promise(r => setTimeout(r, ms / Math.max(0.01, sc.speed)));
const secs = (sc, ms) => ms / 1000 / Math.max(0.01, sc.speed);

/** A distinct cast signature for every curated spell. Purely cosmetic: no rules, saves or RNG state read.
 *  Spokes alter the light geometry, while pulse tempo shifts the charging silhouette. */
export const CAST_SIGNATURES = Object.freeze({
  shock: [3,0.3], lightningBolt: [7,1.0], chain: [5,0.7],
  fire: [5,0.7], fireball: [9,1.1], flameSlash: [2,0.5], pyroclasm: [12,1.3],
  growth: [6,0.7], titanic: [8,1], snakeskin: [4,0.45],
  frost: [6,0.85], drain: [5,-0.7], disfigure: [3,-0.35], poison: [9,-0.3],
  summon: [8,0.6], heal: [10,0.5], salve: [4,0.35], shield: [6,0.2], wind: [4,1.5],
});
export function castSignature(sc, kind, at, power, manaTier = profileFor(kind).tier + 1) {
  if (sc.reduced || sc.speed >= 50 || !sc.addRing || !at || manaTier < 2) return;
  const [spokes, speed] = CAST_SIGNATURES[kind] || [6,0.5];
  const col = profileFor(kind).col;
  sc.addRing({ pos: at, r0: 0.05, r1: Math.min(0.6, 0.2 + power * 0.11),
    life: 0.26, col, width: 0.026, spokes, seg: spokes * 2, spin: speed });
}

/** Stages 1 + 2: magic converges on the casting point, then concentrates. Resolves with a cleanup function. */
export async function charge(sc, { uid, kind, audio = null, toward = null, power = 1, manaTier = profileFor(kind).tier + 1 }) {
  const P = profileFor(kind), reduced = !!sc.reduced;
  const v = sc.units.get(uid); if (!v) return () => {};
  const origin = () => castOrigin(sc, uid, kind);
  if (toward && sc.face) sc.face(v, toward);
  if (sc.play) sc.play(uid, 'cast');
  if (audio) audio.play(P.cue);
  const style = MANA_STYLE[manaTier];
  const time = visualChargeTimings(P, manaTier);
  const k = reduced ? 0.5 : 1;
  const n = Math.min(48, Math.max(5, Math.round(P.motes * style.motes * (0.7 + 0.3 * power) * (reduced ? 0.3 : Math.max(0.2, sc.fx?.density ?? 1)))));
  const timers = [];
  // stage 1 — gather: element-coloured motes converge on the casting point; a faint glow follows the body
  const glow = sc.light(origin(), P.col, 1.3, secs(sc, (time.gather + time.build) * k) + 0.2, 0.5); glow.follow = origin;
  v.flash = Math.max(v.flash || 0, 0.15);
  for (let i = 0; i < n; i++) {
    const o = origin(); const a = Math.random() * Math.PI * 2, r = 0.7 + Math.random() * 0.8;
    const start = P.fromGround ? [o[0] + Math.cos(a) * r, 0.04, o[2] + Math.sin(a) * r] : [o[0] + Math.cos(a) * r, o[1] + R() * 0.9, o[2] + Math.sin(a) * r];
    sc.fx.emit({ pos: start, vel: [0, P.fromGround ? 0.6 : 0, 0], col: [...P.col, 1], size: 7 + Math.random() * 6, life: secs(sc, (time.gather + time.build) * k) + 0.1, drag: 0.6, target: origin }, true);
    if (P.embers && i % 3 === 0) sc.fx.emit({ pos: start, vel: [0, 0.5, 0], col: [1, 0.75, 0.3, 1], size: 5, life: 0.5, grav: -1, target: origin }, true);
  }
  if (v.style && v.style.flying && !reduced) sc.tween(P.gather / 1000, t => { v.castLift = 0.12 * t; });
  await sleep(sc, time.gather * k);
  // stage 2 — intensify: the glow brightens, a concentrated core / arcs form, powerful spells lean the camera in
  castSignature(sc, kind, origin(), power, manaTier);
  glow.radius = (1.1 + manaTier * 0.58) * style.radiance * (0.8 + 0.2 * power);
  glow.base = (0.6 + manaTier * 0.38) * style.radiance * (0.8 + 0.2 * power);
  if (manaTier >= 2 && P.core) sc.addRing({ pos: origin(), r0: 0.05, r1: (0.22 + 0.06 * P.tier) * (0.75 + 0.25 * power), life: secs(sc, time.build * k) + 0.05, col: P.col, width: 0.05, spin: 6, seg: 16 });
  if (P.arcs && manaTier >= 2 && !reduced) {
    timers.push(setInterval(() => { const o = origin(); for (let i = 0; i < P.arcs; i++) sc.addBolt({ a: o, b: [o[0] + R() * 0.6, o[1] + R() * 0.5, o[2] + R() * 0.6], life: 0.07, width: 0.016, col: P.col, segs: 4 }); }, 55 / Math.max(0.01, sc.speed)));
  }
  if (manaTier >= 3 && !reduced) {
    // A three-mana spell has an additional radiant halo regardless of spell identity.
    sc.addRing({ pos: origin(), r0: 0.14, r1: 0.78, life: secs(sc, time.build * k) + 0.16,
      col: P.col, width: 0.055, seg: 22, spokes: 12, spin: 2 });
    sc.light(origin(), P.col, 3.4, secs(sc, time.build * k) + 0.16, 1.85);
  }
  sc.fx.burst(origin(), P.col, Math.round((6 + manaTier * 6) * style.burst * (reduced ? 0.5 : 1)), { speed: 0.5, up: 0.2, size: 8 + P.tier * 3, grav: 0, life: secs(sc, time.build * k) + 0.1, spread: 0.05 });
  let z0 = null;
  if (manaTier >= 3 && !reduced) { z0 = sc.zoom; sc.tween(time.build / 1000, t => { sc.zoom = z0 * (1 + 0.05 * t); }); }
  if (v.style && v.style.armored && !reduced && manaTier >= 2) { sc.shake(0.03); sc.addRing({ pos: [v.pos[0], 0.03, v.pos[2]], r0: 0.1, r1: 0.6, life: 0.3, col: P.col, width: 0.05 }); }
  await sleep(sc, time.build * k);
  let done = false;
  return () => {
    if (done) return; done = true;
    for (const t of timers) clearInterval(t);
    if (z0 != null) sc.tween(0.25, t => { sc.zoom = z0 * (1 + 0.05 * (1 - t)); }).then(() => { sc.zoom = z0; });
    if (v.castLift) sc.tween(0.2, t => { v.castLift = 0.12 * (1 - t); }).then(() => { v.castLift = 0; });
  };
}

/** Full cast: charge at the caster, then the spell's own release/impact from the casting point. Resolves at IMPACT.
 *  Never rejects: a failed animation must not stall the battle UI (gameplay was already resolved by the engine). */
export async function castSpellVisual(sc, { kind, uid, to, target = null, tiles = [], audio = null, magnitude = 3, manaCost = null }) {
  const fn = VFX[kind]; if (!fn) return;
  let cleanup = () => {};
  const power = intensityOf(magnitude), P = profileFor(kind);
  const manaTier = visualManaTier(manaCost ?? (P.tier + 1));
  try {
    const instant = sc.speed >= 50;
    if (!instant) cleanup = await charge(sc, { uid, kind, audio, power, manaTier, toward: target != null && sc.units.get(target) ? sc.units.get(target).pos : to });
    const from = castOrigin(sc, uid, kind);
    if (!instant && manaTier >= 2 && !P.self) sc.light(lerp(from, to || from, 0.3), P.col, 2.2 * (0.8 + 0.2 * power), 0.25, 1.4);   // brief directional light
    await fn(sc, { from, to: to || from, target, tiles, uid, uidFrom: uid, charged: true, power });
    if (!instant) {
      impactAmplifier(sc, P, to || from, power, manaTier);
      aftermathSigil(sc, kind, to || from, power, manaTier);
    }
  } catch (err) { if (typeof console !== 'undefined') console.warn('Spell VFX failed (gameplay unaffected):', err); }
  finally { cleanup(); }
}

/** v0.8 impact scaled by the resolved magnitude + brief lingering motes. Hard caps on particles, light and shake.
 *  Low graphics settings reduce density automatically (sc.fx.density); reduced motion removes shake. */
export function impactAmplifier(sc, P, at, power, manaTier = P.tier + 1) {
  const style = MANA_STYLE[manaTier];
  const extra = Math.round(Math.min(40, 10 * power * style.burst) * (sc.reduced ? 0.4 : 1));
  sc.fx.burst(at, P.col, extra, { speed: 1.4 + power * 0.6, up: 1 + power * 0.4, size: 8 + power * 3, life: 0.45 + power * 0.1 });
  sc.light(at, P.col, Math.min(5.5, (1.15 + power * 1.2) * style.radiance), 0.25 + power * 0.12, Math.min(3, (0.8 + power * 0.7) * style.radiance));
  if (manaTier >= 2 && power > 1.1 && !P.self) sc.addRing({ pos: [at[0], 0.03, at[2]], r0: 0.1, r1: Math.min(2.2, 0.6 + power * 0.6), life: 0.4, col: P.col, width: 0.05 + 0.03 * power });
  if (manaTier >= 3 && power > 1.3 && !sc.reduced && sc.shake) sc.shake(Math.min(MAX_SHAKE, 0.05 * power * power));
  const linger = Math.round(Math.min(18, 6 * power) * (sc.reduced ? 0.4 : 1));   // lingering, non-blocking dissipation
  for (let i = 0; i < linger; i++) sc.fx.emit({ pos: [at[0] + R() * 0.8, (at[1] || 0.3) + R() * 0.4, at[2] + R() * 0.8], vel: [R() * 0.2, 0.25 + Math.random() * 0.3, R() * 0.2], col: [...P.col, 0.8], size: 5 + Math.random() * 4, life: 0.9 + Math.random() * 0.7, drag: 0.4 });
}

/** Brief, original elemental residue at the impact site. Presentation only: no lasting floor
 *  object, no collision state, no rule changes. Reduced motion/instant modes skip it.
 *  Each spell identity has an authored silhouette, not just a recolored explosion. */
export const AFTERMATH_SIGILS = Object.freeze({
  shock: 'spark', lightningBolt: 'storm', chain: 'storm',
  fire: 'embers', fireball: 'inferno', flameSlash: 'embers', pyroclasm: 'inferno',
  growth: 'roots', titanic: 'roots', snakeskin: 'roots',
  frost: 'snowflake', drain: 'void', disfigure: 'void', poison: 'spores',
  summon: 'sunburst', heal: 'sunburst', salve: 'sunburst', shield: 'ward', wind: 'wind',
});
const RESIDUE = Object.freeze({
  spark: { spokes: 3, seg: 8, spin: 0, radius: 0.42 },
  storm: { spokes: 7, seg: 9, spin: 3, radius: 0.85 },
  embers: { spokes: 5, seg: 8, spin: 1, radius: 0.6 },
  inferno: { spokes: 12, seg: 18, spin: 2, radius: 1.12 },
  roots: { spokes: 8, seg: 8, spin: 0.5, radius: 0.86 },
  snowflake: { spokes: 6, seg: 12, spin: 0, radius: 0.85 },
  void: { spokes: 5, seg: 7, spin: -2, radius: 0.75 },
  spores: { spokes: 9, seg: 12, spin: 1, radius: 0.65 },
  sunburst: { spokes: 10, seg: 12, spin: 0.5, radius: 0.8 },
  ward: { spokes: 6, seg: 6, spin: 0, radius: 0.78 },
  wind: { spokes: 4, seg: 15, spin: 4, radius: 0.85 },
});
export function aftermathSigil(sc, kind, at, power = 1, manaTier = profileFor(kind).tier + 1) {
  if (sc.reduced || sc.speed >= 50 || !sc.addRing) return;
  const shape = RESIDUE[AFTERMATH_SIGILS[kind]];
  if (!shape || !at || !Number.isFinite(at[0]) || !Number.isFinite(at[2])) return;
  const col = profileFor(kind).col;
  const radius = Math.min(1.8, shape.radius * (0.78 + 0.22 * power) * MANA_STYLE[manaTier].radiance);
  sc.addRing({ pos: [at[0], 0.045, at[2]], r0: radius * 0.55, r1: radius,
    life: Math.min(0.7, 0.43 + manaTier * 0.09), col, width: 0.02 + manaTier * 0.008,
    spokes: manaTier === 1 ? 0 : shape.spokes, seg: manaTier === 1 ? 8 : shape.seg, spin: manaTier === 1 ? 0 : shape.spin });
  // Three-mana spells get an extra concentric echo; one-mana spells stay restrained.
  if (manaTier >= 3) sc.addRing({ pos: [at[0], 0.05, at[2]], r0: 0.08, r1: radius * 0.6,
    life: 0.48, col, width: 0.025, spokes: shape.spokes, seg: shape.seg });
}

/** UI safety net: resolve no later than `ms` even if an effect hangs (e.g. a throttled background tab). */
export function withTimeout(p, ms) { let t; return Promise.race([p, new Promise(r => { t = setTimeout(r, Math.max(50, ms)); })]).finally(() => clearTimeout(t)); }
