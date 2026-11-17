import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TILE_INSPECT_LOCK_DELAY_MS, TileInspectLatch } from '../src/ui/terrain-inspect.js';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
function timerHarness() {
  let id = 0, now = 0;
  const pending = new Map();
  const schedule = (fn, delay) => { const n = ++id; pending.set(n, { fn, at: now + delay }); return n; };
  const cancel = n => pending.delete(n);
  const advance = ms => { now += ms; for (const [n, item] of [...pending]) if (item.at <= now) { pending.delete(n); item.fn(); } };
  return { latch: new TileInspectLatch({ schedule, cancel }), advance, pending };
}

test('tile inspection charges for exactly three seconds before locking', () => {
  assert.equal(TILE_INSPECT_LOCK_DELAY_MS, 3000);
  const h = timerHarness(); let locks = 0;
  h.latch.watch({ x: 3, y: 2 }, () => locks++);
  h.advance(2999);
  assert.equal(h.latch.locked, false);
  assert.equal(locks, 0);
  h.advance(1);
  assert.equal(h.latch.locked, true);
  assert.equal(locks, 1);
});

test('re-entering the same tile does not restart the countdown', () => {
  const h = timerHarness(); let locks = 0;
  h.latch.watch({ x: 1, y: 1 }, () => locks++);
  h.advance(2500);
  h.latch.watch({ x: 1, y: 1 }, () => locks++);
  h.advance(500);
  assert.equal(locks, 1);
});

test('moving to another tile before locking cancels previous countdown', () => {
  const h = timerHarness(); let a = 0, b = 0;
  h.latch.watch({ x: 1, y: 2 }, () => a++);
  h.advance(2000);
  h.latch.watch({ x: 3, y: 4 }, () => b++);
  h.advance(1000);
  assert.deepEqual([a, b, h.latch.locked], [0, 0, false]);
  h.advance(2000);
  assert.deepEqual([a, b, h.latch.locked], [0, 1, true]);
});

test('Escape/selection reset cancels an in-progress or locked panel', () => {
  const h = timerHarness(); let locks = 0;
  h.latch.watch({ x: 1, y: 2 }, () => locks++);
  h.advance(2000); h.latch.reset(); h.advance(2000);
  assert.deepEqual([locks, h.latch.locked, h.latch.key], [0, false, null]);
  h.latch.watch({ x: 1, y: 2 }, () => locks++);
  h.advance(3000); h.latch.reset();
  assert.equal(h.latch.locked, false);
});

test('battle UI holds a pinned tile during hover and releases it on explicit canvas selection', () => {
  const ui = source('src/ui/battle-ui.js');
  assert.ok(ui.includes("this.tileInspectLatch.locked && $('inspect')?.classList.contains('terrain-inspect')"));
  assert.match(ui, /this\.tileInspectLatch\.watch\(t, \(\) =>/);
  assert.match(ui, /if \(this\.tileInspectLatch\.locked\) \{ this\.resetTileInspectLock\(\); this\.hover = null; this\.setHover\(t\); \}/);
  assert.match(ui, /data-terrain-details/);
  assert.match(ui, /gb-terrain-lock-progress/);
  assert.match(ui, /cancel\(\) \{ this\.resetTileInspectLock\(\)/);
});

test('a narrow 2px gold progress bar fills in the same three seconds', () => {
  const css = source('styles.css');
  assert.match(css, /\.gb-terrain-lock-progress\{[^}]*height:2px/);
  assert.match(css, /\.terrain-locking \.gb-terrain-lock-progress::after\{animation:gb-terrain-lock-fill 3000ms linear forwards/);
  assert.match(css, /\.terrain-locked \.gb-terrain-lock-progress::after\{transform:scaleX\(1\)/);
  assert.match(css, /\.terrain-plain \.gb-terrain-details-btn\{display:inline-flex/);
});
