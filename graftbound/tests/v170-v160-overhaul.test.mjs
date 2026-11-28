// GRAFTBOUND v1.6.0 regression coverage: graft levels, Cinematic default, idle clock, stances, exile portal, discard,
// threat explanation + adaptive tactics, run report, skin patterns, anatomy composition, umbral VFX, special tiles.
import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
import { installReferenceSet } from '../src/cards/reference-set.js'; installReferenceSet();
import { GRAFT_LEVELS, traitLevelsOf, traitParams, duplicatePreview, clampLevel, GRAFT_LEVEL_CAP } from '../src/cards/graft-levels.js';
import { GRAFT_TRAITS } from '../src/cards/trait-registry.js';
import { newEvolution, absorb } from '../src/engine/evolution.js';
import { createBattle, endTurn, player } from '../src/engine/combat.js';
import { deriveStats } from '../src/engine/evolution.js';
import { arena } from './helpers.mjs';
const evoOf = ids => ids.reduce((e, id) => absorb(e, 'mtg:' + id).evo, newEvolution());

// ── 8. graft levels ────────────────────────────────────────────────────────────────────────────────────────
test('every reviewed graft trait has a central level definition, capped at 3, scaling only what the card does', () => {
  for (const t of Object.values(GRAFT_TRAITS)) { const d = GRAFT_LEVELS[t.id]; assert.ok(d, t.id); assert.ok(d.max >= 1 && d.max <= GRAFT_LEVEL_CAP); assert.equal(d.levels.length, d.max); }
  assert.deepEqual(traitParams('ophiomancer', 1).token, [1, 1]); assert.deepEqual(traitParams('ophiomancer', 2).token, [2, 2]);
  assert.deepEqual(traitParams('ophiomancer', 99), traitParams('ophiomancer', 3), 'never scales past its cap');
  assert.equal(clampLevel('archmage', 5), 1, 'single-switch traits stay level 1');
});
test('duplicate grafts level ONE trait (no stacked triggers) and keep printed P/T absorption', () => {
  const one = evoOf(['ophiomancer']), two = evoOf(['ophiomancer', 'ophiomancer']);
  assert.deepEqual(traitLevelsOf(two.absorbed), { ophiomancer: 2 });
  assert.equal(two.power - one.power, one.power - 1, 'printed power still added for the duplicate');
  const s = createBattle({ evo: two, stats: deriveStats(two), spellbook: [], encounter: { name: 't', w: 5, h: 4, terrain: new Array(20).fill(0), playerStart: { x: 2, y: 3 }, enemies: [{ defId: 'grub', x: 2, y: 0 }] }, seed: 3 });
  assert.equal(s.traits.filter(t => t === 'ophiomancer').length, 1); assert.equal(s.traitLevels.ophiomancer, 2);
  endTurn(s);
  const snakes = s.units.filter(u => u.side === 'player' && !u.hero && (u.types || []).includes('Snake'));
  assert.equal(snakes.length, 1, 'still one Snake (no duplicate trigger)'); assert.deepEqual([snakes[0].power, snakes[0].toughness], [2, 2]);
});
test('multiple duplicate grafts level independently; previews explain the upgrade and the cap', () => {
  const evo = evoOf(['ophiomancer', 'blood-artist', 'ophiomancer', 'blood-artist', 'blood-artist', 'blood-artist']);
  assert.deepEqual(traitLevelsOf(evo.absorbed), { ophiomancer: 2, bloodArtist: 3 });
  const p = duplicatePreview(evoOf(['ophiomancer']).absorbed, 'mtg:ophiomancer'); assert.deepEqual([p.from, p.to, p.maxed], [1, 2, false]); assert.match(p.after, /2\/2/);
  const m = duplicatePreview(evoOf(['archmage-emeritus']).absorbed, 'mtg:archmage-emeritus'); assert.equal(m.maxed, true);
  assert.equal(duplicatePreview(newEvolution().absorbed, 'mtg:ophiomancer'), null, 'first copy is not a duplicate');
});
test('levels reach live handlers through the central table, not ad-hoc numbers', () => {
  const c = src('src/engine/combo-triggers.js'), t = src('src/engine/trait-triggers.js');
  for (const id of ['ophiomancer', 'rabblemaster', 'mystic', 'hornetQueen', 'hermit', 'guttersnipe', 'spitfire', 'zulaport', 'ayara', 'skeleton']) assert.match(c, new RegExp(`lv\\(s,'${id}'\\)`), id);
  for (const id of ['brimaz', 'pyromancer', 'talrand', 'bloodArtist', 'sheoldred', 'vito', 'ascendant']) assert.match(t, new RegExp(`lv\\(s,'${id}'\\)`), id);
});

// ── 4. Cinematic default ───────────────────────────────────────────────────────────────────────────────────
test('Cinematic is the default; migration keeps deliberate choices', async () => {
  const { DEFAULT_SETTINGS, newMeta, META_VERSION } = await import('../src/engine/progression.js');
  const { META_MIGRATIONS } = await import('../src/engine/save.js');
  assert.equal(DEFAULT_SETTINGS.animSpeed, 'cinematic'); assert.equal(newMeta().settings.animSpeed, 'cinematic'); assert.equal(META_VERSION, 6);
  assert.equal(META_MIGRATIONS[5]({ v: 5, settings: { animSpeed: 'normal' } }).settings.animSpeed, 'cinematic');
  for (const keep of ['fast', 'instant', 'cinematic']) assert.equal(META_MIGRATIONS[5]({ v: 5, settings: { animSpeed: keep } }).settings.animSpeed, keep);
  assert.equal(META_MIGRATIONS[5]({ v: 5, settings: { animSpeed: 'normal', animSpeedChosen: true } }).settings.animSpeed, 'normal');
  assert.match(src('src/ui/screens.js'), /if \(k === 'animSpeed'\) st\.animSpeedChosen = true;/);
});
// ── 7. idle clock ──────────────────────────────────────────────────────────────────────────────────────────
test('idle breathing runs on real time; actions follow the speed setting; reduced motion holds idle', async () => {
  const { idleClockStep } = await import('../src/rendering/scene.js');
  // v1.7.0: idle is on real time at a calm fixed tempo (IDLE_TEMPO), identical for every speed setting
  const { IDLE_TEMPO } = await import('../src/rendering/scene.js');
  for (const speed of [0.65, 1, 2.2]) assert.ok(Math.abs(idleClockStep('idle', 0.1, speed, false) - 0.1 * IDLE_TEMPO) < 1e-12);
  assert.equal(idleClockStep('attack', 0.1, 2, false), 0.2); assert.equal(idleClockStep('idle', 0.1, 1, true), 0);
});
// ── 2. stances ─────────────────────────────────────────────────────────────────────────────────────────────
test('Guard and Channel never call the attack or cast animation rows; cast poses exclude the punch', async () => {
  const ui = src('src/ui/battle-ui.js'), st = ui.slice(ui.indexOf("case 'stance': {"), ui.indexOf("case 'guarded':"));
  assert.doesNotMatch(st, /sc\.play\(/); assert.match(st, /sc\.stance\(e\.uid, e\.kind\)/);
  const { BENCHMARK_POSES } = await import('../src/rendering/raster-benchmarks.js'); assert.ok(!BENCHMARK_POSES.cast.includes(5));
});
// ── 1. exile portal ────────────────────────────────────────────────────────────────────────────────────────
test('Exile portal: persistent canvas, wall-clock phase, black core, pauses when hidden, count + inspection kept', async () => {
  const P = await import('../src/ui/exile-portal.js'), s = src('src/ui/exile-portal.js'), ui = src('src/ui/battle-ui.js');
  assert.equal(P.portalIntensity(0, 0, 1), 0, 'deep black centre'); assert.equal(P.portalIntensity(1.2, 0, 1), -1);
  assert.notEqual(P.portalIntensity(0.6, 0.2, 0), P.portalIntensity(0.6, 0.2, 1), 'it rotates');
  assert.match(s, /performance\.now\(\)/); assert.match(s, /document\.hidden/); assert.match(s, /prefers-reduced-motion/);
  assert.match(ui, /exilePortalCanvas\(\); if \(slot && pc\) slot\.appendChild\(pc\)/, 'the same node is re-attached on every HUD rebuild');
  assert.match(ui, /data-zone="exile"/); assert.match(ui, /Exile<\/strong><em>\$\{exileCount\(s\)\}/);
});
// ── 13. mandatory discard ──────────────────────────────────────────────────────────────────────────────────
test('discard requirement is surfaced immediately; tap arms Discard; drag targets the Graveyard only; End Turn never discards', async () => {
  const { discardRequirement } = await import('../src/engine/zones.js');
  const s = { phase: 'player', deck: { hand: [1, 2, 3, 4, 5, 6, 7, 8, 9], capacity: 7, pendingDiscards: 0 } };
  assert.deepEqual([discardRequirement(s).need, discardRequirement(s).blocking], [2, false]); assert.equal(discardRequirement(s).text, 'Discard 2 cards to continue');
  s.deck.pendingDiscards = 3; assert.equal(discardRequirement(s).need, 3); assert.equal(discardRequirement(s).blocking, true);
  assert.equal(discardRequirement({ ...s, phase: 'enemy' }).need, 0);
  const ui = src('src/ui/battle-ui.js');
  assert.match(ui, /classList\.contains\('discard-mode'\)\) \{ const i =/, 'tapping a card in discard mode never casts');
  assert.match(ui, /if \(e\.type === 'pointerup' && graveAt\(e\.clientX, e\.clientY\)\) this\.discardCard\(d\.i\);/);
  assert.match(ui, /if \(discardRequirement\(this\.s\)\.need\) \{ this\.audio\.play\('nope'\)/);
  assert.match(src('index.html'), /id="gb-discard-bar"/);
});
// ── 9/10. threat explanation + tactics ─────────────────────────────────────────────────────────────────────
test('threat reasons and factors come from the calculation; boss flawless raises threat; capped and hold are explained', async () => {
  const { settleWorldThreat, threatTactics } = await import('../src/engine/world-threat.js');
  let r = {}; settleWorldThreat({ level: 7 }, { victory: true, enemyDamage: 0, maxHealth: 40, turns: 3, boss: true }, r);
  assert.deepEqual([r.before, r.after], [7, 10]); assert.ok(r.reasons.some(x => /boss/i.test(x))); assert.equal(r.factors.damagePct, 0);
  r = {}; settleWorldThreat({ level: 24 }, { victory: true, enemyDamage: 0, maxHealth: 40, turns: 5 }, r); assert.equal(r.delta, 0);   // v1.8.0 cap 24 assert.ok(r.reasons.some(x => /maximum/.test(x)));
  r = {}; settleWorldThreat({ level: 5 }, { victory: true, enemyDamage: 5, maxHealth: 40, turns: 6 }, r); assert.equal(r.delta, 0); assert.match(r.reasons.join(' '), /threat holds/);
  r = {}; settleWorldThreat({ level: 11 }, { victory: true, enemyDamage: 22, maxHealth: 40, turns: 6 }, r); assert.equal(r.delta, -2); assert.match(r.reasons[0], /Heavy damage sustained/);
  assert.equal(threatTactics(5, { nodeType: 'elite' }).surge, null); assert.ok(threatTactics(6, { nodeType: 'elite' }).surge);
  assert.ok(threatTactics(9).surge); assert.equal(threatTactics(8, { nodeType: 'boss' }).bossEscorts, 1); assert.equal(threatTactics(11, { nodeType: 'boss' }).bossEscorts, 2);
  assert.ok(threatTactics(12).surge.pct <= 0.2, 'surge damage is bounded');
  const ui = src('src/ui/battle-ui.js'); assert.doesNotMatch(ui, /The world answers your strength/);
  assert.match(src('src/ui/screens.js'), /Global Threat: \$\{t\.before\} → \$\{t\.after\}/);
});
test('Threat Surge is telegraphed (pending slam, dodgeable), never on turn 1, and deterministic', async () => {
  const { surgeAfterAct } = await import('../src/engine/ai.js');
  const s = arena(['..g..', '.....', '.....', '..P..'], { g: 'grub' }); s.threatSurge = { every: 2, pct: 0.2 }; s.phase = 'enemy';
  const e = s.units.find(u => u.side === 'enemy'); const ev = [];
  s.turn = 1; surgeAfterAct(s, ev, e); assert.equal(e.slam, undefined);
  s.turn = 2; surgeAfterAct(s, ev, e); assert.ok(e.slam && e.slam.kind === 'surge'); assert.ok(ev.some(x => x.t === 'aim' && x.slam));
  assert.ok(e.slam.tiles.some(t => t.x === player(s).x && t.y === player(s).y)); assert.ok(e.slam.damage >= 2);
});
// ── 14/15. run report ──────────────────────────────────────────────────────────────────────────────────────
test('Copy Run Stats: full Markdown from real values; score unchanged; no ids; handles empty/older records', async () => {
  const { runStatsMarkdown, derivedMetrics } = await import('../src/engine/run-report.js');
  const { LAST_PAGE_TURNS } = await import('./fixtures/last-page-turns.mjs'); const { expeditionTotals } = await import('../src/engine/scoring.js');
  assert.equal(expeditionTotals(LAST_PAGE_TURNS).total, 39945, 'scoring meaning (incl. completion bonus) preserved');
  const md = runStatsMarkdown({ ...LAST_PAGE_TURNS, seed: 987654321 }, { won: true, earned: [], newBest: true });
  for (const want of ['The Last Page Turns', 'Final Global Threat:** 11/24', 'Battles won:** 17', 'Bosses defeated:** 3', '28m 35s', 'Act I 11m 47s', '39,945', 'Toxrill, the Corrosive (boss) | 9/8 | 0/48', 'Expedition completed bonus', 'Local · unranked', 'None earned this run']) assert.ok(md.includes(want), want);
  assert.ok(!md.includes('987654321') && !/key|seed|token/i.test(md.replace(/Toxrill|tokens?/gi, '')), 'no internal identifiers');
  assert.ok(runStatsMarkdown({}, {}).includes('No scored encounters'), 'empty record is graceful');
  assert.equal(derivedMetrics(LAST_PAGE_TURNS).bossesFlawless, 1);
  const ui = src('src/ui/screens.js'); assert.match(ui, /Copy Run Stats/); assert.match(ui, /status\.textContent = 'Copied!'/); assert.match(src('src/engine/run-report.js'), /execCommand\('copy'\)/);
});
// ── 3. skin patterns ───────────────────────────────────────────────────────────────────────────────────────
test('skin pattern: chosen at creation, saved, deterministic; older saves stay single-tone; mixed tones harmonious', async () => {
  const { skinPatternForSeed, visualForRun, validSkinPattern, SKIN_PALETTES } = await import('../src/engine/visual-identity.js');
  const { newRun } = await import('../src/engine/run.js');
  const pats = Array.from({ length: 400 }, (_, i) => skinPatternForSeed(i * 7919));
  const mixed = pats.filter(p => p.mode === 'mixed'); assert.ok(mixed.length > 120 && mixed.length < 280, 'both appearances occur');
  for (const p of pats) { assert.ok(validSkinPattern(p)); if (p.mode === 'mixed') { const d = Math.abs(p.tones[0] - p.tones[1]); assert.ok(d >= 2 && d <= 5 && p.tones[1] < SKIN_PALETTES.length); } }
  const run = newRun({ seed: 4242 }); assert.deepEqual(run.visual.skinPattern, skinPatternForSeed(4242));
  assert.deepEqual(visualForRun(JSON.parse(JSON.stringify(run))).skinPattern, run.visual.skinPattern, 'survives save/reload');
  assert.equal(visualForRun({ seed: 4242, visual: { skinTone: 3 } }).skinPattern.mode, 'single', 'pre-1.6 saves keep their single tone');
});
test('body regions follow the pose; the face is never split; styles are region-based (not per-pixel noise)', async () => {
  const { regionAt, styleWeight, R } = await import('../src/rendering/body-regions.js');
  const { blankNativeAnchor } = await import('../src/rendering/native-blank-art.js');
  const A = blankNativeAnchor('idle', 0, 0);
  assert.equal(regionAt(A, ...A.head), R.head); assert.equal(regionAt(A, ...A.leftHand), R.leftArm); assert.equal(regionAt(A, ...A.rightFoot), R.rightLeg);
  for (const st of ['limbs', 'mantle', 'split', 'patches']) assert.equal(styleWeight(st, R.head, ...A.face, A), 0, st + ' keeps the face one tone');
  const W = blankNativeAnchor('attack', 2, 0); assert.equal(regionAt(W, ...W.rightHand), R.rightArm, 'regions move with the strike pose');
});
// ── 5. anatomy composition ─────────────────────────────────────────────────────────────────────────────────
test('anatomy: absorption order decides the leading lineage (Dragon→Bird ≠ Bird→Dragon); surfaces claim body regions by order', async () => {
  const { resolveAnatomy } = await import('../src/engine/anatomy-resolver.js'); const { surfacePlan } = await import('../src/rendering/evolution-visuals.js');
  const db = resolveAnatomy(evoOf(['volcanic-dragon', 'storm-crow'])), bd = resolveAnatomy(evoOf(['storm-crow', 'volcanic-dragon']));
  assert.equal(db.morph.wingKind, 'membrane'); assert.equal(db.morph.wingTrim, 'feather'); assert.equal(bd.morph.wingKind, 'feather'); assert.equal(bd.morph.wingTrim, 'membrane');
  assert.deepEqual(surfacePlan({ stage: 0 }), [], 'the Blank stays plain');
  const plan = surfacePlan(resolveAnatomy(evoOf(['volcanic-dragon', 'savannah-lions', 'craw-wurm', 'pillarfield-ox', 'spined-wurm'])));
  assert.equal(plan[0].kind, 'scales'); assert.ok(plan[0].regions.includes(1), 'first lineage transforms the torso');
  assert.ok(plan.some(p => p.kind === 'fur' && p.regions.includes(2)), 'second lineage claims the arms');
  assert.ok(plan.every(p => !p.regions.includes(0)), 'the head/face is never textured');
});
test('graft art grows out of the body: sockets, flesh-to-material gradients, back-view layering, reshaped hands, healed scars', () => {
  const a = src('src/rendering/native-blank-art.js');
  assert.match(a, /function socket\(/); assert.match(a, /const dorsal=\(view===1\)===\(pass==='front'\);/);
  assert.match(a, /the hand itself is RESHAPED/); assert.match(a, /healed graft scars, not stitches/); assert.match(a, /addColorStop\(0,SK\.mid\)/);
  assert.doesNotMatch(a, /'#ffcf8a'/, 'no orange stitch bars'); assert.match(a, /horns root in bony bosses on the CROWN/);
});
// ── 6. roster standard ─────────────────────────────────────────────────────────────────────────────────────
test('every native creature study shares one pixel density and the HD-2D finish pass', async () => {
  const m = await import('../src/rendering/real-creature-models.js'); const { finishCreatureCell } = await import('../src/rendering/creature-motion.js');
  assert.equal(m.NATIVE_STUDY_DENSITY, 0.42); assert.match(src('src/rendering/real-creature-models.js'), /pixelScale:NATIVE_STUDY_DENSITY/);
  const d = new Uint8ClampedArray(4 * 4 * 4); for (let y = 1; y < 3; y++) for (let x = 1; x < 3; x++) d.set([200, 100, 50, 255], (y * 4 + x) * 4);
  finishCreatureCell(d, 4, 4); assert.ok(d[(2 * 4 + 2) * 4] < 200, 'shadow-side sel-out'); assert.equal(d[(0) * 4 + 3], 0, 'alpha preserved');
  assert.ok(src('dev/roster-gallery.html').includes('IN-GAME relative size'));
});
// ── 11. umbral spells ──────────────────────────────────────────────────────────────────────────────────────
test('black spells use spectral shadow hands; other colours keep their identities; impact resolves at the grip', async () => {
  const { VFX, SPELL_VFX } = await import('../src/rendering/vfx.js'); const v = src('src/rendering/vfx.js'), sm = src('src/rendering/shadow-magic.js');
  assert.match(v, /murder\(sc, args\) \{ await shadowMurder\(sc, args\);/); assert.match(v, /disfigure: \(sc, a\) => shadowDisfigure/); assert.match(v, /drain: \(sc, a\) => shadowDrain/);
  assert.equal(SPELL_VFX['Infest'], 'infest'); assert.ok(VFX.infest);
  assert.equal(SPELL_VFX['Lightning Bolt'], 'lightningBolt'); assert.equal(SPELL_VFX['Shock'], 'shock');
  assert.match(sm, /const hash = /); assert.doesNotMatch(sm.slice(sm.indexOf('export function makeShadowAtlas'), sm.indexOf('const sleep')), /Math\.random/, 'atlas is deterministic');
  assert.match(sm, /if \(target != null\) sc\.hit\(target/);
});
// ── 12. special tiles ──────────────────────────────────────────────────────────────────────────────────────
test('Leyline, Inscribed Page, Rift and Arcane Conduit each have a distinct glyph shape, material and motion', () => {
  const e = src('src/rendering/environment.js'), g = src('src/rendering/gl.js');
  assert.match(e, /GLYPH_MAT = Object\.freeze\(\{ leyline: 17, page: 18, rift: 19, conduit: 20 \}\)/);
  for (const id of ['17.0', '18.0', '19.0', '20.0']) assert.ok(g.includes(`id == ${id}`), id);
  assert.match(e, /kind: 'page'/); assert.match(e, /kind: 'conduit'/);
});
// ── versioning ─────────────────────────────────────────────────────────────────────────────────────────────
test('v1.6.0 rules fingerprint and challenge revision', async () => {
  const { RULES_VERSION, RANKED_CHALLENGES } = await import('../src/engine/ranked.js'); const { GAME } = await import('../src/config.js');
  assert.equal(GAME.version, '1.8.4-candidate'); assert.equal(RULES_VERSION, 'graftbound-rules-1.8.4-candidate'); assert.equal(RANKED_CHALLENGES['gb-expedition-01'].revision, 31);
});
test('styles.css is structurally valid: every block closes (a single unclosed block silently disables all later rules)', () => {
  const css = src('styles.css').replace(/\/\*[\s\S]*?\*\//g, ''); let d = 0;
  for (const ch of css) { if (ch === '{') d++; else if (ch === '}') { d--; assert.ok(d >= 0, 'unexpected }'); } }
  assert.equal(d, 0, 'unclosed CSS block');
});
test('one battle raises threat by at most +3 and says so', async () => {
  const { settleWorldThreat } = await import('../src/engine/world-threat.js'); const r = {};
  settleWorldThreat({ level: 7, strongStreak: 2 }, { victory: true, enemyDamage: 0, maxHealth: 44, turns: 3, boss: true }, r);
  assert.equal(r.delta, 3); assert.ok(r.reasons.some(x => /at most \+3/.test(x)));
});
