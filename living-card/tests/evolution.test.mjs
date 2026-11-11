import test from 'node:test'; import assert from 'node:assert/strict';
import { newEvolution, absorb, deriveStats, STARTING_NAME } from '../src/engine/evolution.js';
import { deriveAppearance, MAX_EFFECTS } from '../src/engine/appearance.js';
import { CREATURES, SPELLS, ALL_CARDS } from '../src/data/cards.js';
import { KEYWORDS } from '../src/data/keywords.js';
import { evoWith } from './helpers.mjs';

test('starting creature: The Blank, 1/1, no abilities, nothing absorbed', () => {
  const e = newEvolution(); assert.equal(STARTING_NAME, 'The Blank');
  assert.deepEqual([e.power, e.toughness, e.keywords, e.absorbed], [1, 1, {}, []]);
});
test('blank 1/1 absorbing a 2/2 deathtouch becomes 3/3 deathtouch', () => {
  const { evo, change } = absorb(newEvolution(), 'nightcap_toad');
  assert.equal(evo.power, 3); assert.equal(evo.toughness, 3);
  assert.equal(evo.keywords.deathtouch, 1); assert.deepEqual(change.gained, ['deathtouch']);
  assert.equal(evo.absorbed[0].name, 'Nightcap Toad');
});
test('3/3 deathtouch absorbing a 3/2 flier becomes 6/5 deathtouch + flying', () => {
  const e = evoWith('nightcap_toad', 'galecrest_roc');
  assert.deepEqual([e.power, e.toughness], [6, 5]); assert.deepEqual(Object.keys(e.keywords).sort(), ['deathtouch', 'flying']);
});
test('absorb never mutates the input evolution', () => {
  const e0 = newEvolution(); absorb(e0, 'nightcap_toad'); assert.equal(e0.power, 1); assert.deepEqual(e0.keywords, {});
});
test('rejects non-creatures and unknown keywords', () => {
  assert.throws(() => absorb(newEvolution(), 'ember_dart'));
  assert.throws(() => absorb(newEvolution(), { id: 'x', kind: 'creature', power: 1, toughness: 1, keywords: { hexproof: 1 } }), /Unsupported keyword/);
});
test('duplicate flag keyword converts to Resonance (+1/+1)', () => {
  const e = absorb(newEvolution(), 'nightcap_toad').evo; const r = absorb(e, 'sable_adder');
  assert.equal(r.change.resonance, 1); assert.equal(r.evo.power, 5); assert.equal(r.evo.toughness, 5);
  assert.equal(r.evo.keywords.deathtouch, 1); assert.equal(r.evo.keywords.firstStrike, 1);
});
test('stack keywords add and overflow past cap converts to Resonance', () => {
  const e = evoWith('cairnshell_tortoise', 'cairnshell_tortoise', 'cairnshell_tortoise');
  assert.equal(e.keywords.ward, 6); assert.equal(e.resonance, 0);
  const r = absorb(e, 'cairnshell_tortoise'); assert.equal(r.evo.keywords.ward, 6); assert.equal(r.change.resonance, 2); assert.deepEqual(r.change.raised, []);
});
test('derived stats: health = spark + 2*toughness; flying/haste add movement; attuned adds mana', () => {
  const s0 = deriveStats(newEvolution()); assert.equal(s0.maxHealth, 7); assert.equal(s0.move, 3); assert.equal(s0.maxMana, 3);
  const e = evoWith('hollow_owl', 'ridgehorn_boar'); const s = deriveStats(e);
  assert.equal(s.move, 5); assert.equal(s.maxMana, 4); assert.equal(s.manaRegen, 2); assert.equal(s.startMana, 2);
  assert.equal(deriveStats(e, { sparkBonus: 3 }).maxHealth, 8 + 2 * e.toughness);
});
test('appearance: slots, priority, dormant parts, effect cap, growth', () => {
  const a0 = deriveAppearance(newEvolution()); assert.equal(a0.stage, 'blank'); assert.deepEqual(a0.slots, {});
  const a1 = deriveAppearance(evoWith('nightcap_toad')); assert.deepEqual(a1.effects, ['venom']); assert.ok(a1.size > a0.size); assert.notDeepEqual(a1.body, a0.body);
  const a2 = deriveAppearance(evoWith('cairnshell_tortoise', 'ashwing_kestrel'));
  assert.equal(a2.slots.back.part, 'wings'); assert.ok(a2.dormant.includes('shell'));
  const a3 = deriveAppearance(evoWith('cairnshell_tortoise', 'cairnshell_tortoise', 'ashwing_kestrel'));
  assert.equal(a3.slots.back.part, 'shell'); assert.equal(a3.slots.back.tier, 2);
  const a4 = deriveAppearance(evoWith('nightcap_toad', 'inkwell_wisp', 'mossback_brute', 'bloodmoss_leech'));
  assert.equal(a4.effects.length, MAX_EFFECTS); assert.ok(a4.dormant.length >= 2);
});
test('card data integrity', () => {
  assert.ok(ALL_CARDS.length >= 20 && ALL_CARDS.length <= 30, 'count ' + ALL_CARDS.length);
  const ids = new Set(); for (const c of ALL_CARDS) { assert.ok(!ids.has(c.id)); ids.add(c.id); }
  for (const c of CREATURES) for (const k of Object.keys(c.keywords)) assert.ok(KEYWORDS[k], k);
  assert.ok(new Set(CREATURES.flatMap(c => Object.keys(c.keywords))).size >= 10);
  assert.ok(SPELLS.length >= 8); assert.ok(new Set(SPELLS.map(s => s.category)).size >= 8, 'spell categories');
});
