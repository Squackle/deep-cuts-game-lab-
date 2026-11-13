// Booster generation (v0.5): 3 distinct REAL Magic cards; >=1 creature and >=1 spell when possible;
// functionally distinct where possible; creatures gated by GRAFTBOUND power rating (not Magic rarity or mana value);
// rarity weights only shape which ELIGIBLE card appears. Deterministic per seed. No hidden pity.
import { makeRng, next } from '../core/rng.js';
import { RARITY } from '../data/cards.js';
import { rewardCards, resolveCard } from '../cards/catalog.js';
import { graftRating, creatureBudget, spellMaxCost } from './power.js';

export const MAX_SPELL_LEVEL = 3;
/** v0.8 Spell Primer: an affordable, category-diverse, spells-only choice (deterministic per seed). */
export const PRIMER_CATEGORIES = ['damage', 'protection', 'healing', 'weaken', 'disable', 'enhance', 'area', 'summon'];
export function primerPack(seed, { spellbook = [] } = {}) {
  const rng = makeRng(seed ^ 0x9e11);
  const pool = rewardCards().filter(c => c.kind === 'spell' && c.cost <= 2 && !spellbook.some(s => s.id === c.id));
  const out = []; const used = new Set();
  for (const cat of PRIMER_CATEGORIES) {
    const opts = pool.filter(c => c.category === cat && !used.has(c.category)); if (!opts.length) continue;
    out.push({ c: opts[Math.floor(next(rng) * opts.length)], k: next(rng) }); used.add(cat);
  }
  return out.sort((a, b) => a.k - b.k).slice(0, 3).map(o => o.c.id);
}
const ORDER = ['common', 'uncommon', 'rare', 'mythic'];
const NO_EVO = { power: 0, toughness: 0, keywords: {} };

/** Eligible pack contents for a campaign step / tier / build. */
export function cardPool({ spellbook = [], noRares = false, step = 0, tier = 'battle', evo = NO_EVO } = {}) {
  const budget = creatureBudget(step, tier), maxCost = spellMaxCost(step, tier);
  return rewardCards().filter(c => {
    if (noRares && (c.rarity === 'rare' || c.rarity === 'mythic')) return false;
    if (c.kind === 'equipment') return step >= 3 && (tier === 'elite' || tier === 'boss' || step >= 9) && c.cost <= maxCost + 1;
    if (c.kind === 'aura') return step >= 2 && c.cost <= maxCost;
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
export function generatePack(seed, { tier = 'battle', forced = [], step = 0, evo = NO_EVO, creaturesOnly = false, only = null, minSpells = 1, ...poolOpts } = {}) {
  const rng = makeRng(seed);
  if (creaturesOnly) only = 'creature';
  const pool = cardPool({ ...poolOpts, step, tier, evo }).filter(c => !only || c.kind === only);
  const weights = rarityWeights(step);
  const picked = forced.map(resolveCard).filter(c => c && c.reference);
  const strong = c => c.kind === 'creature' ? graftRating(c,evo)>=creatureBudget(step,tier)-3 : c.cost>=2;
  const take = (filter, prefer) => {
    const sigs = new Set(picked.map(signature));
    let cands = pool.filter(c => !picked.includes(c) && filter(c) && !sigs.has(signature(c)));
    if (!cands.length) cands = pool.filter(c => !picked.includes(c) && filter(c));
    if (!cands.length) cands = rewardCards().filter(c => !picked.includes(c) && filter(c) && (!only || c.kind === only) && (c.kind !== 'creature' ? c.cost <= 1 : graftRating(c, evo) <= creatureBudget(step, tier)));
    if (cands.length) picked.push(weightedPick(rng, cands, weights, prefer));
  };
  const ANY = () => true;
  if (tier === 'elite' || tier === 'boss') take(ANY, strong);  // elite/boss: one card near the top of the budget
  if (only !== 'spell' && !picked.some(c => c.kind === 'creature')) take(c => c.kind === 'creature');
  if (only !== 'creature' && !picked.some(c => c.kind === 'spell')) take(c => c.kind === 'spell');
  // v0.8 spell access: while the spellbook is thin early on, packs carry a SECOND spell (still 3 cards; the creature
  // slot is never removed), preferring a different tactical category so a choice is meaningful.
  if (only !== 'creature' && minSpells >= 2 && picked.filter(c => c.kind === 'spell').length < 2) take(c => c.kind === 'spell' && !picked.some(p => p.kind === 'spell' && p.category === c.category));
  for (let guard = 0; picked.length < 3 && guard < 6; guard++) take(only ? c => c.kind === only : ANY);
  return picked.map(c => ({ c, k: next(rng) })).sort((a, b) => a.k - b.k).map(o => o.c.id).slice(0, 3);
}
