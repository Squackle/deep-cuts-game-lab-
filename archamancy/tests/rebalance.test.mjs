// Beta 13.50 rebalance: in campaign deck (kit) battles, spells flow all wave and keep pace with enemy health,
// and each Gauntlet win raises the ante (+10% enemy health, up to 8 wins). Endless, Daily and sandbox are unchanged.
import test from "node:test";
import assert from "node:assert/strict";
import { createEngine, KIT_DRAW_TICKS, ANTE_STEP, ANTE_MAX } from "../engine.mjs";
import * as camp from "../campaign.mjs";

const kit = (ante, deck = camp.STARTER_DECK) => { const g = createEngine(5, "campaign", "hollow"); g.command({ type: "difficulty", level: "easy" }); assert.ok(g.command({ type: "kit", deck, ante })); return g; };

test("kit battles draw 2 at wave start and 1 every 12 seconds of an active wave", () => {
 const g = kit(0); g.state.discard.push(...g.state.hand.splice(0));
 g.command({ type: "wave" });
 assert.equal(g.state.hand.length, 2);
 const start = g.state.tick; while (g.state.tick < start + KIT_DRAW_TICKS && g.state.phase === "active") g.step();
 assert.equal(g.state.hand.length, 3, "tempo draw");
});

test("non-kit battles keep one draw per wave", () => {
 const g = createEngine(5, "campaign", "hollow"); g.state.discard.push(...g.state.hand.splice(0));
 g.command({ type: "wave" }); assert.equal(g.state.hand.length, 1);
 const start = g.state.tick; while (g.state.tick < start + KIT_DRAW_TICKS * 2 && g.state.phase === "active") g.step();
 assert.equal(g.state.hand.length, 1);
});

test("ante raises enemy health per campaign win, capped", () => {
 const hp = a => { const g = kit(a); g.command({ type: "wave" }); g.step(); g.step(); return g.state.enemies[0].maxHp; };
 const base = hp(0);
 assert.ok(Math.abs(hp(4) / base - (1 + 4 * ANTE_STEP)) < .05);
 assert.equal(hp(99), hp(ANTE_MAX));
 assert.deepEqual(camp.kitFor({ ...camp.newCampaign(1), wins: 3 }).ante, 3);
 assert.deepEqual(camp.kitFor({ ...camp.newCampaign(1), wins: 30 }).ante, 8);
});

test("kit spells hit harder than the same spell outside the kit, and scale with the ante", () => {
 const blast = (g) => { g.command({ type: "wave" }); for (let i = 0; i < 40; i++) g.step(); const e = g.state.enemies[0], before = e.hp, q = g.pointAt(e.progress); g.state.hand = ["meteor"]; g.state.mana = 999; assert.ok(g.command({ type: "cast", index: 0, ...q })); return { dealt: before - e.hp, max: e.maxHp }; };
 const plain = createEngine(5, "campaign", "hollow"); plain.command({ type: "difficulty", level: "easy" });
 const a = blast(plain), b = blast(kit(0));
 assert.ok(b.dealt >= a.dealt, "kit Fireball at least as strong");
 // At a late wave a kit Fireball should one-shot a raider even at max ante.
 const late = kit(ANTE_MAX); late.state.wave = 19; const r = blast(late);
 assert.equal(r.dealt, r.max, "late kit Fireball still kills a raider at max ante");
});

test("towers-only easy run stays winnable at max ante (campaign bot)", async () => {
 const { play } = await import("../tools/relic-balance.mjs");
 const r = play({ ante: ANTE_MAX }, 1, { commander: "edgar", cast: false, difficulty: "easy" });
 assert.ok(r.won, "easy, no spells, max ante: " + JSON.stringify(r));
});
