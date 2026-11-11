// Branching region maps — one per act (three acts in v0.5). Each act: 8 layers (start, 6 branching, boss).
// A full adventure visits 24 meaningful nodes (battles, elites, Wayshrines, three bosses).
import { makeRng, int, next } from '../core/rng.js';
import { ACTS } from '../data/encounters.js';

export const NODE_TYPES = {
  battle: { name: 'Skirmish', glyph: '⚔' }, elite: { name: 'Elite Lair', glyph: '☠' }, shrine: { name: 'Wayshrine', glyph: '✧' },
  boss: { name: 'Boss', glyph: '♛' }, event: { name: 'Mystery', glyph: '?' }, tutorial: { name: 'The Waking Glade', glyph: '⚔' },
};
export const ACT_COUNT = ACTS.length;
export function generateMap(seed, { act = 0, tutorial = false } = {}) {
  const rng = makeRng((seed ^ (act * 0x9e3779b1)) >>> 0);
  const layers = [[{ type: tutorial && act === 0 ? 'tutorial' : 'battle' }]];
  for (let d = 1; d <= 6; d++) {
    const n = d === 6 ? 2 : 2 + int(rng, 2);
    const row = [];
    for (let i = 0; i < n; i++) {
      let type = 'battle'; const r = next(rng);
      if (d >= 3 && r < 0.3) type = 'elite';
      else if (d >= 2 && r < 0.5) type = 'shrine';
      row.push({ type });
    }
    if (d === 3 && !row.some(n => n.type === 'elite')) row[row.length - 1].type = 'elite';
    if (d === 2 && !row.some(n => n.type === 'shrine')) row[0].type = 'shrine';
    if (d === 5 && !row.some(n => n.type === 'shrine')) row[0].type = 'shrine';
    if (d === 1) row.forEach(n => (n.type = 'battle'));
    if (d === 6) row.forEach((n, i) => (n.type = i === 0 ? 'battle' : n.type === 'shrine' ? 'shrine' : 'elite'));
    layers.push(row);
  }
  // v0.6 special encounters: 1–2 per act, placed with a SEPARATE rng so battle/elite/shrine layout is unchanged.
  const er = makeRng((seed ^ 0xe7e7e7 ^ (act * 131)) >>> 0);
  const swap = (d, pref, keepBattle = true) => { const row = layers[d]; const i = row.findIndex((n, k) => n.type === 'battle' && (pref == null || k === pref)); if (i >= 0 && (!keepBattle || row.filter(n => n.type === 'battle').length > 1)) { row[i].type = 'event'; return true; } return false; };
  const shrineSwap = () => { const total = layers.flat().filter(n => n.type === 'shrine').length; if (total <= 2) return false; for (const d of [4, 3, 5]) { const n = layers[d].find(x => x.type === 'shrine'); if (n) { n.type = 'event'; return true; } } return false; };
  const roll = next(er); (swap(4, null) || swap(3, null) || swap(5, null) || swap(4, null, false) || swap(3, null, false) || shrineSwap() || swap(2, null, false)); if (roll < 0.5) swap(2, layers[2].length - 1);
  layers.push([{ type: 'boss' }]);
  const nodes = []; let id = 0;
  layers.forEach((row, d) => row.forEach((n, i) => {
    nodes.push({ id: id++, depth: d, index: i, type: n.type, x: (i + 1) / (row.length + 1), next: [], seed: ((seed * 31 + act * 7717 + d * 977 + i * 131) >>> 0) || 1 });
  }));
  for (let d = 0; d < layers.length - 1; d++) {
    const cur = nodes.filter(n => n.depth === d), nxt = nodes.filter(n => n.depth === d + 1);
    for (const n of cur) {
      const sorted = nxt.slice().sort((a, b) => Math.abs(a.x - n.x) - Math.abs(b.x - n.x));
      n.next.push(sorted[0].id);
      if (sorted[1] && Math.abs(sorted[1].x - n.x) < 0.4) n.next.push(sorted[1].id);
    }
    for (const m of nxt) if (!cur.some(n => n.next.includes(m.id))) cur.slice().sort((a, b) => Math.abs(a.x - m.x) - Math.abs(b.x - m.x))[0].next.push(m.id);
  }
  return { seed, nodes, act, region: ACTS[act].name, boss: ACTS[act].boss };
}
export const nodeById = (map, id) => map.nodes.find(n => n.id === id);
export function availableNodes(map, currentId) {
  if (currentId == null) return map.nodes.filter(n => n.depth === 0);
  return nodeById(map, currentId).next.map(id => nodeById(map, id));
}
