// Campaign deckbuilding ("Balatro deckbuilding meets Magic"). Every entry is a real Magic: The Gathering card (unofficial fan content).
// Names, color identity, type line and a phrase of rules text are checked against Scryfall by tools/verify-cards.mjs in CI.
//
// How Balatro's pool maps onto ARCHEMANCY (counts from Balatro 1.0: 150 Jokers, 22 Tarot, 12 Planet, 18 Spectral, 32 Vouchers = 234):
//   Jokers 64%   -> RELICS     passives in limited slots (5), split by the Joker effect mix below
//   Vouchers 14% -> BOONS      permanent campaign upgrades, one per shop visit
//   Tarot 9%     -> RITUALS    one-shot deck edits: tutor a spell in, upgrade one, exile one
//   Spectral 8%  -> FORBIDDEN  rare one-shots with a big upside and a cost
//   Planet 5%    -> LANDS      basic lands level up a color, like Planets level up a poker hand
//   Playing cards -> SPELLS    the 30 spells in the engine; your deck is a singleton (Commander-style) set of them
// Joker effect mix (Balatro's own scoring roles): +Mult 22%, xMult 23%, +Chips 13%, Economy 13%, Retrigger 4%, Utility 24%.
// Relics follow it: +Chips = flat damage, +Mult = percent damage, xMult = conditional multipliers, Retrigger = doubled effects.

export const CATEGORIES = {
 relic: { name: "Relic", plural: "Relics", balatro: "Jokers", share: 64, text: "Passive power that lasts the whole campaign. You hold up to 5." },
 boon: { name: "Boon", plural: "Boons", balatro: "Vouchers", share: 14, text: "A permanent campaign upgrade. One appears in each shop." },
 ritual: { name: "Ritual", plural: "Rituals", balatro: "Tarot cards", share: 9, text: "Use once to change your deck: add, upgrade or exile a spell." },
 forbidden: { name: "Forbidden", plural: "Forbidden", balatro: "Spectral cards", share: 8, text: "Rare, powerful one-shots that come with a cost." },
 land: { name: "Land", plural: "Lands", balatro: "Planet cards", share: 5, text: "Levels up one color: its towers, troops and spells hit harder." }
};
export const SUBTYPES = {
 chips: { name: "Flat damage", balatro: "+Chips", share: 13 },
 mult: { name: "Percent damage", balatro: "+Mult", share: 22 },
 xmult: { name: "Multiplier", balatro: "xMult", share: 23 },
 econ: { name: "Economy", balatro: "Economy", share: 13 },
 retrigger: { name: "Double up", balatro: "Retrigger", share: 4 },
 utility: { name: "Utility", balatro: "Utility", share: 24 }
};
export const RARITY = { common: { cost: 4, weight: 70 }, uncommon: { cost: 6, weight: 25 }, rare: { cost: 8, weight: 5 } };

// ci = expected color identity (WUBRG order, "" for colorless); type = text the type line contains; has = phrase in the rules text.
// fx = what the relic does in the engine (see engine.mjs relic hooks). Percentages are fractions.
const R = (id, name, ci, type, has, sub, rarity, fx, text) => ({ id, name, ci, type, has, kind: "relic", sub, rarity, fx, text });
export const RELICS = [
 // +Chips: flat damage
 R("bonesplitter", "Bonesplitter", "", "Equipment", "+2/+0", "chips", "common", { troopFlat: 5 }, "Troops deal +5 damage per hit."),
 R("anthem", "Glorious Anthem", "W", "Enchantment", "Creatures you control get +1/+1", "chips", "common", { troopFlat: 3, troopHp: .1 }, "Troops deal +3 damage per hit and have +10% health."),
 R("gauntlet", "Pyromancer's Gauntlet", "", "Artifact", "plus 2", "chips", "uncommon", { spellFlat: { R: 25 } }, "Red spells deal +25 damage to each enemy they hit."),
 R("tremors", "Impact Tremors", "R", "Enchantment", "deals 1 damage to each opponent", "chips", "common", { summonZap: 20 }, "Whenever a troop is summoned, it zaps the leading enemy in reach for 20."),
 R("bombardment", "Goblin Bombardment", "R", "Enchantment", "Sacrifice a creature", "chips", "uncommon", { deathZap: 30 }, "Whenever a troop dies, it hurls a goblin at the nearest enemy for 30."),
 R("sofi", "Sword of Fire and Ice", "", "Equipment", "+2/+2", "chips", "rare", { towerFlat: { U: 8, R: 8 } }, "Blue and red towers deal +8 damage per hit."),
 // +Mult: percent damage
 R("honor", "Honor of the Pure", "W", "Enchantment", "White creatures you control get +1/+1", "mult", "common", { color: { W: .2 } }, "White towers, troops and spells: +20% damage."),
 R("winds", "Favorable Winds", "U", "Enchantment", "with flying get +1/+1", "mult", "common", { color: { U: .2 } }, "Blue towers and spells: +20% damage."),
 R("badmoon", "Bad Moon", "B", "Enchantment", "Black creatures get +1/+1", "mult", "common", { color: { B: .2 } }, "Black towers, troops and spells: +20% damage."),
 R("fires", "Fires of Yavimaya", "RG", "Enchantment", "have haste", "mult", "common", { color: { R: .1, G: .1 } }, "Red and green towers, troops and spells: +10% damage."),
 R("gaea", "Gaea's Anthem", "G", "Enchantment", "Creatures you control get +1/+1", "mult", "common", { color: { G: .2 } }, "Green towers, troops and spells: +20% damage."),
 R("spear", "Spear of Heliod", "W", "Enchantment Artifact", "Creatures you control get +1/+1", "mult", "uncommon", { troopPct: .15, troopHp: .15 }, "Troops: +15% damage and +15% health."),
 R("norn", "Elesh Norn, Grand Cenobite", "W", "Creature", "Other creatures you control get +2/+2", "mult", "rare", { troopPct: .3, troopHp: .3 }, "Troops: +30% damage and +30% health."),
 R("coat", "Coat of Arms", "", "Artifact", "shares at least one creature type", "mult", "uncommon", { sameKind: .04 }, "Each tower deals +4% damage for every other tower of the same kind (up to +20%)."),
 R("door", "Door of Destinies", "", "Artifact", "charge counter", "mult", "uncommon", { perCast: .01 }, "Towers deal +1% damage for every spell cast this battle (up to +25%)."),
 R("ascension", "Beastmaster Ascension", "G", "Enchantment", "quest counter", "mult", "common", { perKill: .002 }, "Troops deal +1% damage for every 5 enemies defeated this battle (up to +30%)."),
 R("crusade", "Cathars' Crusade", "W", "Enchantment", "+1/+1 counter on each creature you control", "mult", "uncommon", { troopPct: .1, troopHp: .2 }, "Troops: +10% damage and +20% health."),
 // xMult: multipliers, most of them conditional
 R("furnace", "Furnace of Rath", "R", "Enchantment", "double that damage", "xmult", "rare", { xAll: 1.5, leakX: 2 }, "All your damage x1.5, but enemies that reach the keep cost double fortress."),
 R("emancipation", "Fiery Emancipation", "R", "Enchantment", "triple that damage", "xmult", "rare", { xColor: { R: 1.5 } }, "Red towers, troops and spells deal x1.5 damage."),
 R("dictate", "Dictate of the Twin Gods", "R", "Enchantment", "double that damage", "xmult", "uncommon", { xBossWave: 1.4 }, "Boss waves (every 5th): all damage x1.4."),
 R("violence", "Gratuitous Violence", "R", "Enchantment", "double that damage", "xmult", "uncommon", { xTroop: 1.5 }, "Troops deal x1.5 damage."),
 R("giantkiller", "Giant Killer", "W", "Creature", "power 4 or greater", "xmult", "common", { xBoss: 1.6 }, "Damage to bosses x1.6."),
 R("archer", "Thornweald Archer", "G", "Creature", "Reach", "xmult", "common", { xFlier: 1.5 }, "Damage to fliers x1.5."),
 R("slime", "Acidic Slime", "G", "Creature", "Deathtouch", "xmult", "common", { xArmor: 1.35 }, "Damage to armored enemies x1.35."),
 R("shadow", "Death's Shadow", "B", "Creature", "where X is your life total", "xmult", "uncommon", { xLow: 1.6 }, "While your fortress has 10 or less, all damage x1.6."),
 R("storm", "Thousand-Year Storm", "UR", "Enchantment", "for each other instant and sorcery spell", "xmult", "rare", { stormX: .25 }, "Spells deal +25% more for each spell already cast this wave (up to x2)."),
 R("embercleave", "Embercleave", "R", "Equipment", "double strike", "xmult", "rare", { xCommander: 2 }, "Your commander deals x2 damage."),
 R("memorial", "Akroma's Memorial", "", "Artifact", "first strike", "xmult", "rare", { xTroop: 1.3, troopHp: .3 }, "Troops deal x1.3 damage and have +30% health."),
 // Economy
 R("solring", "Sol Ring", "", "Artifact", "{C}{C}", "econ", "uncommon", { waveMana: 20 }, "+20 mana whenever a wave starts."),
 R("signet", "Arcane Signet", "", "Artifact", "commander's color identity", "econ", "common", { waveMana: 10 }, "+10 mana whenever a wave starts."),
 R("tithe", "Smothering Tithe", "W", "Enchantment", "Whenever an opponent draws a card", "econ", "uncommon", { spawnMana: 1 / 3 }, "+1 mana for every 3 enemies that arrive."),
 R("revel", "Revel in Riches", "B", "Enchantment", "create a Treasure token", "econ", "common", { killMana: 1 }, "+1 mana for every enemy defeated (up to 40 a wave)."),
 R("plunderer", "Pitiless Plunderer", "B", "Creature", "create a Treasure token", "econ", "common", { deathMana: 3 }, "+3 mana whenever one of your troops dies (up to 30 a wave)."),
 R("reflection", "Mana Reflection", "G", "Enchantment", "twice as much", "econ", "rare", { farm: .25 }, "Mana Groves harvest 25% more, and their wave budgets grow to match."),
 // Retrigger
 R("doubling", "Doubling Season", "G", "Enchantment", "twice that many", "retrigger", "rare", { tokenTwice: true }, "Your commander's token makers create two tokens instead of one (caps still apply)."),
 R("scepter", "Isochron Scepter", "", "Artifact", "copy the exiled card", "retrigger", "uncommon", { firstCopy: true }, "The first spell you cast each wave resolves twice."),
 // Utility
 R("arena", "Phyrexian Arena", "B", "Enchantment", "lose 1 life", "utility", "uncommon", { waveDraw: 1, bleed: 5 }, "Draw an extra card every wave. Lose 1 fortress every 5th wave."),
 R("rhystic", "Rhystic Study", "U", "Enchantment", "unless that player pays {1}", "utility", "uncommon", { evenDraw: 1 }, "Draw an extra card on every even-numbered wave."),
 R("clamp", "Skullclamp", "", "Equipment", "draw two cards", "utility", "uncommon", { clamp: 6 }, "Draw a card for every 6 troops that die (up to 2 a wave)."),
 R("prison", "Ghostly Prison", "W", "Enchantment", "can't attack you unless", "utility", "common", { slow: .08 }, "Enemies move 8% slower."),
 R("baral", "Baral, Chief of Compliance", "U", "Creature", "cost {1} less to cast", "utility", "common", { castOff: { instant: .15 } }, "Instants and sorceries cost 15% less mana."),
 R("sculptor", "Etherium Sculptor", "U", "Creature", "Artifact spells you cast cost {1} less", "utility", "common", { castOff: { artifact: .25 } }, "Artifact spells cost 25% less mana."),
 R("grounds", "Training Grounds", "U", "Enchantment", "cost {2} less to activate", "utility", "common", { cooldown: .3 }, "Your commander's power recharges 30% faster."),
 R("boots", "Swiftfoot Boots", "", "Equipment", "hexproof and haste", "utility", "common", { cmdHp: .3 }, "Your commander has +30% health."),
 R("greaves", "Lightning Greaves", "", "Equipment", "haste and shroud", "utility", "common", { respawn: .5 }, "Your commander returns twice as fast after falling."),
 R("mother", "Mother of Runes", "W", "Creature", "protection from the color", "utility", "common", { ward: 15 }, "New troops arrive with a 15-point ward."),
 R("warden", "Soul Warden", "W", "Creature", "you gain 1 life", "utility", "common", { mend: 5 }, "Every 5th wave, regain 1 fortress (up to 20)."),
 R("sylvan", "Sylvan Library", "G", "Enchantment", "draw two additional cards", "utility", "uncommon", { openDraw: 2 }, "Start each battle with 2 extra cards in hand.")
];

const B = (id, name, ci, type, has, fx, text) => ({ id, name, ci, type, has, kind: "boon", rarity: "uncommon", fx, text });
export const BOONS = [
 B("cloudkey", "Cloud Key", "", "Artifact", "cost {1} less to cast", { shopOff: 1 }, "Everything in the shop costs 1 Treasure less."),
 B("bazaar", "Bazaar of Baghdad", "", "Land", "discard three cards", { shopSlots: 1 }, "The shop shows one more item."),
 B("scrollrack", "Scroll Rack", "", "Artifact", "from your hand face down", { rerollOff: 1 }, "Shop rerolls cost 1 Treasure less."),
 B("howling", "Howling Mine", "", "Artifact", "draws an additional card", { openDraw: 1 }, "Start each battle with 1 extra card in hand."),
 B("treasuremap", "Treasure Map", "", "Artifact", "landmark counter", { payout: 2 }, "+2 Treasure every time you finish a battle."),
 B("reliquary", "Reliquary Tower", "", "Land", "no maximum hand size", { hand: 1 }, "Hold 6 spells in hand instead of 5."),
 B("gallery", "Mirror Gallery", "", "Artifact", "legend rule", { slots: 1 }, "+1 relic slot."),
 B("anticipate", "Anticipate", "U", "Instant", "Look at the top three cards", { draftChoices: 1 }, "Spell drafts show one more choice."),
 B("tomb", "Ancient Tomb", "", "Land", "deals 2 damage to you", { startMana: 40 }, "Start each battle with +40 mana."),
 B("wits", "Battle of Wits", "U", "Enchantment", "200 or more cards", { deckCap: 5 }, "Your deck can hold 5 more spells.")
];

const T = (id, name, ci, type, has, fx, text) => ({ id, name, ci, type, has, kind: "ritual", rarity: "common", fx, text });
export const RITUALS = [
 T("demonic", "Demonic Tutor", "B", "Sorcery", "Search your library for a card", { tutor: "any" }, "Add any spell you choose to your deck."),
 T("enlightened", "Enlightened Tutor", "W", "Instant", "artifact or enchantment card", { tutor: "permanent" }, "Add an artifact, enchantment or Aura spell of your choice."),
 T("mystical", "Mystical Tutor", "U", "Instant", "instant or sorcery card", { tutor: "instant" }, "Add an instant or sorcery of your choice."),
 T("worldly", "Worldly Tutor", "G", "Instant", "creature card", { tutor: "creature" }, "Add a creature spell of your choice."),
 T("gamble", "Gamble", "R", "Sorcery", "discard a card at random", { tutor: "random" }, "Add a random spell, then exile a random spell from your deck."),
 T("growth", "Giant Growth", "G", "Instant", "+3/+3", { upgrade: 1 }, "Upgrade a spell in your deck for free."),
 T("path", "Path to Exile", "W", "Instant", "Exile target creature", { exile: 1 }, "Exile a spell from your deck for free.")
];

const F = (id, name, ci, type, has, fx, text) => ({ id, name, ci, type, has, kind: "forbidden", rarity: "rare", fx, text });
export const FORBIDDEN = [
 F("twister", "Timetwister", "U", "Sorcery", "shuffles their hand and graveyard into their library", { reroll: true }, "Swap every spell in your deck for a random spell you don't have. Upgrades carry over."),
 F("wish", "Burning Wish", "R", "Sorcery", "from outside the game", { freeRelic: "rare" }, "Gain a random rare relic, if you have a free slot."),
 F("spark", "Spark Double", "U", "Creature", "copy of a creature or planeswalker you control", { cloneRelic: true }, "Copy your first relic. Every other relic is destroyed."),
 F("omen", "Prismatic Omen", "G", "Enchantment", "every basic land type", { allLands: 1 }, "Every color gains a land level."),
 F("wheel", "Wheel of Fortune", "R", "Sorcery", "discards their hand, then draws seven cards", { burn: 2, gold: 8 }, "Exile 2 random spells from your deck and gain 8 Treasure."),
 F("necro", "Necropotence", "B", "Enchantment", "Skip your draw step", { slots: 1, hand: -1 }, "+1 relic slot, but hold one fewer spell in hand.")
];

const L = (c, name) => ({ id: "land" + c, name, ci: c, type: "Basic Land", has: "{" + c + "}", kind: "land", rarity: "common", color: c, fx: { land: c }, text: "Level up " + { W: "white", U: "blue", B: "black", R: "red", G: "green" }[c] + ": +8% damage and +8% troop health for that color per level." });
export const LANDS = [L("W", "Plains"), L("U", "Island"), L("B", "Swamp"), L("R", "Mountain"), L("G", "Forest")];

export const POOL = [...RELICS, ...BOONS, ...RITUALS, ...FORBIDDEN, ...LANDS];
export const BY_ID = Object.fromEntries(POOL.map(x => [x.id, x]));
export const LAND_STEP = .08, LAND_MAX = 5;

// Share of each category in the pool, for the in-game breakdown and the tests.
export function poolShares(pool = POOL) { const out = {}; for (const x of pool) out[x.kind] = (out[x.kind] || 0) + 1; for (const k of Object.keys(out)) out[k] = { count: out[k], pct: Math.round(out[k] / pool.length * 1000) / 10 }; return out; }
export function relicShares() { const out = {}; for (const x of RELICS) out[x.sub] = (out[x.sub] || 0) + 1; return out; }

// Spell types, for tutors and cost discounts. TYPES lives in the engine; this reads game.cards[id].type.
export function spellKind(type = "") { return /Instant|Sorcery/.test(type) ? "instant" : /Creature/.test(type) ? "creature" : "permanent"; }
export const isArtifact = (type = "") => /Artifact/.test(type);
