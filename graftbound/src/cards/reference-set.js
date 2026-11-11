// Builds the real-card set from the bundled curated pool. Pure + synchronous so saves containing real cards
// validate before anything is fetched from the network. Gameplay never depends on Scryfall availability.
import { REAL_CREATURES, REAL_SPELLS, poolRecord } from './real-pool.js';
import { toGameCard } from './compatibility.js';
import { registerReferenceCards, referenceCards } from './catalog.js';
import { powerRating } from '../engine/power.js';

export function buildReferenceSet() {
  const ok = [], rejected = [];
  for (const e of [...REAL_CREATURES, ...REAL_SPELLS]) {
    const r = toGameCard(poolRecord(e));
    if (r.ok) { r.card.rating = powerRating(r.card); ok.push(r.card); } else rejected.push({ name: e.name, reasons: r.reasons });
  }
  return { cards: ok, rejected };
}
let installed = false;
export function installReferenceSet() {
  if (installed) return referenceCards();
  const { cards, rejected } = buildReferenceSet();
  if (rejected.length) console.warn('Real-card pool entries rejected:', rejected);
  registerReferenceCards(cards); installed = true;
  return cards;
}
