// Presentation-only graphics policy. Explicit settings always outrank adaptive quality.
const LEVELS = ['high', 'balanced', 'performance'];
export const isFixedQuality = value => LEVELS.includes(value);
export function graphicsQuality({ forced, preference, adaptive, coarse = false, small = false, deviceMemory } = {}) {
  if (isFixedQuality(forced)) return forced;
  if (isFixedQuality(preference)) return preference;
  if (isFixedQuality(adaptive)) return adaptive;
  return coarse || small || (deviceMemory && deviceMemory < 4) ? 'balanced' : 'high';
}
export function adaptiveEnabled({ forced, preference, hidden = false } = {}) {
  return !hidden && !isFixedQuality(forced) && preference === 'auto';
}
export function lowerQuality(current, averageFrameSeconds) {
  const index = LEVELS.indexOf(current);
  if (index < 0 || index === LEVELS.length - 1 || !Number.isFinite(averageFrameSeconds) || averageFrameSeconds <= 0) return current;
  return 1 / averageFrameSeconds < 32 ? LEVELS[index + 1] : current;
}
