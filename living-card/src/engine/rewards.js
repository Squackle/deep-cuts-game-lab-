// Booster generation: 3 distinct cards; always >=1 creature and >=1 spell; avoids functionally identical
// picks (same keyword set / same spell category); rarity odds are fixed weights shown in RARITY — no hidden pity.
import { makeRng, next } from '../core/rng.js';
import { RARITY } from '../data/cards.js';
import { catalogCards, resolveCard } from '../cards/catalog.js';

export const MAX_SPELL_LEVEL = 3;
const ORDER = ['common', 'uncommon', 'rare', 'mythic'];

/** Highest mana value a real card may have in a pack at this depth (big real creatures arrive later). */
export const maxManaValue = (depth, tier = 'battle') => 2 + Math.max(0, depth) + (tier === 'elite' || tier === 'boss' ? 1 : 0);
export function cardPool({ unlocks = {}, spellbook = [], noRares = false, includeReference = false, depth = null, tier = 'battle' } = {}) {
  return catalogCards({ includeReference }).filter(c => {
    if (depth != null && c.mv != null && c.mv > maxManaValue(depth, tier)) return false;
    if (c.unlock && !unlocks[c.unlock]) return false;
    if (noRares && (c.rarity === 'rare' || c.rarity === 'mythic')) return false;
    if (c.kind === 'spell') { const e = spellbook.find(s => s.id === c.id); if (e && e.level >= MAX_SPELL_LEVEL) return false; }
    return true;
  });
}
/** Rarity weights by progression depth: later steps raise uncommon/rare odds a little (documented, not hidden). */
export function rarityWeights(depth = 0) {
  const d = Math.max(0, Math.min(6, depth));
  return { common: RARITY.common.weight - d * 4, uncommon: RARITY.uncommon.weight + d * 2, rare: RARITY.rare.weight + d * 1.5, mythic: RARITY.mythic.weight + d * 0.5 };
}
const signature = c => (c.kind === 'creature' ? 'c:' + Object.keys(c.keywords).sort().join('+') : 's:' + c.category);

function weightedPick(rng, cards, weights, minRarity) {
  const pool = minRarity ? cards.filter(c => ORDER.indexOf(c.rarity) >= ORDER.indexOf(minRarity)) : cards;
  const list = pool.length ? pool : cards;
  const total = list.reduce((a, c) => a + weights[c.rarity], 0);
  let r = next(rng) * total;
  for (const c of list) { r -= weights[c.rarity]; if (r < 0) return c; }
  return list[list.length - 1];
}

/** tier: 'battle' | 'elite' | 'boss' | 'shrine'. forced: card ids that must appear (tutorial). */
export function generatePack(seed, { tier = 'battle', forced = [], depth = 0, ...poolOpts } = {}) {
  const rng = makeRng(seed);
  const pool = cardPool({ ...poolOpts, depth, tier });
  const weights = rarityWeights(depth);
  const picked = forced.map(resolveCard).filter(Boolean);
  const take = (filter, minR) => {
    const sigs = new Set(picked.map(signature));
    let cands = pool.filter(c => !picked.includes(c) && filter(c) && !sigs.has(signature(c)));
    if (!cands.length) cands = pool.filter(c => !picked.includes(c) && filter(c));
    if (cands.length) picked.push(weightedPick(rng, cands, weights, minR));
  };
  if (tier === 'elite' || tier === 'boss') take(() => true, 'rare');
  if (!picked.some(c => c.kind === 'creature')) take(c => c.kind === 'creature');
  if (!picked.some(c => c.kind === 'spell')) take(c => c.kind === 'spell');
  while (picked.length < 3) take(() => true);
  return picked.map(c => ({ c, k: next(rng) })).sort((a, b) => a.k - b.k).map(o => o.c.id).slice(0, 3);
}
