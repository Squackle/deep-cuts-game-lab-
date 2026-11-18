// Touch-first, presentation-only reward sequence. It never selects or consumes rewards.
export function createRevealSequence(total) {
  if (!Number.isInteger(total) || total < 1) throw new RangeError('Card stack must not be empty');
  let index = 0, flipped = false;
  return {
    get index() { return index; },
    get flipped() { return flipped; },
    get done() { return index === total; },
    get total() { return total; },
    tap() {
      if (index === total || flipped) return false;
      flipped = true;
      return true;
    },
    dismiss() {
      if (index === total || !flipped) return false;
      index++;
      flipped = false;
      return true;
    },
    revealAll() {
      if (index === total) return false;
      index = total;
      flipped = false;
      return true;
    },
  };
}

export function isRightSwipe(dx, dy, cardWidth = 240) {
  return dx >= Math.max(58, cardWidth * 0.22) && dx > Math.abs(dy) * 1.3;
}

/**
 * The top card alone is interactive until every card has been revealed and
 * dismissed. After the final swipe the original reward picker receives all
 * three face-up cards; claiming a reward is still handled by the caller.
 */
export function attachMobileRewardStack(fan, {
  onReveal, onProgress, onComplete, reducedMotion = false,
}) {
  const slots = [...fan.querySelectorAll('.slot')];
  const sequence = createRevealSequence(slots.length);
  const flipMs = reducedMotion ? 0 : 360;
  const leaveMs = reducedMotion ? 0 : 260;
  let busy = false, gesture = null, suppressTapUntil = 0;
  const timers = new Set();
  const schedule = (fn, ms) => {
    const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms);
    timers.add(timer);
  };
  fan.classList.add('out', 'gb-stack-mode');

  function update() {
    slots.forEach((slot, i) => {
      const complete = sequence.done;
      slot.classList.toggle('gb-stack-top', !complete && i === sequence.index);
      slot.classList.toggle('gb-stack-under', !complete && i > sequence.index);
      slot.classList.toggle('gb-stack-past', !complete && i < sequence.index);
      slot.tabIndex = complete || i === sequence.index ? 0 : -1;
      slot.setAttribute('aria-hidden', String(!complete && i !== sequence.index));
      slot.style.zIndex = complete ? '' : String(slots.length - i);
      slot.style.setProperty('--gb-stack-depth', String(Math.max(0, i - sequence.index)));
      slot.querySelectorAll('button').forEach(button => {
        button.tabIndex = complete ? 0 : -1;
      });
      if (!complete && i === sequence.index) {
        slot.setAttribute('aria-label', sequence.flipped
          ? `Card ${i + 1} of ${slots.length}, revealed. Swipe right or choose Next card.`
          : `Card ${i + 1} of ${slots.length}, face down. Tap to flip.`);
      }
    });
    onProgress({
      index: sequence.index, total: sequence.total,
      phase: sequence.done ? 'complete' : sequence.flipped ? 'revealed' : 'concealed',
    });
  }

  function flipTop() {
    if (busy || !sequence.tap()) return false;
    busy = true;
    const slot = slots[sequence.index];
    slot.classList.add('gb-stack-turn');
    schedule(() => { onReveal(slot); }, flipMs / 2);
    schedule(() => {
      slot.classList.remove('gb-stack-turn');
      busy = false;
      update();
    }, flipMs);
    return true;
  }

  function dismissTop() {
    if (busy || sequence.done || !sequence.flipped) return false;
    busy = true;
    const slot = slots[sequence.index];
    slot.classList.remove('gb-stack-dragging');
    slot.style.removeProperty('--gb-drag-x');
    slot.style.removeProperty('--gb-drag-rot');
    slot.classList.add('gb-stack-leaving');
    schedule(() => {
      if (!sequence.dismiss()) return;
      slot.classList.remove('gb-stack-leaving');
      busy = false;
      if (sequence.done) fan.classList.add('gb-stack-complete');
      update();
      if (sequence.done) onComplete();
      else slots[sequence.index].focus({ preventScroll: true });
    }, leaveMs);
    return true;
  }

  function revealAll() {
    if (sequence.done) return false;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    busy = false;
    gesture = null;
    for (const slot of slots) {
      slot.classList.remove('gb-stack-turn', 'gb-stack-dragging', 'gb-stack-leaving');
      slot.style.removeProperty('--gb-drag-x');
      slot.style.removeProperty('--gb-drag-rot');
      if (slot.querySelector('.lc-card.flipped')) onReveal(slot);
    }
    sequence.revealAll();
    fan.classList.add('gb-stack-complete');
    update();
    onComplete();
    return true;
  }

  function handleTap(e) {
    if (sequence.done) return false; // The original choice handler takes over.
    const slot = e.target.closest('.slot');
    if (slot === slots[sequence.index] && Date.now() >= suppressTapUntil) {
      if (!sequence.flipped) flipTop();
    }
    return true;
  }

  fan.addEventListener('pointerdown', e => {
    if (busy || sequence.done || !sequence.flipped || !e.isPrimary) return;
    const slot = e.target.closest('.slot');
    if (slot !== slots[sequence.index] || e.target.closest('button')) return;
    gesture = { id: e.pointerId, slot, x: e.clientX, y: e.clientY, dx: 0, dy: 0, moved: false };
    slot.setPointerCapture?.(e.pointerId);
  });
  fan.addEventListener('pointermove', e => {
    if (!gesture || e.pointerId !== gesture.id) return;
    gesture.dx = e.clientX - gesture.x;
    gesture.dy = e.clientY - gesture.y;
    if (gesture.dx > 8 && gesture.dx > Math.abs(gesture.dy)) {
      gesture.moved = true;
      if (e.cancelable) e.preventDefault();
      gesture.slot.classList.add('gb-stack-dragging');
      gesture.slot.style.setProperty('--gb-drag-x', Math.max(0, gesture.dx) + 'px');
      gesture.slot.style.setProperty('--gb-drag-rot', Math.min(18, gesture.dx / 18) + 'deg');
    }
  });
  const releaseGesture = (e, cancelled = false) => {
    if (!gesture || e.pointerId !== gesture.id) return;
    const { slot, dx, dy, moved } = gesture;
    gesture = null;
    slot.releasePointerCapture?.(e.pointerId);
    if (moved) suppressTapUntil = Date.now() + 450;
    slot.classList.remove('gb-stack-dragging');
    if (!cancelled && isRightSwipe(dx, dy, slot.getBoundingClientRect().width)) {
      dismissTop();
    } else {
      slot.style.removeProperty('--gb-drag-x');
      slot.style.removeProperty('--gb-drag-rot');
    }
  };
  fan.addEventListener('pointerup', e => releaseGesture(e));
  fan.addEventListener('pointercancel', e => releaseGesture(e, true));
  // Keyboard users can flip with Enter/Space and dismiss with Right Arrow.
  fan.addEventListener('keydown', e => {
    if (sequence.done || e.target !== slots[sequence.index]) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.key === 'ArrowRight') dismissTop();
      else flipTop();
    }
  }, true);

  update();
  return { handleTap, dismissTop, revealAll, get complete() { return sequence.done; } };
}
