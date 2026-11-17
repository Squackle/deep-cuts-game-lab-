// v1.5.0 visual/UI overhaul: creature quality standard, graft composition, camera orbit, HUD, depth and shadow fixes.
import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
import { REAL_CREATURE_MODELS } from '../src/rendering/real-creature-models.js';
import { FOLK_STUDY_FEATURES, folkRigPose, FOLK_FRAME } from '../src/rendering/detailed-folk-art.js';
import { HUMANOID_STUDY_FEATURES } from '../src/rendering/detailed-humanoid-art.js';
import { SPECIES_STUDY_FEATURES } from '../src/rendering/detailed-species-art.js';
import { BEAST_STUDY_FEATURES } from '../src/rendering/detailed-beast-art.js';
import { TOKEN_STUDY_FEATURES } from '../src/rendering/detailed-token-art.js';
import { MAGIC_STUDY_FEATURES } from '../src/rendering/detailed-magic-art.js';
import { MONSTER_STUDY_FEATURES } from '../src/rendering/detailed-monster-art.js';
import { CREATURE_MOTION_FAMILIES } from '../src/rendering/creature-motion.js';
import { surfaceStrength, SURFACE_STYLE } from '../src/rendering/evolution-visuals.js';
import { PITCH_MIN, PITCH_MAX, FOLIAGE_PUSH } from '../src/rendering/scene.js';

const DETAILED = new Set([...FOLK_STUDY_FEATURES, ...HUMANOID_STUDY_FEATURES, ...SPECIES_STUDY_FEATURES, ...BEAST_STUDY_FEATURES, ...TOKEN_STUDY_FEATURES, ...MAGIC_STUDY_FEATURES, ...MONSTER_STUDY_FEATURES]);
// Legendary bosses are replaced by legendary-boss-art.js; the Soldier and Nemata have their own premium/boss rigs.
const OWN_RIG = new Set(['friendlySoldier', 'nemata', 'arasta', 'drakuseth', 'krenko', 'scarab']);
test('every real-creature identity now uses a native 96px detailed study (no blown-up 28-68px placeholders)', () => {
  for (const [name, c] of Object.entries(REAL_CREATURE_MODELS)) if (!OWN_RIG.has(name)) assert.ok(DETAILED.has(c.feature), `${name} (${c.feature}) still uses a low-resolution placeholder rig`);
  assert.equal(FOLK_FRAME, 96);
  for (const f of FOLK_STUDY_FEATURES) assert.ok(CREATURE_MOTION_FAMILIES[f], f + ' has a motion family');
});
test('folk rig poses are deterministic for every state, frame and both views', () => {
  for (const f of FOLK_STUDY_FEATURES) for (let st = 0; st <= 5; st++) for (let fr = 0; fr < 4; fr++) for (const v of [0, 1]) {
    const a = folkRigPose(f, st, fr, v), b = folkRigPose(f, st, fr, v); assert.deepEqual(a, b);
    for (const k of ['head', 'hip', 'leftHand', 'rightHand', 'leftFoot', 'rightFoot']) assert.ok(a[k].every(Number.isFinite), `${f} ${k}`);
  }
});
test('graft surface re-skin: the Blank stays plain; strength grows with grafts and is bounded', () => {
  assert.equal(surfaceStrength(0), 0);
  let prev = 0; for (let n = 1; n <= 12; n++) { const k = surfaceStrength(n); assert.ok(k >= prev && k <= 0.78); prev = k; }
  assert.deepEqual(Object.keys(SURFACE_STYLE).sort(), ['bark', 'chitin', 'fur', 'scales']);
  const ev = src('src/rendering/evolution-visuals.js');
  assert.match(ev, /rg\.globalCompositeOperation = 'source-in'; rg\.drawImage\(mask/, 'surface pattern is clipped to the skin mask, never clothing/equipment');
  assert.match(ev, /app\.anatomy\?\.stage\]\)/, 'sheet cache is keyed on graft count');
});
test('graft anatomy is silhouette-scale and stays inside its frame', () => {
  const art = src('src/rendering/native-blank-art.js');
  assert.match(art, /span=Math\.min\(22\+tier\*7/); assert.match(art, /function graftSeams/);
  assert.doesNotMatch(art, /\n  if\(hasEvolution\)surface\(g,A,m\);/);
});
test('middle-mouse orbit: yaw + clamped pitch, never selects tiles', async () => {
  assert.ok(PITCH_MIN > 0.3 && PITCH_MAX < 1.2 && PITCH_MIN < PITCH_MAX);
  const { Scene } = await import('../src/rendering/scene.js');
  const cam = { yawTarget: 0, pitchTarget: 0.66 }; Scene.prototype.orbit.call(cam, 100, 0); assert.ok(cam.yawTarget < 0);
  Scene.prototype.orbit.call(cam, 0, 100000); assert.equal(cam.pitchTarget, PITCH_MAX);
  Scene.prototype.orbit.call(cam, 0, -100000); assert.equal(cam.pitchTarget, PITCH_MIN);
  const ui = src('src/ui/battle-ui.js');
  assert.match(ui, /e\.button === 1 && e\.pointerType === 'mouse'/); assert.match(ui, /orbit = null; cv\.classList\.remove\('orbiting'\)/);
});
test('props sharing a tile with a creature are pushed behind it; sprite shadow sampled once per sprite', () => {
  assert.ok(FOLIAGE_PUSH > 0.2 && FOLIAGE_PUSH < 0.5);
  const gl = src('src/rendering/gl.js'); assert.match(gl, /flat out vec3 vAnchor/); assert.match(gl, /shadowAt\(vAnchor/);
});
test('post-battle input is quiet: no error toast once the battle is ending; victory banner plays once', () => {
  const ui = src('src/ui/battle-ui.js');
  assert.match(ui, /if \(this\.inputClosed\(\)\) \{ console\.debug/); assert.match(ui, /if \(this\.victoryPlayed\) break; this\.victoryPlayed = true;/);
  assert.match(ui, /checkEnd\(\) \{ if \(!this\.s\) return; if \(this\.s\.phase === 'won' \|\| this\.s\.phase === 'lost'\) \{ this\.ending = true;/);
});
test('threat dial: never auto-dismisses, Continue + keyboard, clockwise/counter-clockwise needle, reduced motion', async () => {
  const s = src('src/ui/screens.js');
  assert.match(s, /data-threat-continue>Continue<\/button>/); assert.doesNotMatch(s.slice(s.indexOf('export function threatDialScreen')), /setTimeout\(\(\) => \{? ?(go|res)\(/);
  assert.match(s, /prefers-reduced-motion: reduce/); const { threatAngle } = await import('../src/ui/screens.js').catch(() => ({}));
  if (threatAngle) { assert.ok(threatAngle(6) > threatAngle(4)); assert.equal(threatAngle(99), threatAngle(24)); }
  const m = src('src/main.js'); assert.ok(m.indexOf('threatDialScreen') < m.indexOf('encounterResultScreen'), 'dial before the level statistics');
});
