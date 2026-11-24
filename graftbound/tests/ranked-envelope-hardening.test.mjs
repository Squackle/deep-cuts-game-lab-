import test from 'node:test';
import assert from 'node:assert/strict';
import { installReferenceSet } from '../src/cards/reference-set.js';
import { ACTIVE_CHALLENGE, challengeFor, startRanked, validDecision, applyDecision, replayRun, applySegment } from '../src/engine/ranked.js';

installReferenceSet();

const inherited = ['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__'];

test('ranked decision types must be explicitly registered strings', () => {
  for (const type of [...inherited, 'unknown', ['end'], null, 42]) {
    assert.equal(validDecision({ seq: 0, type }, 0), false, String(type));
  }
  assert.equal(validDecision({ seq: 0, type: 'end' }, 0), true);
});

test('ranked envelopes reject extra keys including inherited shape names', () => {
  for (const key of [...inherited, 'score', 'damage', 'rng']) {
    const d = JSON.parse('{"seq":0,"type":"end",' + JSON.stringify(key) + ':0}');
    assert.equal(validDecision(d, 0), false, key);
  }
  assert.equal(validDecision({ seq: 0, type: 'end', [Symbol('hidden')]: 1 }, 0), false);
});

test('ranked envelopes require own fields and contiguous integer sequence', () => {
  assert.equal(validDecision(Object.create({ seq: 0, type: 'end' }), 0), false);
  assert.equal(validDecision(Object.assign(Object.create({ x: 1 }), { seq: 0, type: 'move', y: 2 }), 0), false);
  assert.equal(validDecision({ seq: 0, type: 'move', y: 2 }, 0), false);
  assert.equal(validDecision({ seq: '0', type: 'end' }, '0'), false);
  assert.equal(validDecision({ seq: -1, type: 'end' }, -1), false);
  assert.equal(validDecision({ seq: 1, type: 'end' }, 0), false);
});

test('valid JSON decisions preserve optional modes and coordinates', () => {
  const d = { seq: 3, type: 'cast', id: 'mtg:drain-life', x: 1, y: 2 };
  assert.equal(validDecision(JSON.parse(JSON.stringify(d)), 3), true);
  assert.equal(validDecision({ ...d, xValue: 5 }, 3), true);
  assert.equal(validDecision({ ...d, xValue: 0 }, 3), false);
  assert.equal(validDecision({ ...d, mode: 'heal' }, 3), true);
  assert.equal(validDecision({ ...d, mode: 'bogus' }, 3), false);
  assert.equal(validDecision(Object.assign(Object.create(null), { seq: 0, type: 'end' }), 0), true);
});

test('ranked challenge lookup rejects inherited names and coerced IDs', () => {
  for (const id of [...inherited, 'missing', [ACTIVE_CHALLENGE], null]) {
    assert.throws(() => challengeFor(id), /Unknown or retired challenge/);
  }
  const c = challengeFor(ACTIVE_CHALLENGE);
  assert.equal(challengeFor(ACTIVE_CHALLENGE, c.revision), c);
  assert.throws(() => challengeFor(ACTIVE_CHALLENGE, c.revision + 1), /Unknown or retired challenge/);
});

test('invalid actions cannot advance a run or checkpoint sequence', () => {
  const run = startRanked();
  const before = structuredClone(run);
  const invalid = { seq: 0, type: 'constructor' };
  assert.throws(() => applyDecision(run, invalid), /Malformed or out-of-order/);
  assert.deepEqual(run, before);
  assert.throws(() => replayRun(ACTIVE_CHALLENGE, [invalid]), /Malformed or out-of-order/);
  assert.throws(() => applySegment(run, [invalid]), /Malformed or out-of-order/);
  assert.deepEqual(run, before);
});
