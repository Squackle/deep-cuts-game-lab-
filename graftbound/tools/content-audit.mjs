// Offline, deterministic content gate; no network, writes, or runtime state changes.
import { REAL_CREATURES, REAL_SPELLS, poolRecord } from '../src/cards/real-pool.js';
import { ATTACHMENT_FACTS } from '../src/cards/attachments.js';
import { toGameCard, slug } from '../src/cards/compatibility.js';
import { CARD_POOL_VERSION } from '../src/engine/ranked.js';

export function auditCardPool(entries, version) {
  const problems = [], names = new Set(), ids = new Set();
  const count = /^real-pool-(\d+)-v\d+$/.exec(version);
  if (!count || Number(count[1]) !== entries.length) problems.push('Version count does not match curated entry count');
  for (const e of entries) {
    if (!e || typeof e.name !== 'string' || !e.name.trim()) { problems.push('Missing card identity'); continue; }
    const name = e.name.trim().toLowerCase(), id = 'mtg:' + slug(e.name);
    if (names.has(name)) problems.push('Duplicate name: ' + e.name);
    if (ids.has(id)) problems.push('Duplicate ID: ' + id);
    names.add(name); ids.add(id);
    if (!Number.isSafeInteger(e.cmc) || e.cmc < 0 || !['common','uncommon','rare','mythic'].includes(e.rarity)) problems.push('Invalid mana value or rarity: ' + e.name);
    try {
      const r = toGameCard(poolRecord(e));
      if (!r.ok) { problems.push(e.name + ': ' + r.reasons.join('; ')); continue; }
      const c = r.card;
      if (c.id !== id) problems.push('Unstable ID: ' + e.name);
      if (c.kind === 'creature') {
        if (!Number.isFinite(c.power) || !Number.isFinite(c.toughness) || !Object.keys(c.parts || {}).length) problems.push('Missing numeric stats or anatomy: ' + e.name);
        if (c.trait && !c.adaptationNote) problems.push('Undisclosed trait: ' + e.name);
      } else {
        if (!c.adaptationNote || !c.vfx || !Number.isFinite(c.cost) || c.cost < 0) problems.push('Missing reviewed effect/cost/visual: ' + e.name);
      }
    } catch (err) { problems.push(e.name + ': ' + err.message); }
  }
  return { count: entries.length, uniqueIds: ids.size, problems };
}
export function auditCuratedPool() {
  return auditCardPool([...REAL_CREATURES, ...REAL_SPELLS, ...ATTACHMENT_FACTS], CARD_POOL_VERSION);
}
