import test from 'node:test'; import assert from 'node:assert/strict';
import { newEvolution, absorb, deriveStats, rebuild, STARTING_NAME, RESONANCE_SPARK } from '../src/engine/evolution.js';
import { deriveAppearance, MAX_EFFECTS } from '../src/engine/appearance.js';
import { resolveCard } from '../src/cards/catalog.js';
import { evoWith } from './helpers.mjs';
const R = id => resolveCard('mtg:' + id);

test('starting creature: The Blank, 1/1, no abilities, nothing grafted, 7 health', () => {
  const e = newEvolution(); assert.equal(STARTING_NAME, 'The Blank');
  assert.deepEqual([e.power, e.toughness, e.keywords, e.absorbed], [1, 1, {}, []]); assert.equal(deriveStats(e).maxHealth, 7);
});
test('grafting stays fully additive with REAL printed stats: Blank + Typhoid Rats (1/1 Deathtouch) = 2/2 Deathtouch', () => {
  const { evo, change } = absorb(newEvolution(), R('typhoid-rats'));
  assert.deepEqual([evo.power, evo.toughness, evo.keywords], [2, 2, { deathtouch: 1 }]); assert.deepEqual(change.gained, ['deathtouch']);
  assert.equal(evo.absorbed[0].name, 'Typhoid Rats');
});
test('2/2 Deathtouch + Snapping Drake (3/2 Flying) = 5/4 Deathtouch + Flying', () => {
  const e = evoWith('mtg:typhoid-rats', 'mtg:snapping-drake');
  assert.deepEqual([e.power, e.toughness], [5, 4]); assert.deepEqual(Object.keys(e.keywords).sort(), ['deathtouch', 'flying']);
});
test('absorb never mutates its input; rejects spells and unknown keywords', () => {
  const e0 = newEvolution(); absorb(e0, R('grizzly-bears')); assert.equal(e0.power, 1);
  assert.throws(() => absorb(newEvolution(), R('shock')));
  assert.throws(() => absorb(newEvolution(), { id: 'x', kind: 'creature', power: 1, toughness: 1, keywords: { hexproof: 1 } }), /Unsupported keyword/);
});
test('Resonance (v0.5): a duplicate ability grants +2 Spark, NOT +1/+1', () => {
  const a = evoWith('mtg:typhoid-rats'); const r = absorb(a, R('pharika-s-chosen'));
  assert.equal(r.change.resonance, 1); assert.deepEqual([r.evo.power, r.evo.toughness], [3, 3], 'only printed stats added');
  assert.equal(deriveStats(r.evo).maxHealth, 6 + 3 + RESONANCE_SPARK);
});
test('Health (v0.5) = Spark 6 + Toughness (no longer 2×) — a 9/9 Brontodon adds 9 health, not 18', () => {
  const big = evoWith('mtg:ancient-brontodon'); assert.equal(deriveStats(big).maxHealth, 6 + 10);
  const s = deriveStats(evoWith('mtg:storm-crow', 'mtg:raging-goblin')); assert.equal(s.move, 5);
  assert.equal(deriveStats(newEvolution(), { manaBonus: 1 }).maxMana, 4);
});
test('rebuild() reproduces an evolution from its graft list (Graftsmith / graft release)', () => {
  const cards = ['mtg:typhoid-rats', 'mtg:wind-drake', 'mtg:grizzly-bears'].map(resolveCard);
  const e = rebuild(cards); const e2 = evoWith(...cards); assert.deepEqual(e, e2);
  const without = rebuild([cards[0], cards[2]]); assert.equal(without.keywords.flying, undefined); assert.deepEqual([without.power, without.toughness], [4, 4]);
});
test('visual traits come from abilities AND creature types; slots resolve; effects capped', () => {
  const a0 = deriveAppearance(newEvolution()); assert.equal(a0.stage, 'blank'); assert.deepEqual(a0.slots, {});
  const a1 = deriveAppearance(evoWith('mtg:typhoid-rats')); assert.ok(a1.effects.includes('venom') && a1.slots.rear.part === 'tail');
  const a2 = deriveAppearance(evoWith('mtg:serra-angel')); assert.equal(a2.slots.back.part, 'wings'); assert.ok(a2.effects.includes('aura'));
  const a3 = deriveAppearance(evoWith('mtg:youthful-knight')); assert.equal(a3.slots.body.part, 'armor'); assert.equal(a3.slots.head.part, 'crown');
  const a4 = deriveAppearance(evoWith('mtg:typhoid-rats', 'mtg:gifted-aetherborn', 'mtg:child-of-night', 'mtg:elvish-warrior'));
  assert.equal(a4.effects.length, MAX_EFFECTS); assert.ok(a4.dormant.length >= 1);
});
