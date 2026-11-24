import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleUI } from '../src/ui/battle-ui.js';
import { arena } from './helpers.mjs';
import { shouldAutoEnd } from '../src/engine/legal.js';

function fixture(t) {
  const originalDocument = globalThis.document;
  globalThis.document = { hidden: false };
  const battle = Object.create(BattleUI.prototype);
  const s = arena(['P..', '...', '..g'], { g: 'grub' });
  s.p.moveLeft = 0; s.p.attacksLeft = 0;
  assert.equal(shouldAutoEnd(s), true);
  let open = false, calls = 0;
  battle.s = s;
  battle.app = { mode: 'battle', modalOpen: () => open, meta: { settings: { autoEnd: true } }, status() {}, animFactor: () => 100 };
  battle.doEndTurn = async () => { calls++; };
  t.after(() => { battle.cancelAutoEnd(); if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument; });
  return { battle, s, open: value => { open = value; }, calls: () => calls };
}
const wait = () => new Promise(resolve => setTimeout(resolve, 90));

test('auto-end is suppressed while a modal is open or document is hidden', async t => {
  const f = fixture(t);
  f.open(true); f.battle.maybeAutoEnd();
  assert.equal(f.battle.autoEnding, undefined);
  f.open(false); document.hidden = true; f.battle.maybeAutoEnd();
  assert.equal(f.battle.autoEnding, undefined);
  document.hidden = false; f.battle.maybeAutoEnd();
  assert.equal(f.battle.autoEnding, true);
  f.open(true); await wait();
  assert.equal(f.calls(), 0);
  f.open(false); f.battle.maybeAutoEnd(); await wait();
  assert.equal(f.calls(), 1);
});

test('auto-end rejects timers from an earlier encounter or earlier turn', async t => {
  const f = fixture(t);
  f.battle.maybeAutoEnd();
  f.battle.s = structuredClone(f.s);
  await wait(); assert.equal(f.calls(), 0);
  f.battle.maybeAutoEnd();
  f.battle.s.turn++;
  await wait(); assert.equal(f.calls(), 0);
});

test('cancelling auto-end clears pending work and permits exactly one new timer', async t => {
  const f = fixture(t);
  f.battle.maybeAutoEnd(); f.battle.cancelAutoEnd();
  await wait(); assert.equal(f.calls(), 0);
  assert.equal(f.battle.autoEndTimer, null);
  f.battle.maybeAutoEnd(); f.battle.maybeAutoEnd();
  await wait(); assert.equal(f.calls(), 1);
});
