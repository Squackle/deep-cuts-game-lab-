import test from 'node:test'; import assert from 'node:assert/strict';
import { botPlay, evoWith } from './helpers.mjs';
import { newRun, enterNode, concludeBattle, chooseReward, skipReward, shrineChoice, runStats, RUN_VERSION, TUTORIAL_CARD, graftCapacity, woundsOf, maxHpOf } from '../src/engine/run.js';
import { availableNodes } from '../src/engine/campaign.js';
import { createStore, memoryStorage, KEYS, _internal } from '../src/engine/save.js';
import { newMeta, evaluateAchievements } from '../src/engine/progression.js';
import { player, attack, attackTargets, endTurn, movePlayer, moveOptions } from '../src/engine/combat.js';
import { resolveCard } from '../src/cards/catalog.js';
import { manhattan } from '../src/core/grid.js';
import { SHRINES, MAX_SPARK_FONTS } from '../src/engine/shrines.js';
import { absorb, newEvolution } from '../src/engine/evolution.js';

const win = run => { assert.equal(botPlay(run.battle, 60), 'won'); return concludeBattle(run); };
test('ACCEPTANCE: Blank 1/1 -> win -> 3 real cards -> graft real 1/1 Deathtouch -> 2/2 DT -> DT kills a 50-health foe next battle -> save/reload', () => {
  const store = createStore(memoryStorage());
  const run = newRun({ seed: 1234, tutorial: true });
  assert.deepEqual([run.name, run.evo.power, run.evo.toughness, run.hp], ['The Blank', 1, 1, 7]);
  enterNode(run, availableNodes(run.map, null)[0].id);
  const b = run.battle; const st = moveOptions(b)[0]; movePlayer(b, st.x, st.y); win(run);
  assert.equal(run.pending.cards.length, 3); assert.ok(run.pending.cards.includes(TUTORIAL_CARD)); assert.ok(run.pending.cards.every(id => id.startsWith('mtg:')));
  const ch = chooseReward(run, TUTORIAL_CARD); assert.equal(ch.kind, 'absorb');
  assert.equal(run.pending.tier, 'primer', 'v0.8: the Spell Primer follows the first victory'); skipReward(run);
  assert.deepEqual([run.evo.power, run.evo.toughness, run.evo.keywords.deathtouch], [2, 2, 1]);
  enterNode(run, availableNodes(run.map, run.current)[0].id);
  const p = player(run.battle); assert.deepEqual([p.power, p.toughness, p.keywords.deathtouch], [2, 2, 1]);
  const b2 = run.battle;
  for (let i = 0; i < 20 && b2.phase === 'player' && !attackTargets(b2).length; i++) {
    const tgt = b2.units.filter(u => u.side === 'enemy' && u.hp > 0)[0];
    const mv = moveOptions(b2).sort((a, c) => manhattan(a, tgt) - manhattan(c, tgt))[0]; if (mv) movePlayer(b2, mv.x, mv.y);
    if (!attackTargets(b2).length) endTurn(b2);
  }
  const t = attackTargets(b2).find(x => !x.legendary && !x.keywords.armor); t.statuses.shield = 0; t.hp = t.maxHp = 50; attack(b2, t.uid); assert.equal(t.hp, 0);
  store.saveRun(run); const back = store.loadRun().run; assert.deepEqual(back.evo, run.evo); assert.deepEqual(player(back.battle).keywords, { deathtouch: 1 });
});
test('wounds: a victory restores half the missing health; the next battle starts wounded', () => {
  const run = newRun({ seed: 77, tutorial: true }); enterNode(run, 0);
  const h = player(run.battle); h.hp = 3; run.battle.units.filter(u => u.side === 'enemy').forEach(u => (u.hp = 0)); run.battle.phase = 'won';
  concludeBattle(run); assert.equal(run.hp, 3 + Math.ceil((7 - 3) / 2)); assert.equal(woundsOf(run), 2);
  chooseReward(run, run.pending.cards.find(id => resolveCard(id).kind === 'spell')); skipReward(run);   // decline the Spell Primer (+1 Spark)
  enterNode(run, availableNodes(run.map, run.current)[0].id); assert.equal(player(run.battle).hp, 6, '5 + 1 from the declined primer Spark');
});
test('graft capacity (4/6/8 by act): when full you must release a graft; release is exact', () => {
  const run = newRun({ seed: 5 }); run.evo = ['mtg:grizzly-bears', 'mtg:storm-crow', 'mtg:typhoid-rats', 'mtg:savannah-lions'].reduce((e, id) => absorb(e, id).evo, newEvolution());
  assert.equal(graftCapacity(run), 4); run.phase = 'reward'; run.pending = { cards: ['mtg:wind-drake', 'mtg:shock', 'mtg:glory-seeker'], tier: 'battle' };
  assert.throws(() => chooseReward(run, 'mtg:glory-seeker'), /full/);
  const ch = chooseReward(run, 'mtg:glory-seeker', 1); assert.equal(ch.released, 'Storm Crow');
  assert.equal(run.evo.absorbed.length, 4); assert.equal(run.evo.keywords.flying, undefined); assert.deepEqual([run.evo.power, run.evo.toughness], [1 + 2 + 1 + 2 + 2, 1 + 2 + 1 + 1 + 2]);
  run.act = 1; assert.equal(graftCapacity(run), 6); run.act = 2; assert.equal(graftCapacity(run), 8);
});
test('Wayshrine offerings: up to 4 eligible choices, each works, persists and cannot be repeated', () => {
  const mk = () => { const r = newRun({ seed: 11 }); r.evo = absorb(absorb(newEvolution(), 'mtg:grizzly-bears').evo, 'mtg:storm-crow').evo; r.spellbook = [{ id: 'mtg:shock', level: 1 }]; r.hp = maxHpOf(r) - 4; r.phase = 'shrine'; r.current = r.map.nodes.find(n => n.depth === 2).id; return r; };
  const r0 = mk(); r0.shrine = { options: Object.keys(SHRINES) };
  assert.throws(() => shrineChoice({ ...r0, shrine: { options: ['spark'] } }, 'restoration'), /not available/);
  for (const k of Object.keys(SHRINES)) {
    const r = mk(); r.shrine = { options: [k] }; const max0 = maxHpOf(r), hp0 = r.hp;
    const res = shrineChoice(r, k, k === 'inscribe' ? 'mtg:shock' : k === 'graftsmith' ? 0 : undefined);
    assert.equal(r.shrine, null, k + ' consumes the shrine'); assert.throws(() => shrineChoice(r, k), /Not at a shrine/);
    if (k === 'restoration') { assert.equal(r.hp, maxHpOf(r)); assert.equal(r.wardNext, 3); }
    if (k === 'spark') assert.equal(maxHpOf(r), max0 + 3);
    if (k === 'arcane') assert.equal(runStats(r).maxMana, 4);
    if (k === 'inscribe') assert.equal(r.spellbook[0].level, 2);
    if (k === 'offering') { assert.equal(r.phase, 'reward'); assert.ok(r.hp < hp0); assert.equal(r.pending.cards.length, 3); }
    if (k === 'graftsmith') { assert.equal(r.phase, 'reward'); assert.equal(r.pending.tier, 'graftsmith'); assert.equal(r.evo.absorbed.length, 1); assert.ok(r.pending.cards.every(id => resolveCard(id).kind === 'creature')); assert.throws(() => chooseReward(r, 'mtg:shock')); }
    const store = createStore(memoryStorage()); store.saveRun(r); assert.deepEqual(store.loadRun().run.evo, r.evo, k + ' persists');
  }
  const r = mk(); r.sparkFonts = MAX_SPARK_FONTS; r.hp = maxHpOf(r); r.manaBonus = 2; r.spellbook = [];
  assert.ok(!SHRINES.spark.when(r) && !SHRINES.restoration.when({ ...r, wounds: 0 }) && !SHRINES.arcane.when(r) && !SHRINES.inscribe.when(r), 'limits stop repeated exploitation');
});
test('skip grants +1 Spark; invalid choices rejected', () => {
  const run = newRun({ seed: 9 }); run.phase = 'reward'; run.pending = { cards: ['mtg:shock', 'mtg:grizzly-bears', 'mtg:feat-of-resistance'] };
  assert.throws(() => chooseReward(run, 'mtg:fireball'), /Invalid reward/); skipReward(run); assert.equal(maxHpOf(run), 8);
});
test('save/load mid-battle; corrupted save recovers last good backup; invalid saves rejected', () => {
  const st = memoryStorage(); const store = createStore(st); const run = newRun({ seed: 77, tutorial: true }); enterNode(run, 0);
  store.saveRun(run); const back = store.loadRun().run; assert.deepEqual(back, JSON.parse(JSON.stringify(run))); assert.equal(botPlay(back.battle), 'won');
  run.sparkBonus = 2; store.saveRun(run); st.setItem(KEYS.run, st.getItem(KEYS.run).replace('"sparkBonus\\":2', '"sparkBonus\\":9'));
  const r = store.loadRun(); assert.ok(r.recovered); assert.equal(r.run.sparkBonus, 0); assert.ok(st.getItem(KEYS.run + '.corrupt'));
  const bad = newRun({ seed: 6 }); bad.evo.keywords.hexproof = 1; st.setItem(KEYS.run, _internal.wrap(RUN_VERSION, bad)); st.removeItem(KEYS.run + '.bak');
  assert.match(store.loadRun().error, /keyword hexproof/);
});
test('v0.4 (run v2) saves migrate without data loss: legacy grafts kept exactly, raw save preserved, idempotent', () => {
  const st = memoryStorage(); const store = createStore(st);
  const v04 = newRun({ seed: 42, tutorial: true });
  let evo = newEvolution(); for (const id of ['nightcap_toad', 'galecrest_roc', 'sable_adder']) evo = absorb(evo, id).evo;
  evo.power += evo.resonance; evo.toughness += evo.resonance; // v0.4 baked Resonance into stats
  const old = { ...JSON.parse(JSON.stringify(v04)), v: 2, contentMode: 'original', evo, spellbook: [{ id: 'ember_dart', level: 2 }, { id: 'mtg:shock', level: 1 }] };
  for (const k of ['act', 'actHistory', 'manaBonus', 'sparkFonts', 'wardNext', 'hp', 'shrine']) delete old[k];
  const raw = _internal.wrap(2, old); st.setItem(KEYS.run, raw);
  const r = store.loadRun(); assert.ok(r.migrated); assert.equal(r.run.v, 5); assert.equal(r.run.act, 0);
  assert.deepEqual(r.run.evo.absorbed.map(a => a.cardId), ['nightcap_toad', 'galecrest_roc', 'sable_adder'], 'legacy cards never swapped');
  assert.deepEqual([r.run.evo.power, r.run.evo.toughness], [evo.power, evo.toughness]); assert.equal(r.run.evo.legacyResonance, 1); assert.equal(r.run.evo.resonance, 0);
  assert.deepEqual(r.run.spellbook, old.spellbook); assert.equal(st.getItem(KEYS.run + '.pre-v2'), raw, 'untouched v0.4 save kept');
  const again = store.loadRun(); assert.ok(!again.migrated); assert.deepEqual(again.run, r.run, 'idempotent');
  enterNode(again.run, availableNodes(again.run.map, again.run.current)[0].id); assert.equal(botPlay(again.run.battle, 60) !== 'timeout', true, 'migrated run is playable');
  st.setItem(KEYS.run, _internal.wrap(99, old)); st.removeItem(KEYS.run + '.bak'); assert.equal(store.loadRun().run, null, 'future versions refused (kept as .corrupt)');
});
test('meta: achievements, unlocks, settings; v0.4 meta (v3) drops the old card-source setting', () => {
  const st = memoryStorage(); const store = createStore(st); const meta = newMeta();
  const got = evaluateAchievements(meta, { event: 'bossDown', act: 0, battleStats: { damageTaken: 1 }, attacks: 1 }); assert.ok(got.some(a => a.id === 'thornmother'));
  st.setItem(KEYS.meta, _internal.wrap(3, { v: 3, unlocks: { firstVictory: true }, settings: { sound: false, contentMode: 'original' } }));
  const m = store.loadMeta(); assert.equal(m.settings.sound, false); assert.equal(m.settings.contentMode, undefined); assert.ok(m.unlocks.firstVictory);
});
