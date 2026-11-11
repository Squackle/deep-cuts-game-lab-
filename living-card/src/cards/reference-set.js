// Builds the Real-cards set from the bundled curated pool. Pure + synchronous so saves that reference
// real cards can be validated before anything is fetched from the network.
import { REAL_CREATURES, REAL_SPELLS, poolRecord } from './real-pool.js';
import { toGameCard } from './compatibility.js';
import { registerReferenceCards, referenceCards } from './catalog.js';

export function buildReferenceSet() {
  const ok = [], rejected = [];
  for (const e of [...REAL_CREATURES, ...REAL_SPELLS]) {
    const r = toGameCard(poolRecord(e));
    if (r.ok) ok.push(r.card); else rejected.push({ name: e.name, reasons: r.reasons });
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
