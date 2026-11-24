import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PACK_LOOK, rarityOf, CLIP, openShow, TIMING } from "../packfx.mjs";
import { PACKS } from "../campaign.mjs";
import { RELICS } from "../pool.mjs";

test("every pack kind has a wrapper look, and rarities follow MTG colors", () => {
 for (const k of Object.keys(PACKS)) assert.ok(PACK_LOOK[k]?.emblem.includes("<"), k);
 assert.equal(rarityOf("forbidden", {}), "mythic");
 assert.equal(rarityOf("land", {}), "common");
 assert.equal(rarityOf("spell", { cost: 85 }), "rare");
 assert.equal(rarityOf("spell", { cost: 50 }), "uncommon");
 assert.equal(rarityOf("spell", { cost: 20 }), "common");
 const r = RELICS.find(x => x.rarity === "rare"); assert.equal(rarityOf("relic", r), "rare");
 for (const c of Object.values(CLIP)) assert.match(c, /^polygon\(/);
});

// Minimal fakes: class lists, a manual clock and a recording sfx.
const node = () => { const set = new Set(); return { dataset: {}, style: { setProperty() {} }, classList: { add: (...c) => c.forEach(x => set.add(x)), remove: (...c) => c.forEach(x => set.delete(x)), contains: c => set.has(c) }, has: c => set.has(c) }; };
function clock() { let now = 0, id = 0; const q = new Map(); return { setTimeout(fn, ms) { q.set(++id, { fn, at: now + ms }); return id; }, clearTimeout(i) { q.delete(i); }, run(to) { for (;;) { const next = [...q.entries()].filter(([, t]) => t.at <= to).sort((a, b) => a[1].at - b[1].at)[0]; if (!next) break; q.delete(next[0]); now = next[1].at; next[1].fn(); } now = to; } }; }

test("opening show: shake, tear, deal, flip each card with rarity flair, then ready", () => {
 const stage = node(), slots = ["common", "rare", "mythic"].map(r => { const s = node(); s.dataset.rarity = r; return s; }), played = [], c = clock(); let ready = 0;
 openShow({ stage, slots, sfx: { play: n => played.push(n) }, timers: c, onReady: () => ready++ });
 assert.ok(stage.has("pk-sealed"));
 c.run(TIMING.autoOpen + 10); assert.ok(stage.has("pk-shaking")); assert.deepEqual(played, ["packShake"]);
 c.run(TIMING.autoOpen + TIMING.shake + 10); assert.ok(stage.has("pk-opened")); assert.ok(played.includes("packTear"));
 c.run(20000);
 assert.equal(ready, 1); assert.ok(stage.has("pk-done"));
 assert.ok(slots.every(s => s.has("pk-up")));
 assert.equal(played.filter(n => n === "cardFlip").length, 3);
 assert.ok(played.includes("revealRare") && played.includes("revealMythic"));
 assert.ok(slots[1].has("pk-flare") && !slots[0].has("pk-flare"));
});

test("tapping after the tear skips straight to the reveal; reduced motion never animates", () => {
 const stage = node(), slots = [node(), node()], c = clock(); let ready = 0;
 const show = openShow({ stage, slots, sfx: null, timers: c, onReady: () => ready++ });
 show.open(); c.run(TIMING.shake + 10); show.open();
 assert.equal(ready, 1); assert.ok(slots.every(s => s.has("pk-up")));
 c.run(20000); assert.equal(ready, 1, "no second ready after skipping");
 const s2 = node(), sl2 = [node()]; let r2 = 0;
 openShow({ stage: s2, slots: sl2, reduced: true, timers: clock(), onReady: () => r2++ });
 assert.equal(r2, 1); assert.ok(s2.has("pk-done") && !s2.has("pk-sealed"));
});

test("the pack dialog has a stage and the sounds exist", () => {
 const html = readFileSync(new URL("../../archemancy/index.html", import.meta.url), "utf8");
 assert.match(html, /id="packStage"[^>]*>\s*<div id="packList"/);
 const sfx = readFileSync(new URL("../sfx.mjs", import.meta.url), "utf8");
 for (const n of ["packShake", "packTear", "cardDeal", "cardFlip", "revealUncommon", "revealRare", "revealMythic", "packPick"]) assert.ok(sfx.includes(" " + n + ":"), n);
});
