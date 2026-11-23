// Shared scenario helpers for the relic, boon and land effect tests: one tower, troop or spell against a training dummy.
import { createEngine } from "../engine.mjs";
import { STARTER_DECK } from "../campaign.mjs";

export function kitGame(kit, { commander = null, seed = 3 } = {}) {
 const g = createEngine(seed, "campaign", "hollow");
 if (commander) g.command({ type: "commander", id: commander });
 if (kit && !g.command({ type: "kit", deck: STARTER_DECK, ...kit })) throw Error("kit refused " + JSON.stringify(kit));
 return g;
}
export function dummy(g, progress, patch = {}) {
 const e = { id: 900 + g.state.enemies.length, kind: "raider", ...g.types.raider, hp: 1e7, maxHp: 1e7, attack: 0, progress, speed: 0, slowUntil: 0, rootUntil: 0, curseUntil: 0, markUntil: 0, hasteUntil: 0, revealed: true, abilityAt: 0, phase: null, phaseAt: 0, baseArmor: 0, baseResist: 0, armor: 0, resist: 0, burnUntil: 0, burnSource: null, poisonUntil: 0, poisonStacks: 0, poisonSource: null, nextAttack: 0, wave: 1, ...patch };
 g.state.enemies.push(e); return e;
}
// Start wave 1 with no real enemies, so only the dummy is on the road.
export function quiet(g) { g.state.mana = 99999; g.command({ type: "wave" }); g.state.queue = []; g.state.enemies = []; g.state.mana = 99999; return g; }
const PAD = 5;
export function towerDamage(kit, kind = "pyre", { patch = {}, steps = 60, setup = () => {}, tier = 1 } = {}) {
 const g = kitGame(kit); g.state.mana = 99999;
 if (!g.command({ type: "build", pad: PAD, kind })) throw Error("build " + kind);
 for (let t = 1; t < tier; t++) g.command({ type: "upgrade", pad: PAD, ...(t === 2 ? { branch: "A" } : {}) });
 quiet(g); const p = g.map.pads[PAD]; dummy(g, g.nearestPath(p.x, p.y), patch); setup(g);
 for (let i = 0; i < steps; i++) g.step();
 return g.state.towers[PAD].damage;
}
export function troopFight(kit, { steps = 80, commander = null, kind = "legion", patch = {} } = {}) {
 const g = kitGame(kit, { commander }); g.state.mana = 99999;
 const pad = 4; if (kind) g.command({ type: "build", pad, kind });
 quiet(g);
 const at = kind ? g.state.towers[pad].rally : g.state.commander.progress;
 const e = dummy(g, at - 4, { attack: 1, ...patch });
 for (let i = 0; i < steps; i++) g.step();
 return { g, e, troopDamage: g.state.stats.troopDamage, commanderDamage: g.state.stats.commanderDamage, hp: g.state.troops.filter(u => u.source !== "cmd").map(u => u.maxHp) };
}
export function spellDamage(kit, card = "meteor", { patch = {}, before = () => {} } = {}) {
 const g = kitGame(kit); quiet(g); const e = dummy(g, 200, patch); before(g);
 while (g.state.hand.length >= g.state.handMax) g.command({ type: "discard", index: 0 });
 g.state.hand.push(card);
 const at = g.pointAt(200);
 if (!g.command({ type: "cast", index: g.state.hand.length - 1, ...at })) throw Error("cast " + card);
 return { g, damage: g.state.stats.spellDamage, e };
}
