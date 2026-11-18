import test from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { LEGENDARY_BOSSES, BOSS_BY_ID, BOSS_CARD_IDS, isBossCard } from '../src/data/legendary.js';
import { toGameCard } from '../src/cards/compatibility.js';
import { registerReferenceCards, referenceCards, resolveCard, rewardCards } from '../src/cards/catalog.js';
import { cardPool, generatePack } from '../src/engine/rewards.js';
import { newEvolution, absorb } from '../src/engine/evolution.js';
import { newRun, chooseReward } from '../src/engine/run.js';

const bosses = LEGENDARY_BOSSES.flat();

test('every current and future registered boss identity is reserved directly from the encounter roster', () => {
  assert.equal(bosses.length, Object.keys(BOSS_BY_ID).length);
  assert.equal(BOSS_CARD_IDS.length, bosses.length);
  for (const b of bosses) {
    const cardId = 'mtg:' + b.name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    assert.ok(BOSS_CARD_IDS.includes(cardId), b.name);
    assert.equal(isBossCard(cardId), true, b.name + ' card ID');
    assert.equal(isBossCard(b.name.toUpperCase()), true, b.name + ' case-insensitive name');
    assert.equal(isBossCard({ name: b.name }), true, b.name + ' by name');
    assert.equal(isBossCard({ id: cardId, name: 'Some other card' }), true, b.name + ' by ID');
  }
  assert.equal(isBossCard('mtg:brimaz-king-of-oreskos'), false, 'nonboss legendary grafts remain allowed');
  assert.equal(isBossCard('mtg:sheoldred-the-apocalypse'), false, 'nonboss mythics remain allowed');
});

test('boss creature records cannot enter the playable real-card pool even with valid stats', () => {
  for (const b of bosses) {
    const record = {
      source: 'scryfall', name: b.name, typeLine: 'Legendary Creature — ' + (b.tribe || 'Creature'),
      power: b.power, toughness: b.toughness, keywords: [], colors: ['G'], rarity: 'mythic',
      cmc: 4, manaCost: '{2}{G}{G}', oracleText: ''
    };
    const result = toGameCard(record);
    assert.equal(result.ok, false, b.name);
    assert.match(result.reasons.join(' '), /boss identity is encounter-only/i);
  }
});

test('reward catalog rejects a whole registration batch atomically when it contains a boss', () => {
  const before = referenceCards().map(c => c.id);
  const harmless = { id: 'mtg:boss-guard-test-nonboss', name: 'Nonboss regression fixture', reference: true, kind: 'creature' };
  const boss = { id: BOSS_CARD_IDS[0], name: bosses[0].name, reference: true, kind: 'creature' };
  assert.throws(() => registerReferenceCards([harmless, boss]), /Boss creatures are encounter-only/);
  assert.deepEqual(referenceCards().map(c => c.id), before, 'a rejected batch never installs partial rewards');
  assert.equal(resolveCard(harmless.id), null);
  assert.ok(!rewardCards().some(c => isBossCard(c)));
});

test('every booster tier and creature-only reward excludes every encounter boss', () => {
  for (const tier of ['battle', 'elite', 'boss', 'shrine']) {
    const eligible = cardPool({ step: 23, tier });
    assert.ok(eligible.length > 0);
    assert.ok(eligible.every(c => !isBossCard(c)), tier + ' cardPool');
    for (let seed = 1; seed <= 80; seed++) {
      for (const creaturesOnly of [false, true]) {
        const pack = generatePack(seed, { tier, step: 23, creaturesOnly });
        assert.ok(pack.length > 0, tier + ' ' + seed);
        assert.ok(pack.every(id => !isBossCard(id)), tier + ' ' + seed);
      }
    }
  }
  for (const cardId of BOSS_CARD_IDS) {
    assert.ok(!generatePack(5, { tier: 'boss', step: 23, forced: [cardId] }).includes(cardId), cardId);
  }
});

test('direct grafting and forced pending reward choices reject bosses without mutating a run', () => {
  for (const b of bosses) {
    const id = BOSS_CARD_IDS[bosses.indexOf(b)];
    const forgedCreature = { id, name: b.name, kind: 'creature', power: b.power, toughness: b.toughness, keywords: {}, parts: {} };
    const base = newEvolution();
    const before = JSON.stringify(base);
    assert.throws(() => absorb(base, forgedCreature), /Boss creatures are encounter-only/);
    assert.throws(() => absorb(base, id), /Boss creatures are encounter-only/);
    assert.equal(JSON.stringify(base), before);
    const run = newRun({ seed: 283 });
    run.phase = 'reward';
    run.pending = { tier: 'boss', cards: [id] };
    const runBefore = JSON.stringify(run);
    assert.throws(() => chooseReward(run, id), /Boss creatures are encounter-only/);
    assert.equal(JSON.stringify(run), runBefore, b.name + ' must not alter run state');
  }
});
