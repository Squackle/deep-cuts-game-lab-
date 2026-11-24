// Real Magic card art from Scryfall (art crops), with the artist credit Scryfall requires.
// Looked up lazily in the browser, one request at a time well under Scryfall's rate limit, and cached locally.
// Any failure leaves the card without art and is not retried until the page reloads.
const KEY = "archemancy.cardart.v1", API = "https://api.scryfall.com/cards/named?exact=", SEARCH = "https://api.scryfall.com/cards/search?q=";
// The art cache is disposable (unlike player progress); damage must not make parsing or storage unbounded.
const MAX_CACHE_CHARS = 256 * 1024, MAX_CACHED_ART = 350;
export function createCardArt({ fetchFn = globalThis.fetch?.bind(globalThis), storage = null, delay = 120, onUpdate = () => {} } = {}) {
 let cache = Object.create(null);
 try {
  const raw = storage?.getItem(KEY);
  if (typeof raw === "string" && raw.length <= MAX_CACHE_CHARS) {
   const parsed = JSON.parse(raw);
   if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
    for (const [name, entry] of Object.entries(parsed).slice(0, MAX_CACHED_ART))
     if (name.length <= 160 && valid(entry)) cache[name] = entry;
  }
 } catch { cache = Object.create(null); }
 const queue = [], pending = new Set(), failed = new Set();
 let running = false;
 // The art URL goes into CSS url("..."), and the cache lives in localStorage, so accept only a plain Scryfall image URL:
 // https on cards.scryfall.io, with no quotes, brackets, backslashes or spaces that could end the url() early.
 function valid(v) {
  return !!v && typeof v === "object" && typeof v.art === "string"
   && /^https:\/\/cards\.scryfall\.io\/[A-Za-z0-9\/._~%?=&-]+$/.test(v.art)
   && v.art.length < 400 && typeof v.artist === "string" && v.artist.length < 200
   && (v.link == null || (typeof v.link === "string"
    && /^https:\/\/scryfall\.com\/card\/[A-Za-z0-9\/._~%?=&-]+$/.test(v.link) && v.link.length < 400));
 }
 function persist() {
  while (Object.keys(cache).length > MAX_CACHED_ART) delete cache[Object.keys(cache)[0]];
  try { storage?.setItem(KEY, JSON.stringify(cache)); } catch {}
 }
 async function pump() {
  if (running) return; running = true;
  while (queue.length) {
   const name = queue.shift();
   try {
    // "token:Soldier:W" looks up the newest Soldier token whose colors are exactly white; anything else is an exact card name.
    const tok = /^token:([A-Za-z]+):([WUBRGC])$/.exec(name);
    const url = tok ? SEARCH + encodeURIComponent("t:token t:" + tok[1] + " c=" + tok[2]) + "&order=released&dir=desc" : API + encodeURIComponent(name);
    const r = await fetchFn(url, { headers: { Accept: "application/json" } });
    if (r.ok) {
     let card = await r.json();
     if (tok) card = card?.data?.[0] || {};
     const face = card.image_uris || card.card_faces?.[0]?.image_uris || {};
     const entry = { art: face.art_crop, artist: card.artist || card.card_faces?.[0]?.artist || "Unknown artist", link: card.scryfall_uri };
     if (valid(entry)) { cache[name] = entry; persist(); onUpdate(name); }
    }
   } catch {}
   pending.delete(name);
   if (!valid(cache[name])) failed.add(name);
   if (queue.length) await new Promise(res => setTimeout(res, delay));
  }
  running = false;
 }
 // Returns {art, artist, link} or null while loading / unavailable.
 function get(name) {
  if (typeof name !== "string" || !name.trim() || name.length > 160 || /[\r\n]/.test(name)) return null;
  if (valid(cache[name])) return cache[name];
  if (fetchFn && !pending.has(name) && !failed.has(name)) { pending.add(name); queue.push(name); pump(); }
  return null;
 }
 return { get };
}
