// Visual-only facing targets for combat playback. No engine state, replay or RNG changes.
const DIRECT = new Set(['attack', 'counter', 'rangedShot', 'spit', 'hex', 'harpoon', 'spell']);
const AREA = new Set(['aim', 'fire', 'slamHit']);

export function combatFacingTarget(event, unitPoint, tilePoint) {
  if (!event || typeof event !== 'object') return null;
  if (DIRECT.has(event.t)) {
    if (event.target != null) {
      const target = unitPoint(event.target);
      if (target) return target;
    }
    // Area and empty-tile spell targets still have an actual destination.
    if (event.t === 'spell' && Number.isFinite(event.x) && Number.isFinite(event.y))
      return tilePoint(event.x, event.y);
    return null;
  }
  if (!AREA.has(event.t) || !Array.isArray(event.tiles)) return null;
  // Use the telegraph's centre, avoiding a misleading turn toward its first corner.
  const tiles = event.tiles.filter(t => t && Number.isFinite(t.x) && Number.isFinite(t.y));
  if (!tiles.length) return null;
  const x = tiles.reduce((sum, t) => sum + t.x, 0) / tiles.length;
  const y = tiles.reduce((sum, t) => sum + t.y, 0) / tiles.length;
  return tilePoint(x, y);
}
