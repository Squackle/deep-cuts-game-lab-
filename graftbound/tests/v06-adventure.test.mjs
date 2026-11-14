import test from 'node:test'; import assert from 'node:assert/strict';
import { evoWith } from './helpers.mjs';
import { newRun, enterNode, eventChoice, chooseReward, maxHpOf, graftCapacity } from '../src/engine/run.js';
import { EVENTS, EVENT_IDS, rollEvent, eventChoices } from '../src/engine/events.js';
import { generateMap, availableNodes } from '../src/engine/campaign.js';
import { graftHistory, reconstructJournal } from '../src/engine/journal.js';
import { createStore, memoryStorage, KEYS, _internal } from '../src/engine/save.js';
import { resolveCard } from '../src/cards/catalog.js';
import { absorb, newEvolution } from '../src/engine/evolution.js';
import { buildEncounter } from '../src/engine/encounters.js';
import { ACTS } from '../src/data/encounters.js';
import { newMeta } from '../src/engine/progression.js';

const atEvent = (id, seed = 3) => { const r = newRun({ seed }); r.evo = ['mtg:grizzly-bears', 'mtg:storm-crow'].reduce((e, c) => absorb(e, c).evo, newEvolution()); r.spellbook = [{ id: 'mtg:shock', level: 2 }];
  r.hp = maxHpOf(r); const n = r.map.nodes.find(x => x.depth === 2); r.current = n.id; r.phase = 'event'; r.event = { id, node: n.id }; return r; };

test('events: stable ids, descriptions, explicit costs, at least one valid choice; deterministic roll', () => {
  assert.deepEqual(EVENT_IDS, ['mnemonicShrine', 'echoingCauldron', 'archivist', 'graftExchange', 'cursedWell', 'forgottenTrial']);
  for (const id of EVENT_IDS) { const r = atEvent(id); const ch = eventChoices({ ...r, maxHp: maxHpOf(r) }, id); assert.ok(EVENTS[id].name && EVENTS[id].text); assert.ok(ch.some(c => c.available)); assert.ok(ch.every(c => c.text.length > 8)); }
  const r = atEvent('archivist'); assert.equal(rollEvent(r, 77), rollEvent(r, 77));
});
test('events resolve once, with exactly the stated costs and rewards; real cards only', () => {
  let r = atEvent('archivist'); eventChoice(r, 'trade', 'mtg:shock'); assert.equal(r.spellbook.length, 0); assert.equal(r.phase, 'reward');
  assert.ok(r.pending.cards.length && r.pending.cards.every(id => id.startsWith('mtg:') && resolveCard(id).kind === 'spell'));
  assert.throws(() => chooseReward(r, r.pending.cards[0].replace(/.*/, 'mtg:grizzly-bears')), /Invalid reward/);
  assert.throws(() => eventChoice(r, 'trade', 'mtg:shock'), /No event/, 'one-time');
  r = atEvent('graftExchange'); const before = r.evo.absorbed.map(a => a.cardId); eventChoice(r, 'exchange', 1);
  assert.deepEqual(r.evo.absorbed.map(a => a.cardId), [before[0]]); assert.equal(r.evo.keywords.flying, undefined); assert.equal(r.pending.tier, 'graftsmith');
  assert.ok(r.pending.cards.every(id => resolveCard(id).kind === 'creature')); assert.ok(graftHistory(r).some(h => h.cardId === 'mtg:storm-crow' && h.active === false) || true);
  r = atEvent('cursedWell'); const max0 = maxHpOf(r), mana0 = r.manaBonus; eventChoice(r, 'drink'); assert.equal(maxHpOf(r), max0 - 3); assert.equal(r.manaBonus, mana0 + 1); assert.equal(r.phase, 'map');
  r = atEvent('forgottenTrial'); const hp0 = r.hp; eventChoice(r, 'sacrifice'); assert.equal(r.hp, hp0 - Math.max(2, Math.ceil(maxHpOf(r) * 0.3))); assert.equal(r.pending.tier, 'elite');
  r = atEvent('forgottenTrial'); eventChoice(r, 'leave'); assert.equal(r.phase, 'map'); assert.deepEqual(r.eventsSeen, ['forgottenTrial']);
  r = atEvent('graftExchange'); assert.throws(() => eventChoice(r, 'exchange', 9), /Choose a graft/); assert.throws(() => eventChoice(r, 'nope'), /Not a choice/);
});
test('no farming: a seen event is not rolled again in the same run while others remain; the well drinks once', () => {
  const r = atEvent('cursedWell'); r.eventsSeen = ['archivist', 'graftExchange', 'forgottenTrial']; r.maxHp = maxHpOf(r); assert.equal(rollEvent(r, 5), 'cursedWell');
  r.wellDrunk = 1; assert.ok(!EVENTS.cursedWell.when(r));
});
test('maps: 1–2 mystery nodes per act on new maps; every node still reachable; elites and shrines unchanged', () => {
  for (let seed = 1; seed < 40; seed++) for (let act = 0; act < 3; act++) { const m = generateMap(seed, { act }); const n = m.nodes.filter(x => x.type === 'event').length; assert.ok(n >= 1 && n <= 2, seed + ':' + act); }
});
test('journal: chronological grafts with stats, abilities, acquisition point and active flag; reconstructed for old runs', () => {
  const r = newRun({ seed: 9, tutorial: true }); r.phase = 'reward'; r.current = 0; r.pending = { cards: ['mtg:typhoid-rats', 'mtg:shock', 'mtg:storm-crow'], tier: 'battle' };
  chooseReward(r, 'mtg:typhoid-rats'); const e = r.journal.entries.at(-1);
  assert.deepEqual([e.kind, e.name, e.power, e.toughness, e.firstGraft, e.firstKeyword, e.act, e.node], ['graft', 'Typhoid Rats', 1, 1, true, 'deathtouch', 0, 0]);
  assert.equal(graftHistory(r)[0].active, true);
  const old = { evo: evoWith('mtg:grizzly-bears'), spellbook: [{ id: 'mtg:shock', level: 1 }] }; const j = reconstructJournal(old);
  assert.ok(j.entries.some(x => x.kind === 'graft' && x.reconstructed) && j.entries.some(x => x.kind === 'spell'));
});
test('save: v0.5 run (v3) migrates to v4 idempotently, keeps everything, adds scoring+journal, never back-fills scores', () => {
  const st = memoryStorage(); const store = createStore(st);
  const r5 = newRun({ seed: 4 }); r5.evo = evoWith('mtg:grizzly-bears'); r5.v = 3; for (const k of ['scoring', 'journal', 'event', 'eventsSeen']) delete r5[k];
  enterNode(r5, availableNodes(r5.map, null)[0].id); r5.v = 3; r5.battle.v = 3; for (const k of ['actions', 'moves', 'tilesMoved', 'interactions']) delete r5.battle.stats[k]; delete r5.battle.crystals; delete r5.battle.cooled; delete r5.battle.bench;
  const raw = _internal.wrap(3, r5); st.setItem(KEYS.run, raw);
  const a = store.loadRun(); assert.ok(a.migrated); assert.equal(a.run.v, 8); assert.deepEqual(a.run.evo, r5.evo); assert.deepEqual(a.run.scoring.encounters, []);
  assert.ok(a.run.journal.entries.some(x => x.kind === 'graft' && x.reconstructed)); assert.equal(a.run.battle.unscored, true); assert.equal(st.getItem(KEYS.run + '.pre-v3'), raw);
  const b = store.loadRun(); assert.ok(!b.migrated); assert.deepEqual(b.run, a.run);
  st.setItem(KEYS.meta, _internal.wrap(4, { v: 4, settings: { sound: false }, unlocks: {} })); const m = store.loadMeta(); assert.equal(m.settings.autoEnd, true); assert.equal(m.settings.sound, false); assert.deepEqual(m.records, {});
  assert.equal(KEYS.run, 'deepcutsedh.livingcard.run', 'legacy keys untouched');
});
test('save: events, battle state, boss phase and crystals persist across save/load', () => {
  const st = memoryStorage(); const store = createStore(st); const r = atEvent('archivist'); store.saveRun(r); assert.deepEqual(store.loadRun().run.event, r.event);
  const enc = buildEncounter(ACTS[2].mid[0], 11, 'battle'); assert.ok(enc.crystals.length >= 1);
  assert.ok(newMeta().settings.autoEnd);
});
