// Card catalog (v0.5).
//  • REWARDS: real Magic cards only (src/cards/reference-set.js, every card passed compatibility.js).
//  • LEGACY: the v0.1–v0.4 original cards (src/data/cards.js) are still RESOLVABLE so old saves keep the exact
//    grafts and spells they earned, but they are never offered in packs and are labeled "Legacy" in the UI.
import { CARD_BY_ID } from '../data/cards.js';

const reference = new Map();
export function registerReferenceCards(cards) { for (const c of cards) { if (!c.reference) throw new Error('Not a reference card'); reference.set(c.id, c); } }
export function clearReferenceCards() { reference.clear(); }
export function referenceCards() { return [...reference.values()]; }
export function resolveCard(id) { return reference.get(id) || CARD_BY_ID[id] || null; }
export const isLegacy = id => !!(CARD_BY_ID[id] && !reference.has(id));
/** Everything a booster may contain. Only genuine Magic cards. */
export function rewardCards() { return referenceCards(); }
