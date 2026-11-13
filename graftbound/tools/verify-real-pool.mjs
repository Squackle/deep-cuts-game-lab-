// Read-only, rate-aware verification of every bundled real Magic card against live Scryfall.
// The collection endpoint accepts up to 75 named identifiers per request;
// don't spam /cards/named or retry on HTTP 429. Exit nonzero on blocked or missing data.
import { REAL_CREATURES, REAL_SPELLS } from '../src/cards/real-pool.js';
import { normalizeCard } from '../src/cards/scryfall-adapter.js';
import { ATTACHMENT_FACTS } from '../src/cards/attachments.js';
import { ENEMY_FACTS } from '../src/cards/enemy-facts.js';
import { LEGENDARY_BOSSES } from '../src/data/legendary.js';
import { toGameCard } from '../src/cards/compatibility.js';

const enemyCards=Object.values(ENEMY_FACTS).map(e=>({...e,enemy:true,power:String(e.power),toughness:String(e.toughness)}));
const bossCards=LEGENDARY_BOSSES.flat().map(e=>({name:e.name,power:String(e.power),toughness:String(e.toughness),boss:true}));
const cards = [...REAL_CREATURES, ...REAL_SPELLS, ...ATTACHMENT_FACTS, ...enemyCards, ...bossCards];
const headers = {
  'User-Agent': 'DeepCutsEDH-GRAFTBOUND/1.1 (+https://github.com/Squackle/deep-cuts-game-lab-)',
  Accept: 'application/json;q=0.9,*/*;q=0.8',
  'Content-Type': 'application/json',
};
const results = [];
for (let i=0;i<cards.length;i+=75) {
  // Scryfall limits /cards/collection to 75 identifiers. No automatic rate-limit retries.
  const identifiers = cards.slice(i,i+75).map(({name})=>({name}));
  let response;
  try {
    response=await fetch('https://api.scryfall.com/cards/collection', {
      method:'POST',headers,body:JSON.stringify({identifiers}),signal:AbortSignal.timeout(45000),
    });
  } catch (err) { console.error('INCOMPLETE: Scryfall unreachable:',err?.message||err);process.exit(2); }
  if (!response.ok) { console.error('INCOMPLETE: Scryfall HTTP '+response.status);process.exit(2); }
  const data=await response.json();
  if(data?.object!=='list'||!Array.isArray(data.data)) {console.error('INCOMPLETE: invalid Scryfall response');process.exit(2);}
  results.push(data);
}
const found = new Map();
for (const result of results) for (const item of result.data) {
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
  if (entry.mana_cost && live.manaCost !== entry.mana_cost) issues.push('printed mana cost ' + live.manaCost + ' ≠ ' + entry.mana_cost);
  if (entry.type_line && live.typeLine !== entry.type_line) issues.push('printed type ' + live.typeLine + ' ≠ ' + entry.type_line);
  if (!entry.spell && !entry.kind && (live.power !== entry.power || live.toughness !== entry.toughness))
    issues.push('printed P/T ' + live.power + '/' + live.toughness + ' ≠ ' + entry.power + '/' + entry.toughness);
  if (!entry.kind && !entry.enemy && !entry.boss && live.keywords.slice().sort().join() !== entry.keywords.slice().sort().join())
    issues.push('keywords ' + live.keywords.join(', ') + ' ≠ ' + entry.keywords.join(', '));
  if (!entry.spell && !entry.enemy && !entry.boss) {
    const adaptation = toGameCard(live);
    if (!adaptation.ok) issues.push('compatibility ' + adaptation.reasons.join('; '));
  }
  if (issues.length) {
    bad++;
    console.error('✖', entry.name, '—', issues.join(' | '));
  } else console.log('✔', entry.name);
}
const notFound = results.flatMap(r=>r.not_found||[]);
if (notFound.length) console.error('Scryfall did not find ' + notFound.length + ' requested identifiers.');
console.log(cards.length + ' curated cards checked, ' + bad + ' problems.');
process.exit(bad ? 1 : 0);
