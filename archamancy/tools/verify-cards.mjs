// Checks every real Magic card ARCHEMANCY uses against Scryfall: exact name, color identity, type line and a phrase of rules text.
// Runs in CI (GitHub's runners can reach api.scryfall.com). Usage: node archamancy/tools/verify-cards.mjs
import { appendFileSync } from "node:fs";
import { POOL } from "../pool.mjs";
import { createEngine } from "../engine.mjs";

const game = createEngine(1);
const spells = Object.entries(game.cards).map(([id, c]) => ({ id, name: c.name, ci: c.color === "C" ? "" : c.color, type: c.type, kind: "spell" }));
// Enemies and bosses: name, type line and power/toughness from their card label (color identity isn't tracked for enemies).
const enemies = Object.entries(game.types).map(([id, t]) => { const [type, pt] = String(t.card).split(" · "); return { id, name: t.name, type, pt, kind: "enemy" }; });
const cards = [...spells, ...POOL, ...enemies];
const norm = s => String(s || "").replace(/[−–—]/g, "-").replace(/\s+/g, " ").toLowerCase();
const order = c => [..."WUBRG"].filter(x => c.includes(x)).join("");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rows = [], bad = [];
const H = { "User-Agent": "ArchemancyCardCheck/1.0", Accept: "application/json" };
// Scryfall asks for few requests: one /cards/collection call per 75 cards, then /cards/named for any name the collection missed
// (adventure and double-faced cards are listed by their full "A // B" name). 429s back off and retry.
async function get(url, opts = {}) {
 for (let tries = 0; tries < 6; tries++) {
  try { const r = await fetch(url, { ...opts, headers: { ...H, ...(opts.headers || {}) } }); if (r.status === 429 || r.status >= 500) { await sleep(1000 * 2 ** tries); continue; } return r; } catch { await sleep(1000 * 2 ** tries); }
 }
 return null;
}
const found = new Map();
for (let i = 0; i < cards.length; i += 75) {
 const batch = cards.slice(i, i + 75);
 const r = await get("https://api.scryfall.com/cards/collection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifiers: batch.map(c => ({ name: c.name })) }) });
 if (r?.ok) for (const card of (await r.json()).data || []) { found.set(card.name, card); for (const f of card.card_faces || []) if (!found.has(f.name)) found.set(f.name, card); }
 await sleep(300);
}
for (const c of cards) {
 let card = found.get(c.name) || null, err = "";
 if (!card) { const r = await get("https://api.scryfall.com/cards/named?exact=" + encodeURIComponent(c.name)); if (r?.ok) card = await r.json(); else err = r ? (r.status === 404 ? "not found" : "HTTP " + r.status) : "no response"; await sleep(300); }
 if (!card) { bad.push(c.name + ": " + err); rows.push([c.kind, c.name, "✗ " + err, "", ""]); continue; }
 const faces = card.card_faces || [card];
 const oracle = faces.map(f => f.oracle_text || "").join(" // ") || card.oracle_text || "";
 const typeLine = card.type_line || faces.map(f => f.type_line).join(" // ");
 const problems = [];
 if (card.name !== c.name && !card.name.startsWith(c.name + " // ")) problems.push("name is " + card.name);
 if (c.ci !== undefined && order(card.color_identity.join("")) !== order(c.ci)) problems.push("color identity is " + (card.color_identity.join("") || "colorless") + ", expected " + (c.ci || "colorless"));
 if (c.type && !norm(typeLine).includes(norm(c.type))) problems.push("type line is " + typeLine);
 if (c.pt && (card.power ?? faces[0].power) + "/" + (card.toughness ?? faces[0].toughness) !== c.pt) problems.push("P/T is " + (card.power ?? faces[0].power) + "/" + (card.toughness ?? faces[0].toughness) + ", expected " + c.pt);
 if (c.has && !norm(oracle).includes(norm(c.has))) problems.push("rules text lacks \"" + c.has + "\"");
 if (problems.length) bad.push(c.name + ": " + problems.join("; "));
 rows.push([c.kind, card.name, problems.length ? "✗ " + problems.join("; ") : "✓", (card.color_identity.join("") || "C"), typeLine + " — " + oracle.replace(/\n/g, " ").slice(0, 160)]);
}
const md = ["### ARCHEMANCY card check (Scryfall)", "", cards.length + " cards checked, " + bad.length + " problems.", "", "| Kind | Card | Check | CI | Type and rules text |", "|---|---|---|---|---|", ...rows.map(r => "| " + r.map(x => String(x).replace(/\|/g, "/")).join(" | ") + " |")].join("\n");
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
console.log(md);
if (bad.length) { console.error("\nProblems:\n" + bad.join("\n")); process.exit(1); }
