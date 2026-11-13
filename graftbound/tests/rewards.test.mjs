import test from 'node:test'; import assert from 'node:assert/strict';
import './helpers.mjs';
import { buildReferenceSet } from '../src/cards/reference-set.js';
import { REAL_CREATURES, REAL_SPELLS } from '../src/cards/real-pool.js';
import { ATTACHMENT_FACTS } from '../src/cards/attachments.js';
import { resolveCard, rewardCards, isLegacy } from '../src/cards/catalog.js';
import { ALL_CARDS } from '../src/data/cards.js';
import { generatePack, cardPool } from '../src/engine/rewards.js';
import { powerRating, graftRating, creatureBudget } from '../src/engine/power.js';
import { newEvolution } from '../src/engine/evolution.js';
import { evoWith } from './helpers.mjs';

const REAL_NAMES = new Set([...REAL_CREATURES, ...REAL_SPELLS, ...ATTACHMENT_FACTS].map(c => c.name));
const isReal = id => { const c = resolveCard(id); return !!(c && c.reference && !c.legacy && REAL_NAMES.has(c.name) && id.startsWith('mtg:')); };
test('the reward pool is ONLY curated real Magic cards: 50 creatures + 13 spells, all pass compatibility', () => {
  const { cards, rejected } = buildReferenceSet(); assert.deepEqual(rejected, []);
  assert.ok(REAL_CREATURES.length >= 45 && REAL_SPELLS.length >= 12);
  assert.equal(rewardCards().length, cards.length); assert.ok(rewardCards().every(c => isReal(c.id)));
  assert.ok(!rewardCards().some(c => ALL_CARDS.some(o => o.id === c.id)), 'no original/fictional card can be offered');
});
test('every pack of every tier contains only real cards (tutorial, battle, elite, boss, shrine, graftsmith)', () => {
  for (let seed = 1; seed < 400; seed++) for (const tier of ['battle', 'elite', 'boss', 'shrine']) {
    const pk = generatePack(seed, { tier, step: seed % 24, evo: newEvolution() });
    assert.equal(pk.length, 3); assert.ok(pk.every(isReal), tier + ' ' + pk); assert.equal(new Set(pk).size, 3);
    assert.ok(pk.some(id => resolveCard(id).kind === 'creature') && pk.some(id => resolveCard(id).kind !== 'creature'));
  }
  const gs = generatePack(9, { tier: 'elite', step: 10, creaturesOnly: true }); assert.ok(gs.length === 3 && gs.every(id => isReal(id) && resolveCard(id).kind === 'creature'));
  const tut = generatePack(3, { forced: ['mtg:typhoid-rats'], step: 0 }); assert.ok(tut.includes('mtg:typhoid-rats') && tut.every(isReal));
  assert.ok(!generatePack(3, { forced: ['nightcap_toad'], step: 0 }).includes('nightcap_toad'), 'a forced legacy id is ignored');
});
test('early packs are modest: no creature above the opening budget (≈ 2/2 vanilla) at step 0', () => {
  for (let seed = 1; seed < 300; seed++) {
    for (const id of generatePack(seed, { step: 0 })) { const c = resolveCard(id); if (c.kind === 'creature') assert.ok(powerRating(c) <= creatureBudget(0), c.name + ' ' + powerRating(c)); }
  }
  const early = cardPool({ step: 0 }).filter(c => c.kind === 'creature');
  assert.ok(!early.some(c => ['Vampire Nighthawk', 'Colossal Dreadmaw', 'Serra Angel', 'Charging Monstrosaur', 'Gifted Aetherborn', 'Ancient Brontodon'].includes(c.name)));
  assert.ok(early.every(c => c.power + c.toughness <= 4));
});
test('strong cards unlock with progress; elite/boss tiers reach higher; rating ≠ Magic rarity', () => {
  const at = (n, step, tier) => cardPool({ step, tier }).some(c => c.name === n);
  assert.ok(!at('Vampire Nighthawk', 8) && at('Vampire Nighthawk', 22, 'boss'));
  assert.ok(!at('Colossal Dreadmaw', 6) && at('Colossal Dreadmaw', 18));
  assert.ok(at('Serra Angel', 14, 'elite') && !at('Serra Angel', 6, 'elite'));
  const dread = rewardCards().find(c => c.name === 'Colossal Dreadmaw'), nighthawk = rewardCards().find(c => c.name === 'Vampire Nighthawk');
  assert.equal(dread.rarity, 'common'); assert.ok(powerRating(dread) > powerRating(rewardCards().find(c => c.name === 'Mahamoti Djinn')) - 1, 'commons can be strong');
  assert.ok(powerRating(nighthawk) > powerRating(rewardCards().find(c => c.name === 'Mahamoti Djinn')), 'keyword combos count');
});
test('synergy: ratings measure what a graft ADDS (duplicate abilities add little, new combos add more)', () => {
  const rats = resolveCard('mtg:typhoid-rats'), crow = resolveCard('mtg:storm-crow');
  assert.ok(graftRating(rats, evoWith('mtg:pharika-s-chosen')) < graftRating(rats, newEvolution()));
  assert.ok(graftRating(crow, evoWith('mtg:typhoid-rats')) > graftRating(crow, newEvolution()), 'flying+deathtouch combo');
});
test('duplicate spells level up and drop out of packs at level 3', () => {
  assert.ok(!cardPool({ step: 10, spellbook: [{ id: 'mtg:shock', level: 3 }] }).some(c => c.id === 'mtg:shock'));
  assert.ok(cardPool({ step: 10, spellbook: [{ id: 'mtg:shock', level: 2 }] }).some(c => c.id === 'mtg:shock'));
});
test('legacy original cards still resolve (for old saves) and are flagged as legacy', () => {
  assert.ok(resolveCard('nightcap_toad') && isLegacy('nightcap_toad') && resolveCard('nightcap_toad').legacy);
  assert.ok(!isLegacy('mtg:typhoid-rats'));
});
