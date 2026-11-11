// Permanent creature evolution (grafting). Pure functions; temporary combat effects never touch this object.
//
// v0.5 BALANCE RULES (explicit — no hidden penalties):
//  • Grafting stays fully additive: absorbing a printed 2/2 adds exactly +2/+2. Strong cards are controlled by
//    WHEN they can appear (engine/power.js budgets), not by secretly shrinking their stats.
//  • Health = Spark (6) + Toughness (was Spark 5 + 2×Toughness). In v0.4 every point of toughness was worth
//    two health, which made big-toughness grafts snowball into near-immortality. 1:1 keeps toughness valuable
//    without doubling it.
//  • Resonance: re-gaining an ability you already have (or overflowing a stacked one) now grants +2 Spark
//    (+2 max health) per point instead of +1/+1. Stacking duplicates is still rewarded, but no longer feeds
//    power — the stat that let one-shot builds trivialize bosses.
export const BASE_SPARK = 6;
export const BASE_MOVE = 3;
export const BASE_MANA = 3;
export const RESONANCE_SPARK = 2;
export const STARTING_NAME = 'The Blank';

export function newEvolution() {
  return { power: 1, toughness: 1, keywords: {}, resonance: 0, parts: {}, colors: {}, absorbed: [] };
}

export function absorb(evoIn, cardOrId) {
  const card = typeof cardOrId === 'string' ? resolveCard(cardOrId) : cardOrId;
  if (!card || card.kind !== 'creature') throw new Error('Not a creature card: ' + (card ? card.id : cardOrId));
  const evo = structuredClone(evoIn);
  const change = { cardId: card.id, power: card.power, toughness: card.toughness, gained: [], raised: [], resonance: 0 };
  evo.power += card.power; evo.toughness += card.toughness;
  for (const [kw, val] of Object.entries(card.keywords || {})) {
    const def = KEYWORDS_REF[kw];
    if (!def) throw new Error('Unsupported keyword ' + kw);
    if (def.kind === 'flag') {
      if (evo.keywords[kw]) change.resonance += 1;
      else { evo.keywords[kw] = 1; change.gained.push(kw); }
    } else {
      const before = evo.keywords[kw] || 0;
      const total = before + val; const capped = Math.min(def.cap, total);
      change.resonance += total - capped;
      if (capped > before) { evo.keywords[kw] = capped; (before ? change.raised : change.gained).push(kw); }
    }
  }
  evo.resonance += change.resonance;
  change.parts = { ...(card.parts || {}) };
  for (const [p, n] of Object.entries(card.parts || {})) evo.parts[p] = (evo.parts[p] || 0) + n;
  if (card.color) evo.colors[card.color] = (evo.colors[card.color] || 0) + 1;
  evo.absorbed.push({ ...change, name: card.name });
  return { evo, change };
}
import { KEYWORDS as KEYWORDS_REF } from '../data/keywords.js';
import { resolveCard } from '../cards/catalog.js';

/** Rebuild an evolution from a list of card objects (used by the Graftsmith's Sever). */
export function rebuild(cards) { let e = newEvolution(); for (const c of cards) e = absorb(e, c).evo; return e; }

/** Spellbook focus (v0.5): every 3 spells in your spellbook grant +1 max mana and +1 mana per turn. */
export const spellFocus = spellCount => Math.floor((spellCount || 0) / 3);
export function deriveStats(evo, { sparkBonus = 0, baseSpark = BASE_SPARK, manaBonus = 0, spellCount = 0 } = {}) {
  const k = evo.keywords; const focus = spellFocus(spellCount);
  const spark = baseSpark + sparkBonus + RESONANCE_SPARK * (evo.resonance || 0);
  return {
    power: evo.power, toughness: evo.toughness, spark,
    maxHealth: spark + evo.toughness,
    move: BASE_MOVE + (k.flying ? 1 : 0) + (k.haste ? 1 : 0),
    maxMana: BASE_MANA + (k.attuned || 0) + manaBonus + focus,
    startMana: 1 + (k.attuned || 0) + Math.min(1, manaBonus),
    manaRegen: 1 + (k.attuned || 0) + focus,
    arcane: k.arcane || 0,
  };
}
