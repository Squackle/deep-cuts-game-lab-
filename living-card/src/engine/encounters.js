import { makeRng, int, pick } from '../core/rng.js';
import { T, DIRS } from '../core/grid.js';
import { ENCOUNTERS, REINFORCEMENTS } from '../data/encounters.js';

export const ARENA_W = 8, ARENA_H = 8;

function connected(terrain, w, h, start) {
  const seen = new Set([start.y * w + start.x]); const q = [start];
  while (q.length) {
    const { x, y } = q.shift();
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy; const i = ny * w + nx;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen.has(i) || terrain[i] === T.ROCK) continue;
      seen.add(i); q.push({ x: nx, y: ny });
    }
  }
  return terrain.every((t, i) => t === T.ROCK || seen.has(i));
}

/** Build a concrete encounter (terrain + spawn positions) from a template, deterministically. */
export function buildEncounter(template, seed, kind = 'battle') {
  const w = ARENA_W, h = ARENA_H;
  for (let attempt = 0; attempt < 60; attempt++) {
    const rng = makeRng(seed + attempt * 7919);
    const terrain = new Array(w * h).fill(T.FLOOR);
    const playerStart = { x: 3 + int(rng, 2), y: h - 1 };
    const reserved = new Set([playerStart.y * w + playerStart.x]);
    const enemySpots = [];
    const free = (x, y) => terrain[y * w + x] === T.FLOOR && !reserved.has(y * w + x);
    for (const defId of template.enemies) {
      for (let k = 0; k < 40; k++) {
        const x = int(rng, w), y = defId === 'thornmother' ? 1 : int(rng, 3);
        if (free(x, y) && !enemySpots.some(e => Math.abs(e.x - x) + Math.abs(e.y - y) < 2)) { enemySpots.push({ defId, x, y }); reserved.add(y * w + x); break; }
      }
    }
    if (enemySpots.length !== template.enemies.length) continue;
    const place = (n, type, rows) => { for (let i = 0, k = 0; i < n && k < 200; k++) { const x = int(rng, w), y = rows[0] + int(rng, rows[1] - rows[0] + 1); if (free(x, y)) { terrain[y * w + x] = type; i++; } } };
    place(template.rocks, T.ROCK, [1, 6]);
    place(template.brambles, T.BRAMBLE, [2, 6]);
    place(template.leylines, T.LEYLINE, [3, 7]);
    for (const [dx, dy] of DIRS) { const x = playerStart.x + dx, y = playerStart.y + dy; if (x >= 0 && x < w && y >= 0 && y < h && terrain[y * w + x] === T.ROCK) terrain[y * w + x] = T.FLOOR; }
    if (!connected(terrain, w, h, playerStart)) continue;
    return { name: template.name, kind, w, h, terrain, playerStart, enemies: enemySpots, boss: !!template.boss };
  }
  throw new Error('Could not build arena');
}

export function templateFor(nodeType, depth, seed) {
  const rng = makeRng(seed);
  if (nodeType === 'tutorial') return ENCOUNTERS.tutorial[0];
  if (nodeType === 'boss') return ENCOUNTERS.boss[0];
  if (nodeType === 'elite') return pick(rng, ENCOUNTERS.elite);
  const tier = depth <= 2 ? 'early' : depth <= 4 ? 'mid' : 'late';
  return pick(rng, ENCOUNTERS[tier]);
}

/** "The Hollow answers": strong creatures attract extra foes, so difficulty tracks the build without
 *  inflating any enemy's health. strength = P + T + 2 per flag ability; expected curve = 4 + 3.2·depth.
 *  Each 5 points above the curve adds one reinforcement (max 2). Deterministic per node seed. */
export function threatOf(evo) {
  const flags = Object.entries(evo.keywords).filter(([, v]) => v === 1).length;
  const stacks = Object.entries(evo.keywords).filter(([, v]) => v > 1).reduce((a, [, v]) => a + v * 0.5, 0);
  return evo.power + evo.toughness + 2 * flags + stacks;
}
export function reinforcements(nodeType, depth, evo, seed) {
  if (nodeType === 'tutorial' || depth < 2) return [];
  const over = threatOf(evo) - (4 + 3.2 * depth);
  const n = Math.max(0, Math.min(2, Math.floor(over / 5)));
  const pool = REINFORCEMENTS[depth <= 2 ? 'early' : depth <= 4 ? 'mid' : 'late'];
  const rng = makeRng(seed ^ 0x51ab);
  return Array.from({ length: n }, () => pick(rng, pool));
}
