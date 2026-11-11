// Branching region map (Act I: The Forgotten Hollow). Layers of nodes connected forward.
import { makeRng, int, next } from '../core/rng.js';

export const NODE_TYPES = {
  battle: { name: 'Skirmish', glyph: '⚔' },
  elite:  { name: 'Elite Lair', glyph: '☠' },
  shrine: { name: 'Wayshrine', glyph: '✧' },
  boss:   { name: 'The Thornmother', glyph: '♛' },
  tutorial: { name: 'The Waking Glade', glyph: '⚔' },
};

/** 8 layers: 0 start, 1..6 branching, 7 boss. */
export function generateMap(seed, { tutorial = false } = {}) {
  const rng = makeRng(seed);
  const layers = [[{ type: tutorial ? 'tutorial' : 'battle' }]];
  for (let d = 1; d <= 6; d++) {
    const n = d === 6 ? 2 : 2 + int(rng, 2);
    const row = [];
    for (let i = 0; i < n; i++) {
      let type = 'battle'; const r = next(rng);
      if (d >= 3 && r < 0.28) type = 'elite';
      else if (d >= 2 && r < 0.48) type = 'shrine';
      row.push({ type });
    }
    if (d === 3 && !row.some(n => n.type === 'elite')) row[row.length - 1].type = 'elite';
    if (d === 5 && !row.some(n => n.type === 'shrine')) row[0].type = 'shrine';
    if (d === 1) row.forEach(n => (n.type = 'battle'));
    layers.push(row);
  }
  layers.push([{ type: 'boss' }]);
  const nodes = []; let id = 0;
  layers.forEach((row, d) => row.forEach((n, i) => {
    nodes.push({ id: id++, depth: d, index: i, type: n.type, x: (i + 1) / (row.length + 1), next: [], seed: (seed * 31 + d * 977 + i * 131) >>> 0 });
  }));
  for (let d = 0; d < layers.length - 1; d++) {
    const cur = nodes.filter(n => n.depth === d), nxt = nodes.filter(n => n.depth === d + 1);
    for (const n of cur) {
      const sorted = nxt.slice().sort((a, b) => Math.abs(a.x - n.x) - Math.abs(b.x - n.x));
      n.next.push(sorted[0].id);
      if (sorted[1] && Math.abs(sorted[1].x - n.x) < 0.4) n.next.push(sorted[1].id);
    }
    for (const m of nxt) if (!cur.some(n => n.next.includes(m.id))) {
      cur.slice().sort((a, b) => Math.abs(a.x - m.x) - Math.abs(b.x - m.x))[0].next.push(m.id);
    }
  }
  return { seed, nodes, act: 1, region: 'The Forgotten Hollow' };
}
export const nodeById = (map, id) => map.nodes.find(n => n.id === id);
export function availableNodes(map, currentId) {
  if (currentId == null) return map.nodes.filter(n => n.depth === 0);
  return nodeById(map, currentId).next.map(id => nodeById(map, id));
}
