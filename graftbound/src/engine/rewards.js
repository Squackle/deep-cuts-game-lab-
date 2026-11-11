// Booster generation (v0.5): 3 distinct REAL Magic cards; >=1 creature and >=1 spell when possible;
// functionally distinct where possible; creatures gated by GRAFTBOUND power rating (not Magic rarity or mana value);
// rarity weights only shape which ELIGIBLE card appears. Deterministic per seed. No hidden pity.
import { makeRng, next } from '../core/rng.js';
import { RARITY } from '../data/cards.js';
import { rewardCards, resolveCard } from '../cards/catalog.js';
import { graftRating, creatureBudget, spellMaxCost } from './power.js';

export const MAX_SPELL_LEVEL = 3;
const ORDER = ['common', 'uncommon', 'rare', 'mythic'];
const NO_EVO = { power: 0, toughness: 0, keywords: {} };

/** Eligible pack contents for a campaign step / tier / build. */
export function cardPool({ spellbook = [], noRares = false, step = 0, tier = 'battle', evo = NO_EVO } = {}) {
  const budget = creatureBudget(step, tier), maxCost = spellMaxCost(step, tier);
  return rewardCards().filter(c => {
    if (noRares && (c.rarity === 'rare' || c.rarity === 'mythic')) return false;
    if (c.kind === 'spell') {
      if (c.cost > maxCost) return false;
      const e = spellbook.find(s => s.id === c.id); if (e && e.level >= MAX_SPELL_LEVEL) return false;
      return true;
    }
    return graftRating(c, evo) <= budget;
  });
}
/** Rarity weights by step (documented, mild). */
export function rarityWeights(step = 0) {
  const d = Math.max(0, Math.min(23, step)) / 4;
  return { common: RARITY.common.weight - d * 4, uncommon: RARITY.uncommon.weight + d * 2, rare: RARITY.rare.weight + d * 1.5, mythic: RARITY.mythic.weight + d * 0.5 };
}
const signature = c => (c.kind === 'creature' ? 'c:' + Object.keys(c.keywords).sort().join('+') + ':' + (c.power + c.toughness) : 's:' + c.category);

function weightedPick(rng, cards, weights, prefer) {
  const list = prefer ? (cards.filter(prefer).length ? cards.filter(prefer) : cards) : cards;
  const total = list.reduce((a, c) => a + weights[c.rarity], 0);
  let r = next(rng) * total;
  for (const c of list) { r -= weights[c.rarity]; if (r < 0) return c; }
  return list[list.length - 1];
}

/** tier: 'battle' | 'elite' | 'boss' | 'shrine'. forced: card ids that must appear (tutorial). */
export function generatePack(seed, { tier = 'battle', forced = [], step = 0, evo = NO_EVO, creaturesOnly = false, only = null, ...poolOpts } = {}) {
  const rng = makeRng(seed);
  if (creaturesOnly) only = 'creature';
  const pool = cardPool({ ...poolOpts, step, tier, evo }).filter(c => !only || c.kind === only);
  const weights = rarityWeights(step);
  const picked = forced.map(resolveCard).filter(c => c && c.reference);
  const strong = c => c.kind === 'spell' ? c.cost >= 2 : graftRating(c, evo) >= creatureBudget(step, tier) - 3;
  const take = (filter, prefer) => {
    const sigs = new Set(picked.map(signature));
    let cands = pool.filter(c => !picked.includes(c) && filter(c) && !sigs.has(signature(c)));
    if (!cands.length) cands = pool.filter(c => !picked.includes(c) && filter(c));
    if (!cands.length) cands = rewardCards().filter(c => !picked.includes(c) && filter(c) && (!only || c.kind === only) && (c.kind === 'spell' ? c.cost <= 1 : graftRating(c, evo) <= creatureBudget(step, tier)));
    if (cands.length) picked.push(weightedPick(rng, cands, weights, prefer));
  };
  const ANY = () => true;
  if (tier === 'elite' || tier === 'boss') take(ANY, strong);  // elite/boss: one card near the top of the budget
  if (only !== 'spell' && !picked.some(c => c.kind === 'creature')) take(c => c.kind === 'creature');
  if (only !== 'creature' && !picked.some(c => c.kind === 'spell')) take(c => c.kind === 'spell');
  for (let guard = 0; picked.length < 3 && guard < 6; guard++) take(only ? c => c.kind === only : ANY);
  return picked.map(c => ({ c, k: next(rng) })).sort((a, b) => a.k - b.k).map(o => o.c.id).slice(0, 3);
}
