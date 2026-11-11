// Compatibility layer: converts a NORMALIZED Scryfall record into a playable card for THIS game, or
// rejects it with reasons. Nothing in Oracle text is ever executed.
// Creatures: eligible iff power/toughness are integers, every keyword maps to a modeled keyword, and the
// Oracle text contains nothing but those keyword lines. Spells: only via reviewed SPELL_ADAPTATIONS.
import { KEYWORDS } from '../data/keywords.js';
import { getCard } from '../data/cards.js';

export const MTG_TO_GAME_KEYWORD = Object.fromEntries(Object.entries(KEYWORDS).filter(([, d]) => d.mtg).map(([id, d]) => [d.mtg.toLowerCase(), id]));
const KEYWORD_PARTS = { flying: 'wings', deathtouch: 'venom', trample: 'horns', firstStrike: 'blades', doubleStrike: 'claws', lifelink: 'tendrils', vigilance: 'antlers', haste: 'tail' };
/** Creature subtypes -> visual traits, so every absorbed real creature visibly changes the body. */
export const TYPE_PARTS = {
  Angel: ['wings', 'aura'], Bird: ['wings', 'beak'], Drake: ['wings', 'tail'], Dragon: ['wings', 'horns', 'tail'], Bat: ['wings'],
  Rat: ['tail'], Cat: ['claws', 'tail'], Bear: ['claws', 'bulk'], Beast: ['claws', 'bulk'], Dinosaur: ['horns', 'tail', 'bulk'],
  Wurm: ['tail', 'bulk'], Elephant: ['tusks', 'bulk'], Boar: ['tusks'], Giant: ['bulk', 'armor'], Unicorn: ['horns'],
  Snake: ['tail', 'venom'], Serpent: ['tail'], Spider: ['eyes'], Insect: ['blades'], Elemental: ['aura', 'eyes'], Spirit: ['aura'],
  Vampire: ['tendrils', 'eyes'], Aetherborn: ['aura'], Goblin: ['claws'], Elf: ['moss'], Human: [], Soldier: ['armor'], Knight: ['armor', 'crown'],
  Warrior: ['armor'], Berserker: ['claws'], Shaman: ['eyes'],
};
const COLOR_MAP = { W: 'radiant', U: 'tide', B: 'umbral', R: 'ember', G: 'verdant' };

/** Explicit, reviewed spell adaptations. The game effect is OUR mechanic; `note` is shown on the card. */
export const SPELL_ADAPTATIONS = {
  'Shock':              { effect: 'ember_dart',      note: 'Adapted as a 2-damage ranged bolt at one foe.' },
  'Lightning Bolt':     { effect: 'ember_dart', bonus: 1, note: 'Adapted as a 3-damage ranged bolt at one foe.' },
  'Flame Slash':        { effect: 'ember_dart', bonus: 2, cost: 2, note: 'Adapted as a 4-damage bolt at one foe (costs 2 gems here).' },
  'Giant Growth':       { effect: 'sap_surge',       note: 'Adapted as +3 power until end of turn (the toughness bonus is not modeled).' },
  'Drain Life':         { effect: 'soul_siphon',     note: 'Adapted as a fixed 3-damage drain that heals you; X is not modeled.' },
  'Raise the Alarm':    { effect: 'call_sproutling', note: 'Adapted as summoning one 2/2 ally for this battle.' },
  'Healing Hands':      { effect: 'mending_rain',    note: 'Adapted as healing 5 and cleansing poison; card draw is not modeled.' },
  'Feat of Resistance': { effect: 'barkskin',        note: 'Adapted as a 3-point shield; counters and protection are not modeled.' },
  'Frost Breath':       { effect: 'rootsnare',       note: 'Adapted as 1 damage + stun on one foe (one target, not two).' },
};

export const slug = name => String(name).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function stripReminder(t) { return t.replace(/\([^)]*\)/g, '').trim(); }

export function partsFor(kws, typeLine) {
  const parts = {};
  for (const k of Object.keys(kws)) if (KEYWORD_PARTS[k]) parts[KEYWORD_PARTS[k]] = 1;
  const subtypes = (typeLine.split('—')[1] || '').trim().split(/\s+/).filter(Boolean);
  for (const st of subtypes) for (const p of TYPE_PARTS[st] || []) parts[p] = (parts[p] || 0) + (parts[p] ? 0 : 1);
  if (!Object.keys(parts).length) parts.bulk = 1;
  return parts;
}

export function toGameCard(sf) {
  const reasons = [];
  if (!sf || sf.source !== 'scryfall') return { ok: false, reasons: ['not a normalized Scryfall record'] };
  const isCreature = /\bCreature\b/.test(sf.typeLine);
  const base = { id: 'mtg:' + slug(sf.name), reference: true, name: sf.name, rarity: sf.rarity, color: COLOR_MAP[sf.colors[0]] || 'radiant',
    mv: typeof sf.cmc === 'number' ? sf.cmc : null,
    sourceInfo: { manaCost: sf.manaCost, typeLine: sf.typeLine, oracleText: sf.oracleText, set: sf.set, setName: sf.setName, scryfallUri: sf.scryfallUri, image: sf.image, keywords: sf.keywords, artist: sf.artist || '', bundled: !!sf.bundled } };
  if (isCreature) {
    if (sf.power == null || sf.toughness == null) reasons.push('non-numeric power/toughness');
    const kws = {};
    for (const k of sf.keywords) { const g = MTG_TO_GAME_KEYWORD[k.toLowerCase()]; if (g) kws[g] = 1; else reasons.push('unsupported keyword: ' + k); }
    if (sf.oracleText != null) {
      const lines = stripReminder(sf.oracleText).split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        const parts = line.split(/,\s*/).map(p => p.trim().toLowerCase());
        if (!parts.every(p => MTG_TO_GAME_KEYWORD[p] && sf.keywords.some(k => k.toLowerCase() === p))) reasons.push('unmodeled rules text: "' + line.slice(0, 60) + '"');
      }
    }
    if (reasons.length) return { ok: false, reasons };
    const type = (sf.typeLine.split('—')[1] || 'Creature').trim();
    return { ok: true, card: { ...base, kind: 'creature', type, power: +sf.power, toughness: +sf.toughness, keywords: kws, parts: partsFor(kws, sf.typeLine), art: null, flavor: '' } };
  }
  const ad = SPELL_ADAPTATIONS[sf.name];
  if (!ad) return { ok: false, reasons: ['spell has no reviewed adaptation'] };
  const eff = getCard(ad.effect);
  return { ok: true, card: { ...base, kind: 'spell', effect: ad.effect, bonus: ad.bonus || 0, cost: ad.cost || eff.cost, target: eff.target, range: eff.range, los: eff.los, category: eff.category, text: eff.text, art: eff.art, adaptationNote: ad.note } };
}
