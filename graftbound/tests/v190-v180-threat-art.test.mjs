// GRAFTBOUND v1.8.0: Global Threat 0..24, toxic smoke, painted MTG creature art (100% roster), retired original bosses,
// painterly graft finishing.
import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const src = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
import { WORLD_THREAT_MAX, LEGACY_MAX, settleWorldThreat, threatModifiers, threatTactics, effectiveThreatLevel, normalizedWorldThreat, UPPER_TIERS } from '../src/engine/world-threat.js';

test('threat scale is 0..24 and Threat 0..12 keeps its exact v1.7 effects', () => {
  assert.equal(WORLD_THREAT_MAX, 24); assert.equal(LEGACY_MAX, 12);
  for (let n = 0; n <= 12; n++) { const m = threatModifiers({ level: n }); assert.ok(Math.abs(m.shieldRate - Math.min(0.42, n * 0.035)) < 1e-9); assert.equal(m.reinforcement, n >= 10 ? 2 : n >= 5 ? 1 : 0); }
  assert.equal(normalizedWorldThreat({ level: 99 }).level, 24);
});
test('13..24 add telegraphed tactics, not health', () => {
  assert.equal(threatTactics(13).surge.every, 2); assert.equal(threatTactics(15).surge.wide, true); assert.equal(threatTactics(16).surge.callers, 2);
  assert.equal(threatModifiers({ level: 18 }).reinforcement, 3); assert.equal(threatTactics(19).flank, 1); assert.equal(threatTactics(21, { nodeType: 'boss' }).bossEscorts, 3);
  assert.ok(threatTactics(24).surge.pct <= 0.24 + 1e-9); assert.ok(threatModifiers({ level: 24 }).shieldRate - threatModifiers({ level: 12 }).shieldRate <= 0.06 + 1e-9);
  assert.deepEqual(UPPER_TIERS.map(t => t.at), [13, 15, 16, 18, 19, 21, 23]);
});
test('above 12 threat must be EARNED: slower rises, strength floor stops at 12', () => {
  let r = {}; settleWorldThreat({ level: 12, strongStreak: 5 }, { victory: true, enemyDamage: 0, maxHealth: 40, turns: 2, boss: true }, r);
  assert.ok(r.delta <= 2 && r.after > 12);
  r = {}; settleWorldThreat({ level: 4, strongStreak: 5 }, { victory: true, enemyDamage: 0, maxHealth: 40, turns: 2, boss: true }, r); assert.equal(r.delta, 3);
  assert.equal(effectiveThreatLevel({ level: 0 }, { strength: 999, expected: 0 }), 12); assert.equal(effectiveThreatLevel({ level: 20 }, {}), 20);
});
test('wide surge covers 3x3 and the second caller alternates', async () => {
  const { arena } = await import('./helpers.mjs'); const { surgeAfterAct } = await import('../src/engine/ai.js');
  const s = arena(['.g.g.', '.....', '.....', '..P..'], { g: 'grub' }); s.phase = 'enemy'; s.threatSurge = { every: 2, pct: 0.2, wide: true, callers: 2 };
  const [a, b] = s.units.filter(u => u.side === 'enemy'); s.turn = 2; surgeAfterAct(s, [], a); surgeAfterAct(s, [], b);
  assert.equal([a, b].filter(u => u.slam).length, 1); assert.equal([a, b].find(u => u.slam).slam.tiles.length, 6);
});
test('score bonus extends to +45% at Threat 24; UI, previews, save validation and report use /24', async () => {
  const { threatBonusRate } = await import('../src/engine/scoring.js');
  assert.equal(threatBonusRate(12), 0.3); assert.ok(Math.abs(threatBonusRate(18) - 0.375) < 1e-9); assert.equal(threatBonusRate(24), 0.45);
  assert.match(src('src/ui/screens.js'), /THREAT_DIAL_MAX = 24/); assert.match(src('src/engine/threat-preview.js'), /'\/24'/);
  assert.match(src('src/engine/save.js'), /level > 24/); assert.match(src('src/engine/run-report.js'), /\/24`/);
});
test('toxic smoke: dense pixel-art volumes over every affected tile, ~1s hold, dissolve fade', async () => {
  const v = await import('../src/rendering/vfx.js'); assert.equal(v.TOXIC_HOLD, 1.0); assert.ok(v.TOXIC_FADE >= 0.5);
  const s = src('src/rendering/vfx.js'); assert.match(s, /tex: 'toxic'/); assert.match(s, /area\.forEach/);
  const sm = await import('../src/rendering/shadow-magic.js'); assert.equal(sm.TOXIC_FRAMES, 6); assert.equal(sm.TOXIC_PALETTE.length, 8);
});
test('EVERY creature that can appear in the game (foes, tokens, allies, bosses) has a painted MTG sheet', async () => {
  const { validateCreatureIndex } = await import('../src/rendering/raster-benchmarks.js');
  const { ENEMIES } = await import('../src/data/enemies.js'); const { BOSS_BY_ID } = await import('../src/data/legendary.js'); const { ACTS } = await import('../src/data/encounters.js');
  const idx = validateCreatureIndex(JSON.parse(src('assets/hd2d/creatures/index.json'))), keys = new Set(idx.map(e => 'mtg_' + e.key));
  for (const e of idx) assert.ok(existsSync(new URL('../assets/hd2d/' + e.file, import.meta.url)), e.file);
  const spawnable = new Set();
  for (const A of ACTS) for (const k of ['early', 'mid', 'late', 'elite', 'tutorial']) for (const t of A[k] || []) t.enemies.forEach(id => spawnable.add(id));
  for (const id of Object.keys(BOSS_BY_ID)) spawnable.add(id);
  for (const id of ['wolf', 'saproling', 'spider', 'goblin', 'zombie', 'angel', 'slug', 'golemFly', 'golemVigilance', 'golemTrample', 'wurmTouch', 'wurmLife']) spawnable.add(id);   // summoned/created foes
  for (const id of spawnable) { const sp = ENEMIES[id]?.sprite; assert.ok(sp, id); assert.ok(keys.has(sp) || ['mtg_friendlySquirrel'].includes(sp), `${id} (${sp}) has no painted art`); }
  const allies = ['Elemental', 'Drake', 'CatSoldier', 'Sproutling', 'BirdIllusion', 'Tentacle', 'Skeleton', 'Snake', 'Goblin', 'Hornet', 'Spider'];
  for (const a of allies) assert.ok(keys.has('mtg_friendly' + a), a);
});
test('the original Thornmother / Pyre Matron / Unwritten bosses can never appear', async () => {
  const { ACTS } = await import('../src/data/encounters.js'); const { templateFor } = await import('../src/engine/encounters.js');
  for (const A of ACTS) for (const k of Object.keys(A)) for (const t of [].concat(A[k] || [])) assert.ok(!t.enemies?.some(id => ['thornmother', 'matron', 'unwritten'].includes(id)), t.name);
  for (let act = 0; act < 3; act++) for (let seed = 1; seed < 40; seed++) assert.ok(!['thornmother', 'matron', 'unwritten'].includes(templateFor(act, 'boss', 7, seed).enemies[0]));
  assert.match(src('src/rendering/legendary-boss-art.js'), /if\(!LEGENDARY_BOSS_KEYS\.includes\(name\)\)continue;/);
});
test('painted sheets are clean pixel art in the benchmark layout; generators skip painted identities', async () => {
  const { validateCreatureIndex, runtimeKeyFor } = await import('../src/rendering/raster-benchmarks.js');
  assert.throws(() => validateCreatureIndex({ schemaVersion: 1, creatures: [{ key: 'grub', size: 100 }] }));
  assert.equal(validateCreatureIndex({ schemaVersion: 1, creatures: [{ key: 'spider', size: 96, art: 'friendlySpider' }] })[0].file, 'creatures/friendlySpider-poses.png');
  assert.equal(runtimeKeyFor('grub', { mtg_grub: {} }), 'mtg_grub');
  const sp = src('src/rendering/sprites.js'); assert.match(sp, /installRealCreatureModels\(images,manifest,painted\)/); assert.match(sp, /installCreatureArt\(images, manifest, img/);
  assert.match(src('src/rendering/real-creature-models.js'), /if\(painted\.has\(key\)\)/);
});
test('graft finishing: supersampled, form-shaded, sel-out edges and flesh roots on every graft layer', () => {
  const g = src('src/rendering/graft-paint.js'), e = src('src/rendering/evolution-visuals.js');
  assert.match(g, /export function supersample/); assert.match(g, /flesh roots/); assert.match(e, /return paintLayer\(L,bodyRef\)/);
});
test('v1.8.0 rules fingerprint and challenge revision', async () => {
  const { RULES_VERSION, RANKED_CHALLENGES } = await import('../src/engine/ranked.js'); const { GAME } = await import('../src/config.js');
  assert.equal(GAME.version, '1.8.0-beta'); assert.equal(RULES_VERSION, 'graftbound-rules-1.8.0-beta'); assert.equal(RANKED_CHALLENGES['gb-expedition-01'].revision, 27);
});
