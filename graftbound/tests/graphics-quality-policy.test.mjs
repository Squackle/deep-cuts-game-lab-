import test from 'node:test';
import assert from 'node:assert/strict';
import { graphicsQuality, adaptiveEnabled, lowerQuality } from '../src/rendering/quality-policy.js';

test('explicit graphics choices supersede stale automatic downgrades', () => {
  assert.equal(graphicsQuality({ preference: 'high', adaptive: 'performance' }), 'high');
  assert.equal(graphicsQuality({ preference: 'balanced', adaptive: 'performance' }), 'balanced');
  assert.equal(graphicsQuality({ forced: 'performance', preference: 'high' }), 'performance');
  assert.equal(graphicsQuality({ forced: 'high', preference: 'auto', adaptive: 'performance' }), 'high');
});
test('automatic graphics retains device defaults and valid adaptive downgrade', () => {
  assert.equal(graphicsQuality({ preference: 'auto' }), 'high');
  for (const device of [{ coarse: true }, { small: true }, { deviceMemory: 2 }]) {
    assert.equal(graphicsQuality({ preference: 'auto', ...device }), 'balanced');
  }
  assert.equal(graphicsQuality({ preference: 'auto', adaptive: 'performance' }), 'performance');
  assert.equal(graphicsQuality({ preference: 'invalid', forced: 'unknown' }), 'high');
});
test('adaptive sampling is restricted to visible, unforced automatic graphics', () => {
  assert.equal(adaptiveEnabled({ preference: 'auto' }), true);
  assert.equal(adaptiveEnabled({ preference: 'auto', hidden: true }), false);
  assert.equal(adaptiveEnabled({ preference: 'auto', forced: 'high' }), false);
  assert.equal(adaptiveEnabled({ preference: 'performance' }), false);
});
test('adaptive quality lowers one tier only on slow valid frame averages', () => {
  assert.equal(lowerQuality('high', 1 / 60), 'high');
  assert.equal(lowerQuality('high', 1 / 32), 'high');
  assert.equal(lowerQuality('high', 1 / 25), 'balanced');
  assert.equal(lowerQuality('balanced', 1 / 25), 'performance');
  assert.equal(lowerQuality('performance', 1 / 20), 'performance');
  for (const invalid of [0, -1, Infinity, NaN]) assert.equal(lowerQuality('high', invalid), 'high');
});
