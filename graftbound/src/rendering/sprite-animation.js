/** Pure presentation clock: authored non-looping defeat states hold their last frame.
 * Never advances or samples the simulation/gameplay RNG. */
export function spriteAnimationFrame(name, elapsed, animations) {
  const state = animations[name] ? name : 'idle';
  const active = animations[state];
  if (!active || !(active.frames > 0) || !(active.fps > 0)) throw new Error('Invalid sprite animation metadata');
  let frame = Math.floor(Math.max(0, elapsed) * active.fps);
  if (frame >= active.frames) {
    if (active.loop) frame %= active.frames;
    else if (state === 'defeat') frame = active.frames - 1;
    else return { state: 'idle', frame: 0, reset: true };
  }
  return { state, frame, reset: false };
}

/** Respect full animation exposure before dissolving the last portion.
 * Legacy creatures with no authored defeat retain their previous 0.55s visual. */
export function defeatTiming(animations) {
  const defeat = animations?.defeat;
  if (!defeat || !Number.isFinite(defeat.frames) || !Number.isFinite(defeat.fps) || defeat.frames <= 0 || defeat.fps <= 0)
    return { authored: false, seconds: 0.55, fadeStart: 0 };
  return { authored: true, seconds: Math.min(1.4, Math.max(0.55, defeat.frames / defeat.fps)), fadeStart: 0.65 };
}
