// Evolution -> appearance description consumed by rendering/evolution-visuals.js. Pure & testable.
export const PALETTE = {
  parchment: [0.86, 0.80, 0.64],
  verdant: [0.36, 0.62, 0.36], umbral: [0.55, 0.36, 0.72], ember: [0.88, 0.45, 0.22],
  tide: [0.30, 0.60, 0.78], radiant: [0.96, 0.84, 0.45],
};
export const SLOTS = {
  back:  ['wings', 'shell', 'spikes'],
  head:  ['crown', 'horns', 'antlers'],
  rear:  ['tail'],
  body:  ['armor'],
  front: ['blades', 'claws', 'tusks', 'beak'],
};
export const EFFECTS = ['venom', 'aura', 'eyes', 'moss', 'tendrils'];
export const MAX_EFFECTS = 2;
export function dominantColor(evo) {
  let best = null, n = 0;
  for (const c of ['verdant', 'umbral', 'ember', 'tide', 'radiant']) if ((evo.colors[c] || 0) > n) { n = evo.colors[c]; best = c; }
  return best;
}
export function deriveAppearance(evo) {
  const total = evo.absorbed.length;
  const dom = dominantColor(evo);
  const p = evo.parts || {};
  const slots = {}, dormant = [];
  for (const [slot, prio] of Object.entries(SLOTS)) {
    const present = prio.filter(x => p[x]).sort((a, b) => p[b] - p[a] || prio.indexOf(a) - prio.indexOf(b));
    if (present.length) { slots[slot] = { part: present[0], tier: Math.min(2, p[present[0]]) }; dormant.push(...present.slice(1)); }
  }
  const effects = EFFECTS.filter(x => p[x]).sort((a, b) => p[b] - p[a] || EFFECTS.indexOf(a) - EFFECTS.indexOf(b));
  dormant.push(...effects.slice(MAX_EFFECTS));
  const mix = total ? Math.min(0.7, 0.3 + total * 0.05) : 0;
  const tint = dom ? PALETTE[dom] : PALETTE.parchment;
  const body = PALETTE.parchment.map((b, i) => b * (1 - mix) + tint[i] * mix);
  const size = +Math.min(1.9, 1 + 0.06 * (evo.toughness - 1) + 0.12 * Math.min(2, p.bulk || 0)).toFixed(3);
  return {
    stage: total === 0 ? 'blank' : total < 4 ? 'stirring' : total < 9 ? 'awakened' : 'ascendant',
    size, dominant: dom, tintMix: +mix.toFixed(3), body, glow: dom ? PALETTE[dom] : [1, 0.86, 0.5],
    slots, effects: effects.slice(0, MAX_EFFECTS), dormant, markings: Object.keys(evo.colors).sort(),
  };
}
