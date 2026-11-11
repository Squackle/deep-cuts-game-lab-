// Verifies every curated real card against LIVE Scryfall data (needs network; the build sandbox had none).
// Usage (from graftbound/): node tools/verify-real-pool.mjs   → exits 1 on any mismatch or missing card.
import { REAL_CREATURES, REAL_SPELLS } from '../src/cards/real-pool.js';
import { createScryfallAdapter } from '../src/cards/scryfall-adapter.js';
import { toGameCard } from '../src/cards/compatibility.js';
const sf = createScryfallAdapter({ minIntervalMs: 120 });
let bad = 0;
for (const e of [...REAL_CREATURES, ...REAL_SPELLS]) {
  try {
    const live = await sf.cardByName(e.name); const issues = [];
    if (live.manaCost !== e.mana_cost) issues.push(`mana ${live.manaCost} ≠ ${e.mana_cost}`);
    if (live.typeLine !== e.type_line) issues.push(`type "${live.typeLine}"`);
    if (!e.spell && (live.power !== e.power || live.toughness !== e.toughness)) issues.push(`P/T ${live.power}/${live.toughness}`);
    if (live.keywords.slice().sort().join() !== e.keywords.slice().sort().join()) issues.push(`keywords ${live.keywords.join(', ')}`);
    if (!e.spell) { const g = toGameCard(live); if (!g.ok) issues.push('compat: ' + g.reasons.join('; ')); }
    if (issues.length) { bad++; console.log('✖', e.name, '—', issues.join(' | ')); } else console.log('✔', e.name);
  } catch (err) { bad++; console.log('✖', e.name, '—', err.code || err.message); }
}
console.log(bad ? `${bad} problem(s)` : 'All real cards verified'); process.exit(bad ? 1 : 0);
