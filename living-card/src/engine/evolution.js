// Permanent creature evolution (grafting). Pure functions; temporary combat effects never touch this object.
import { KEYWORDS } from '../data/keywords.js';
import { resolveCard } from '../cards/catalog.js';

export const BASE_SPARK = 5;   // bonus health only the Graftbound has
export const BASE_MOVE = 3;
export const BASE_MANA = 3;
export const STARTING_NAME = 'The Blank';

export function newEvolution() {
  return { power: 1, toughness: 1, keywords: {}, resonance: 0, parts: {}, colors: {}, absorbed: [] };
}

/**
 * Absorb (graft) a creature card. Deterministic rules:
 *  1. power += card.power, toughness += card.toughness.
 *  2. New flag keyword -> gained. Duplicate flag keyword -> +1 Resonance.
 *  3. Stack keyword -> value added up to its cap; each point above the cap -> +1 Resonance.
 *  4. Each Resonance grants +1/+1 immediately (recorded in history).
 *  5. Visual parts and color weights accumulate.
 * Accepts a card object (from the catalog/compatibility layer) or a card id. Input evo is not mutated.
 */
export function absorb(evoIn, cardOrId) {
  const card = typeof cardOrId === 'string' ? resolveCard(cardOrId) : cardOrId;
  if (!card || card.kind !== 'creature') throw new Error('Not a creature card: ' + (card ? card.id : cardOrId));
  const evo = structuredClone(evoIn);
  const change = { cardId: card.id, power: card.power, toughness: card.toughness, gained: [], raised: [], resonance: 0 };
  evo.power += card.power; evo.toughness += card.toughness;
  for (const [kw, val] of Object.entries(card.keywords || {})) {
    const def = KEYWORDS[kw];
    if (!def) throw new Error('Unsupported keyword ' + kw);
    if (def.kind === 'flag') {
      if (evo.keywords[kw]) change.resonance += 1;
      else { evo.keywords[kw] = 1; change.gained.push(kw); }
    } else {
      const before = evo.keywords[kw] || 0;
      const total = before + val;
      const capped = Math.min(def.cap, total);
      change.resonance += total - capped;
      if (capped > before) { evo.keywords[kw] = capped; (before ? change.raised : change.gained).push(kw); }
    }
  }
  evo.resonance += change.resonance;
  evo.power += change.resonance; evo.toughness += change.resonance;
  change.parts = { ...(card.parts || {}) };
  for (const [p, n] of Object.entries(card.parts || {})) evo.parts[p] = (evo.parts[p] || 0) + n;
  if (card.color) evo.colors[card.color] = (evo.colors[card.color] || 0) + 1;
  evo.absorbed.push({ ...change, name: card.name });
  return { evo, change };
}

/** Derived permanent stats for a run. */
export function deriveStats(evo, { sparkBonus = 0, baseSpark = BASE_SPARK } = {}) {
  const k = evo.keywords;
  const spark = baseSpark + sparkBonus;
  return {
    power: evo.power, toughness: evo.toughness, spark,
    maxHealth: spark + 2 * evo.toughness,
    move: BASE_MOVE + (k.flying ? 1 : 0) + (k.haste ? 1 : 0),
    maxMana: BASE_MANA + (k.attuned || 0),
    startMana: 1 + (k.attuned || 0),
    manaRegen: 1 + (k.attuned || 0),
    arcane: k.arcane || 0,
  };
}
