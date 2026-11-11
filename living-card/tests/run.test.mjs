import test from 'node:test'; import assert from 'node:assert/strict';
import { newRun, enterNode, concludeBattle, chooseReward, skipReward, shrineChoice, runStats, RUN_VERSION } from '../src/engine/run.js';
import { availableNodes, generateMap } from '../src/engine/campaign.js';
import { generatePack, cardPool, rarityWeights } from '../src/engine/rewards.js';
import { getCard } from '../src/data/cards.js';
import { createStore, memoryStorage, KEYS, _internal } from '../src/engine/save.js';
import { newMeta, evaluateAchievements } from '../src/engine/progression.js';
import { player, attack, attackTargets, endTurn, movePlayer, moveOptions } from '../src/engine/combat.js';
import { buildEncounter, templateFor } from '../src/engine/encounters.js';
import { manhattan } from '../src/core/grid.js';
import { botPlay } from './helpers.mjs';

function winBattle(run) { assert.equal(botPlay(run.battle, 60), 'won', 'bot should win'); return concludeBattle(run); }

test('ACCEPTANCE: blank 1/1 -> move -> win -> 3 cards -> absorb 2/2 deathtouch -> 3/3 DT works in next battle -> save/reload preserves it', () => {
  const st = memoryStorage(); const store = createStore(st);
  const run = newRun({ seed: 1234, tutorial: true });
  assert.deepEqual([run.name, run.evo.power, run.evo.toughness], ['The Blank', 1, 1]);
  enterNode(run, availableNodes(run.map, null)[0].id);
  const b = run.battle; const p0 = { ...player(b) };
  const step = moveOptions(b)[0]; movePlayer(b, step.x, step.y); assert.notDeepEqual([player(b).x, player(b).y], [p0.x, p0.y], 'moved');
  winBattle(run);
  assert.equal(run.phase, 'reward'); assert.equal(run.pending.cards.length, 3); assert.ok(run.pending.cards.includes('nightcap_toad'));
  const ch = chooseReward(run, 'nightcap_toad');
  assert.equal(ch.kind, 'absorb'); assert.deepEqual([run.evo.power, run.evo.toughness, run.evo.keywords.deathtouch], [3, 3, 1]);
  enterNode(run, availableNodes(run.map, run.current)[0].id);
  const p = player(run.battle); assert.deepEqual([p.power, p.toughness, p.maxHp, p.keywords.deathtouch], [3, 3, 11, 1]);
  const b2 = run.battle;
  for (let i = 0; i < 20 && b2.phase === 'player' && !attackTargets(b2).length; i++) {
    const tgt = b2.units.filter(u => u.side === 'enemy' && u.hp > 0)[0];
    const mv = moveOptions(b2).sort((a, c) => manhattan(a, tgt) - manhattan(c, tgt))[0]; if (mv) movePlayer(b2, mv.x, mv.y);
    if (!attackTargets(b2).length) endTurn(b2);
  }
  const t = attackTargets(b2).find(x => !x.legendary); assert.ok(t, 'reached a foe');
  t.statuses.shield = 0; t.hp = t.maxHp = 50; attack(b2, t.uid); assert.equal(t.hp, 0, 'deathtouch destroyed a 50-health foe');
  store.saveRun(run); const { run: back } = store.loadRun();
  assert.deepEqual(back.evo, run.evo); assert.equal(back.evo.absorbed[0].cardId, 'nightcap_toad'); assert.equal(back.visited.length, 2);
  assert.deepEqual(player(back.battle).keywords, { deathtouch: 1 });
});
test('packs: 3 distinct cards, >=1 creature & spell, no duplicate signatures when avoidable, elite has rare+', () => {
  for (let seed = 1; seed < 300; seed++) {
    const pk = generatePack(seed, { tier: seed % 3 ? 'battle' : 'elite', depth: seed % 7 }).map(getCard);
    assert.equal(new Set(pk.map(c => c.id)).size, 3);
    assert.ok(pk.some(c => c.kind === 'creature')); assert.ok(pk.some(c => c.kind === 'spell'));
    const sig = pk.map(c => (c.kind === 'creature' ? Object.keys(c.keywords).sort().join() : c.category));
    assert.equal(new Set(sig).size, 3, 'functionally distinct: ' + pk.map(c => c.id));
    if (seed % 3 === 0) assert.ok(pk.some(c => c.rarity === 'rare' || c.rarity === 'mythic'));
  }
  assert.deepEqual(generatePack(42, {}), generatePack(42, {}), 'deterministic');
  assert.ok(rarityWeights(6).rare > rarityWeights(0).rare);
});
test('locked cards stay out until unlocked; maxed spells drop out; pauper excludes rares', () => {
  assert.ok(!cardPool({}).some(c => c.id === 'thousandscale_drake'));
  assert.ok(cardPool({ unlocks: { firstVictory: true } }).some(c => c.id === 'thousandscale_drake'));
  assert.ok(!cardPool({ spellbook: [{ id: 'ember_dart', level: 3 }] }).some(c => c.id === 'ember_dart'));
  assert.ok(!cardPool({ noRares: true }).some(c => c.rarity === 'rare'));
});
test('spell duplicates level up; skip grants spark; invalid choices rejected', () => {
  const run = newRun({ seed: 9 }); const pend = () => { run.phase = 'reward'; run.pending = { cards: ['ember_dart', 'nightcap_toad', 'barkskin'] }; };
  pend(); chooseReward(run, 'ember_dart'); pend(); assert.equal(chooseReward(run, 'ember_dart').level, 2);
  pend(); assert.throws(() => chooseReward(run, 'starfall'), /Invalid reward/);
  skipReward(run); assert.equal(runStats(run).maxHealth, 5 + 1 + 2);
});
test('shrine choices', () => {
  const run = newRun({ seed: 3 }); run.phase = 'shrine'; run.current = 0;
  shrineChoice(run, 'spark'); assert.equal(run.sparkBonus, 3);
  run.phase = 'shrine'; shrineChoice(run, 'pack'); assert.equal(run.phase, 'reward'); assert.equal(run.pending.cards.length, 3);
});
test('map: 8 layers, all reachable, boss at end, deterministic', () => {
  for (let seed = 1; seed < 50; seed++) {
    const m = generateMap(seed); assert.deepEqual(m, generateMap(seed)); assert.equal(m.nodes.at(-1).type, 'boss');
    const reach = new Set([0]); for (const n of m.nodes) if (reach.has(n.id)) n.next.forEach(i => reach.add(i));
    assert.equal(reach.size, m.nodes.length);
  }
});
test('arenas deterministic for every template', () => {
  for (let seed = 1; seed < 60; seed++) for (const type of ['tutorial', 'battle', 'elite', 'boss'])
    assert.deepEqual(buildEncounter(templateFor(type, seed % 7, seed), seed, type), buildEncounter(templateFor(type, seed % 7, seed), seed, type));
});
test('save/load round trip mid-battle; battle continues', () => {
  const store = createStore(memoryStorage()); const run = newRun({ seed: 77, tutorial: true }); enterNode(run, 0);
  store.saveRun(run); const { run: back } = store.loadRun();
  assert.deepEqual(back, JSON.parse(JSON.stringify(run))); assert.equal(botPlay(back.battle), 'won');
});
test('corrupted save is quarantined and the last good backup is recovered', () => {
  const st = memoryStorage(); const store = createStore(st);
  const run = newRun({ seed: 5 }); store.saveRun(run); run.sparkBonus = 2; store.saveRun(run);
  st.setItem(KEYS.run, st.getItem(KEYS.run).replace('"power\\":1', '"power\\":99'));
  const r = store.loadRun(); assert.ok(r.recovered); assert.match(r.error, /checksum/); assert.equal(r.run.sparkBonus, 0, 'previous good save');
  assert.ok(st.getItem(KEYS.run + '.corrupt'));
  st.setItem(KEYS.run, 'not json'); st.removeItem(KEYS.run + '.bak'); assert.equal(store.loadRun().run, null);
});
test('structurally invalid but checksum-valid saves are rejected', () => {
  const st = memoryStorage(); const store = createStore(st); const run = newRun({ seed: 6 });
  run.evo.keywords.hexproof = 1; st.setItem(KEYS.run, _internal.wrap(RUN_VERSION, run));
  const r = store.loadRun(); assert.equal(r.run, null); assert.match(r.error, /keyword hexproof/);
});
test('v1 saves migrate to v2', () => {
  const st = memoryStorage(); const store = createStore(st);
  const run = newRun({ seed: 8, tutorial: true }); enterNode(run, 0);
  const v1 = JSON.parse(JSON.stringify(run)); v1.v = 1; delete v1.name; delete v1.contentMode; v1.battle.v = 1;
  for (const u of v1.battle.units) delete u.hero; v1.evo.parts = { venomSacs: 1, legs: 1 };
  st.setItem(KEYS.run, _internal.wrap(1, v1));
  const r = store.loadRun(); assert.ok(r.migrated); assert.equal(r.run.v, 2); assert.equal(r.run.name, 'The Blank');
  assert.ok(player(r.run.battle)); assert.deepEqual(r.run.evo.parts, { venom: 1 });
  st.setItem(KEYS.run, _internal.wrap(99, run)); assert.equal(store.loadRun().run, null, 'future versions refused');
});
test('meta persists achievements, unlocks and settings; v1 meta migrates', () => {
  const st = memoryStorage(); const store = createStore(st); const meta = newMeta();
  const got = evaluateAchievements(meta, { event: 'battleWon', elite: true, battleStats: { damageTaken: 0 }, attacks: 1 });
  assert.ok(got.some(a => a.id === 'alpha_down')); assert.ok(meta.unlocks.firstElite);
  meta.settings.graphics = 'performance'; store.saveMeta(meta); const back = store.loadMeta();
  assert.ok(back.unlocks.firstElite); assert.equal(back.settings.graphics, 'performance');
  st.setItem(KEYS.meta, _internal.wrap(1, { v: 1, unlocks: { firstVictory: true }, settings: { sound: false } }));
  const m = store.loadMeta(); assert.equal(m.settings.sound, false); assert.equal(m.settings.animSpeed, 'normal'); assert.ok(m.unlocks.firstVictory);
});
