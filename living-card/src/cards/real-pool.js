// Curated pool of REAL Magic: The Gathering cards used in "Real cards" mode.
// Only cards whose entire relevant rules text is modeled by THIS engine:
//   • creatures with no rules text except modeled keywords (Deathtouch, Flying, Trample, First strike,
//     Double strike, Lifelink, Vigilance, Haste) — or vanilla;
//   • spells listed in compatibility.js SPELL_ADAPTATIONS.
// Bundled: card FACTS only. Spell Oracle text and images are fetched read-only from Scryfall at runtime.
// Facts were entered from general knowledge and are VERIFIED AT RUNTIME against Scryfall (mismatches logged).
const C = (name, mana_cost, cmc, type_line, power, toughness, keywords, color_identity, rarity) =>
  ({ name, mana_cost, cmc, type_line, power: String(power), toughness: String(toughness), keywords, color_identity, rarity });
const S = (name, mana_cost, cmc, type_line, color_identity, rarity) => ({ name, mana_cost, cmc, type_line, keywords: [], color_identity, rarity, spell: true });

export const REAL_CREATURES = [
  C('Typhoid Rats', '{B}', 1, 'Creature — Rat', 1, 1, ['Deathtouch'], ['B'], 'common'),
  C("Pharika's Chosen", '{B}', 1, 'Creature — Snake', 1, 1, ['Deathtouch'], ['B'], 'common'),
  C('Child of Night', '{1}{B}', 2, 'Creature — Vampire', 2, 1, ['Lifelink'], ['B'], 'common'),
  C('Gifted Aetherborn', '{B}{B}', 2, 'Creature — Aetherborn Vampire', 2, 3, ['Deathtouch', 'Lifelink'], ['B'], 'uncommon'),
  C('Vampire Nighthawk', '{1}{B}{B}', 3, 'Creature — Vampire Shaman', 2, 3, ['Flying', 'Deathtouch', 'Lifelink'], ['B'], 'rare'),
  C('Savannah Lions', '{W}', 1, 'Creature — Cat', 2, 1, [], ['W'], 'common'),
  C('Glory Seeker', '{1}{W}', 2, 'Creature — Human Soldier', 2, 2, [], ['W'], 'common'),
  C('Silvercoat Lion', '{1}{W}', 2, 'Creature — Cat', 2, 2, [], ['W'], 'common'),
  C('Youthful Knight', '{1}{W}', 2, 'Creature — Human Knight', 2, 1, ['First strike'], ['W'], 'common'),
  C('Fencing Ace', '{1}{W}', 2, 'Creature — Human Soldier', 1, 1, ['Double strike'], ['W'], 'uncommon'),
  C('Mesa Unicorn', '{1}{W}', 2, 'Creature — Unicorn', 2, 2, ['Lifelink'], ['W'], 'common'),
  C('Serra Angel', '{3}{W}{W}', 5, 'Creature — Angel', 4, 4, ['Flying', 'Vigilance'], ['W'], 'uncommon'),
  C('Storm Crow', '{1}{U}', 2, 'Creature — Bird', 1, 2, ['Flying'], ['U'], 'common'),
  C('Wind Drake', '{2}{U}', 3, 'Creature — Drake', 2, 2, ['Flying'], ['U'], 'common'),
  C('Air Elemental', '{3}{U}{U}', 5, 'Creature — Elemental', 4, 4, ['Flying'], ['U'], 'uncommon'),
  C('Raging Goblin', '{R}', 1, 'Creature — Goblin Berserker', 1, 1, ['Haste'], ['R'], 'common'),
  C('Hill Giant', '{3}{R}', 4, 'Creature — Giant', 3, 3, [], ['R'], 'common'),
  C('Lightning Elemental', '{3}{R}', 4, 'Creature — Elemental', 4, 1, ['Haste'], ['R'], 'common'),
  C('Charging Monstrosaur', '{4}{R}', 5, 'Creature — Dinosaur', 5, 5, ['Trample', 'Haste'], ['R'], 'uncommon'),
  C('Grizzly Bears', '{1}{G}', 2, 'Creature — Bear', 2, 2, [], ['G'], 'common'),
  C('Elvish Warrior', '{G}{G}', 2, 'Creature — Elf Warrior', 2, 3, [], ['G'], 'common'),
  C('Gnarled Mass', '{1}{G}{G}', 3, 'Creature — Spirit', 3, 3, [], ['G'], 'common'),
  C('War Mammoth', '{3}{G}', 4, 'Creature — Elephant', 3, 3, ['Trample'], ['G'], 'common'),
  C('Rumbling Baloth', '{2}{G}{G}', 4, 'Creature — Beast', 4, 4, [], ['G'], 'common'),
  C('Craw Wurm', '{4}{G}{G}', 6, 'Creature — Wurm', 6, 4, [], ['G'], 'common'),
  C('Colossal Dreadmaw', '{4}{G}{G}', 6, 'Creature — Dinosaur', 6, 6, ['Trample'], ['G'], 'rare'),
  C('Boros Swiftblade', '{R}{W}', 2, 'Creature — Human Soldier', 1, 2, ['Double strike'], ['R', 'W'], 'uncommon'),
  C('Skyknight Legionnaire', '{1}{R}{W}', 3, 'Creature — Human Knight', 2, 2, ['Flying', 'Haste'], ['R', 'W'], 'uncommon'),
];
export const REAL_SPELLS = [
  S('Shock', '{R}', 1, 'Instant', ['R'], 'common'),
  S('Lightning Bolt', '{R}', 1, 'Instant', ['R'], 'uncommon'),
  S('Flame Slash', '{R}', 1, 'Sorcery', ['R'], 'common'),
  S('Giant Growth', '{G}', 1, 'Instant', ['G'], 'common'),
  S('Drain Life', '{1}{B}', 2, 'Sorcery', ['B'], 'common'),
  S('Raise the Alarm', '{1}{W}', 2, 'Instant', ['W'], 'common'),
  S('Healing Hands', '{2}{W}', 3, 'Sorcery', ['W'], 'common'),
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
