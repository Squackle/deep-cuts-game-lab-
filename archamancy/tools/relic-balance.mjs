// Balance sanity for campaign relics, boons and lands: plays the same scripted Gauntlet (the foundation benchmark build order,
// plus a bot that casts spells from the campaign starter deck) once per relic, and prints how far each one moves the result.
// Usage: node archamancy/tools/relic-balance.mjs [--json] [--seeds 3]
import { createEngine } from "../engine.mjs";
import { RELICS, BOONS, LANDS } from "../pool.mjs";
import { STARTER_DECK } from "../campaign.mjs";

export function play(kit = {}, seed = 1, { commander = "krenko", cast = true, difficulty = "hard" } = {}) {
 const g = createEngine(seed, "campaign", "hollow");
 g.command({ type: "difficulty", level: difficulty });
 if (commander) g.command({ type: "commander", id: commander });
 if (kit) g.command({ type: "kit", deck: STARTER_DECK, ...kit });
 const b = (pad, kind) => g.command({ type: "build", pad, kind });
 const u = pad => g.command({ type: "upgrade", pad, ...(g.state.towers[pad]?.tier === 2 ? { branch: ({ grove: "A", arcanum: "B", storm: "A", pyre: "B", legion: "A" })[g.state.towers[pad].kind] || "A" } : {}) });
 b(0, "arcanum"); b(4, "legion"); b(20, "grove");
 for (let w = 1; w <= 60; w++) {
  if (g.state.phase === "won") g.command({ type: "continue" });
  if (w === 2) { b(5, "pyre"); b(6, "arcanum"); }
  if (w === 3) { b(10, "grove"); b(15, "arcanum"); }
  if (w >= 4) {
   for (const p of [20, 10]) if (g.state.mana > 150) u(p);
   for (const p of [1, 11, 16, 19, 7, 8, 9, 12, 13, 14, 17, 18, 21, 22, 23, 2, 3]) if (g.state.mana > 160 && !g.state.towers[p]) b(p, p % 3 === 0 ? "storm" : p % 3 === 1 ? "arcanum" : "pyre");
   for (const t of Object.values(g.state.towers)) if (t.kind !== "grove" && g.state.mana > 400) u(t.id);
  }
  if (!g.command({ type: "wave" })) break;
  for (let i = 0; i < 7000 && g.state.phase === "active"; i++) {
   g.step();
   if (cast && i % 40 === 20 && g.state.mana > 450 && g.state.enemies.length) {
    const e = g.state.enemies.filter(x => x.hp > 0 && !x.escaped).sort((a, b) => b.progress - a.progress)[0];
    if (e) { const at = g.pointAt(e.progress); for (let h = 0; h < g.state.hand.length; h++) if (g.command({ type: "cast", index: h, ...at }) || g.command({ type: "cast", index: h, pad: 4 }) || g.command({ type: "cast", index: h })) break; }
   }
  }
  if (g.state.phase === "lost") break;
 }
 const s = g.state.stats;
 return { won: g.state.wave >= 25 && g.state.phase !== "lost" || g.state.wave > 25, wave: g.state.wave - (g.state.phase === "lost" ? 1 : 0) + g.state.health / 20, health: g.state.health, damage: s.damage, casts: s.casts, leaks: s.leaks };
}

export function sweep(seeds = [1, 2, 3]) {
 const avg = kit => { const r = seeds.map(s => play(kit, s)); return { won: r.filter(x => x.won).length, wave: r.reduce((a, x) => a + x.wave, 0) / r.length, health: r.reduce((a, x) => a + x.health, 0) / r.length, damage: Math.round(r.reduce((a, x) => a + x.damage, 0) / r.length), leaks: r.reduce((a, x) => a + x.leaks, 0) / r.length }; };
 const base = avg({});
 const rows = [];
 for (const x of [...RELICS.map(r => ({ id: r.id, kit: { relics: [r.id] } })), ...BOONS.map(r => ({ id: r.id, kit: { boons: [r.id] } })), ...LANDS.map(l => ({ id: l.id + "x3", kit: { lands: { [l.color]: 3 } } }))]) {
  const r = avg(x.kit); rows.push({ id: x.id, ...r, dmg: Math.round((r.damage / base.damage - 1) * 1000) / 10, dHealth: r.health - base.health });
 }
 return { base, rows };
}

if (import.meta.url === "file://" + process.argv[1]) {
 const n = Number(process.argv[process.argv.indexOf("--seeds") + 1]) || 3, out = sweep(Array.from({ length: n }, (_, i) => i + 1));
 if (process.argv.includes("--json")) console.log(JSON.stringify(out, null, 1));
 else { console.log("baseline", out.base); for (const r of out.rows.sort((a, b) => b.dmg - a.dmg)) console.log(r.id.padEnd(14), ("" + r.dmg).padStart(6) + "% dmg", "health " + r.health.toFixed(1).padStart(5), "(" + (r.dHealth >= 0 ? "+" : "") + r.dHealth.toFixed(1) + ")", "won " + r.won, "wave " + r.wave.toFixed(1)); }
}
