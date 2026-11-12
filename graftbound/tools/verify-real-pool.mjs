// Read-only, single-request verification of every bundled real Magic card against live Scryfall.
// The collection endpoint accepts up to 75 named identifiers. This pool has fewer than 75;
// don't spam /cards/named or retry on HTTP 429. Exit nonzero on blocked or missing data.
import { REAL_CREATURES, REAL_SPELLS } from '../src/cards/real-pool.js';
import { normalizeCard } from '../src/cards/scryfall-adapter.js';
import { toGameCard } from '../src/cards/compatibility.js';

const cards = [...REAL_CREATURES, ...REAL_SPELLS];
if (cards.length > 75) {
  console.error('INCOMPLETE: more than 75 cards; this verifier must use the bulk-data feed instead.');
  process.exit(2);
}
const identifiers = cards.map(({ name }) => ({ name }));
const headers = {
  'User-Agent': 'DeepCutsEDH-GRAFTBOUND/1.1 (+https://github.com/Squackle/deep-cuts-game-lab-)',
  Accept: 'application/json;q=0.9,*/*;q=0.8',
  'Content-Type': 'application/json',
};
let result;
try {
  const response = await fetch('https://api.scryfall.com/cards/collection', {
    method: 'POST',
    headers,
    body: JSON.stringify({ identifiers }),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) {
    console.error('INCOMPLETE: Scryfall collection endpoint HTTP ' + response.status +
      (response.status === 429 ? ' (rate limited; do not retry automatically)' : ''));
    process.exit(2);
  }
  result = await response.json();
} catch (error) {
  console.error('INCOMPLETE: Scryfall collection lookup unreachable:', error?.message || error);
  process.exit(2);
}
if (result?.object !== 'list' || !Array.isArray(result.data)) {
  console.error('INCOMPLETE: invalid Scryfall collection response.');
  process.exit(2);
}
const found = new Map();
for (const item of result.data) {
  try {
    const live = normalizeCard(item);
    found.set(live.name.toLowerCase(), live);
  } catch (err) {
    console.error('INVALID Scryfall record:', err.message);
  }
}
let bad = 0;
for (const entry of cards) {
  const live = found.get(entry.name.toLowerCase());
  if (!live) {
    bad++;
    console.error('✖', entry.name, '— missing from Scryfall collection');
    continue;
  }
  const issues = [];
  if (live.manaCost !== entry.mana_cost) issues.push('printed mana cost ' + live.manaCost + ' ≠ ' + entry.mana_cost);
  if (live.typeLine !== entry.type_line) issues.push('printed type ' + live.typeLine + ' ≠ ' + entry.type_line);
  if (!entry.spell && (live.power !== entry.power || live.toughness !== entry.toughness))
    issues.push('printed P/T ' + live.power + '/' + live.toughness + ' ≠ ' + entry.power + '/' + entry.toughness);
  if (live.keywords.slice().sort().join() !== entry.keywords.slice().sort().join())
    issues.push('keywords ' + live.keywords.join(', ') + ' ≠ ' + entry.keywords.join(', '));
  if (!entry.spell) {
    const adaptation = toGameCard(live);
    if (!adaptation.ok) issues.push('compatibility ' + adaptation.reasons.join('; '));
  }
  if (issues.length) {
    bad++;
    console.error('✖', entry.name, '—', issues.join(' | '));
  } else console.log('✔', entry.name);
}
const notFound = result.not_found || [];
if (notFound.length) console.error('Scryfall did not find ' + notFound.length + ' requested identifiers.');
console.log(cards.length + ' curated cards checked, ' + bad + ' problems.');
process.exit(bad ? 1 : 0);
