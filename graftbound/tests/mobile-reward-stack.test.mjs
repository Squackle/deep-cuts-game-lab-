import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRevealSequence, isRightSwipe, attachMobileRewardStack } from '../src/ui/mobile-reward-stack.js';

test('mobile stack requires tap before right swipe and never chooses a reward', () => {
  const stack = createRevealSequence(3);
  assert.equal(stack.dismiss(), false, 'cannot dismiss a hidden card');
  for (let i = 0; i < 3; i++) {
    assert.equal(stack.index, i);
    assert.equal(stack.flipped, false);
    assert.equal(stack.tap(), true);
    assert.equal(stack.tap(), false, 'same card cannot flip twice');
    assert.equal(stack.dismiss(), true);
  }
  assert.equal(stack.done, true);
  assert.equal(stack.tap(), false);
  assert.equal(stack.dismiss(), false);
});

test('Reveal All completes the stack without affecting reward selection', () => {
  const stack = createRevealSequence(3);
  stack.tap();
  stack.dismiss();
  assert.equal(stack.revealAll(), true);
  assert.equal(stack.index, 3);
  assert.equal(stack.done, true);
  assert.equal(stack.revealAll(), false);
  assert.throws(() => createRevealSequence(0), RangeError);
});

test('only deliberate right swipes dismiss cards', () => {
  assert.equal(isRightSwipe(95, 14, 260), true);
  assert.equal(isRightSwipe(-120, 5, 260), false);
  assert.equal(isRightSwipe(33, 2, 260), false);
  assert.equal(isRightSwipe(110, 100, 260), false);
  assert.equal(isRightSwipe(59, 4, 260), true);
});

function fakeList() {
  const values = new Set();
  return {
    add: (...xs) => xs.forEach(x => values.add(x)),
    remove: (...xs) => xs.forEach(x => values.delete(x)),
    contains: x => values.has(x),
    toggle: (x, value) => { if (value) values.add(x); else values.delete(x); },
  };
}
function fakeStyle() {
  const values = new Map();
  return {
    setProperty: (k, v) => values.set(k, v),
    removeProperty: k => values.delete(k),
  };
}
function fixture() {
  const listeners = new Map();
  const slots = Array.from({length:3},(_,index) => {
    const slot = {
      index, flipped:true, classList:fakeList(), style:fakeStyle(),
      setAttribute() {}, focus() {}, setPointerCapture() {}, releasePointerCapture() {},
      getBoundingClientRect: () => ({width:250}),
      querySelector: selector => selector === '.lc-card.flipped' && slot.flipped ? {} : null,
      querySelectorAll: () => [],
    };
    return slot;
  });
  const fan = {
    classList:fakeList(),
    querySelectorAll: selector => selector === '.slot' ? slots : [],
    addEventListener: (type, fn) => { listeners.set(type, fn); },
    fire: (type, event) => listeners.get(type)?.(event),
  };
  const revealed = [];
  let completed = 0;
  const api = attachMobileRewardStack(fan,{
    reducedMotion:true,
    onReveal: slot => { slot.flipped = false; slot.classList.add('revealed'); revealed.push(slot.index); },
    onProgress() {},
    onComplete: () => completed++,
  });
  return { fan, slots, api, revealed, get completed(){return completed} };
}
const tap = slot => ({target:{closest: name => name === '.slot' ? slot : null}});
async function settle() {
  await new Promise(resolve => setTimeout(resolve, 10));
}

test('tap flips top card, swipe-right advances, and last swipe opens full chooser', async () => {
  const f=fixture();
  assert.equal(f.api.handleTap(tap(f.slots[1])),true);
  assert.equal(f.revealed.length,0,'covered card must remain hidden');
  assert.equal(f.api.handleTap(tap(f.slots[0])),true);
  await settle();
  assert.deepEqual(f.revealed,[0]);
  f.fan.fire('pointerdown',{isPrimary:true,pointerId:3,clientX:100,clientY:200,target:{closest:s=>s==='.slot'?f.slots[0]:null}});
  f.fan.fire('pointermove',{pointerId:3,clientX:190,clientY:202,cancelable:true,preventDefault(){}});
  f.fan.fire('pointerup',{pointerId:3,clientX:190,clientY:202});
  await settle();
  assert.equal(f.slots[1].classList.contains('gb-stack-top'),true);
  for (let i=1;i<3;i++) {
    f.api.handleTap(tap(f.slots[i])); await settle();
    assert.equal(f.api.dismissTop(),true); await settle();
  }
  assert.equal(f.api.complete,true);
  assert.equal(f.fan.classList.contains('gb-stack-complete'),true);
  assert.equal(f.completed,1);
  assert.deepEqual(f.revealed,[0,1,2]);
});

test('Reveal All remains available on the stack and preserves every card for selection', async () => {
  const f=fixture();
  f.api.handleTap(tap(f.slots[0]));
  assert.equal(f.api.revealAll(),true);
  await settle();
  assert.deepEqual(f.revealed,[0,1,2]);
  assert.equal(f.completed,1);
  assert.equal(f.api.revealAll(),false);
  assert.equal(f.slots.every(s=>s.classList.contains('revealed')),true);
});

test('every reward tier includes the visible Reveal All button and shared mobile handler', () => {
  const screens=readFileSync(new URL('../src/ui/screens.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
  assert.match(screens,/export function rewardScreen\(app, cards, \{ tier, severed, firstVictoryPacks \}\)/);
  assert.match(screens,/id="rw-reveal">Reveal All<\/button>/);
  assert.match(screens,/if \(mobileStack\) \{ mobileStack\.revealAll\(\); return; \}/);
  assert.match(screens,/if \(claimed \|\| !opened \|\| \(mobileStack && !mobileStack\.complete\)\) return/);
  for (const tier of ['battle','tutorial','elite','boss','shrine','primer','archivist','graftsmith']) {
    assert.ok(screens.includes('packIdentity(tier)'), tier);
  }
  assert.match(css,/\.fan\.gb-stack-mode:not\(\.gb-stack-complete\)/);
  assert.match(css,/\.fan\.gb-stack-mode\.gb-stack-complete/);
});


test('left and incomplete drags spring back without dismissing a revealed card', async () => {
  const f = fixture();
  f.api.handleTap(tap(f.slots[0]));
  await settle();
  for (const dx of [-125, 35]) {
    const pointerId = dx < 0 ? 7 : 8;
    const target = { closest: selector => selector === '.slot' ? f.slots[0] : null };
    f.fan.fire('pointerdown', { isPrimary: true, pointerId, clientX: 180, clientY: 100, target });
    f.fan.fire('pointermove', { pointerId, clientX: 180 + dx, clientY: 103, cancelable: true, preventDefault() {} });
    f.fan.fire('pointerup', { pointerId, clientX: 180 + dx, clientY: 103 });
    await settle();
    assert.equal(f.slots[0].classList.contains('gb-stack-top'), true);
    assert.equal(f.slots[1].classList.contains('gb-stack-under'), true);
    assert.equal(f.api.complete, false);
  }
});


test('Reveal All is a prominent button before the pack on every reward screen', () => {
  const screens = readFileSync(new URL('../src/ui/screens.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const reward = screens.slice(
    screens.indexOf('export function rewardScreen'),
    screens.indexOf('export function shrineScreen'),
  );
  const button = reward.indexOf('id="rw-reveal">Reveal All</button>');
  const stage = reward.indexOf('class="pack-stage"');
  assert.ok(button > 0 && stage > button, 'Reveal All must be shown before the pack/card stack');
  assert.equal((reward.match(/id="rw-reveal"/g) || []).length, 1, 'one visible, accessible Reveal All button');
  assert.match(reward, /class="rw-reveal-actions"/);
  assert.match(reward, /aria-label="Reveal all cards in this pack"/);
  assert.match(reward, /if \(mobileStack\) \{ mobileStack\.revealAll\(\); return; \}/);
  assert.match(reward, /if \(!opened\) skipCeremony\(\)/);
  assert.ok(reward.includes('packIdentity(tier)'), 'all tier types share one pack opening');
  for (const tier of ['battle', 'elite', 'boss', 'shrine', 'primer', 'archivist', 'graftsmith']) {
    assert.match(reward, new RegExp('\\b' + tier + '\\b'), tier);
  }
  assert.match(css, /\.rewardscr \.rw-reveal-actions/);
  assert.match(css, /\.rewardscr #rw-reveal/);
  assert.match(css, /min-height:44px/);
});


test('fast release uses final pointer coordinates even without a move sample', async () => {
  const f = fixture();
  f.api.handleTap(tap(f.slots[0])); await settle();
  const target = { closest: s => s === '.slot' ? f.slots[0] : null };
  f.fan.fire('pointerdown', { isPrimary: true, pointerId: 31, clientX: 100, clientY: 100, target });
  f.fan.fire('pointerup', { pointerId: 31, clientX: 200, clientY: 103 });
  await settle();
  assert.equal(f.slots[1].classList.contains('gb-stack-top'), true);
  assert.deepEqual(f.revealed, [0]);
});

test('lost pointer capture cancels a drag and allows a new deliberate swipe', async () => {
  const f = fixture();
  f.api.handleTap(tap(f.slots[0])); await settle();
  const target = { closest: s => s === '.slot' ? f.slots[0] : null };
  f.fan.fire('pointerdown', { isPrimary: true, pointerId: 32, clientX: 100, clientY: 100, target });
  f.fan.fire('pointermove', { pointerId: 32, clientX: 200, clientY: 101, cancelable: true, preventDefault() {} });
  f.fan.fire('lostpointercapture', { pointerId: 32 });
  await settle();
  assert.equal(f.slots[0].classList.contains('gb-stack-top'), true);
  assert.equal(f.slots[0].classList.contains('gb-stack-dragging'), false);
  f.fan.fire('pointerdown', { isPrimary: true, pointerId: 33, clientX: 100, clientY: 100, target });
  f.fan.fire('pointerup', { pointerId: 33, clientX: 200, clientY: 101 });
  await settle();
  assert.equal(f.slots[1].classList.contains('gb-stack-top'), true);
});

test('release after reversing a right drag does not dismiss the card', async () => {
  const f = fixture();
  f.api.handleTap(tap(f.slots[0])); await settle();
  const target = { closest: s => s === '.slot' ? f.slots[0] : null };
  f.fan.fire('pointerdown', { isPrimary: true, pointerId: 34, clientX: 100, clientY: 100, target });
  f.fan.fire('pointermove', { pointerId: 34, clientX: 200, clientY: 101, cancelable: true, preventDefault() {} });
  f.fan.fire('pointerup', { pointerId: 34, clientX: 105, clientY: 101 });
  await settle();
  assert.equal(f.slots[0].classList.contains('gb-stack-top'), true);
  assert.equal(f.slots[0].classList.contains('gb-stack-dragging'), false);
});
