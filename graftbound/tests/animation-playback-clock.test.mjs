import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ActivePlaybackClock } from '../dev/animation-studio/animation-clock.js';

test('hidden-tab time does not skip the fire or impact', () => {
  const clock = new ActivePlaybackClock();
  clock.start(1000);
  assert.equal(clock.elapsed(2000), 1);
  clock.pause(2200);
  assert.ok(Math.abs(clock.elapsed(2200) - 1.2) < 1e-9);
  assert.ok(Math.abs(clock.elapsed(30000) - 1.2) < 1e-9);
  clock.resume(30000);
  assert.ok(Math.abs(clock.elapsed(30600) - 1.8) < 1e-9);
});

test('playback speed changes integrate forward without an instantaneous phase jump', () => {
  const clock = new ActivePlaybackClock();
  clock.start(0);
  assert.equal(clock.elapsed(1000), 1);
  clock.setRate(.75, 1000);
  assert.equal(clock.elapsed(2000), 1.75);
  clock.setRate(1.4, 2000);
  assert.ok(Math.abs(clock.elapsed(2500) - 2.45) < 1e-9);
});

test('pause and resume are idempotent, invalid rates safe and time cannot run backward', () => {
  const clock = new ActivePlaybackClock();
  clock.start(0, Number.NaN);
  clock.pause(1000); clock.pause(2000);
  assert.equal(clock.elapsed(3000), 1);
  clock.resume(4000); clock.resume(4000);
  assert.equal(clock.elapsed(4200), 1.2);
  assert.equal(clock.elapsed(4100), 1.2);
  clock.start(5000, 2);
  assert.equal(clock.elapsed(5500), 1);
});

test('studio owns visibility/page lifecycle and rate selector without changing gameplay files', () => {
  const source = readFileSync(new URL('../dev/animation-studio/studio.js', import.meta.url), 'utf8');
  assert.match(source, /playbackClock\.start\(performance\.now\(\),Number\(speedSel\.value\)\)/);
  assert.match(source, /playbackClock\.elapsed\(now\)/);
  assert.match(source, /playbackClock\.setRate\(Number\(speedSel\.value\),performance\.now\(\)\)/);
  assert.match(source, /document\.addEventListener\('visibilitychange'/);
  assert.match(source, /window\.addEventListener\('pagehide'/);
  assert.match(source, /window\.addEventListener\('pageshow'/);
  assert.doesNotMatch(source, /\(now-started\)\/1000/);
});
