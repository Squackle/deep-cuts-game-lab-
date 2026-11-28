import test from 'node:test';
import assert from 'node:assert/strict';
import { installReferenceSet } from '../src/cards/reference-set.js';
import { startRanked } from '../src/engine/ranked.js';
import { createStore, memoryStorage, KEYS } from '../src/engine/save.js';

installReferenceSet();

test('corrupt primary recovery survives a second reload before any player action', () => {
  const storage = memoryStorage();
  const store = createStore(storage);
  const original = startRanked();
  store.saveRun(original);
  store.saveRun(original); // establish previous good snapshot
  storage.setItem(KEYS.run, 'corrupt-primary');
  const restored = store.loadRun();
  assert.equal(restored.recovered, true);
  assert.deepEqual(restored.run, original);
  assert.equal(storage.getItem(KEYS.run + '.corrupt'), 'corrupt-primary');
  const reopened = createStore(storage).loadRun();
  assert.deepEqual(reopened.run, original);
  assert.equal(reopened.recovered, undefined);
});

test('an intentionally cleared adventure is never resurrected from its backup', () => {
  const storage = memoryStorage(), store = createStore(storage);
  const run = startRanked();
  store.saveRun(run);
  store.saveRun(null);
  assert.ok(storage.getItem(KEYS.run + '.bak'));
  assert.equal(createStore(storage).loadRun().run, null);
});

test('two corrupt copies do not produce a fabricated recovered adventure', () => {
  const storage = memoryStorage();
  storage.setItem(KEYS.run, 'bad-primary');
  storage.setItem(KEYS.run + '.bak', 'bad-backup');
  const result = createStore(storage).loadRun();
  assert.equal(result.run, null);
  assert.equal(result.recovered, undefined);
  assert.equal(storage.getItem(KEYS.run + '.corrupt'), 'bad-primary');
  assert.equal(storage.getItem(KEYS.run + '.bak'), 'bad-backup');
});
