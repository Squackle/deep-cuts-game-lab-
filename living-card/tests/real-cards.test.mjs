import test from 'node:test'; import assert from 'node:assert/strict';
import { buildReferenceSet, installReferenceSet } from '../src/cards/reference-set.js';
import { REAL_CREATURES, REAL_SPELLS } from '../src/cards/real-pool.js';
import { slug, partsFor } from '../src/cards/compatibility.js';
import { resolveCard, catalogCards } from '../src/cards/catalog.js';
import { generatePack, cardPool, maxManaValue } from '../src/engine/rewards.js';
import { newRun, enterNode, concludeBattle, chooseReward } from '../src/engine/run.js';
import { availableNodes } from '../src/engine/campaign.js';
import { absorb, newEvolution } from '../src/engine/evolution.js';
import { deriveAppearance } from '../src/engine/appearance.js';
import { createLiveCards, checkFacts } from '../src/cards/live.js';
import { createStore, memoryStorage } from '../src/engine/save.js';
import { cast, player, enemies } from '../src/engine/combat.js';
import { arena, botPlay } from './helpers.mjs';

installReferenceSet();

test('every curated real card passes the compatibility layer (nothing unmodeled sneaks in)', () => {
  const { cards, rejected } = buildReferenceSet();
  assert.deepEqual(rejected, []);
  assert.equal(cards.length, REAL_CREATURES.length + REAL_SPELLS.length);
  assert.equal(new Set(cards.map(c => c.id)).size, cards.length, 'unique ids');
  assert.ok(REAL_CREATURES.length >= 24 && REAL_SPELLS.length >= 8);
});
test('real card facts map exactly onto the additive evolution rules', () => {
  const hawk = resolveCard('mtg:vampire-nighthawk');
  assert.deepEqual([hawk.power, hawk.toughness, Object.keys(hawk.keywords).sort()], [2, 3, ['deathtouch', 'flying', 'lifelink']]);
  assert.equal(hawk.sourceInfo.manaCost, '{1}{B}{B}'); assert.equal(hawk.mv, 3); assert.equal(hawk.color, 'umbral');
  const { evo } = absorb(newEvolution(), hawk);
  assert.deepEqual([evo.power, evo.toughness], [3, 4]); assert.equal(Object.keys(evo.keywords).length, 3);
  const angel = resolveCard('mtg:serra-angel'); assert.equal(angel.sourceInfo.oracleText, 'Flying, vigilance');
  assert.equal(resolveCard('mtg:grizzly-bears').sourceInfo.oracleText, '', 'vanilla');
});
test('creature types and keywords become visible body traits', () => {
  assert.deepEqual(partsFor({ flying: 1, vigilance: 1 }, 'Creature — Angel'), { wings: 1, antlers: 1, aura: 1 });
  assert.ok(partsFor({}, 'Creature — Dinosaur').horns && partsFor({}, 'Creature — Dinosaur').bulk);
  assert.ok(partsFor({ firstStrike: 1 }, 'Creature — Human Knight').armor);
  for (const c of catalogCards({ includeReference: true }).filter(c => c.reference && c.kind === 'creature')) assert.ok(Object.keys(c.parts).length, c.name + ' has a visual trait');
  const ap = deriveAppearance(absorb(newEvolution(), resolveCard('mtg:youthful-knight')).evo);
  assert.equal(ap.slots.body.part, 'armor');
});
test('real spells are adaptations of modeled effects, with honest notes and working numbers', () => {
  const bolt = resolveCard('mtg:lightning-bolt'); assert.equal(bolt.effect, 'ember_dart'); assert.match(bolt.adaptationNote, /3-damage/);
  const s = arena(['t...', '....', 'P...'], { t: 'tortoise' }, { spellbook: [{ id: 'mtg:lightning-bolt', level: 1 }, { id: 'mtg:flame-slash', level: 1 }, { id: 'mtg:drain-life', level: 1 }] });
  s.p.mana = 9; const t = enemies(s)[0]; t.hp = t.maxHp = 20;
  cast(s, 'mtg:lightning-bolt', 0, 0); assert.equal(t.hp, 17);
  cast(s, 'mtg:flame-slash', 0, 0); assert.equal(t.hp, 13); assert.equal(s.p.mana, 9 - 1 - 2);
  player(s).hp = 2; cast(s, 'mtg:drain-life', 0, 0); assert.equal(t.hp, 10); assert.equal(player(s).hp, 5);
  for (const sp of REAL_SPELLS) assert.ok(resolveCard('mtg:' + slug(sp.name)).adaptationNote, sp.name);
});
test('Real-cards mode pool: real cards plus only the originals that add uncovered mechanics', () => {
  const pool = catalogCards({ includeReference: true }); const ids = new Set(pool.map(c => c.id));
  assert.ok(!ids.has('ridgehorn_boar') && !ids.has('nightcap_toad') && !ids.has('ember_dart'), 'covered originals removed');
  assert.ok(ids.has('longneck_heron') && ids.has('cairnshell_tortoise') && ids.has('inkwell_wisp') && ids.has('venom_mist'), 'unique mechanics kept');
  assert.ok(pool.filter(c => c.reference).length > pool.filter(c => !c.reference).length, 'real cards dominate');
  assert.ok(!catalogCards().some(c => c.reference), 'original mode has no real cards');
});
test('mana value gates big real creatures to later depths', () => {
  assert.equal(maxManaValue(0), 2); assert.equal(maxManaValue(3, 'elite'), 6);
  assert.ok(!cardPool({ includeReference: true, depth: 0 }).some(c => c.mv > 2));
  assert.ok(cardPool({ includeReference: true, depth: 4 }).some(c => c.id === 'mtg:colossal-dreadmaw'));
  for (let seed = 1; seed < 200; seed++) {
    const d = seed % 7; const pk = generatePack(seed, { includeReference: true, depth: d }).map(resolveCard);
    assert.equal(pk.length, 3); assert.ok(pk.every(c => c.mv == null || c.mv <= maxManaValue(d)));
    assert.ok(pk.some(c => c.kind === 'creature') && pk.some(c => c.kind === 'spell'));
  }
});
test('Real-cards adventure: tutorial still guarantees the 2/2 deathtouch, real cards appear and save/load', () => {
  const run = newRun({ seed: 99, tutorial: true, contentMode: 'reference' });
  enterNode(run, availableNodes(run.map, null)[0].id); botPlay(run.battle, 60); concludeBattle(run);
  assert.ok(run.pending.cards.includes('nightcap_toad'));
  assert.ok(run.pending.cards.some(id => resolveCard(id).reference), 'a real card in the first pack');
  const real = run.pending.cards.find(id => resolveCard(id).reference && resolveCard(id).kind === 'creature') || 'nightcap_toad';
  chooseReward(run, real);
  const store = createStore(memoryStorage()); store.saveRun(run); const back = store.loadRun();
  assert.equal(back.error, undefined); assert.deepEqual(back.run.evo, run.evo); assert.equal(back.run.contentMode, 'reference');
});
test('live Scryfall enrichment is display-only, cross-checks facts and fails safe', async () => {
  const card = resolveCard('mtg:typhoid-rats'); const before = JSON.stringify({ p: card.power, t: card.toughness, k: card.keywords });
  const rec = { source: 'scryfall', name: 'Typhoid Rats', power: '1', toughness: '1', keywords: ['Deathtouch'], manaCost: '{B}', oracleText: 'Deathtouch (…)', image: { normal: 'https://cards.scryfall.io/normal/front/x.jpg' }, set: 'm20', setName: 'Core Set 2020', artist: 'Someone', scryfallUri: 'https://scryfall.com/card/x' };
  const live = createLiveCards({ adapter: { cardByName: async () => rec }, online: () => true });
  await live.enrich('mtg:typhoid-rats');
  assert.equal(card.sourceInfo.live, true); assert.equal(card.sourceInfo.image.normal, rec.image.normal); assert.deepEqual(card.sourceInfo.issues, []);
  assert.equal(JSON.stringify({ p: card.power, t: card.toughness, k: card.keywords }), before, 'gameplay untouched');
  assert.deepEqual(checkFacts(resolveCard('mtg:grizzly-bears'), { ...rec, power: '3', toughness: '3', keywords: [], manaCost: '{1}{G}' }), ['P/T is 3/3 on Scryfall']);
  const off = createLiveCards({ adapter: { cardByName: async () => { throw Object.assign(new Error('x'), { code: 'network' }); } }, online: () => true });
  assert.equal(await off.enrich('mtg:storm-crow'), null); assert.equal(resolveCard('mtg:storm-crow').sourceInfo.liveError, 'network');
  assert.equal(await createLiveCards({ adapter: { cardByName: async () => rec }, online: () => false }).enrich('mtg:wind-drake'), null);
});
