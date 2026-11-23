// Campaign deck, shop and drafts (pure data; main.mjs draws it, engine.mjs plays the kit). Saved in the profile as profile.camp.
// You start with a small singleton deck. Each Gauntlet battle pays Treasure and offers a spell draft; between battles the world map
// has a Shop (relics, boons, rituals, lands, forbidden cards and spells) and a Deck view (upgrade or exile spells).
import { POOL, BY_ID, RELICS, BOONS, RITUALS, FORBIDDEN, LANDS, RARITY, spellKind, LAND_MAX } from "./pool.mjs";

export const STARTER_DECK = ["meteor", "flame", "legion", "ward", "inquiry", "freeze", "root", "offering"];
export const DECK_CAP = 15, MIN_DECK = 5, BASE_SLOTS = 5, UPGRADE_COST = [4, 6], EXILE_COST = 3, SPELL_COST = 3, BOON_COST = 10;
export const PRICE = { ritual: 3, land: 3, forbidden: 5 };
// Balatro's shop card weights: Jokers 20, Tarot 4, Planet 4 (Spectral cards only from packs, so we give them a small weight).
export const SHOP_WEIGHTS = { relic: 20, ritual: 4, land: 4, forbidden: 1 };

export function newCampaign(seed = 1) { return { v: 1, deck: STARTER_DECK.slice(), up: {}, relics: [], boons: [], marks: [], lands: {}, treasure: 4, shop: null, draft: null, battles: 0, wins: 0, seed: seed >>> 0 || 1 }; }

const ids = (a, ok) => Array.isArray(a) ? [...new Set(a.filter(x => typeof x === "string" && ok(x)))] : [];
export function sanitize(raw, cards) {
 const c = newCampaign(raw?.seed);
 if (!raw || typeof raw !== "object") return c;
 const deck = ids(raw.deck, k => Object.hasOwn(cards, k));
 if (deck.length >= MIN_DECK) c.deck = deck.slice(0, 40);
 for (const k of c.deck) { const n = raw.up?.[k]; if (Number.isInteger(n) && n > 0) c.up[k] = Math.min(2, n); }
 c.boons = ids(raw.boons, k => BY_ID[k]?.kind === "boon");
 c.marks = Array.isArray(raw.marks) ? raw.marks.filter(k => BY_ID[k]?.kind === "forbidden").slice(0, 6) : [];
 c.relics = ids(raw.relics, k => BY_ID[k]?.kind === "relic").slice(0, slots(c));
 for (const k of "WUBRG") { const n = raw.lands?.[k]; if (Number.isInteger(n) && n > 0) c.lands[k] = Math.min(LAND_MAX, n); }
 for (const k of ["treasure", "battles", "wins"]) if (Number.isInteger(raw[k]) && raw[k] >= 0) c[k] = Math.min(raw[k], 1e6);
 if (raw.shop && Array.isArray(raw.shop.items)) c.shop = { rerolls: Number.isInteger(raw.shop.rerolls) ? raw.shop.rerolls : 0, items: raw.shop.items.filter(i => i && typeof i.id === "string" && (i.kind === "spell" ? Object.hasOwn(cards, i.id) : !!BY_ID[i.id])).map(i => ({ kind: i.kind === "spell" ? "spell" : BY_ID[i.id].kind, id: i.id, price: Math.max(0, Math.min(99, Number(i.price) | 0)), sold: !!i.sold })) };
 if (Array.isArray(raw.draft)) { const d = raw.draft.filter(k => Object.hasOwn(cards, k) && !c.deck.includes(k)); c.draft = d.length ? d.slice(0, 5) : null; }
 return c;
}

// Effects that change the campaign itself (boons and forbidden marks), summed.
export function metaFx(c) { const fx = {}; for (const k of [...c.boons, ...c.marks]) for (const [n, v] of Object.entries(BY_ID[k]?.fx || {})) if (typeof v === "number") fx[n] = (fx[n] || 0) + v; return fx; }
export const slots = c => BASE_SLOTS + (metaFx(c).slots || 0);
export const deckCap = c => DECK_CAP + (metaFx(c).deckCap || 0);
export const kitFor = c => ({ deck: c.deck.slice(), up: { ...c.up }, relics: c.marks.includes("spark") && c.relics.length ? [...c.relics, c.relics[0]] : c.relics.slice(), boons: [...c.boons, ...c.marks], lands: { ...c.lands } });

function rnd(c) { let t = c.seed = (c.seed + 0x6D2B79F5) >>> 0; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
function weighted(c, list, w) { const total = list.reduce((a, x) => a + w(x), 0); if (!total) return null; let r = rnd(c) * total; for (const x of list) { r -= w(x); if (r < 0) return x; } return list.at(-1); }
const off = c => metaFx(c).shopOff || 0;
export const priceOf = (c, base) => Math.max(1, base - off(c));

// A shop visit: card slots (relic / ritual / land / forbidden by Balatro weights), one spell and one boon you don't own.
export function rollShop(c, cards) {
 const items = [], taken = new Set(), n = 2 + (metaFx(c).shopSlots || 0);
 for (let i = 0; i < n; i++) {
  const kind = weighted(c, Object.keys(SHOP_WEIGHTS), k => SHOP_WEIGHTS[k]);
  let pick = null;
  if (kind === "relic") pick = weighted(c, RELICS.filter(r => !c.relics.includes(r.id) && !taken.has(r.id)), r => RARITY[r.rarity].weight);
  else if (kind === "land") pick = weighted(c, LANDS.filter(l => (c.lands[l.color] || 0) < LAND_MAX && !taken.has(l.id)), () => 1);
  else pick = weighted(c, (kind === "ritual" ? RITUALS : FORBIDDEN).filter(r => !taken.has(r.id) && !(r.fx.cloneRelic && c.marks.includes(r.id))), () => 1);
  if (!pick) { i--; if (items.length + i > 20) break; continue; }
  taken.add(pick.id); items.push({ kind: pick.kind, id: pick.id, price: priceOf(c, pick.kind === "relic" ? RARITY[pick.rarity].cost : PRICE[pick.kind]), sold: false });
 }
 const spell = weighted(c, Object.keys(cards).filter(k => !c.deck.includes(k)), () => 1);
 if (spell) items.push({ kind: "spell", id: spell, price: priceOf(c, SPELL_COST), sold: false });
 const boon = weighted(c, BOONS.filter(b => !c.boons.includes(b.id)), () => 1);
 if (boon) items.push({ kind: "boon", id: boon.id, price: priceOf(c, BOON_COST), sold: false });
 c.shop = { rerolls: 0, items };
 return c.shop;
}
export const rerollCost = c => Math.max(1, 2 + (c.shop?.rerolls || 0) - (metaFx(c).rerollOff || 0));
export function reroll(c, cards) { const cost = rerollCost(c); if (c.treasure < cost) return false; const n = (c.shop?.rerolls || 0) + 1; c.treasure -= cost; rollShop(c, cards); c.shop.rerolls = n; return true; }

// Which spells a ritual can fetch, or act on.
export function ritualTargets(c, id, cards) {
 const fx = BY_ID[id]?.fx || {};
 if (fx.tutor) return Object.keys(cards).filter(k => !c.deck.includes(k) && (fx.tutor === "any" || fx.tutor === "random" || spellKind(cards[k].type) === fx.tutor));
 if (fx.upgrade) return c.deck.filter(k => (c.up[k] || 0) < 2);
 if (fx.exile) return c.deck.length > MIN_DECK ? c.deck.slice() : [];
 return null;
}
export const needsTarget = id => { const fx = BY_ID[id]?.fx || {}; return !!(fx.upgrade || fx.exile || (fx.tutor && fx.tutor !== "random")); };

// Why an item can't be bought right now, or null.
export function blocker(c, item, cards) {
 if (item.sold) return "Sold";
 if (c.treasure < item.price) return "Not enough Treasure";
 if (item.kind === "relic" && c.relics.length >= slots(c)) return "Relic slots full: sell one in your Deck";
 if (item.kind === "spell" && c.deck.length >= deckCap(c)) return "Deck full: exile a spell first";
 if (item.kind === "ritual") { const fx = BY_ID[item.id].fx; if ((fx.tutor && fx.tutor !== "random") && c.deck.length >= deckCap(c)) return "Deck full: exile a spell first"; const t = ritualTargets(c, item.id, cards); if (t && !t.length) return "Nothing to use it on"; }
 if (item.kind === "forbidden" && BY_ID[item.id].fx.freeRelic && c.relics.length >= slots(c)) return "Relic slots full";
 if (item.kind === "forbidden" && BY_ID[item.id].fx.cloneRelic && !c.relics.length) return "You have no relic to copy";
 if (item.kind === "forbidden" && BY_ID[item.id].fx.cloneRelic && c.marks.includes(item.id)) return "Already copying a relic";
 if (item.kind === "forbidden" && BY_ID[item.id].fx.allLands && [..."WUBRG"].every(k => (c.lands[k] || 0) >= LAND_MAX)) return "Every color is at max level";
 return null;
}

// Buy shop item i. Rituals that need a spell take it as target. Returns a short result line, or null if nothing happened.
export function buy(c, i, cards, target = null) {
 const item = c.shop?.items?.[i]; if (!item || blocker(c, item, cards)) return null;
 const x = BY_ID[item.id], fx = x?.fx || {};
 let line = null;
 if (item.kind === "relic") { c.relics.push(item.id); line = x.name + " joins your relics."; }
 else if (item.kind === "boon") { c.boons.push(item.id); line = x.name + ": " + x.text; }
 else if (item.kind === "land") { c.lands[x.color] = Math.min(LAND_MAX, (c.lands[x.color] || 0) + 1); line = x.name + ": " + { W: "white", U: "blue", B: "black", R: "red", G: "green" }[x.color] + " is now level " + c.lands[x.color] + "."; }
 else if (item.kind === "spell") { c.deck.push(item.id); line = cards[item.id].name + " added to your deck."; }
 else if (item.kind === "ritual") line = ritual(c, item.id, cards, target);
 else if (item.kind === "forbidden") line = forbidden(c, item.id, cards);
 if (!line) return null;
 c.treasure -= item.price; item.sold = true; return line;
}
function ritual(c, id, cards, target) {
 const fx = BY_ID[id].fx, ok = ritualTargets(c, id, cards);
 if (fx.tutor === "random") { const add = ok[Math.floor(rnd(c) * ok.length)]; if (!add) return null; const pool = c.deck.filter(k => k !== add), gone = c.deck.length >= MIN_DECK + 1 || c.deck.length >= deckCap(c) ? pool[Math.floor(rnd(c) * pool.length)] : null; if (gone) exile(c, gone); c.deck.push(add); return "Gamble: " + cards[add].name + " joins your deck" + (gone ? ", " + cards[gone].name + " is exiled." : "."); }
 if (!ok?.includes(target)) return null;
 if (fx.tutor) { c.deck.push(target); return cards[target].name + " added to your deck."; }
 if (fx.upgrade) { c.up[target] = (c.up[target] || 0) + 1; return cards[target].name + " upgraded to level " + (c.up[target] + 1) + "."; }
 if (fx.exile) { exile(c, target); return cards[target].name + " exiled from your deck."; }
 return null;
}
function exile(c, id) { c.deck = c.deck.filter(k => k !== id); delete c.up[id]; }
function forbidden(c, id, cards) {
 const fx = BY_ID[id].fx, name = BY_ID[id].name;
 if (fx.reroll) { const keep = c.deck.length, ups = Object.values(c.up); const pool = Object.keys(cards).filter(k => !c.deck.includes(k)); const next = []; while (next.length < keep && pool.length) next.push(pool.splice(Math.floor(rnd(c) * pool.length), 1)[0]); if (next.length < keep) next.push(...c.deck.slice(0, keep - next.length)); c.deck = next; c.up = {}; ups.forEach((n, i) => { if (next[i]) c.up[next[i]] = n; }); return name + ": your deck was reshuffled into " + keep + " new spells."; }
 if (fx.freeRelic) { const r = weighted(c, RELICS.filter(r => r.rarity === "rare" && !c.relics.includes(r.id)), () => 1); if (!r) return null; c.relics.push(r.id); return name + ": " + r.name + " joins your relics."; }
 if (fx.cloneRelic) { const first = c.relics[0]; c.relics = [first]; c.marks.push(id); return name + ": every relic but " + BY_ID[first].name + " is gone, and it now counts twice."; }
 if (fx.allLands) { for (const k of "WUBRG") c.lands[k] = Math.min(LAND_MAX, (c.lands[k] || 0) + 1); return name + ": every color gains a level."; }
 if (fx.burn) { const n = Math.min(fx.burn, c.deck.length - MIN_DECK); for (let i = 0; i < n; i++) exile(c, c.deck[Math.floor(rnd(c) * c.deck.length)]); c.treasure += fx.gold; return name + ": " + n + " spells exiled, +" + fx.gold + " Treasure."; }
 if (fx.slots) { c.marks.push(id); return name + ": +1 relic slot, but you hold one fewer spell."; }
 return null;
}

// Deck view actions.
export const upgradeCost = (c, id) => (c.up[id] || 0) >= 2 ? null : UPGRADE_COST[c.up[id] || 0];
export function upgrade(c, id) { const cost = upgradeCost(c, id); if (!c.deck.includes(id) || cost === null || c.treasure < cost) return false; c.treasure -= cost; c.up[id] = (c.up[id] || 0) + 1; return true; }
export function remove(c, id) { if (!c.deck.includes(id) || c.deck.length <= MIN_DECK || c.treasure < EXILE_COST) return false; c.treasure -= EXILE_COST; exile(c, id); return true; }
export const sellValue = id => Math.floor(RARITY[BY_ID[id]?.rarity || "common"].cost / 2);
export function sellRelic(c, id) { if (!c.relics.includes(id)) return false; c.relics = c.relics.filter(k => k !== id); c.treasure += sellValue(id); return true; }

// After a Gauntlet battle: Treasure, a fresh shop and (if you cleared 5 or more waves) a spell draft.
export function finishBattle(c, run, cards) {
 const won = !!run.won, stars = won ? Math.max(1, Math.min(3, run.stars | 0)) : 0, waves = Math.max(0, run.wave | 0);
 const gold = (won ? 8 + 2 * stars : Math.floor(waves / 5)) + (metaFx(c).payout || 0);
 c.treasure += gold; c.battles++; if (won) c.wins++;
 rollShop(c, cards);
 c.draft = won || waves >= 5 ? draftOffer(c, cards) : null;
 return { gold, draft: c.draft };
}
export function draftOffer(c, cards) { const pool = Object.keys(cards).filter(k => !c.deck.includes(k)), out = [], n = 3 + (metaFx(c).draftChoices || 0); while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd(c) * pool.length), 1)[0]); return out.length ? out : null; }
// Take a drafted spell. With a full deck, name a deck spell to swap out (it leaves with its upgrades); null skips for +2 Treasure.
export function pickDraft(c, id, swapOut = null) { if (!c.draft) return false; if (id === null) { c.draft = null; c.treasure += 2; return true; } if (!c.draft.includes(id)) return false; if (c.deck.length >= deckCap(c)) { if (!c.deck.includes(swapOut)) return false; exile(c, swapOut); } c.deck.push(id); c.draft = null; return true; }
export { POOL };
