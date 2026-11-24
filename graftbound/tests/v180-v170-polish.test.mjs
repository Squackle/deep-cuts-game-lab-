// GRAFTBOUND v1.7.0 regression coverage. P0 items exercise real state transitions, not source strings.
import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
import { installReferenceSet } from '../src/cards/reference-set.js'; installReferenceSet();
import { arena, evoWith } from './helpers.mjs';
import { endTurn, movePlayer, player, cast, castOptions, createBattle } from '../src/engine/combat.js';
import { deriveStats, newEvolution, absorb } from '../src/engine/evolution.js';
import { dealDamage } from '../src/engine/abilities.js';
import { T, tileAt } from '../src/core/grid.js';
const book = ids => ids.map(id => ({ id: 'mtg:' + id, level: 1 }));

// #25 Mentor soft-lock
test('#25 pending-choice modal is locked against backdrop/Escape and closeModal always re-prompts', () => {
  const m = src('src/main.js'), ui = src('src/ui/battle-ui.js');
  // Mandatory choices cannot be dismissed even by a nested data-close control.
  assert.match(m, /if \(this\.modalLocked\(\)\) return; if \(e\.target\.id === 'modal' \|\| e\.target\.closest\('\[data-close\]'\)\) this\.closeModal\(\);/);
  assert.match(m, /if \(!this\.modalLocked\(\)\) this\.closeModal\(\)/);
  assert.match(m, /setTimeout\(\(\) => this\.battle\.promptComboChoices\(\), 0\)/);
  assert.match(ui, /role=\\?"alertdialog\\?"[\s\S]{0,4000}?,'',\{locked:true\}\);/);
});
test('#24/#25 Mentor choice wording and explicit Pay / Skip actions survive save/reload', async () => {
  const { comboChoices, hasComboChoices } = await import('../src/engine/combo-triggers.js');
  const s = arena(['g..', '...', 'P..'], { g: 'grub' }); s.traits = ['mentor']; s.combo = { choices: [{ kind: 'mentor', source: 1 }], counters: {}, actions: {}, treasure: 0 };
  s.p.mana = 2; s.deck = { library: [{ id: 'mtg:shock' }], hand: [], graveyard: [], exile: [], capacity: 7 };
  const back = JSON.parse(JSON.stringify(s)); assert.ok(hasComboChoices(back));
  const c = comboChoices(back); assert.match(c.subtitle, /^Meek ally entered/); assert.deepEqual(c.choices.map(x => x.arg).sort(), [0, 1]);
});
// #4/#5 marksman
test('#4 a prepared shot skips allied foes in the lane and hits the first player-team creature', () => {
  const s = arena(['a.....', 'g.....', '......', 'P.....'], { a: 'archer', g: 'grub' });
  const ar = s.units.find(u => u.defId === 'archer'), gr = s.units.find(u => u.defId === 'grub');
  ar.aim = { tiles: [{ x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }], damage: 2 };
  const hp = player(s).hp; const ev = endTurn(s);
  assert.ok(!ev.some(e => e.t === 'damage' && e.kind === 'arrow' && e.uid === gr.uid), 'no friendly fire'); assert.ok(ev.some(e => e.t === 'damage' && e.kind === 'arrow' && e.amount === 2 && e.uid === player(s).uid), 'hero hit by the prepared shot');
});
test('#4 a rock in the lane blocks the prepared shot', () => {
  const s = arena(['a.....', '#.....', '......', 'P.....'], { a: 'archer' });
  const ar = s.units.find(u => u.defId === 'archer'); ar.aim = { tiles: [{ x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }], damage: 2 };
  const ev = endTurn(s); assert.ok(!ev.some(e => e.t === 'damage' && e.kind === 'arrow' && e.amount === 2));
});
test('#5 marksman: prepared shot (2) plus exactly one ordinary quick shot (1) per enemy turn, telegraphed', async () => {
  const { ENEMIES } = await import('../src/data/enemies.js'); assert.deepEqual(ENEMIES.archer.quickShot, { damage: 1, range: 4 }); assert.equal(ENEMIES.archer.aimDamage, 2);
  const s = arena(['......', 'a.....', '......', 'P.....'], { a: 'archer' });
  const ar = s.units.find(u => u.defId === 'archer'); ar.aim = { tiles: [{ x: 0, y: 2 }, { x: 0, y: 3 }], damage: 2 };
  const ev = endTurn(s); assert.equal(ev.filter(e => e.t === 'attack' && e.kind === 'quickShot' && e.uid === ar.uid).length, 1);
  assert.match(src('src/ui/battle-ui.js'), /then a quick shot for/);
});
// #14 attribution + score
test('#14 self, own-spell, ally and neutral terrain damage never count as enemy damage; foe damage does', () => {
  const s = arena(['g..', '...', 'P..'], { g: 'grub' }), h = player(s), foe = s.units.find(u => u.side === 'enemy');
  dealDamage(s, [], null, h, 2, { kind: 'bramble' }); dealDamage(s, [], h, h, 1, { kind: 'spell' });
  assert.equal(s.stats.enemyHealthDamage, 0); assert.equal(s.stats.damageTaken, 3);
  dealDamage(s, [], null, h, 1, { kind: 'lava', cause: 'enemy' }); dealDamage(s, [], foe, h, 1, { combat: true });
  assert.equal(s.stats.enemyHealthDamage, 2);
});
test('#14 foe-created hazards and foe poison are attributed to enemies; terrain spores are not', () => {
  const s = arena(['g.....', '......', 'P.....'], { g: 'grub' }); s.terrain[1 * s.w + 0] = T.BRAMBLE; s.foeTiles = [1 * s.w + 0];
  movePlayer(s, 0, 1); assert.ok(s.stats.enemyHealthDamage > 0, 'foe bramble counts');
  const t = arena(['g.....', '......', 'P.....'], { g: 'grub' }); t.terrain[1 * t.w + 0] = T.BRAMBLE; movePlayer(t, 0, 1); assert.equal(t.stats.enemyHealthDamage, 0, 'neutral bramble does not');
});
test('#14 threat score bonus: +2.5%/level of encounter-start threat, capped at +30%, victory only', async () => {
  const { encounterScore, threatBonusRate } = await import('../src/engine/scoring.js');
  const base = { victory: true, acceptedActions: 6, rawHpDamageTaken: 0, parActions: 6, damageBudget: 10, multiplier: 1 };
  assert.equal(encounterScore({ ...base, threat: 0 }).threatBonus, 0);
  assert.equal(encounterScore({ ...base, threat: 4 }).threatBonus, 200); assert.equal(encounterScore({ ...base, threat: 4 }).total, 2200);
  assert.equal(threatBonusRate(12), 0.3); assert.equal(threatBonusRate(99), 0.45);   // v1.8.0 assert.equal(encounterScore({ ...base, victory: false, threat: 12 }).total, 0);
  assert.match(src('src/engine/run.js'), /battle\.threatAtStart = node\.type === 'tutorial' \? 0 : activeThreat;/);
});
// #20 stepwise hazards
test('#20 hazards resolve on entry and a lethal tile stops the rest of the path', () => {
  const s = arena(['g.....', '......', '......', 'P.....'], { g: 'grub' }); const h = player(s);
  s.terrain[2 * s.w + 0] = T.BRAMBLE; s.terrain[1 * s.w + 0] = T.BRAMBLE; h.hp = 1; s.p.moveLeft = 3;
  const ev = movePlayer(s, 0, 1);
  assert.deepEqual([h.x, h.y], [0, 2], 'stopped on the first bramble'); assert.ok(ev.some(e => e.t === 'moveStopped'));
  assert.equal(ev.filter(e => e.t === 'damage' && e.kind === 'bramble').length, 1, 'later tile never fires');
  const moveIdx = ev.findIndex(e => e.t === 'move'), dmgIdx = ev.findIndex(e => e.t === 'damage');
  assert.ok(moveIdx >= 0 && moveIdx < dmgIdx, 'walk segment is presented before the hazard resolves');
});
test('#3 movement records the last direction travelled (saved, presentation-only)', () => {
  const s = arena(['g.....', '......', 'P.....'], { g: 'grub' }); movePlayer(s, 2, 2); assert.deepEqual(player(s).facing, [1, 0]);
  assert.deepEqual(JSON.parse(JSON.stringify(s)).units.find(u => u.hero).facing, [1, 0]);
});
// #18 AoE on rocks
test('#18 area spells may centre on a rock and shatter it; single-target spells may not target rocks', () => {
  const s = arena(['t..#', '....', 'P...'], { t: 'tortoise' }, { spellbook: book(['infest', 'fireball', 'shock']) }); s.p.mana = 9; s.p.maxMana = 9;
  assert.ok(castOptions(s, 'mtg:infest').some(o => o.x === 3 && o.y === 0)); assert.ok(!castOptions(s, 'mtg:shock').some(o => o.x === 3 && o.y === 0));
  cast(s, 'mtg:fireball', 3, 0); assert.equal(tileAt(s, 3, 0), T.FLOOR); assert.ok(s.rubble.some(r => r.x === 3 && r.y === 0));
});
// #17 Talrand
test('#17 Talrand duplicates level ONE trait (2/2 → 2/3 → 3/3), keep every absorption record, show a Level Up', async () => {
  const { traitLevelsOf, levelText, duplicatePreview } = await import('../src/cards/graft-levels.js');
  const evo = ['mtg:talrand-sky-summoner', 'mtg:talrand-sky-summoner'].reduce((e, id) => absorb(e, id).evo, newEvolution());
  assert.equal(evo.absorbed.length, 2); assert.deepEqual(traitLevelsOf(evo.absorbed), { talrand: 2 });
  assert.deepEqual([1, 2, 3].map(l => levelText('talrand', l)), ['Flying Drake 2/2 per instant/sorcery', 'Flying Drake 2/3 per instant/sorcery', 'Flying Drake 3/3 per instant/sorcery']);
  const s = createBattle({ evo, stats: deriveStats(evo), spellbook: book(['shock']), encounter: { name: 't', w: 5, h: 4, terrain: new Array(20).fill(0), playerStart: { x: 2, y: 3 }, enemies: [{ defId: 'tortoise', x: 2, y: 0 }] }, seed: 3 });   // survives Shock, so the battle is not over
  s.p.mana = 9; const n0 = s.units.length; cast(s, 'mtg:shock', 2, 0);
  const drakes = s.units.slice(n0).filter(u => u.name === 'Drake'); assert.equal(drakes.length, 1, 'one trigger'); assert.deepEqual([drakes[0].power, drakes[0].toughness], [2, 3]);
  assert.equal(duplicatePreview(evo.absorbed, 'mtg:talrand-sky-summoner').to, 3);
  assert.match(src('src/ui/screens.js'), /Level Up \$\{esc\(c\.name\)\} → Lv \$\{dp\.to\}/); assert.match(src('src/main.js'), /<b>Level Up!<\/b>/);
});
// #23 ambush
test('#23 ambush suppresses ONLY battle-entry graft setup; later triggers work; rare, deterministic, never bosses', async () => {
  const evo = evoWith('mtg:hornet-queen'); const enc = { name: 't', w: 6, h: 5, terrain: new Array(30).fill(0), playerStart: { x: 2, y: 4 }, enemies: [{ defId: 'grub', x: 2, y: 0 }] };
  const normal = createBattle({ evo, stats: deriveStats(evo), spellbook: [], encounter: enc, seed: 2 });
  const amb = createBattle({ evo, stats: deriveStats(evo), spellbook: [], encounter: enc, seed: 2, ambush: true });
  assert.ok(normal.units.filter(u => u.side === 'player' && !u.hero).length >= 4); assert.equal(amb.units.filter(u => u.side === 'player' && !u.hero).length, 0);
  assert.ok(amb.ambushed && amb.traits.includes('hornetQueen'), 'the graft itself is still owned for later triggers');
  const { EVENTS, rollEvent } = await import('../src/engine/events.js'); assert.equal(EVENTS.stalkersThicket.rare, true);
  const run = { act: 1, eventsSeen: [], hp: 20, maxHp: 30, evo: { absorbed: [{}] }, spellbook: [], handCapacity: 7 };
  const hits = Array.from({ length: 400 }, (_, i) => rollEvent(run, i * 7919)).filter(x => x === 'stalkersThicket').length;
  assert.ok(hits > 0 && hits < 60, 'rare: ' + hits); assert.equal(rollEvent(run, 123), rollEvent(run, 123));
  assert.match(src('src/engine/run.js'), /!\['tutorial', 'boss'\]\.includes\(node\.type\)/);
});
// #15
test('#15 no start-of-encounter Global Threat banner; dial and Continue remain', () => {
  const ui = src('src/ui/battle-ui.js'); assert.doesNotMatch(ui, /banner\(`Global Threat/); assert.match(src('src/ui/screens.js'), /data-threat-continue>Continue/);
});
// visual systems
test('#1/#22 central species scale: squirrels tiny, wolves < humanoids < bosses; art centred on its tile; footprint capped', async () => {
  const { visualScale, SIZE, anchorsOf, sizeClassOf } = await import('../src/rendering/creature-scale.js');
  assert.ok(SIZE.tiny < SIZE.small && SIZE.quad < SIZE.humanoid && SIZE.humanoid < SIZE.boss);
  assert.equal(sizeClassOf('mtg_friendlySquirrel'), 'tiny'); assert.equal(sizeClassOf('mtg_krenko', { w: 112 }), 'boss');
  const meta = { w: 96, h: 96, pixelScale: 0.42 }, b = { x0: 4, x1: 82, y0: 33, y1: 83 };
  assert.deepEqual(anchorsOf(meta, b), { pivot: 83, cx: -5 }, 'snake art is shifted 5 px left → re-centred');
  const s = visualScale('mtg_friendlySnake', meta, b); assert.ok(78 * (1 / 19) * 0.42 * s <= 1.3001);
  assert.match(src('src/rendering/scene.js'), /rH\[0\] \* ox/);
});
test('#2/#3 calm idle tempo; mirroring respects native facing with hysteresis', async () => {
  const { IDLE_TEMPO } = await import('../src/rendering/scene.js'); assert.ok(IDLE_TEMPO <= 0.35);
  const { mirrorFor, FACES_RIGHT } = await import('../src/rendering/creature-scale.js');
  assert.equal(mirrorFor(false, 0.8, false), true); assert.equal(mirrorFor(true, 0.8, true), false); assert.equal(mirrorFor(true, 0.01, true), true, 'keeps last side');
  assert.ok(FACES_RIGHT.has('mtg_wolf'));
});
test('#9 health bar sits above the WHOLE composed model', () => {
  const sc = src('src/rendering/scene.js');
  assert.match(sc, /heightOf\(v\) \{ return Math\.max\(0\.1, \(v\.pivot - \(v\.topPx \?\? 0\)\)/); assert.match(sc, /measureBounds\(canvas, v\.fw, v\.fh, \[\[0, 0\], \[0, rows\]\]\)/);
});
test('#10 wolf coats are deterministic per uid; the pack leader is always distinct', async () => {
  const { wolfCoatFor, WOLF_COATS, LEADER_COAT, recoatPixels } = await import('../src/rendering/creature-variants.js');
  assert.equal(wolfCoatFor(7, 3), wolfCoatFor(7, 3)); assert.ok(new Set(Array.from({ length: 50 }, (_, i) => wolfCoatFor(7, i).name)).size >= 4);
  assert.ok(!WOLF_COATS.includes(LEADER_COAT));
  const px = new Uint8ClampedArray([140, 90, 50, 255, 0, 0, 0, 0]); const out = recoatPixels(px, WOLF_COATS[1]); assert.notDeepEqual([...out.slice(0, 3)], [140, 90, 50]); assert.equal(out[7], 0);
});
test('#12 skeleton defeat: view removed immediately, bone pile is a decal; #13 poison orb; #16 four-stage hand', async () => {
  const sc = src('src/rendering/scene.js'), sm = src('src/rendering/shadow-magic.js'), v = src('src/rendering/vfx.js');
  assert.match(sc, /if \(\/Skeleton\/i\.test\(v\.key\)\)/); assert.match(sc, /this\.removeUnit\(uid\);\n      this\.addShadow\(\{ tex: 'bones'/);
  assert.match(v, /export const VFX = \{ infest: toxicOrb,/); assert.match(v, /sort\(\(a, b\) => a\.d - b\.d\)/);
  const { GRASP_STAGES } = await import('../src/rendering/shadow-magic.js'); assert.ok(GRASP_STAGES.gather >= 300 && GRASP_STAGES.intensify >= 250);
  assert.match(sm, /1 · gather/); assert.match(sm, /2 · intensify/); assert.match(sm, /3 · emerge from the cloud/);
});
test('#6 bow rig: both hands on the weapon in every state; full draw pulls the string back', async () => {
  const { bowPose } = await import('../src/rendering/detailed-folk-art.js'); const A = { torsoY: 49 };
  for (let st = 0; st <= 5; st++) for (let f = 0; f < 4; f++) { const p = bowPose(st, f, A); assert.ok(p.grip && p.draw && Math.hypot(p.grip[0] - p.draw[0], p.grip[1] - p.draw[1]) < 40); }
  assert.ok(bowPose(3, 2, A).pull > 10 && bowPose(3, 2, A).arrow); assert.equal(bowPose(2, 1, A).snap, true);
});
test('#19 labels: priority layout + status folding; #21 torso-conforming graft layer; #11 results grid', () => {
  const ui = src('src/ui/battle-ui.js'); assert.match(ui, /pr: u\?\.hero \? 0 : u\?\.boss \? 1/); assert.match(ui, /stShown\.length > 3/);
  assert.match(src('src/rendering/evolution-visuals.js'), /layerOf\('front','conform'\)/); assert.match(src('src/rendering/native-blank-art.js'), /function armoredBack/);
  const s = src('src/ui/screens.js'); assert.match(s, /class="end-grid"/); assert.match(s, /Copy Run Stats<\/button>/);
});
test('v1.7.0 rules fingerprint and challenge revision', async () => {
  const { RULES_VERSION, RANKED_CHALLENGES } = await import('../src/engine/ranked.js'); const { GAME } = await import('../src/config.js');
  assert.equal(GAME.version, '1.8.3-beta'); assert.equal(RULES_VERSION, 'graftbound-rules-1.8.3-beta'); assert.equal(RANKED_CHALLENGES['gb-expedition-01'].revision, 30);
});
