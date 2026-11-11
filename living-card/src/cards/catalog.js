// Active card catalog.
//  • ORIGINAL set (src/data/cards.js): always registered.
//  • REFERENCE set (real Magic cards, src/cards/reference-set.js): registered at startup; every card has
//    passed cards/compatibility.js, i.e. its relevant behavior is fully modeled by this engine.
// Content modes: 'original' → original only; 'reference' → real cards plus originals that add mechanics
// no real card in the pool covers.
import { ALL_CARDS, CARD_BY_ID } from '../data/cards.js';
import { KEYWORDS } from '../data/keywords.js';

const reference = new Map();
export function registerReferenceCards(cards) { for (const c of cards) { if (!c.reference) throw new Error('Not a reference card'); reference.set(c.id, c); } }
export function clearReferenceCards() { reference.clear(); }
export function referenceCards() { return [...reference.values()]; }
export function resolveCard(id) { return CARD_BY_ID[id] || reference.get(id) || null; }

export function originalNeededInReferenceMode(card) {
  if (card.reference) return true;
  if (card.kind === 'creature') return Object.keys(card.keywords).some(k => !KEYWORDS[k].mtg);
  const adapted = new Set(referenceCards().filter(c => c.kind === 'spell').map(c => c.effect));
  return !adapted.has(card.id);
}
export function catalogCards({ includeReference = false } = {}) {
  if (!includeReference) return ALL_CARDS.slice();
  return [...ALL_CARDS.filter(originalNeededInReferenceMode), ...reference.values()];
}
