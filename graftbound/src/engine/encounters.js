// Encounter construction (act-aware). Layouts are deterministic per node seed and always fully connected.
import { makeRng, int, pick } from '../core/rng.js';
import { T, DIRS } from '../core/grid.js';
import { ACTS, REINFORCEMENTS } from '../data/encounters.js';
import { stepOf } from './power.js';
import { strengthOf, expectedStrength } from './strength.js';
import { bossForSeed, BOSS_BY_ID } from '../data/legendary.js';

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
const BOSS_IDS = new Set(['thornmother', 'matron', 'unwritten', ...Object.keys(BOSS_BY_ID)]);
export function buildEncounter(template, seed, kind = 'battle') {
  const w = ARENA_W, h = ARENA_H;
  for (let attempt = 0; attempt < 80; attempt++) {
    const rng = makeRng(seed + attempt * 7919);
    const terrain = new Array(w * h).fill(T.FLOOR);
    const playerStart = { x: 3 + int(rng, 2), y: h - 1 };
    const reserved = new Set([playerStart.y * w + playerStart.x]);
    for (const [dx, dy] of DIRS) { const x = playerStart.x + dx, y = playerStart.y + dy; if (x >= 0 && x < w && y >= 0 && y < h) reserved.add(y * w + x); }
    const enemySpots = [];
    const free = (x, y) => terrain[y * w + x] === T.FLOOR && !reserved.has(y * w + x);
    for (const defId of template.enemies) {
      for (let k = 0; k < 60; k++) {
        const x = int(rng, w), y = BOSS_IDS.has(defId) ? 1 : int(rng, 3);
        if (free(x, y) && !enemySpots.some(e => Math.abs(e.x - x) + Math.abs(e.y - y) < 2)) { enemySpots.push({ defId, x, y }); reserved.add(y * w + x); break; }
      }
    }
    if (enemySpots.length !== template.enemies.length) continue;
    const place = (n, type, rows) => { for (let i = 0, k = 0; i < n && k < 200; k++) { const x = int(rng, w), y = rows[0] + int(rng, rows[1] - rows[0] + 1); if (free(x, y)) { terrain[y * w + x] = type; i++; } } };
    place(template.rocks, T.ROCK, [1, 6]);
    place(template.brambles || 0, T.BRAMBLE, [2, 6]);
    place(template.lava || 0, T.LAVA, [2, 6]);
    place(template.rifts || 0, T.RIFT, [2, 6]);
    place(template.leylines || 0, T.LEYLINE, [3, 7]);
    // v1.1 hazards: deterministic and never placed under starting units, crystals or the player.
    place(template.ice || 0, T.ICE, [2, 6]);
    place(template.spores || 0, T.SPORES, [2, 6]);
    place(template.unstable || 0, T.UNSTABLE, [2, 5]);
    place(template.conduits || 0, T.CONDUIT, [2, 6]);
    place(template.crumbling || 0, T.CRUMBLE, [2, 6]);
    place(template.archives || 0, T.ARCHIVE, [2, 6]);
    if (!connected(terrain, w, h, playerStart)) continue;
    const crystals = [];   // v0.6: crystals sit on plain floor, never on hazards, never on a unit
    for (let i = 0, k = 0; i < (template.crystals || 0) && k < 200; k++) { const x = int(rng, w), y = 2 + int(rng, 5); if (free(x, y) && !crystals.some(c => c.x === x && c.y === y)) { crystals.push({ x, y }); reserved.add(y * w + x); i++; } }
    return { name: template.name, kind, w, h, terrain, playerStart, enemies: enemySpots, boss: !!template.boss, crystals };
  }
  throw new Error('Could not build arena');
}
export function templateFor(act, nodeType, depth, seed) {
  const rng = makeRng(seed); const A = ACTS[act];
  if (nodeType === 'tutorial' || (act === 0 && depth === 0)) return ACTS[0].tutorial[0]; // the Blank's first fight is always gentle
  const prior = nodeType === 'boss' ? A.bossEncounters[0] : nodeType === 'elite' ? pick(rng, A.elite) : pick(rng, A[depth <= 2 ? 'early' : depth <= 4 ? 'mid' : 'late']);
  const base = nodeType === 'boss' ? { ...prior, name: bossForSeed(act, seed).name, enemies: [bossForSeed(act,seed).id, ...prior.enemies.slice(1)] } : prior;
  // A small, authored amount of each new terrain: bosses intensify fissures, not every route.
  // All placements are performed after baseline hazards and checked for map connectivity.
  const late = depth >= 3 || nodeType === 'elite' || nodeType === 'boss';
  return { ...base,
    ice: act !== 1 ? 1 + (act === 2 && late ? 1 : 0) : 0,
    spores: act === 0 ? 1 + (late ? 1 : 0) : act === 2 ? 1 : 0,
    unstable: act > 0 ? 1 + (nodeType === 'boss' ? 1 : 0) : 0,
    conduits: late ? 1 : 0,
    crumbling: 1 + (nodeType === 'elite' ? 1 : 0),
    archives: 1, // Inscribed Page: stand here when ending turn to draw one card.
  };
}
/** "The world answers": builds stronger than the expected curve draw extra foes (never extra health).
 *  threat = P + T + 2 per flag ability + half of stacked values; expected = 4 + 1.5·step. +1 foe per 5 over, cap per act. */
export function threatOf(evo) {
  const flags = Object.entries(evo.keywords).filter(([, v]) => v === 1).length;
  const stacks = Object.entries(evo.keywords).filter(([, v]) => v > 1).reduce((a, [, v]) => a + v * 0.5, 0);
  return evo.power + evo.toughness + 2 * flags + stacks;
}
export const REINFORCE_CAP = [1, 2, 3];
/** v0.8 "the world answers what you have become": foes that COUNTER the build, never extra health.
 *  Each list is ordered by how directly it answers that build; the reinforcement rolls among the first two. */
export const COUNTERS = [
  { flying: ['archer', 'moth'], spells: ['hexer', 'hound'], melee: ['tortoise', 'archer'], tank: ['hexer', 'moth'], any: ['hound', 'grub', 'moth'] },
  { flying: ['harpooner', 'emberseer'], spells: ['harpooner', 'hound'], melee: ['cinderling', 'ashbrute'], tank: ['emberseer', 'harpooner'], any: ['cinderling', 'harpooner', 'hound'] },
  { flying: ['harpooner', 'shardling'], spells: ['nullwarden', 'riftstalker'], melee: ['riftstalker', 'cinderling'], tank: ['shardling', 'nullwarden'], any: ['shardling', 'riftstalker', 'cinderling'] },
];
export const OVER_PER_FOE = [8, 6, 6];
export function buildFocus(profile) { return profile.flying ? 'flying' : profile.spells >= 3 ? 'spells' : profile.melee ? 'melee' : profile.tank ? 'tank' : 'any'; }
export function reinforcements(act, nodeType, depth, evo, seed, { spellbook = [], stats = null } = {}) {
  if (nodeType === 'tutorial' || nodeType === 'boss' || (act === 0 && depth < 2)) return [];
  const st = strengthOf(evo, { spellbook, stats: stats || {} });
  const over = st.score - expectedStrength(stepOf(act, depth));
  const n = Math.max(0, Math.min(REINFORCE_CAP[act], Math.floor(over / OVER_PER_FOE[act])));
  const rng = makeRng(seed ^ 0x51ab); const pool = COUNTERS[act][buildFocus(st.profile)];
  return Array.from({ length: n }, (_, i) => i === 0 ? pool[0] : pick(rng, pool));
}
/** Boss adaptation (v0.8): how far above the curve you are when you reach a boss. Read by boss AI only. */
export function bossAdaptation(act, evo, { spellbook = [], stats = null } = {}) {
  const st = strengthOf(evo, { spellbook, stats: stats || {} }); const over = st.score - expectedStrength(stepOf(act, 7));
  return { over: +over.toFixed(1), surge: over >= OVER_PER_FOE[act] * 1.5, focus: buildFocus(st.profile), spells: spellbook.length };
}
