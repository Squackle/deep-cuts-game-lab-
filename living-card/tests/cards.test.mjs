import test from 'node:test'; import assert from 'node:assert/strict';
import { normalizeCard, createScryfallAdapter, ScryfallError } from '../src/cards/scryfall-adapter.js';
import { toGameCard } from '../src/cards/compatibility.js';
import { registerReferenceCards, resolveCard } from '../src/cards/catalog.js';
import { absorb, newEvolution } from '../src/engine/evolution.js';
import { cardPool } from '../src/engine/rewards.js';
import * as F from './fixtures/scryfall.mjs';

test('normalizeCard keeps plain data, clamps strings, rejects bad shapes and unsafe URLs', () => {
  const n = normalizeCard(F.TYPHOID_RATS);
  assert.equal(n.name, 'Typhoid Rats'); assert.equal(n.power, '1'); assert.deepEqual(n.colors, ['B']); assert.ok(n.image.normal.startsWith('https://cards.scryfall.io/'));
  assert.throws(() => normalizeCard({ name: 'x' }), ScryfallError);
  const evil = normalizeCard({ ...F.GRIZZLY_BEARS, name: '<img src=x onerror=alert(1)>', image_uris: { normal: 'javascript:alert(1)' }, scryfall_uri: 'http://evil.example', oracle_text: 'x'.repeat(5000) });
  assert.equal(evil.image.normal, null); assert.equal(evil.scryfallUri, null); assert.equal(evil.oracleText.length, 1200);
  assert.equal(evil.name, '<img src=x onerror=alert(1)>', 'kept as plain text — UI must escape');
});
test('compatibility: keyword-only creatures become playable; anything unmodeled is rejected with reasons', () => {
  const rats = toGameCard(normalizeCard(F.TYPHOID_RATS)); assert.ok(rats.ok);
  assert.deepEqual([rats.card.power, rats.card.toughness, rats.card.keywords], [1, 1, { deathtouch: 1 }]); assert.equal(rats.card.color, 'umbral');
  const angel = toGameCard(normalizeCard(F.SERRA_ANGEL)); assert.ok(angel.ok); assert.deepEqual(Object.keys(angel.card.keywords).sort(), ['flying', 'vigilance']);
  assert.ok(toGameCard(normalizeCard(F.GRIZZLY_BEARS)).ok, 'vanilla creatures are fine');
  const elves = toGameCard(normalizeCard(F.LLANOWAR_ELVES)); assert.ok(!elves.ok); assert.match(elves.reasons[0], /unmodeled rules text/);
  const spider = toGameCard(normalizeCard(F.REACH_SPIDER)); assert.ok(!spider.ok); assert.match(spider.reasons.join(), /unsupported keyword: Reach/);
  assert.ok(!toGameCard(normalizeCard(F.STAR_POWER)).ok);
});
test('spells only via reviewed adaptations, labeled as such', () => {
  const shock = toGameCard(normalizeCard(F.SHOCK)); assert.ok(shock.ok); assert.equal(shock.card.effect, 'ember_dart'); assert.match(shock.card.adaptationNote, /Adapted/);
  assert.equal(shock.card.sourceInfo.oracleText, 'Shock deals 2 damage to any target.');
});
test('reference cards flow through catalog, rewards and absorption once registered', () => {
  const rats = toGameCard(normalizeCard(F.TYPHOID_RATS)).card;
  registerReferenceCards([rats]);
  assert.ok(cardPool({ includeReference: true }).some(c => c.id === rats.id));
  assert.ok(!cardPool({}).some(c => c.id === rats.id), 'original mode never includes reference cards');
  const { evo } = absorb(newEvolution(), resolveCard(rats.id)); assert.deepEqual([evo.power, evo.toughness, evo.keywords], [2, 2, { deathtouch: 1 }]);
  assert.throws(() => registerReferenceCards([{ id: 'x' }]));
});
test('adapter: caching, spacing between requests, failure codes', async () => {
  let t = 0; const calls = []; const slept = [];
  const fetchFn = async url => { calls.push([url, t]); if (url.includes('Nope')) return { ok: false, status: 404 }; if (url.includes('Slow')) return { ok: false, status: 429 }; return { ok: true, status: 200, json: async () => F.TYPHOID_RATS }; };
  const sf = createScryfallAdapter({ fetchFn, now: () => t, sleep: async ms => { slept.push(ms); t += ms; }, minIntervalMs: 100 });
  const a = await sf.cardByName('Typhoid Rats'); const b = await sf.cardByName('typhoid rats');
  assert.equal(calls.length, 1, 'second call served from cache'); assert.equal(a, b);
  await assert.rejects(sf.cardByName('Nope'), e => e.code === 'not_found');
  assert.ok(slept.length >= 1 && slept[0] === 100, 'requests are spaced');
  await assert.rejects(sf.cardByName('Slow'), e => e.code === 'rate_limited');
  await assert.rejects(createScryfallAdapter({ fetchFn: async () => { throw new Error('offline'); }, sleep: async () => {} }).cardByName('x'), e => e.code === 'network');
  await assert.rejects(sf.cardById('not-a-uuid'), e => e.code === 'invalid');
});
