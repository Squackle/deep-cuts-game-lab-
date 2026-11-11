import test from 'node:test'; import assert from 'node:assert/strict';
import { normalizeCard, createScryfallAdapter, ScryfallError } from '../src/cards/scryfall-adapter.js';
import { toGameCard } from '../src/cards/compatibility.js';
import { createLiveCards, checkFacts } from '../src/cards/live.js';
import { resolveCard } from '../src/cards/catalog.js';
import './helpers.mjs';
import * as F from './fixtures/scryfall.mjs';

test('normalizeCard keeps plain data, clamps strings, rejects bad shapes and unsafe URLs', () => {
  const n = normalizeCard(F.TYPHOID_RATS); assert.equal(n.name, 'Typhoid Rats'); assert.ok(n.image.normal.startsWith('https://cards.scryfall.io/'));
  assert.throws(() => normalizeCard({ name: 'x' }), ScryfallError);
  const evil = normalizeCard({ ...F.GRIZZLY_BEARS, name: '<img src=x onerror=alert(1)>', image_uris: { normal: 'javascript:alert(1)' }, scryfall_uri: 'http://evil.example', oracle_text: 'x'.repeat(5000) });
  assert.equal(evil.image.normal, null); assert.equal(evil.scryfallUri, null); assert.equal(evil.oracleText.length, 1200);
});
test('compatibility: keyword-only creatures become playable; anything unmodeled is rejected with reasons', () => {
  assert.ok(toGameCard(normalizeCard(F.TYPHOID_RATS)).ok); assert.ok(toGameCard(normalizeCard(F.GRIZZLY_BEARS)).ok);
  assert.match(toGameCard(normalizeCard(F.LLANOWAR_ELVES)).reasons[0], /unmodeled rules text/);
  assert.match(toGameCard(normalizeCard(F.REACH_SPIDER)).reasons.join(), /unsupported keyword: Reach/);
  assert.ok(!toGameCard(normalizeCard(F.STAR_POWER)).ok);
  const shock = toGameCard(normalizeCard(F.SHOCK)); assert.ok(shock.ok); assert.equal(shock.card.vfx, 'shock');
});
test('adapter: caching, spacing, failure codes (offline / 404 / 429 / bad id)', async () => {
  let t = 0; const calls = []; const slept = [];
  const fetchFn = async url => { calls.push(url); if (url.includes('Nope')) return { ok: false, status: 404 }; if (url.includes('Slow')) return { ok: false, status: 429 }; return { ok: true, status: 200, json: async () => F.TYPHOID_RATS }; };
  const sf = createScryfallAdapter({ fetchFn, now: () => t, sleep: async ms => { slept.push(ms); t += ms; }, minIntervalMs: 100 });
  await sf.cardByName('Typhoid Rats'); await sf.cardByName('typhoid rats'); assert.equal(calls.length, 1);
  await assert.rejects(sf.cardByName('Nope'), e => e.code === 'not_found'); assert.equal(slept[0], 100);
  await assert.rejects(sf.cardByName('Slow'), e => e.code === 'rate_limited');
  await assert.rejects(createScryfallAdapter({ fetchFn: async () => { throw new Error('offline'); }, sleep: async () => {} }).cardByName('x'), e => e.code === 'network');
  await assert.rejects(sf.cardById('not-a-uuid'), e => e.code === 'invalid');
});
test('Scryfall failure never changes gameplay or substitutes a fictional card; images load independently', async () => {
  const card = resolveCard('mtg:storm-crow'); const before = JSON.stringify([card.power, card.toughness, card.keywords, card.id]);
  const off = createLiveCards({ adapter: { cardByName: async () => { throw Object.assign(new Error('x'), { code: 'network' }); } }, online: () => true });
  assert.equal(await off.enrich('mtg:storm-crow'), null); assert.equal(card.sourceInfo.liveError, 'network');
  assert.equal(JSON.stringify([card.power, card.toughness, card.keywords, card.id]), before); assert.ok(card.reference && !card.legacy);
  const rec = { name: 'Typhoid Rats', power: '1', toughness: '1', keywords: ['Deathtouch'], manaCost: '{B}', oracleText: 'Deathtouch', image: { normal: null }, set: 'x', setName: 'X', artist: 'A', scryfallUri: null };
  const ok = createLiveCards({ adapter: { cardByName: async () => rec }, online: () => true }); await ok.enrich('mtg:typhoid-rats');
  assert.equal(resolveCard('mtg:typhoid-rats').sourceInfo.live, true, 'enriched even with a missing image (frame fallback renders)');
  assert.deepEqual(checkFacts(resolveCard('mtg:grizzly-bears'), { ...rec, power: '3', toughness: '3', keywords: [], manaCost: '{1}{G}' }), ['P/T is 3/3 on Scryfall']);
});
