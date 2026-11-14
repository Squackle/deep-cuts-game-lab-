// Runtime enrichment of real cards from Scryfall (read-only display data). Never changes gameplay.
// Failures (offline, 404, 429, bad JSON) leave the card fully playable with GRAFTBOUND's own frame.
import { createScryfallAdapter } from './scryfall-adapter.js';
import { resolveCard } from './catalog.js';
import { MTG_TO_GAME_KEYWORD, isReviewedAbilityWord } from './compatibility.js';

export function checkFacts(card, sf) {
  const issues = [];
  if (card.kind === 'creature') {
    if (String(card.power) !== sf.power || String(card.toughness) !== sf.toughness) issues.push(`P/T is ${sf.power}/${sf.toughness} on Scryfall`);
    const live = sf.keywords.filter(k => !isReviewedAbilityWord(card.name, k)).map(k => MTG_TO_GAME_KEYWORD[k.toLowerCase()] || k).sort().join(',');
    const mine = Object.keys(card.keywords).sort().join(',');
    if (live !== mine) issues.push(`keywords on Scryfall: ${sf.keywords.join(', ') || 'none'}`);
  }
  if (card.sourceInfo.manaCost && sf.manaCost && card.sourceInfo.manaCost !== sf.manaCost) issues.push(`mana cost on Scryfall: ${sf.manaCost}`);
  return issues;
}

export function createLiveCards({ adapter = null, storage = null, online = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false) } = {}) {
  const sf = adapter || createScryfallAdapter({ storage });
  const pending = new Map();
  async function enrich(id) {
    const card = resolveCard(id); if (!card || !card.reference) return null;
    if (card.sourceInfo.live) return card;
    if (!online()) return null;
    if (pending.has(id)) return pending.get(id);
    const job = sf.cardByName(card.name).then(rec => {
      const issues = checkFacts(card, rec);
      if (issues.length) console.warn(`Scryfall mismatch for ${card.name}:`, issues);
      Object.assign(card.sourceInfo, { live: true, image: rec.image, oracleText: rec.oracleText, set: rec.set, setName: rec.setName, artist: rec.artist, scryfallUri: rec.scryfallUri, manaCost: rec.manaCost || card.sourceInfo.manaCost, issues });
      return card;
    }).catch(err => { card.sourceInfo.liveError = err.code || 'error'; return null; }).finally(() => pending.delete(id));
    pending.set(id, job); return job;
  }
  return { enrich, enrichAll: ids => Promise.all(ids.map(enrich)) };
}
