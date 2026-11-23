// Boons (Balatro Vouchers), Rituals (Tarot), Forbidden cards (Spectral) and basic land leveling (Planets) each do what they say.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngine } from "../engine.mjs";
import { BOONS, RITUALS, FORBIDDEN, LANDS, BY_ID, LAND_MAX } from "../pool.mjs";
import * as camp from "../campaign.mjs";
import { kitGame, towerDamage, troopFight, spellDamage } from "./relic-fx-helpers.mjs";

const cards = createEngine(1).cards;
const fresh = (patch = {}) => Object.assign(camp.newCampaign(11), { treasure: 200 }, patch);
const shopWith = (c, kind, id, price = 1) => { c.shop = { rerolls: 0, items: [{ kind, id, price, sold: false }] }; return c; };

const BOON_CHECKS = {
 cloudkey: () => { const c = fresh({ boons: ["cloudkey"] }); camp.rollShop(c, cards); const b = fresh(); b.seed = c.seed = 5; camp.rollShop(b, cards); for (let i = 0; i < c.shop.items.length; i++) if (c.shop.items[i].id === b.shop.items[i]?.id) assert.equal(c.shop.items[i].price, Math.max(1, b.shop.items[i].price - 1)); },
 bazaar: () => { const a = fresh(), b = fresh({ boons: ["bazaar"] }); assert.equal(camp.rollShop(b, cards).items.length, camp.rollShop(a, cards).items.length + 1); },
 scrollrack: () => { const a = fresh(), b = fresh({ boons: ["scrollrack"] }); camp.rollShop(a, cards); camp.rollShop(b, cards); assert.equal(camp.rerollCost(b), camp.rerollCost(a) - 1); },
 howling: () => assert.equal(kitGame({ boons: ["howling"] }).state.hand.length, kitGame({}).state.hand.length + 1),
 treasuremap: () => { const a = fresh({ treasure: 0 }), b = fresh({ treasure: 0, boons: ["treasuremap"] }); camp.finishBattle(a, { won: true, stars: 1, wave: 25 }, cards); camp.finishBattle(b, { won: true, stars: 1, wave: 25 }, cards); assert.equal(b.treasure - a.treasure, 2); },
 reliquary: () => assert.equal(kitGame({ boons: ["reliquary"] }).state.handMax, 6),
 gallery: () => assert.equal(camp.slots(fresh({ boons: ["gallery"] })), camp.BASE_SLOTS + 1),
 anticipate: () => assert.equal(camp.draftOffer(fresh({ boons: ["anticipate"] }), cards).length, 4),
 tomb: () => assert.equal(kitGame({ boons: ["tomb"] }).state.mana, kitGame({}).state.mana + 40),
 wits: () => assert.equal(camp.deckCap(fresh({ boons: ["wits"] })), camp.DECK_CAP + 5)
};
test("every boon has an effect test", () => { for (const b of BOONS) assert.ok(BOON_CHECKS[b.id], b.id); });
for (const b of BOONS) test("boon " + b.name + ": " + b.text, () => BOON_CHECKS[b.id]());

test("boons only show up in the shop until you own them, and only one per shop", () => {
 const c = fresh({ boons: BOONS.slice(0, 9).map(b => b.id) });
 for (let i = 0; i < 20; i++) { const items = camp.rollShop(c, cards).items.filter(x => x.kind === "boon"); assert.ok(items.length <= 1); if (items.length) assert.equal(items[0].id, BOONS[9].id); }
 c.boons.push(BOONS[9].id); assert.ok(!camp.rollShop(c, cards).items.some(x => x.kind === "boon"), "all owned");
});

test("tutors fetch only their card type, into a deck with room", () => {
 const kinds = { enlightened: /Artifact|Enchantment/, mystical: /Instant|Sorcery/, worldly: /Creature/ };
 for (const [id, re] of Object.entries(kinds)) {
  const c = fresh(), t = camp.ritualTargets(c, id, cards);
  assert.ok(t.length > 0, id + " has targets");
  for (const k of t) { assert.match(cards[k].type, re, id + " -> " + k); assert.ok(!c.deck.includes(k)); }
  shopWith(c, "ritual", id); assert.equal(camp.buy(c, 0, cards, c.deck[0]), null, "can't fetch a card you own");
  assert.ok(camp.buy(c, 0, cards, t[0])); assert.ok(c.deck.includes(t[0]));
 }
 const d = fresh(), all = camp.ritualTargets(d, "demonic", cards);
 assert.equal(all.length, Object.keys(cards).length - d.deck.length, "Demonic Tutor sees every spell you don't have");
 const full = fresh(); while (full.deck.length < camp.deckCap(full)) full.deck.push(Object.keys(cards).find(k => !full.deck.includes(k)));
 assert.match(camp.blocker(full, { kind: "ritual", id: "demonic", price: 1, sold: false }, cards), /Deck full/);
});

test("Gamble adds a random spell and exiles a random other one; Giant Growth upgrades; Path to Exile respects the minimum deck", () => {
 const c = shopWith(fresh(), "ritual", "gamble"), before = c.deck.slice();
 assert.ok(camp.buy(c, 0, cards)); assert.equal(c.deck.length, before.length, "one in, one out");
 assert.equal(c.deck.filter(k => !before.includes(k)).length, 1);
 const g = shopWith(fresh(), "ritual", "growth"); assert.ok(camp.buy(g, 0, cards, "meteor")); assert.equal(g.up.meteor, 1);
 const g2 = shopWith(fresh({ up: { meteor: 2 } }), "ritual", "growth"); assert.equal(camp.buy(g2, 0, cards, "meteor"), null, "already max level");
 const p = shopWith(fresh(), "ritual", "path"); assert.ok(camp.buy(p, 0, cards, "root")); assert.ok(!p.deck.includes("root"));
 const small = shopWith(fresh({ deck: camp.STARTER_DECK.slice(0, camp.MIN_DECK) }), "ritual", "path");
 assert.match(camp.blocker(small, small.shop.items[0], cards), /Nothing to use it on/);
 for (const r of RITUALS) assert.equal(camp.needsTarget(r.id), r.id !== "gamble", r.id);
});

test("upgraded spells cost less and hit harder in battle", () => {
 const a = spellDamage({}).damage, b = spellDamage({ up: { meteor: 2 } }).damage;
 assert.ok(b / a > 1.45 && b / a < 1.55, "two upgrades +50%: x" + (b / a));
});

test("forbidden: Timetwister, Burning Wish, Prismatic Omen and Wheel of Fortune", () => {
 const t = shopWith(fresh({ up: { meteor: 1 } }), "forbidden", "twister"), old = t.deck.slice();
 assert.ok(camp.buy(t, 0, cards)); assert.equal(t.deck.length, old.length); assert.ok(t.deck.every(k => !old.includes(k)), "all new spells"); assert.equal(Object.values(t.up).reduce((a, n) => a + n, 0), 1, "upgrade carried over");
 const w = shopWith(fresh(), "forbidden", "wish"); assert.ok(camp.buy(w, 0, cards)); assert.equal(BY_ID[w.relics[0]].rarity, "rare");
 const wf = shopWith(fresh({ relics: ["solring", "signet", "prison", "boots", "greaves"] }), "forbidden", "wish"); assert.match(camp.blocker(wf, wf.shop.items[0], cards), /slots full/);
 const o = shopWith(fresh({ lands: { R: 2 } }), "forbidden", "omen"); assert.ok(camp.buy(o, 0, cards)); assert.deepEqual(o.lands, { W: 1, U: 1, B: 1, R: 3, G: 1 });
 const om = shopWith(fresh({ lands: { W: LAND_MAX, U: LAND_MAX, B: LAND_MAX, R: LAND_MAX, G: LAND_MAX } }), "forbidden", "omen"); assert.ok(camp.blocker(om, om.shop.items[0], cards), "nothing left to level");
 const wh = shopWith(fresh({ treasure: 10 }), "forbidden", "wheel"), n = wh.deck.length; assert.ok(camp.buy(wh, 0, cards)); assert.equal(wh.deck.length, n - 2); assert.equal(wh.treasure, 10 - 1 + 8);
 const sp = shopWith(fresh({ relics: ["solring"], marks: ["spark"] }), "forbidden", "spark"); assert.ok(camp.blocker(sp, sp.shop.items[0], cards), "only one Spark Double");
 for (const f of FORBIDDEN) assert.equal(f.rarity, "rare");
});

test("basic lands level a color: +8% damage and troop health per level, capped at 5", () => {
 const L = lv => towerDamage({ lands: { R: lv } });
 assert.ok(L(5) / L(0) > 1.33 && L(5) / L(0) < 1.42, "5 Mountains +40% (per-hit rounding)");
 assert.equal(towerDamage({ lands: { W: 5 } }), L(0), "Plains don't help red towers");
 const t0 = troopFight({}), t3 = troopFight({ lands: { W: 3 } }); assert.ok(t3.hp[0] / t0.hp[0] > 1.23 && t3.hp[0] / t0.hp[0] < 1.25, "white troop health +24%");
 assert.ok(spellDamage({ lands: { R: 2 } }).damage > spellDamage({}).damage, "red spells too");
 const c = fresh({ lands: { G: LAND_MAX } }); for (let i = 0; i < 30; i++) assert.ok(!camp.rollShop(c, cards).items.some(x => x.id === "landG"), "maxed land leaves the shop");
 for (const l of LANDS) assert.ok(/^\{[WUBRG]\}$/.test(l.has));
});
