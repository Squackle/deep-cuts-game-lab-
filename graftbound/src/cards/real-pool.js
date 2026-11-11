// Curated pool of REAL Magic: The Gathering cards — the ONLY source of GRAFTBOUND rewards (v0.5).
// Inclusion rule: every relevant effect must be modeled by this engine.
//   • creatures: no rules text except keywords this game models (Deathtouch, Flying, Trample, First strike,
//     Double strike, Lifelink, Vigilance, Haste), or vanilla;
//   • spells: an explicit, reviewed adaptation in compatibility.js SPELL_ADAPTATIONS (labeled in the UI).
// Bundled: card FACTS only (name, mana cost, mana value, type line, P/T, keywords, color identity, a typical
// printing's rarity). Images and Oracle text are fetched read-only from Scryfall at runtime and cross-checked.
// Facts were entered from general knowledge; the build sandbox could not reach Scryfall. VERIFY with
// `node tools/verify-real-pool.mjs` (needs network) before release. Never add a card you have not confirmed exists.
const C = (name, mana_cost, cmc, type_line, power, toughness, keywords, color_identity, rarity) =>
  ({ name, mana_cost, cmc, type_line, power: String(power), toughness: String(toughness), keywords, color_identity, rarity });
const S = (name, mana_cost, cmc, type_line, color_identity, rarity) => ({ name, mana_cost, cmc, type_line, keywords: [], color_identity, rarity, spell: true });

export const REAL_CREATURES = [
  // White
  C('Savannah Lions', '{W}', 1, 'Creature — Cat', 2, 1, [], ['W'], 'common'),
  C('Elite Vanguard', '{W}', 1, 'Creature — Human Soldier', 2, 1, [], ['W'], 'uncommon'),
  C('Suntail Hawk', '{W}', 1, 'Creature — Bird', 1, 1, ['Flying'], ['W'], 'common'),
  C("Healer's Hawk", '{W}', 1, 'Creature — Bird', 1, 1, ['Flying', 'Lifelink'], ['W'], 'common'),
  C('Glory Seeker', '{1}{W}', 2, 'Creature — Human Soldier', 2, 2, [], ['W'], 'common'),
  C('Silvercoat Lion', '{1}{W}', 2, 'Creature — Cat', 2, 2, [], ['W'], 'common'),
  C('Youthful Knight', '{1}{W}', 2, 'Creature — Human Knight', 2, 1, ['First strike'], ['W'], 'common'),
  C('Fencing Ace', '{1}{W}', 2, 'Creature — Human Soldier', 1, 1, ['Double strike'], ['W'], 'uncommon'),
  C('Mesa Unicorn', '{1}{W}', 2, 'Creature — Unicorn', 2, 2, ['Lifelink'], ['W'], 'common'),
  C('Knight of Meadowgrain', '{W}{W}', 2, 'Creature — Kithkin Knight', 2, 2, ['First strike', 'Lifelink'], ['W'], 'uncommon'),
  C('Pillarfield Ox', '{3}{W}', 4, 'Creature — Ox', 2, 4, [], ['W'], 'common'),
  C('Serra Angel', '{3}{W}{W}', 5, 'Creature — Angel', 4, 4, ['Flying', 'Vigilance'], ['W'], 'uncommon'),
  // Blue
  C('Fugitive Wizard', '{U}', 1, 'Creature — Human Wizard', 1, 1, [], ['U'], 'common'),
  C('Coral Merfolk', '{1}{U}', 2, 'Creature — Merfolk', 2, 1, [], ['U'], 'common'),
  C('Storm Crow', '{1}{U}', 2, 'Creature — Bird', 1, 2, ['Flying'], ['U'], 'common'),
  C('Wind Drake', '{2}{U}', 3, 'Creature — Drake', 2, 2, ['Flying'], ['U'], 'common'),
  C('Snapping Drake', '{3}{U}', 4, 'Creature — Drake', 3, 2, ['Flying'], ['U'], 'common'),
  C('Air Elemental', '{3}{U}{U}', 5, 'Creature — Elemental', 4, 4, ['Flying'], ['U'], 'uncommon'),
  C('Mahamoti Djinn', '{4}{U}{U}', 6, 'Creature — Djinn', 5, 6, ['Flying'], ['U'], 'rare'),
  // Black
  C('Typhoid Rats', '{B}', 1, 'Creature — Rat', 1, 1, ['Deathtouch'], ['B'], 'common'),
  C("Pharika's Chosen", '{B}', 1, 'Creature — Snake', 1, 1, ['Deathtouch'], ['B'], 'common'),
  C('Child of Night', '{1}{B}', 2, 'Creature — Vampire', 2, 1, ['Lifelink'], ['B'], 'common'),
  C('Walking Corpse', '{1}{B}', 2, 'Creature — Zombie', 2, 2, [], ['B'], 'common'),
  C('Gifted Aetherborn', '{B}{B}', 2, 'Creature — Aetherborn Vampire', 2, 3, ['Deathtouch', 'Lifelink'], ['B'], 'uncommon'),
  C('Vampire Nighthawk', '{1}{B}{B}', 3, 'Creature — Vampire Shaman', 2, 3, ['Flying', 'Deathtouch', 'Lifelink'], ['B'], 'uncommon'),
  C('Feral Abomination', '{5}{B}', 6, 'Creature — Thrull', 5, 5, ['Deathtouch'], ['B'], 'common'),
  // Red
  C('Raging Goblin', '{R}', 1, 'Creature — Goblin Berserker', 1, 1, ['Haste'], ['R'], 'common'),
  C('Gray Ogre', '{2}{R}', 3, 'Creature — Ogre', 2, 2, [], ['R'], 'common'),
  C('Hill Giant', '{3}{R}', 4, 'Creature — Giant', 3, 3, [], ['R'], 'common'),
  C('Lightning Elemental', '{3}{R}', 4, 'Creature — Elemental', 4, 1, ['Haste'], ['R'], 'common'),
  C('Fire Elemental', '{3}{R}{R}', 5, 'Creature — Elemental', 5, 4, [], ['R'], 'common'),
  C('Charging Monstrosaur', '{4}{R}', 5, 'Creature — Dinosaur', 5, 5, ['Trample', 'Haste'], ['R'], 'uncommon'),
  C('Volcanic Dragon', '{4}{R}{R}', 6, 'Creature — Dragon', 4, 4, ['Flying', 'Haste'], ['R'], 'uncommon'),
  // Green
  C('Grizzly Bears', '{1}{G}', 2, 'Creature — Bear', 2, 2, [], ['G'], 'common'),
  C('Runeclaw Bear', '{1}{G}', 2, 'Creature — Bear', 2, 2, [], ['G'], 'common'),
  C('Elvish Warrior', '{G}{G}', 2, 'Creature — Elf Warrior', 2, 3, [], ['G'], 'common'),
  C('Alpine Grizzly', '{2}{G}', 3, 'Creature — Bear', 4, 2, [], ['G'], 'common'),
  C('Centaur Courser', '{2}{G}', 3, 'Creature — Centaur Warrior', 3, 3, [], ['G'], 'common'),
  C('Gnarled Mass', '{1}{G}{G}', 3, 'Creature — Spirit', 3, 3, [], ['G'], 'common'),
  C('War Mammoth', '{3}{G}', 4, 'Creature — Elephant', 3, 3, ['Trample'], ['G'], 'common'),
  C('Rumbling Baloth', '{2}{G}{G}', 4, 'Creature — Beast', 4, 4, [], ['G'], 'common'),
  C('Spined Wurm', '{4}{G}', 5, 'Creature — Wurm', 5, 4, [], ['G'], 'common'),
  C('Craw Wurm', '{4}{G}{G}', 6, 'Creature — Wurm', 6, 4, [], ['G'], 'common'),
  C('Colossal Dreadmaw', '{4}{G}{G}', 6, 'Creature — Dinosaur', 6, 6, ['Trample'], ['G'], 'common'),
  C('Ancient Brontodon', '{6}{G}{G}', 8, 'Creature — Dinosaur', 9, 9, [], ['G'], 'common'),
  // Multicolor & colorless
  C('Boros Swiftblade', '{R}{W}', 2, 'Creature — Human Soldier', 1, 2, ['Double strike'], ['R', 'W'], 'uncommon'),
  C('Skyknight Legionnaire', '{1}{R}{W}', 3, 'Creature — Human Knight', 2, 2, ['Flying', 'Haste'], ['R', 'W'], 'common'),
  C('Ornithopter', '{0}', 0, 'Artifact Creature — Thopter', 0, 2, ['Flying'], [], 'common'),
  C('Bronze Sable', '{3}', 3, 'Artifact Creature — Sable', 2, 1, [], [], 'common'),
];
export const REAL_SPELLS = [
  S('Shock', '{R}', 1, 'Instant', ['R'], 'common'),
  S('Lightning Bolt', '{R}', 1, 'Instant', ['R'], 'uncommon'),
  S('Flame Slash', '{R}', 1, 'Sorcery', ['R'], 'common'),
  S('Arc Lightning', '{2}{R}', 3, 'Sorcery', ['R'], 'uncommon'),
  S('Fireball', '{X}{R}', 1, 'Sorcery', ['R'], 'uncommon'),
  S('Giant Growth', '{G}', 1, 'Instant', ['G'], 'common'),
  S('Drain Life', '{1}{B}', 2, 'Sorcery', ['B'], 'common'),
  S('Infest', '{1}{B}{B}', 3, 'Sorcery', ['B'], 'uncommon'),
  S('Raise the Alarm', '{1}{W}', 2, 'Instant', ['W'], 'common'),
  S('Healing Hands', '{2}{W}', 3, 'Sorcery', ['W'], 'common'),
  S('Healing Salve', '{W}', 1, 'Instant', ['W'], 'common'),
  S('Feat of Resistance', '{1}{W}', 2, 'Instant', ['W'], 'common'),
  S('Frost Breath', '{2}{U}', 3, 'Instant', ['U'], 'common'),
];

/** Turn a pool entry into the same normalized record shape scryfall-adapter.normalizeCard() produces. */
export function poolRecord(e) {
  const keywordLine = e.spell ? '' : e.keywords.join(', ').replace(/(^|, )([A-Z])/g, (m, a, b) => a + (a ? b.toLowerCase() : b));
  return { source: 'scryfall', bundled: true, id: '', oracleId: '', name: e.name, manaCost: e.mana_cost, cmc: e.cmc, colors: e.color_identity.slice(),
    typeLine: e.type_line, power: e.spell ? null : e.power, toughness: e.spell ? null : e.toughness, keywords: e.keywords.slice(),
    oracleText: e.spell ? null : keywordLine, set: '', setName: '', rarity: e.rarity, artist: '', image: { normal: null, artCrop: null },
    scryfallUri: null, rulingsUri: null };
}
