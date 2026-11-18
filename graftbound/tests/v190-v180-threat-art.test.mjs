// GRAFTBOUND v1.8.0: Global Threat 0..24, toxic smoke, painted creature-art loader, painterly graft finishing.
import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
import { WORLD_THREAT_MAX, LEGACY_MAX, settleWorldThreat, threatModifiers, threatTactics, effectiveThreatLevel, normalizedWorldThreat, UPPER_TIERS } from '../src/engine/world-threat.js';

test('threat scale is 0..24 and Threat 0..12 keeps its exact v1.7 effects', () => {
  assert.equal(WORLD_THREAT_MAX, 24); assert.equal(LEGACY_MAX, 12);
  const v17 = n => ({ shield: Math.min(0.42, n * 0.035), reinf: n >= 10 ? 2 : n >= 5 ? 1 : 0 });
  for (let n = 0; n <= 12; n++) { const m = threatModifiers({ level: n }); assert.ok(Math.abs(m.shieldRate - v17(n).shield) < 1e-9, 'shield ' + n); assert.equal(m.reinforcement, v17(n).reinf); }
  assert.equal(threatTactics(12, { nodeType: 'boss' }).bossEscorts, 2); assert.equal(threatTactics(12).surge.every, 2);
  assert.equal(normalizedWorldThreat({ level: 99 }).level, 24);
});
test('13..24 add telegraphed tactics, not health: wide surges, second caller, +1 reinforcement, pack tactics, 3 escorts, capped surge damage', () => {
  assert.equal(threatTactics(13).surge.every, 2); assert.equal(threatTactics(14).surge.wide, false); assert.equal(threatTactics(15).surge.wide, true);
  assert.equal(threatTactics(16).surge.callers, 2); assert.equal(threatModifiers({ level: 18 }).reinforcement, 3); assert.equal(threatTactics(19).flank, 1);
  assert.equal(threatTactics(21, { nodeType: 'boss' }).bossEscorts, 3); assert.ok(threatTactics(24).surge.pct <= 0.24 + 1e-9);
  assert.ok(threatModifiers({ level: 24 }).shieldRate - threatModifiers({ level: 12 }).shieldRate <= 0.06 + 1e-9, 'wards barely grow above 12');
  assert.deepEqual(UPPER_TIERS.map(t => t.at), [13, 15, 16, 18, 19, 21, 23]);
});
test('above 12 threat must be EARNED: slower rises, strength floor stops at 12', () => {
  let r = {}; settleWorldThreat({ level: 12, strongStreak: 5 }, { victory: true, enemyDamage: 0, maxHealth: 40, turns: 2, boss: true }, r);
  assert.ok(r.delta <= 2, 'max +2 per battle above 12'); assert.ok(r.after > 12, 'dominance still climbs past 12');
  r = {}; settleWorldThreat({ level: 4, strongStreak: 5 }, { victory: true, enemyDamage: 0, maxHealth: 40, turns: 2, boss: true }, r); assert.equal(r.delta, 3, 'legacy band unchanged');
  assert.equal(effectiveThreatLevel({ level: 0 }, { strength: 999, expected: 0 }), 12);
  assert.equal(effectiveThreatLevel({ level: 20 }, { strength: 0, expected: 0 }), 20);
});
test('second caller alternates, wide surge covers 3x3, pack tactics adds +1 only with a second foe adjacent', async () => {
  const { arena } = await import('./helpers.mjs'); const { surgeAfterAct } = await import('../src/engine/ai.js'); const { strikePower } = await import('../src/engine/abilities.js');
  const s = arena(['.g.g.', '.....', '.....', '..P..'], { g: 'grub' }); s.phase = 'enemy'; s.threatSurge = { every: 2, pct: 0.2, wide: true, callers: 2 };
  const [a, b] = s.units.filter(u => u.side === 'enemy'); s.turn = 2; surgeAfterAct(s, [], a); surgeAfterAct(s, [], b);
  const caller = [a, b].find(u => u.slam); assert.ok(caller && [a, b].filter(u => u.slam).length === 1); assert.equal(caller.slam.tiles.length, 6, '3x3 clipped to the board edge');
  const t = arena(['g..', 'gP.', '...'], { g: 'grub' }); const [f1, f2] = t.units.filter(u => u.side === 'enemy'), hero = t.units.find(u => u.hero);
  const base = strikePower(t, f1, hero); t.threatFlank = 1; assert.equal(strikePower(t, f1, hero), base + (f1.y === hero.y ? 0 : 0) + (Math.abs(f2.x - hero.x) + Math.abs(f2.y - hero.y) === 1 ? 1 : 0));
});
test('score bonus extends to +45% at Threat 24; UI, previews, save validation and report use /24', async () => {
  const { threatBonusRate } = await import('../src/engine/scoring.js');
  assert.equal(threatBonusRate(12), 0.3); assert.ok(Math.abs(threatBonusRate(18) - 0.375) < 1e-9); assert.equal(threatBonusRate(24), 0.45);
  assert.match(src('src/ui/screens.js'), /THREAT_DIAL_MAX = 24/); assert.match(src('src/engine/threat-preview.js'), /'\/24'/);
  assert.match(src('src/engine/save.js'), /level > 24/); assert.match(src('src/engine/run-report.js'), /\/24`/);
});
test('toxic smoke: dense pixel-art volumes over every affected tile, ~1s hold, dissolve fade, reduced-motion friendly', async () => {
  const v = await import('../src/rendering/vfx.js'); assert.equal(v.TOXIC_HOLD, 1.0); assert.ok(v.TOXIC_FADE >= 0.5);
  const s = src('src/rendering/vfx.js'); assert.match(s, /tex: 'toxic'/); assert.match(s, /area\.forEach/); assert.match(s, /sc\.reduced \? 2 : 4/);
  const sm = await import('../src/rendering/shadow-magic.js'); assert.equal(sm.TOXIC_FRAMES, 6); assert.equal(sm.TOXIC_PALETTE.length, 8);
  assert.doesNotMatch(src('src/rendering/shadow-magic.js').slice(src('src/rendering/shadow-magic.js').indexOf('makeToxicAtlas')), /Math\.random/);
});
test('painted creature art replaces generated models; strict index validation; sheets face left', async () => {
  const { validateCreatureIndex, runtimeKeyFor, CREATURE_SIZES } = await import('../src/rendering/raster-benchmarks.js');
  assert.deepEqual(CREATURE_SIZES, [96, 128, 192]);
  assert.deepEqual(validateCreatureIndex({ schemaVersion: 1, creatures: [{ key: 'grub', size: 96 }] })[0], { key: 'grub', size: 96, pivot: 91, file: 'creatures/grub-poses.png' });
  assert.throws(() => validateCreatureIndex({ schemaVersion: 1, creatures: [{ key: 'grub', size: 100 }] })); assert.throws(() => validateCreatureIndex({ schemaVersion: 1, creatures: [{ key: 'a', size: 96 }, { key: 'a', size: 96 }] }));
  assert.equal(runtimeKeyFor('grub', { mtg_grub: {} }), 'mtg_grub'); assert.equal(runtimeKeyFor('thornmother', { thornmother: {} }), 'thornmother'); assert.equal(runtimeKeyFor('nope', {}), null);
  assert.deepEqual(JSON.parse(src('assets/hd2d/creatures/index.json')).schemaVersion, 1);
  assert.match(src('src/rendering/sprites.js'), /installCreatureArt\(images, manifest, img, \(\) => json\('hd2d\/creatures\/index\.json'\)\)/);
  assert.match(src('src/rendering/scene.js'), /man\.sprites\[v\.key\]\?\.facesRight \?\? FACES_RIGHT\.has\(v\.key\)/);
});
test('graft finishing: supersampled, form-shaded, sel-out edges and flesh roots on every graft layer', () => {
  const g = src('src/rendering/graft-paint.js'), e = src('src/rendering/evolution-visuals.js');
  assert.match(g, /export function supersample/); assert.match(g, /export function paintLayer/); assert.match(g, /flesh roots/); assert.match(g, /sel-out/);
  assert.match(e, /return paintLayer\(L,bodyRef\)/); assert.match(e, /layerOf\('front','conform'\)/);
});
test('v1.8.0 rules fingerprint and challenge revision', async () => {
  const { RULES_VERSION, RANKED_CHALLENGES } = await import('../src/engine/ranked.js'); const { GAME } = await import('../src/config.js');
  assert.equal(GAME.version, '1.8.2-beta'); assert.equal(RULES_VERSION, 'graftbound-rules-1.8.2-beta'); assert.equal(RANKED_CHALLENGES['gb-expedition-01'].revision, 29);
});
