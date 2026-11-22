// Real Magic card art from Scryfall (art crops), with the artist credit Scryfall requires.
// Looked up lazily in the browser, one request at a time well under Scryfall's rate limit, and cached locally.
// Any failure leaves the card without art and is not retried until the page reloads.
const KEY = "archemancy.cardart.v1", API = "https://api.scryfall.com/cards/named?exact=";
export function createCardArt({ fetchFn = globalThis.fetch?.bind(globalThis), storage = null, delay = 120, onUpdate = () => {} } = {}) {
 let cache = {};
 try { cache = JSON.parse(storage?.getItem(KEY) || "{}") || {}; } catch { cache = {}; }
 const queue = [], pending = new Set(), failed = new Set();
 let running = false;
 // The art URL goes into CSS url("..."), and the cache lives in localStorage, so accept only a plain Scryfall image URL:
 // https on cards.scryfall.io, with no quotes, brackets, backslashes or spaces that could end the url() early.
 function valid(v) { return !!v && typeof v.art === "string" && /^https:\/\/cards\.scryfall\.io\/[A-Za-z0-9\/._~%?=&-]+$/.test(v.art) && v.art.length < 400 && typeof v.artist === "string" && v.artist.length < 200; }
 function persist() { try { storage?.setItem(KEY, JSON.stringify(cache)); } catch {} }
 async function pump() {
  if (running) return; running = true;
  while (queue.length) {
   const name = queue.shift();
   try {
    const r = await fetchFn(API + encodeURIComponent(name), { headers: { Accept: "application/json" } });
    if (r.ok) {
     const card = await r.json(), face = card.image_uris || card.card_faces?.[0]?.image_uris || {};
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
  if (valid(cache[name])) return cache[name];
  if (fetchFn && !pending.has(name) && !failed.has(name)) { pending.add(name); queue.push(name); pump(); }
  return null;
 }
 return { get };
}
