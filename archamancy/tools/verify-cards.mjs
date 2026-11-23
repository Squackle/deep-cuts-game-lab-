// Checks every real Magic card ARCHEMANCY uses against Scryfall: exact name, color identity, type line and a phrase of rules text.
// Runs in CI (GitHub's runners can reach api.scryfall.com). Usage: node archamancy/tools/verify-cards.mjs
import { appendFileSync } from "node:fs";
import { POOL } from "../pool.mjs";
import { createEngine } from "../engine.mjs";

const game = createEngine(1);
const spells = Object.entries(game.cards).map(([id, c]) => ({ id, name: c.name, ci: c.color === "C" ? "" : c.color, type: c.type, kind: "spell" }));
const cards = [...spells, ...POOL];
const norm = s => String(s || "").replace(/[−–—]/g, "-").replace(/\s+/g, " ").toLowerCase();
const order = c => [..."WUBRG"].filter(x => c.includes(x)).join("");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rows = [], bad = [];
for (const c of cards) {
 let card = null, err = "";
 for (let tries = 0; tries < 3 && !card; tries++) {
  try {
   const r = await fetch("https://api.scryfall.com/cards/named?exact=" + encodeURIComponent(c.name), { headers: { "User-Agent": "ArchemancyCardCheck/1.0", Accept: "application/json" } });
   if (r.status === 404) { err = "not found"; break; }
   if (!r.ok) { err = "HTTP " + r.status; await sleep(1000); continue; }
   card = await r.json();
  } catch (e) { err = String(e.message || e); await sleep(1000); }
 }
 await sleep(110);
 if (!card) { bad.push(c.name + ": " + err); rows.push([c.kind, c.name, "✗ " + err, "", ""]); continue; }
 const faces = card.card_faces || [card];
 const oracle = faces.map(f => f.oracle_text || "").join(" // ") || card.oracle_text || "";
 const typeLine = card.type_line || faces.map(f => f.type_line).join(" // ");
 const problems = [];
 if (card.name !== c.name && !card.name.startsWith(c.name + " // ")) problems.push("name is " + card.name);
 if (order(card.color_identity.join("")) !== order(c.ci)) problems.push("color identity is " + (card.color_identity.join("") || "colorless") + ", expected " + (c.ci || "colorless"));
 if (c.type && !norm(typeLine).includes(norm(c.type))) problems.push("type line is " + typeLine);
 if (c.has && !norm(oracle).includes(norm(c.has))) problems.push("rules text lacks \"" + c.has + "\"");
 if (problems.length) bad.push(c.name + ": " + problems.join("; "));
 rows.push([c.kind, card.name, problems.length ? "✗ " + problems.join("; ") : "✓", (card.color_identity.join("") || "C"), typeLine + " — " + oracle.replace(/\n/g, " ").slice(0, 160)]);
}
const md = ["### ARCHEMANCY card check (Scryfall)", "", cards.length + " cards checked, " + bad.length + " problems.", "", "| Kind | Card | Check | CI | Type and rules text |", "|---|---|---|---|---|", ...rows.map(r => "| " + r.map(x => String(x).replace(/\|/g, "/")).join(" | ") + " |")].join("\n");
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
console.log(md);
if (bad.length) { console.error("\nProblems:\n" + bad.join("\n")); process.exit(1); }
