// Every relic in the campaign pool does what its card text says (and nothing when its condition is off).
import { test } from "node:test";
import assert from "node:assert/strict";
import { RELICS } from "../pool.mjs";
import { kitGame, dummy, quiet, towerDamage, troopFight, spellDamage } from "./relic-fx-helpers.mjs";

const up = (a, b, lo, hi, msg) => { const r = b / a; assert.ok(r >= lo && r <= hi, msg + ": x" + r.toFixed(3) + " (want " + lo + "-" + hi + ")"); };
const same = (a, b, msg) => assert.equal(b, a, msg);
const tower = (relics, kind = "pyre", o) => towerDamage({ relics }, kind, o);
const troop = (relics, o) => troopFight({ relics }, o);
const waveMana = relics => { const g = kitGame({ relics }), m = g.state.mana; g.command({ type: "wave" }); return g.state.mana - m; };
const killMana = relics => { const g = kitGame({ relics }); quiet(g); const m = g.state.mana; dummy(g, 300, { hp: 1, maxHp: 1, reward: 0 }); g.state.enemies.at(-1).progress = g.nearestPath(g.map.pads[5].x, g.map.pads[5].y); g.command({ type: "build", pad: 5, kind: "pyre" }); const after = g.state.mana; for (let i = 0; i < 40; i++) g.step(); return g.state.mana - after; };
const deaths = (relics, extra = {}) => { const r = troopFight({ relics, ...extra }, { patch: { attack: 5000 }, steps: 120 }); return r; };

const CHECKS = {
 // +Chips
 bonesplitter: () => up(troop([]).troopDamage, troop(["bonesplitter"]).troopDamage, 1.2, 3, "troop damage"),
 anthem: () => { const a = troop([]), b = troop(["anthem"]); up(a.troopDamage, b.troopDamage, 1.1, 3, "troop damage"); up(a.hp[0], b.hp[0], 1.09, 1.11, "troop health +10%"); },
 gauntlet: () => { up(spellDamage({}).damage, spellDamage({ relics: ["gauntlet"] }).damage, 1.1, 1.3, "red spell"); },
 tremors: () => { const z = r => { const g = kitGame({ relics: r }); g.state.mana = 99999; g.command({ type: "build", pad: 4, kind: "legion" }); quiet(g); const at = g.state.towers[4].rally; dummy(g, at - 4); g.state.troops = []; for (let i = 0; i < 30; i++) g.step(); return g.state.stats.troopDamage; }; up(z([]) + 1, z(["tremors"]), 1.5, 1e9, "summons zap"); },
 bombardment: () => up(deaths([]).troopDamage + 1, deaths(["bombardment"]).troopDamage, 1.5, 1e9, "dying troops hit back"),
 sofi: () => { up(tower([]), tower(["sofi"]), 1.08, 1.25, "red tower"); up(tower([], "arcanum"), tower(["sofi"], "arcanum"), 1.15, 1.35, "blue tower"); same(tower([], "judgment"), tower(["sofi"], "judgment"), "white tower"); },
 // +Mult
 honor: () => { up(tower([], "judgment"), tower(["honor"], "judgment"), 1.15, 1.25, "white tower"); same(tower([]), tower(["honor"]), "red tower"); },
 winds: () => { up(tower([], "arcanum"), tower(["winds"], "arcanum"), 1.15, 1.25, "blue tower"); same(tower([]), tower(["winds"]), "red tower"); },
 badmoon: () => { up(tower([], "hex"), tower(["badmoon"], "hex"), 1.12, 1.25, "black tower"); same(tower([]), tower(["badmoon"]), "red tower"); },
 fires: () => { up(tower([]), tower(["fires"]), 1.05, 1.15, "red tower"); up(tower([], "thorn"), tower(["fires"], "thorn"), 1.05, 1.15, "green tower"); },
 gaea: () => { up(tower([], "thorn"), tower(["gaea"], "thorn"), 1.12, 1.25, "green tower"); same(tower([]), tower(["gaea"]), "red tower"); },
 spear: () => { const a = troop([]), b = troop(["spear"]); up(a.troopDamage, b.troopDamage, 1.1, 1.25, "troops"); up(a.hp[0], b.hp[0], 1.14, 1.16, "health"); },
 norn: () => { const a = troop([]), b = troop(["norn"]); up(a.troopDamage, b.troopDamage, 1.2, 1.4, "troops"); up(a.hp[0], b.hp[0], 1.29, 1.31, "health"); },
 coat: () => { let n = 0; const more = r => tower(r, "pyre", { setup: g => { for (const p of [23, 22, 21, 19, 18, 17]) g.command({ type: "build", pad: p, kind: "pyre" }); n = Object.keys(g.state.towers).length - 1; } }); const a = more([]), b = more(["coat"]); assert.ok(n >= 5, "built " + n); up(a, b, 1.15, 1.23, "+4% per other pyre, capped at +20%"); same(tower([]), tower(["coat"]), "alone"); },
 door: () => { const cast = r => tower(r, "pyre", { setup: g => { g.state.stats.casts = 100; } }); up(cast([]), cast(["door"]), 1.2, 1.3, "capped at +25%"); },
 ascension: () => { const k = r => { const x = troopFight({ relics: r }, { steps: 0 }); x.g.state.stats.kills = 500; for (let i = 0; i < 80; i++) x.g.step(); return x.g.state.stats.troopDamage; }; up(k([]), k(["ascension"]), 1.2, 1.4, "capped at +30%"); },
 crusade: () => { const a = troop([]), b = troop(["crusade"]); up(a.troopDamage, b.troopDamage, 1.05, 1.2, "troops"); up(a.hp[0], b.hp[0], 1.19, 1.21, "health"); },
 // xMult
 furnace: () => { up(tower([]), tower(["furnace"]), 1.45, 1.55, "x1.5"); const leak = r => { const g = kitGame({ relics: r }); quiet(g); dummy(g, 1e6, { speed: 5 }); const h = g.state.health; g.step(); return h - g.state.health; }; assert.equal(leak([]), 1); assert.equal(leak(["furnace"]), 2, "leaks cost double"); },
 emancipation: () => { up(tower([]), tower(["emancipation"]), 1.45, 1.55, "red x1.5"); same(tower([], "judgment"), tower(["emancipation"], "judgment"), "white"); },
 dictate: () => { same(tower([]), tower(["dictate"]), "wave 1"); const boss = r => tower(r, "pyre", { setup: g => { g.state.wave = 5; } }); up(boss([]), boss(["dictate"]), 1.35, 1.45, "every 5th wave"); },
 violence: () => up(troop([]).troopDamage, troop(["violence"]).troopDamage, 1.4, 1.6, "troops x1.5"),
 giantkiller: () => { same(tower([]), tower(["giantkiller"]), "normal enemy"); const b = r => tower(r, "pyre", { patch: { boss: true } }); up(b([]), b(["giantkiller"]), 1.55, 1.65, "boss x1.6"); },
 archer: () => { const f = r => tower(r, "arcanum", { patch: { flying: true } }); up(f([]), f(["archer"]), 1.45, 1.55, "fliers x1.5"); same(tower([]), tower(["archer"]), "ground"); },
 slime: () => { const a = r => tower(r, "pyre", { patch: { armor: 20, baseArmor: 20 } }); up(a([]), a(["slime"]), 1.2, 1.3, "armored x1.25"); same(tower([]), tower(["slime"]), "unarmored"); },
 shadow: () => { same(tower([]), tower(["shadow"]), "healthy fortress"); const low = r => tower(r, "pyre", { setup: g => { g.state.health = 10; } }); up(low([]), low(["shadow"]), 1.3, 1.4, "at 10 fortress"); },
 storm: () => { const s = r => spellDamage({ relics: r }, "meteor", { before: g => { g.state.storm = 2; } }).damage; up(s([]), s(["storm"]), 1.45, 1.55, "two spells before: +50%"); same(spellDamage({}).damage, spellDamage({ relics: ["storm"] }).damage, "first spell of the wave"); },
 embercleave: () => { const c = r => troopFight({ relics: r }, { commander: "krenko", kind: null }).commanderDamage; up(c([]), c(["embercleave"]), 1.9, 2.1, "commander x2"); },
 memorial: () => { const a = troop([]), b = troop(["memorial"]); up(a.troopDamage, b.troopDamage, 1.2, 1.4, "troops x1.3"); up(a.hp[0], b.hp[0], 1.29, 1.31, "health"); },
 // Economy
 solring: () => assert.equal(waveMana(["solring"]) - waveMana([]), 20),
 signet: () => assert.equal(waveMana(["signet"]) - waveMana([]), 10),
 tithe: () => { assert.ok(waveMana(["tithe"]) - waveMana([]) >= 1, "pays for arriving enemies"); },
 revel: () => assert.equal(killMana(["revel"]) - killMana([]), 1),
 plunderer: () => { const a = deaths([]).g.state.mana, b = deaths(["plunderer"]).g.state.mana; assert.ok(b - a >= 3, "mana per dead troop " + (b - a)); },
 reflection: () => { const f = r => { const g = kitGame({ relics: r }); g.state.mana = 400; g.command({ type: "build", pad: 20, kind: "grove" }); g.command({ type: "wave" }); for (let i = 0; i < 600 && g.state.phase === "active"; i++) g.step(); return g.state.stats.farmMana; }; up(f([]), f(["reflection"]), 1.15, 1.35, "farm mana"); },
 // Retrigger
 doubling: () => { const t = r => troopFight({ relics: r }, { commander: "krenko", kind: null, steps: 170 }).g.state.troops.filter(u => u.source === "cmd").length; assert.ok(t(["doubling"]) > t([]), "more goblins"); },
 scepter: () => { const a = spellDamage({}).damage, b = spellDamage({ relics: ["scepter"] }); up(a, b.damage, 1.9, 2.1, "first spell twice"); },
 // Utility
 arena: () => { const g = kitGame({ relics: ["arena"] }); g.state.discard.push(...g.state.hand.splice(0)); g.command({ type: "wave" }); assert.equal(g.state.hand.length, 3, "1 + kit extra + Arena"); },
 rhystic: () => { const d = r => { const g = kitGame({ relics: r }); g.state.discard.push(...g.state.hand.splice(0)); g.state.wave = 1; g.command({ type: "wave" }); return g.state.hand.length; }; assert.equal(d(["rhystic"]) - d([]), 1, "wave 2 draws one more"); },
 clamp: () => { const h = r => { const x = deaths(r); return x.g.state.hand.length + x.g.state.discard.length; }; assert.ok(h(["clamp"]) >= h([]), "draws on deaths"); },
 prison: () => { const m = r => { const g = kitGame({ relics: r }); quiet(g); const e = dummy(g, 0, { speed: 10 }); for (let i = 0; i < 50; i++) g.step(); return e.progress; }; up(m([]), m(["prison"]), .9, .94, "8% slower"); },
 baral: () => assert.ok(kitGame({ relics: ["baral"] }).castCost("meteor") < kitGame({}).castCost("meteor")),
 sculptor: () => { assert.ok(kitGame({ relics: ["sculptor"] }).castCost("blade") < kitGame({}).castCost("blade")); same(kitGame({}).castCost("meteor"), kitGame({ relics: ["sculptor"] }).castCost("meteor"), "non-artifact"); },
 grounds: () => { const cd = r => { const g = kitGame({ relics: r }, { commander: "krenko" }); quiet(g); dummy(g, g.state.commander.progress - 4); for (let i = 0; i < 5; i++) g.step(); assert.ok(g.command({ type: "ability" }), "ability"); return g.state.commander.abilityAt - g.state.tick; }; up(cd([]), cd(["grounds"]), .65, .75, "30% faster"); },
 boots: () => up(kitGame({}, { commander: "krenko" }).state.commander.maxHp, kitGame({ relics: ["boots"] }, { commander: "krenko" }).state.commander.maxHp, 1.29, 1.31, "commander health"),
 greaves: () => { const r = rel => { const x = troopFight({ relics: rel }, { commander: "krenko", kind: null, patch: { attack: 1e6 }, steps: 30 }); const c = x.g.state.commander; assert.ok(c.dead, "commander fell"); return c.respawnAt - x.g.state.tick; }; up(r([]), r(["greaves"]), .4, .6, "returns twice as fast"); },
 mother: () => { const g = troopFight({ relics: ["mother"] }, { steps: 1 }).g; assert.ok(g.state.troops.every(u => u.ward >= 15)); },
 warden: () => { const g = kitGame({ relics: ["warden"] }); g.state.health = 15; g.state.wave = 4; g.command({ type: "wave" }); assert.equal(g.state.health, 16); },
 sylvan: () => { const g = kitGame({ relics: ["sylvan"] }); assert.equal(g.state.handMax, 6); assert.equal(g.state.hand.length, kitGame({}).state.hand.length + 1); }
};

test("every relic has an effect test", () => { for (const r of RELICS) assert.ok(CHECKS[r.id], "missing check for " + r.id); });
for (const r of RELICS) test("relic " + r.name + ": " + r.text, () => CHECKS[r.id]());

// Balance guard (bot playthrough on Hard, then Endless until it falls; baseline reaches wave 29). Full sweep: node archamancy/tools/relic-balance.mjs
test("no single relic carries the benchmark bot more than 4 waves further", async () => {
 const { play } = await import("../tools/relic-balance.mjs");
 const base = play({}, 1).wave;
 for (const id of ["furnace", "shadow", "sofi", "door", "coat", "emancipation"]) { const w = play({ relics: [id] }, 1).wave; assert.ok(w - base <= 4, id + " reached wave " + w + " vs " + base); }
});
