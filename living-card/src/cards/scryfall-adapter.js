// Scryfall adapter. Responsibilities: polite rate limiting, caching, failure handling, and normalizing
// UNTRUSTED API responses into a small, validated, plain-text record. It never executes Oracle text and
// never downloads/converts artwork — it only keeps image *references* (URLs) for read-only display.
export class ScryfallError extends Error { constructor(code, msg) { super(msg); this.code = code; } }

const MAX_TEXT = 1200;
const str = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');
const optNumStr = v => (typeof v === 'string' && /^\d{1,2}$/.test(v) ? v : null);
const safeUrl = v => (typeof v === 'string' && /^https:\/\/(cards|c\d?|svgs)\.scryfall\.io\//.test(v) ? v : null);

/** Normalize a Scryfall card JSON object. Throws ScryfallError('invalid') if the shape is wrong. */
export function normalizeCard(raw) {
  if (!raw || typeof raw !== 'object' || raw.object !== 'card' || typeof raw.name !== 'string' || typeof raw.id !== 'string') throw new ScryfallError('invalid', 'Not a Scryfall card object');
  const face = Array.isArray(raw.card_faces) && raw.card_faces.length && !raw.oracle_text ? raw.card_faces[0] : raw;
  const imgs = raw.image_uris || (face && face.image_uris) || {};
  return {
    source: 'scryfall', id: str(raw.id, 64), oracleId: str(raw.oracle_id, 64), name: str(raw.name, 141),
    manaCost: str(face.mana_cost, 64), cmc: typeof raw.cmc === 'number' ? raw.cmc : null,
    colors: Array.isArray(raw.color_identity) ? raw.color_identity.filter(c => /^[WUBRG]$/.test(c)) : [],
    typeLine: str(face.type_line || raw.type_line, 200),
    power: optNumStr(face.power), toughness: optNumStr(face.toughness),
    keywords: Array.isArray(raw.keywords) ? raw.keywords.filter(k => typeof k === 'string').map(k => k.slice(0, 40)) : [],
    oracleText: str(face.oracle_text, MAX_TEXT),
    set: str(raw.set, 10), setName: str(raw.set_name, 80), rarity: ['common', 'uncommon', 'rare', 'mythic'].includes(raw.rarity) ? raw.rarity : 'common',
    artist: str(raw.artist, 120),
    image: { normal: safeUrl(imgs.normal), artCrop: safeUrl(imgs.art_crop) },
    scryfallUri: typeof raw.scryfall_uri === 'string' && raw.scryfall_uri.startsWith('https://scryfall.com/') ? raw.scryfall_uri : null,
    rulingsUri: typeof raw.rulings_uri === 'string' && raw.rulings_uri.startsWith('https://api.scryfall.com/') ? raw.rulings_uri : null,
  };
}

export function createScryfallAdapter({ fetchFn = (...a) => fetch(...a), storage = null, minIntervalMs = 110, ttlMs = 7 * 864e5, now = () => Date.now(), sleep = ms => new Promise(r => setTimeout(r, ms)), api = 'https://api.scryfall.com' } = {}) {
  const mem = new Map(); let last = -Infinity; let queue = Promise.resolve();
  const cacheKey = k => 'deepcutsedh.livingcard.sf.' + k;
  const getCached = k => {
    if (mem.has(k)) return mem.get(k);
    if (!storage) return null;
    try { const e = JSON.parse(storage.getItem(cacheKey(k)) || 'null'); if (e && now() - e.t < ttlMs) { mem.set(k, e.v); return e.v; } } catch { /* ignore bad cache */ }
    return null;
  };
  const setCached = (k, v) => { mem.set(k, v); if (storage) try { storage.setItem(cacheKey(k), JSON.stringify({ t: now(), v })); } catch { /* quota */ } };
  const request = url => { const job = queue.then(async () => {
    const wait = last + minIntervalMs - now(); if (wait > 0) await sleep(wait);
    last = now();
    let res;
    try { res = await fetchFn(url, { headers: { Accept: 'application/json' } }); } catch (e) { throw new ScryfallError('network', 'Scryfall unreachable: ' + (e && e.message)); }
    if (res.status === 404) throw new ScryfallError('not_found', 'Card not found');
    if (res.status === 429) throw new ScryfallError('rate_limited', 'Scryfall rate limit hit');
    if (!res.ok) throw new ScryfallError('http', 'Scryfall HTTP ' + res.status);
    try { return await res.json(); } catch { throw new ScryfallError('invalid', 'Bad JSON from Scryfall'); }
  }); queue = job.catch(() => {}); return job; };
  return {
    async cardByName(name) {
      const k = 'n:' + String(name).toLowerCase(); const c = getCached(k); if (c) return c;
      const card = normalizeCard(await request(`${api}/cards/named?exact=${encodeURIComponent(name)}`)); setCached(k, card); return card;
    },
    async cardById(id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ScryfallError('invalid', 'Bad card id');
      const k = 'i:' + id; const c = getCached(k); if (c) return c;
      const card = normalizeCard(await request(`${api}/cards/${id}`)); setCached(k, card); return card;
    },
    async rulings(card) {
      if (!card.rulingsUri) return [];
      const k = 'r:' + card.id; const c = getCached(k); if (c) return c;
      const raw = await request(card.rulingsUri);
      const list = Array.isArray(raw && raw.data) ? raw.data.slice(0, 30).map(r => ({ date: str(r.published_at, 12), text: str(r.comment, 800) })) : [];
      setCached(k, list); return list;
    },
  };
}
