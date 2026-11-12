// v0.8 active-adventure clock. Pure data + helpers; the app feeds it real elapsed time from a monotonic clock
// (performance.now) ONLY while the player is actively in an adventure (not paused, tab visible, browser open).
// It persists accumulated milliseconds, never a start timestamp, so offline time can never be counted.
// Informational only: it is not part of rules, replays, scores or leaderboards.
export const MAX_FRAME_MS = 1000;          // one sample (taken every 250 ms) can add at most 1 s, so sleep/frozen tabs never inflate time
export const newClock = (partial = false) => ({ v: 1, ms: 0, byAct: [0, 0, 0], partial });

/** Add elapsed active time. Large gaps are clamped so a suspended device never inflates the total. */
export function tickClock(clock, deltaMs, act = 0) {
  if (!clock || !(deltaMs > 0) || !Number.isFinite(deltaMs)) return clock;
  const d = Math.min(MAX_FRAME_MS, deltaMs);
  clock.ms += d; const a = Math.max(0, Math.min(2, act | 0)); clock.byAct[a] = (clock.byAct[a] || 0) + d;
  return clock;
}

/** "36s", "4m 05s", "1h 24m 36s". */
export function formatDuration(ms) {
  const t = Math.max(0, Math.floor((ms || 0) / 1000)); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const p = n => String(n).padStart(2, '0');
  return h ? `${h}h ${p(m)}m ${p(s)}s` : m ? `${m}m ${p(s)}s` : `${s}s`;
}

/** Decides whether this frame counts as active play. */
export function clockActive({ hasRun, mode, paused, hidden, ended }) {
  return !!hasRun && !paused && !hidden && !ended && mode !== 'title' && mode !== 'end';
}
