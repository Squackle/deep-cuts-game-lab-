// Grid helpers: terrain, pathing, line of sight. Pure functions over a battle-like {w,h,terrain,units}.
// Terrain: FLOOR, ROCK (blocks ground units), BRAMBLE (1 dmg on entry), LEYLINE (+1 mana),
// LAVA (Act II: damage on entry and when ending a turn on it), RIFT (Act III: pulses on even rounds).
// Exact numbers live in src/data/terrain.js. Crystals (v0.6) are objects on FLOOR tiles (battle.crystals), not terrain.
export const T = { FLOOR: 0, ROCK: 1, BRAMBLE: 2, LEYLINE: 3, LAVA: 4, RIFT: 5 };
export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const inBounds = (s, x, y) => x >= 0 && y >= 0 && x < s.w && y < s.h;
export const tileAt = (s, x, y) => s.terrain[y * s.w + x];
export const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const unitAt = (s, x, y) => s.units.find(u => u.hp > 0 && u.x === x && u.y === y) || null;
export const key = (x, y) => x + ',' + y;
export const isFlying = u => !!(u.keywords && u.keywords.flying) && !(u.statuses && u.statuses.grounded);

/** BFS reachable tiles. Flying units ignore rocks and may pass over units (never stop on them).
 *  Ground units may pass through allies but not enemies. Every map entry has .stop (can end move there). */
export function reachable(s, unit, maxCost) {
  const fly = isFlying(unit);
  const out = new Map();
  out.set(key(unit.x, unit.y), { x: unit.x, y: unit.y, cost: 0, prev: null });
  const q = [[unit.x, unit.y]];
  while (q.length) {
    const [cx, cy] = q.shift();
    const cur = out.get(key(cx, cy));
    if (cur.cost >= maxCost) continue;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (!inBounds(s, nx, ny) || out.has(key(nx, ny))) continue;
      const t = tileAt(s, nx, ny);
      if (t === T.ROCK && !fly) continue;
      const occ = unitAt(s, nx, ny);
      if (occ && occ !== unit && !fly && occ.side !== unit.side) continue;
      out.set(key(nx, ny), { x: nx, y: ny, cost: cur.cost + 1, prev: key(cx, cy) });
      q.push([nx, ny]);
    }
  }
  for (const v of out.values()) v.stop = v.cost === 0 || (!unitAt(s, v.x, v.y) && tileAt(s, v.x, v.y) !== T.ROCK);
  return out;
}
export function pathTo(map, x, y) {
  const path = []; let k = key(x, y);
  while (k && map.get(k)) { const n = map.get(k); path.unshift({ x: n.x, y: n.y }); k = n.prev; }
  return path;
}
/** Bresenham line of sight between tile centers; rocks strictly between endpoints block. */
export function lineOfSight(s, a, b) {
  let x0 = a.x, y0 = a.y; const x1 = b.x, y1 = b.y;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (!(x0 === x1 && y0 === y1)) {
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
    if (x0 === x1 && y0 === y1) break;
    if (tileAt(s, x0, y0) === T.ROCK) return false;
  }
  return true;
}
/** BFS distance ignoring units (AI approach heuristics). */
export function distanceField(s, from, fly = false) {
  const d = new Array(s.w * s.h).fill(Infinity);
  d[from.y * s.w + from.x] = 0; const q = [[from.x, from.y]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(s, nx, ny)) continue;
      if (!fly && tileAt(s, nx, ny) === T.ROCK) continue;
      const i = ny * s.w + nx;
      if (d[i] !== Infinity) continue;
      d[i] = d[y * s.w + x] + 1; q.push([nx, ny]);
    }
  }
  return d;
}
