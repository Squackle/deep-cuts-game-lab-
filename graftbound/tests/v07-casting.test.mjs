// v0.7 spellcasting: every one of the 13 curated spells gathers AT the caster, releases FROM the caster's current
// casting point, reaches its target, and resolves at impact. Uses a recording Scene stub (no GPU needed).
import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import { castSpellVisual, castOrigin, charge, CAST_PROFILE, profileFor, withTimeout } from '../src/rendering/casting.js';
import { SPELL_VFX } from '../src/rendering/vfx.js';
import { rewardCards } from '../src/cards/catalog.js';

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function stub({ speed = 25, reduced = false, caster = {} } = {}) {
  const log = [];
  const units = new Map([[1, { uid: 1, pos: [0, 0, 2], dir: [0, -1], lunge: [0, 0, 0], hover: 0, fh: 48, scale: 1, flash: 0, ...caster }], [2, { uid: 2, pos: [0, 0, -2], dir: [0, 1], lunge: [0, 0, 0], hover: 0, fh: 32, scale: 1, flash: 0 }]]);
  const sc = { speed, reduced, time: 0, zoom: 1, units, log,
    heightOf: v => v.fh / 19 * 1.27 * v.scale * 0.62,
    centerPos: uid => { const v = units.get(uid); return [v.pos[0], v.pos[1] + v.hover + (v.castLift || 0) + sc.heightOf(v) * 0.45, v.pos[2]]; },
    face: (v, to) => log.push({ t: 'face', to }), play: (uid, a) => log.push({ t: 'anim', uid, a }),
    light: (pos, col, radius, life, intensity) => { const l = { pos: pos.slice(), col, radius, life, intensity }; log.push({ t: 'light', pos: pos.slice(), l }); return l; },
    addBolt: o => log.push({ t: 'bolt', a: o.a.slice(), b: o.b.slice() }), addRing: o => log.push({ t: 'ring', pos: o.pos.slice() }),
    shake: a => log.push({ t: 'shake', a }), screenFlash: () => log.push({ t: 'flash' }),
    hit: (uid) => log.push({ t: 'hit', uid, at: Date.now() }),
    tween: (dur, fn) => new Promise(r => { if (speed >= 50) { fn(1); return r(); } setTimeout(() => { fn(1); r(); }, dur * 1000 / speed); }),
    projectile: (from, to) => { log.push({ t: 'proj', from: from.slice(), to: to.slice() }); return new Promise(r => setTimeout(r, 5)); },
    fx: { emit: o => log.push({ t: 'emit', pos: o.pos.slice(), target: !!o.target }), burst: p => log.push({ t: 'burst', pos: p.slice() }), swirl: p => log.push({ t: 'swirl', pos: p.slice() }) },
  };
  return sc;
}
const SPELLS = Object.entries(SPELL_VFX);
const SELF = new Set(['growth', 'heal', 'salve', 'shield', 'titanic', 'pyroclasm']);

test('every curated spell (13 + 3 added in v0.8) has a cast profile with a casting point and an audio cue', () => {
  assert.equal(SPELLS.length, 17);
  for (const [name, kind] of SPELLS) { const P = CAST_PROFILE[kind]; assert.ok(P, name); assert.ok(P.cue && P.origin && P.gather > 0 && P.build > 0, name); }
  assert.equal(rewardCards().filter(c => c.kind === 'spell').every(c => CAST_PROFILE[c.vfx]), true);
});

test('power sets the buildup: quick spells stay quick, the powerful tier (Bolt, Fireball, Titanic Growth, Pyroclasm) builds longest', () => {
  const t = k => profileFor(k).gather + profileFor(k).build;
  assert.ok(t('shock') <= 160 && t('salve') <= 180, t('shock') + ' ' + t('salve'));
  const big = SPELLS.map(([, k]) => k).filter(k => profileFor(k).tier === 2); assert.deepEqual(big.sort(), ['fireball', 'lightningBolt', 'pyroclasm', 'titanic']);
  for (const k of big) for (const [, o] of SPELLS) if (!big.includes(o)) assert.ok(t(k) > t(o), k + ' > ' + o);
});

for (const [name, kind] of SPELLS) test(`${name}: gathers at the caster, releases from the casting point, impact before resolve`, async () => {
  const sc = stub(); const origin = castOrigin(sc, 1, kind); const to = sc.centerPos(2);
  await castSpellVisual(sc, { kind, uid: 1, to, target: SELF.has(kind) ? null : 2, tiles: [to] });
  const L = sc.log;
  assert.equal(L[0].t, 'face', 'caster turns toward the target first'); assert.ok(L.some(x => x.t === 'anim' && x.a === 'cast'), 'casting animation plays');
  const gathered = L.filter(x => x.t === 'emit' && x.target); assert.ok(gathered.length >= 5, 'stage 1 motes converge on the caster');
  const glow = L.find(x => x.t === 'light'); assert.ok(dist(glow.pos, origin) < 0.01, 'caster glow at the casting point'); assert.equal(typeof glow.l.follow, 'function', 'glow follows the body');
  const firstRelease = L.find(x => (x.t === 'proj') || (x.t === 'bolt' && dist(x.a, origin) < 0.01 && dist(x.b, to) < 0.01));
  if (!SELF.has(kind)) {
    assert.ok(firstRelease, name + ' releases toward the target');
    const from = firstRelease.t === 'proj' ? firstRelease.from : firstRelease.a;
    assert.ok(dist(from, origin) < 0.01, `${name} release starts at the casting point (got ${from.map(n => n.toFixed(2))} vs ${origin.map(n => n.toFixed(2))})`);
    assert.ok(!L.some(x => x.t === 'proj' && x.from[1] > 3), 'nothing falls from the sky');
  } else {
    assert.ok(!L.some(x => x.t === 'proj'), name + ' (self) does not fire a projectile');
  }
  if (['shock', 'lightningBolt', 'flameSlash', 'chain', 'drain', 'frost'].includes(kind)) assert.ok(L.some(x => x.t === 'hit' && x.uid === 2), name + ' impact hits the target before the promise resolves');
});

test('evolution: fliers rise while casting; horned/crowned creatures channel through the head; the origin tracks the live sprite', async () => {
  const base = stub(), fly = stub({ caster: { hover: 0.28, style: { flying: true } } }), horned = stub({ caster: { castAt: 'head' } }), big = stub({ caster: { scale: 1.7 } });
  const o = s => castOrigin(s, 1, 'fireball');
  assert.ok(o(fly)[1] > o(base)[1] + 0.2, 'hovering caster casts from higher up'); assert.ok(o(horned)[1] > o(base)[1], 'head channel'); assert.ok(o(big)[1] > o(base)[1], 'larger body, higher origin');
  assert.ok(castOrigin(horned, 1, 'shock')[1] < o(horned)[1], 'hand spells still use the hands');
  const v = fly.units.get(1); const cleanup = await charge(fly, { uid: 1, kind: 'lightningBolt' }); assert.ok(v.castLift > 0, 'flier lifts during the charge');
  cleanup(); await new Promise(r => setTimeout(r, 40)); assert.equal(v.castLift, 0, 'and settles back');
  const before = castOrigin(fly, 1, 'shock'); v.pos[0] += 1; assert.ok(Math.abs(castOrigin(fly, 1, 'shock')[0] - before[0] - 1) < 1e-9, 'origin follows movement');
});

test('instant animations skip the charge entirely but still land the impact; reduced motion removes shake and camera moves', async () => {
  const fast = stub({ speed: 100 }); const t0 = Date.now(); await castSpellVisual(fast, { kind: 'lightningBolt', uid: 1, to: fast.centerPos(2), target: 2 });
  assert.ok(Date.now() - t0 < 60); assert.ok(!fast.log.some(x => x.t === 'emit' && x.target), 'no gather stage'); assert.ok(fast.log.some(x => x.t === 'hit'));
  const red = stub({ reduced: true }); await castSpellVisual(red, { kind: 'lightningBolt', uid: 1, to: red.centerPos(2), target: 2 });
  assert.ok(!red.log.some(x => x.t === 'shake'), 'no shake'); assert.equal(red.zoom, 1, 'no camera push');
  const full = stub(); await castSpellVisual(full, { kind: 'lightningBolt', uid: 1, to: full.centerPos(2), target: 2 }); assert.ok(full.log.some(x => x.t === 'shake'));
  assert.ok(red.log.filter(x => x.t === 'emit').length < full.log.filter(x => x.t === 'emit').length, 'fewer particles');
});

test('no lingering effects: charge arcs stop after release; camera zoom returns; a throwing effect never stalls the UI', async () => {
  const sc = stub(); await castSpellVisual(sc, { kind: 'lightningBolt', uid: 1, to: sc.centerPos(2), target: 2 });
  await new Promise(r => setTimeout(r, 60)); const n = sc.log.filter(x => x.t === 'bolt').length; await new Promise(r => setTimeout(r, 120));
  assert.equal(sc.log.filter(x => x.t === 'bolt').length, n, 'no new arcs after the cast'); assert.ok(Math.abs(sc.zoom - 1) < 1e-9, 'zoom restored');
  const bad = stub(); bad.projectile = () => { throw new Error('boom'); }; await castSpellVisual(bad, { kind: 'fireball', uid: 1, to: bad.centerPos(2) });   // resolves, does not reject
  assert.equal(await withTimeout(new Promise(() => {}), 60), undefined, 'hung promise is released by the UI timeout');
});

test('rules independence: the casting pipeline imports no engine/rules modules, and battle playback awaits it before damage', () => {
  const src = readFileSync(new URL('../src/rendering/casting.js', import.meta.url), 'utf8');
  assert.ok(!/engine\/|data\/|cards\//.test(src.split('\n').filter(l => l.startsWith('import')).join('\n')));
  const ui = readFileSync(new URL('../src/ui/battle-ui.js', import.meta.url), 'utf8');
  assert.match(ui, /await withTimeout\(castSpellVisual\(/); assert.match(ui, /case 'spell': await this\.playSpell\(e\); break;/);
});
