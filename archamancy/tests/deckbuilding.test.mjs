import { test } from "node:test";
import assert from "node:assert/strict";
import { createEngine } from "../engine.mjs";
import { POOL, RELICS, BY_ID, poolShares, relicShares, CATEGORIES, SUBTYPES } from "../pool.mjs";
import * as camp from "../campaign.mjs";

const cards = createEngine(1).cards;
const KNOWN = new Set(["troopFlat", "troopHp", "spellFlat", "summonZap", "deathZap", "towerFlat", "color", "troopPct", "sameKind", "perCast", "perKill", "xAll", "leakX", "xColor", "xBossWave", "xTroop", "xBoss", "xFlier", "xArmor", "xLow", "stormX", "xCommander", "waveMana", "spawnMana", "killMana", "deathMana", "farm", "tokenTwice", "firstCopy", "waveDraw", "bleed", "evenDraw", "clamp", "slow", "castOff", "cooldown", "cmdHp", "respawn", "ward", "mend", "openDraw", "shopOff", "shopSlots", "rerollOff", "payout", "hand", "slots", "draftChoices", "startMana", "deckCap", "tutor", "upgrade", "exile", "reroll", "freeRelic", "cloneRelic", "allLands", "burn", "gold", "land"]);

test("the pool follows Balatro's category mix", () => {
 const s = poolShares();
 for (const [k, c] of Object.entries(CATEGORIES)) assert.ok(Math.abs(s[k].pct - c.share) <= 2.5, k + " is " + s[k].pct + "%, Balatro has " + c.share + "%");
 const r = relicShares();
 for (const [k, c] of Object.entries(SUBTYPES)) assert.ok(Math.abs(r[k] / RELICS.length * 100 - c.share) <= 3, k + " relics off the Joker mix");
 assert.equal(new Set(POOL.map(x => x.id)).size, POOL.length, "unique ids");
 assert.equal(new Set(POOL.map(x => x.name)).size, POOL.length, "unique cards");
 for (const x of POOL) { assert.ok(x.name && x.type && x.has && x.text, x.id + " has card data"); assert.match(x.ci, /^W?U?B?R?G?$/, x.id + " color identity"); for (const k of Object.keys(x.fx)) assert.ok(KNOWN.has(k), x.id + " uses unknown effect " + k); }
 for (const id of camp.STARTER_DECK) assert.ok(cards[id], id);
});

function kitGame(kit, mode = "campaign") { const g = createEngine(3, mode, "hollow"); assert.ok(g.command({ type: "kit", deck: camp.STARTER_DECK, ...kit }), "kit accepted"); return g; }

test("a campaign kit sets the deck, hand size and opening hand; only before wave 1 and only in the Gauntlet", () => {
 const g = kitGame({ relics: ["sylvan"], boons: ["reliquary"] });
 assert.deepEqual(g.state.deck, camp.STARTER_DECK);
 assert.equal(g.state.hand.length, 5, "4 + Sylvan Library 1"); assert.equal(g.state.handMax, 7, "5 + Sylvan + Reliquary");
 assert.equal(g.state.library.length + g.state.hand.length, 8);
 assert.equal(g.command({ type: "kit", deck: camp.STARTER_DECK }), false, "only once");
 assert.equal(createEngine(1, "endless").command({ type: "kit", deck: camp.STARTER_DECK }), false, "not in Endless");
 assert.equal(createEngine(1).command({ type: "kit", deck: ["meteor", "meteor"] }), false, "singleton");
 assert.equal(g.playtestReport().kit.relics[0], "sylvan");
});

test("small decks reshuffle the graveyard when the library runs dry", () => {
 const g = kitGame({});
 g.state.discard.push(...g.state.library.splice(0)); g.state.hand.length = 0;
 g.command({ type: "wave" });
 assert.equal(g.state.hand.length, 2, "drew after reshuffle (1 + kit wave draw)");
 assert.ok(g.state.events.some(e => e.type === "reshuffle"));
});

function hit(kit, setup = () => {}) {
 const g = kit ? kitGame(kit) : createEngine(3, "campaign", "hollow");
 g.command({ type: "sandboxMana", amount: 0 }); g.state.mana = 99999;
 assert.ok(g.command({ type: "build", pad: 5, kind: "pyre" }));
 g.command({ type: "wave" }); g.state.queue = []; g.state.enemies = [];
 const p = g.map.pads[5]; setup(g);
 g.state.enemies.push({ id: 999, kind: "raider", ...g.types.raider, hp: 1e6, maxHp: 1e6, attack: 0, progress: g.nearestPath(p.x, p.y), speed: 0, slowUntil: 0, rootUntil: 0, curseUntil: 0, markUntil: 0, hasteUntil: 0, revealed: true, abilityAt: 0, phase: null, phaseAt: 0, baseArmor: 0, baseResist: 0, armor: 0, resist: 0, burnUntil: 0, burnSource: null, poisonUntil: 0, poisonStacks: 0, poisonSource: null, nextAttack: 0, wave: 1 });
 for (let i = 0; i < 40; i++) g.step();
 return g.state.stats.towerDamage;
}

test("relics and lands raise tower damage; conditional multipliers only fire when their condition holds", () => {
 const base = hit({}), red = hit({ relics: ["fires"] }), land = hit({ lands: { R: 3 } }), furnace = hit({ relics: ["furnace"] }), boss = hit({ relics: ["giantkiller"] });
 assert.ok(base > 0);
 assert.ok(red > base * 1.05 && red < base * 1.15, "Fires of Yavimaya +10% to red");
 assert.ok(land > base * 1.2 && land < base * 1.3, "3 Mountains +24%");
 assert.ok(furnace > base * 1.4, "Furnace x1.5");
 assert.equal(boss, base, "Giant Killer does nothing to a non-boss");
 assert.equal(hit({ relics: ["honor"] }), base, "white anthem leaves red towers alone");
});

test("economy and draw relics pay at wave start; Phyrexian Arena bleeds on every 5th wave", () => {
 const g = kitGame({ relics: ["solring", "arena"] }), m = g.state.mana; g.state.discard.push(...g.state.hand.splice(0));
 g.command({ type: "wave" });
 assert.ok(g.state.mana >= m + 20, "Sol Ring");
 assert.equal(g.state.hand.length, 3, "wave draw + kit extra + Arena");
 g.state.wave = 4; g.state.phase = "ready"; g.state.queue = []; g.state.enemies = []; const hp = g.state.health; g.command({ type: "wave" });
 assert.equal(g.state.health, hp - 1);
});

test("spell upgrades make spells cheaper; Baral discounts instants and sorceries", () => {
 const plain = createEngine(1).castCost("meteor");
 assert.equal(kitGame({ up: { meteor: 2 } }).castCost("meteor"), Math.round(plain * .7));
 assert.equal(kitGame({ relics: ["baral"] }).castCost("meteor"), Math.round(plain * .85));
 assert.equal(kitGame({ relics: ["baral"] }).castCost("twins"), createEngine(1).castCost("twins"), "enchantments unaffected");
});

test("a kitted run saves and restores", () => {
 const g = kitGame({ relics: ["solring", "prison"], lands: { G: 2 } });
 g.command({ type: "wave" }); for (let i = 0; i < 200; i++) g.step();
 const h = createEngine(1, "campaign", "hollow"); assert.ok(h.restore(JSON.parse(JSON.stringify(g.snapshot()))));
 for (let i = 0; i < 100; i++) { g.step(); h.step(); }
 assert.deepEqual(h.playtestReport().stats, g.playtestReport().stats);
 assert.deepEqual(h.playtestReport().kit, g.playtestReport().kit);
});

test("campaign: battles pay Treasure, roll a shop and offer a draft; shop buys and deck edits follow the rules", () => {
 const c = camp.newCampaign(7);
 const r = camp.finishBattle(c, { won: true, stars: 3, wave: 25 }, cards);
 assert.equal(r.gold, 14); assert.equal(c.treasure, 18);
 assert.equal(c.draft.length, 3); assert.ok(c.draft.every(k => !c.deck.includes(k)));
 assert.ok(camp.pickDraft(c, c.draft[0])); assert.equal(c.deck.length, 9);
 {const f = camp.newCampaign(3); f.deck = Object.keys(cards).slice(0, camp.DECK_CAP); f.up[f.deck[0]] = 2; f.draft = Object.keys(cards).filter(k => !f.deck.includes(k)).slice(0, 3);
  assert.equal(camp.pickDraft(f, f.draft[0]), false, "a full deck needs a spell to swap out"); assert.equal(camp.pickDraft(f, f.draft[0], "nope"), false);
  const out = f.deck[0], inn = f.draft[0]; assert.ok(camp.pickDraft(f, inn, out)); assert.equal(f.deck.length, camp.DECK_CAP);
  assert.ok(f.deck.includes(inn) && !f.deck.includes(out)); assert.equal(f.up[out], undefined); assert.equal(f.draft, null);}
 assert.ok(c.shop.items.some(i => i.kind === "spell") && c.shop.items.some(i => i.kind === "boon"));
 for (const it of c.shop.items) assert.ok(it.kind === "spell" || BY_ID[it.id], it.id);
 c.treasure = 100;
 c.shop.items = [{ kind: "relic", id: "solring", price: 6, sold: false }, { kind: "ritual", id: "growth", price: 3, sold: false }, { kind: "land", id: "landR", price: 3, sold: false }, { kind: "boon", id: "gallery", price: 10, sold: false }];
 assert.ok(camp.buy(c, 0, cards)); assert.deepEqual(c.relics, ["solring"]); assert.equal(camp.buy(c, 0, cards), null, "sold out");
 assert.equal(camp.buy(c, 1, cards), null, "Giant Growth needs a target");
 assert.ok(camp.buy(c, 1, cards, "meteor")); assert.equal(c.up.meteor, 1);
 assert.ok(camp.buy(c, 2, cards)); assert.equal(c.lands.R, 1);
 assert.ok(camp.buy(c, 3, cards)); assert.equal(camp.slots(c), 6);
 assert.ok(camp.upgrade(c, "meteor")); assert.equal(camp.upgradeCost(c, "meteor"), null);
 assert.ok(camp.remove(c, "root")); assert.ok(!c.deck.includes("root"));
 while (c.deck.length > camp.MIN_DECK) camp.remove(c, c.deck.at(-1));
 assert.equal(camp.remove(c, c.deck[0]), false, "minimum deck");
 assert.ok(camp.sellRelic(c, "solring") && c.relics.length === 0);
 const back = camp.sanitize(JSON.parse(JSON.stringify(c)), cards);
 assert.deepEqual(back.deck, c.deck); assert.deepEqual(back.up, c.up); assert.equal(back.treasure, c.treasure); assert.deepEqual(back.boons, ["gallery"]);
 const kit = camp.kitFor(back); const g = createEngine(1); assert.ok(g.command({ type: "kit", ...kit }));
});

test("forbidden cards: Necropotence trades hand size for a relic slot; Spark Double keeps one relic twice", () => {
 const c = camp.newCampaign(3); c.treasure = 50; c.relics = ["solring", "prison"];
 c.shop = { rerolls: 0, items: [{ kind: "forbidden", id: "necro", price: 5, sold: false }, { kind: "forbidden", id: "spark", price: 5, sold: false }] };
 assert.ok(camp.buy(c, 0, cards)); assert.equal(camp.slots(c), 6);
 assert.ok(camp.buy(c, 1, cards)); assert.deepEqual(c.relics, ["solring"]);
 const g = createEngine(1); g.command({ type: "kit", ...camp.kitFor(c) }); assert.equal(g.state.handMax, 4); const m = g.state.mana; g.command({ type: "wave" }); assert.ok(g.state.mana >= m + 40, "Sol Ring twice");
 assert.ok(camp.reroll(c, cards) && c.shop.rerolls === 1);
});

test("shop booster packs: two per visit, kept on reroll, open one and keep one card free", () => {
 const c = camp.newCampaign(7); c.treasure = 60;
 camp.finishBattle(c, { won: true, stars: 3, wave: 25 }, cards);
 assert.equal(c.shop.fresh, true, "a battle restocks with new stock");
 assert.equal(c.shop.packs.length, camp.PACK_SLOTS);
 assert.equal(new Set(c.shop.packs.map(p => p.kind)).size, camp.PACK_SLOTS, "different packs");
 const packs = JSON.stringify(c.shop.packs);
 assert.ok(camp.reroll(c, cards)); assert.equal(JSON.stringify(c.shop.packs), packs, "rerolls keep the packs, like Balatro");
 camp.seenShop(c); assert.equal(c.shop.fresh, false);
 for (const kind of Object.keys(camp.PACKS)) {
  c.pack = null; c.treasure = 60; c.shop.packs = [{ kind, price: 4, sold: false }];
  const before = c.treasure, p = camp.openPack(c, 0, cards);
  assert.ok(p, kind + " opens"); assert.equal(c.treasure, before - 4); assert.ok(c.shop.packs[0].sold);
  assert.equal(p.opts.length, camp.PACKS[kind].show); assert.equal(new Set(p.opts).size, p.opts.length);
  assert.equal(camp.openPack(c, 0, cards), null, "can't open twice");
  const free = p.opts.find(id => !camp.packCardBlocker(c, id, cards) && !(kind === "ritual" && camp.needsTarget(id)));
  if (free) { const t = c.treasure; assert.ok(camp.choosePack(c, free, cards), kind + " pick works"); assert.equal(c.treasure, t + (kind === "forbidden" && BY_ID[free].fx.gold || 0), "pack cards are free"); assert.equal(c.pack, null); }
  else assert.ok(camp.skipPack(c));
 }
 c.shop.packs = [{ kind: "ritual", price: 4, sold: false }, { kind: "relic", price: 6, sold: false }];
 camp.openPack(c, 0, cards); assert.equal(camp.packBlocker(c, 1, cards), "Finish the pack you opened first");
 const saved = camp.sanitize(JSON.parse(JSON.stringify(c)), cards);
 assert.deepEqual(saved.pack, c.pack, "an open pack survives a reload"); assert.deepEqual(saved.shop.packs, c.shop.packs);
 const tgt = c.pack.opts.find(id => camp.needsTarget(id));
 if (tgt) { const t = camp.ritualTargets(c, tgt, cards)[0]; assert.equal(camp.choosePack(c, tgt, cards), null, "needs a target"); assert.ok(camp.choosePack(c, tgt, cards, t)); }
 c.relics = RELICS.slice(0, camp.slots(c)).map(r => r.id); c.pack = null;
 assert.equal(camp.packBlocker(c, 1, cards), "Relic slots full: sell one in your Deck");
 assert.equal(camp.sanitize({ ...c, pack: { kind: "relic", opts: ["landR", "nope"] } }, cards).pack, null, "bad pack contents dropped");
});

test("campaign saves retain legitimate shops but bound and reject malformed inventory",()=>{
 const good=camp.newCampaign(42),cards=createEngine(42).cards;
 good.shop={rerolls:3,fresh:true,items:[
  {kind:"relic",id:"solring",price:6,sold:false},
  {kind:"spell",id:"twins",price:3,sold:true}
 ],packs:[{kind:"ritual",price:4,sold:false}]};
 good.draft=["cascade","prism"];
 const retained=camp.sanitize(JSON.parse(JSON.stringify(good)),cards);
 assert.deepEqual(retained.shop,good.shop,"legitimate existing shop inventory remains unchanged");
 assert.deepEqual(retained.draft,good.draft);
 const bad={...good,deck:[...good.deck,...Array.from({length:10000},()=> "not-a-card")],
  draft:[...good.draft,...Array.from({length:10000},()=> "not-a-card")],
  shop:{rerolls:-90,fresh:true,
  items:[{kind:"relic",id:"solring",price:6,sold:false},
   {kind:"ritual",id:"solring",price:1,sold:false},
   {kind:"relic",id:"solring",price:-99,sold:false},
   ...Array.from({length:10000},()=>({kind:"relic",id:"solring",price:6,sold:false}))],
  packs:[{kind:"ritual",price:4,sold:false},{kind:"relic",price:-10,sold:false},...Array.from({length:10000},()=>({kind:"bogus",price:4,sold:false}))]},
  };
 const clean=camp.sanitize(bad,cards);
 assert.equal(clean.shop.rerolls,0,"negative reroll counts cannot give a free-reroll discount");
 assert.equal(clean.shop.items[0].id,"solring");
 assert.ok(clean.shop.items.length<=64,"a corrupted saved shop cannot materialize thousands of entries");
 assert.deepEqual(clean.shop.packs,[{kind:"ritual",price:4,sold:false}]);
 assert.deepEqual(clean.deck,good.deck,"valid player deck survives trailing malformed entries");
 assert.deepEqual(clean.draft,good.draft,"valid draft offer survives trailing malformed entries");
 const high=camp.sanitize({...good,shop:{...good.shop,rerolls:Number.MAX_SAFE_INTEGER}},cards);
 assert.equal(high.shop.rerolls,1e6,"large reroll counters cannot overflow later costs");
});
