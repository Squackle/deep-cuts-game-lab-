// Compatibility layer: converts a NORMALIZED Scryfall record into a playable GRAFTBOUND card, or rejects it
// with reasons. Nothing in Oracle text is ever executed.
import { KEYWORDS } from '../data/keywords.js';
import { getCard } from '../data/cards.js';

export const MTG_TO_GAME_KEYWORD = Object.fromEntries(Object.entries(KEYWORDS).filter(([, d]) => d.mtg).map(([id, d]) => [d.mtg.toLowerCase(), id]));
const KEYWORD_PARTS = { flying: 'wings', deathtouch: 'venom', trample: 'horns', firstStrike: 'blades', doubleStrike: 'claws', lifelink: 'tendrils', vigilance: 'antlers', haste: 'tail' };
/** Creature subtypes -> visual traits, so every grafted creature visibly changes the body. */
export const TYPE_PARTS = {
  Angel: ['wings', 'aura'], Bird: ['wings', 'beak'], Drake: ['wings', 'tail'], Dragon: ['wings', 'horns', 'tail'], Djinn: ['aura', 'eyes'], Thopter: ['wings'],
  Rat: ['tail'], Cat: ['claws', 'tail'], Bear: ['claws', 'bulk'], Beast: ['claws', 'bulk'], Dinosaur: ['horns', 'tail', 'bulk'], Thrull: ['claws', 'tendrils'],
  Wurm: ['tail', 'bulk'], Elephant: ['tusks', 'bulk'], Ox: ['horns', 'bulk'], Giant: ['bulk', 'armor'], Ogre: ['bulk', 'claws'], Unicorn: ['horns'],
  Snake: ['tail', 'venom'], Zombie: ['tendrils'], Elemental: ['aura', 'eyes'], Spirit: ['aura'], Sable: ['claws'],
  Vampire: ['tendrils', 'eyes'], Aetherborn: ['aura'], Goblin: ['claws'], Elf: ['moss'], Merfolk: ['eyes'], Wizard: ['eyes'], Centaur: ['armor'],
  Human: [], Soldier: ['armor'], Knight: ['armor', 'crown'], Kithkin: [], Warrior: ['armor'], Berserker: ['claws'], Shaman: ['eyes'],
};
const COLOR_MAP = { W: 'radiant', U: 'tide', B: 'umbral', R: 'ember', G: 'verdant' };

/** Explicit, reviewed spell adaptations: { effect template, number bonus, gem cost, vfx id, honest note }.
 *  v0.5 costs were raised because spells now reach the whole battlefield. */
export const SPELL_ADAPTATIONS = {
  'Shock':              { effect: 'ember_dart', cost: 1, vfx: 'shock',      note: 'Adapted: 2 damage to one foe anywhere on the battlefield.' },
  'Lightning Bolt':     { effect: 'ember_dart', bonus: 1, cost: 2, vfx: 'lightningBolt', note: 'Adapted: 3 damage to one foe anywhere on the battlefield (costs 2 gems here).' },
  'Flame Slash':        { effect: 'ember_dart', bonus: 2, cost: 3, vfx: 'flameSlash',  note: 'Adapted: 4 damage to one foe (costs 3 gems here).' },
  'Arc Lightning':      { effect: 'chain_lightning', bonus: -1, cost: 3, vfx: 'chain', note: 'Adapted: 2 damage, then 1 arcs to up to two nearby foes (the real card divides 3 damage).' },
  'Fireball':           { effect: 'starfall', cost: 4, vfx: 'fireball', note: 'Adapted: a fixed blast — 4 to the target tile and 2 to adjacent foes. X is not modeled.' },
  'Giant Growth':       { effect: 'sap_surge', cost: 1, vfx: 'growth',  note: 'Adapted: +3 power until end of turn (the toughness bonus is not modeled).' },
  'Drain Life':         { effect: 'soul_siphon', cost: 2, vfx: 'drain', note: 'Adapted: 2 damage to a foe and you heal that much. X is not modeled.' },
  'Infest':             { effect: 'venom_mist', cost: 2, vfx: 'poison', note: 'Adapted: Poison 2 to foes in a 3×3 area (instead of −2/−2 to all creatures).' },
  'Raise the Alarm':    { effect: 'call_sproutling', cost: 2, vfx: 'summon', note: 'Adapted: summon one 2/2 Soldier ally beside you for this battle (instead of two 1/1s).' },
  'Healing Hands':      { effect: 'mending_rain', cost: 2, vfx: 'heal',  note: 'Adapted: heal 4 and cleanse poison and weakness; card draw is not modeled.' },
  'Healing Salve':      { effect: 'mending_rain', bonus: -1, cost: 1, vfx: 'salve', note: 'Adapted: heal 3 and cleanse.' },
  'Feat of Resistance': { effect: 'barkskin', cost: 1, vfx: 'shield', note: 'Adapted: a 3-point shield; counters and protection are not modeled.' },
  'Frost Breath':       { effect: 'rootsnare', cost: 2, vfx: 'frost', note: 'Adapted: 1 damage and Stun one foe (one target, not two).' },
};

export const slug = name => String(name).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function stripReminder(t) { return t.replace(/\([^)]*\)/g, '').trim(); }

export function partsFor(kws, typeLine) {
  const parts = {};
  for (const k of Object.keys(kws)) if (KEYWORD_PARTS[k]) parts[KEYWORD_PARTS[k]] = 1;
  const subtypes = (typeLine.split('—')[1] || '').trim().split(/\s+/).filter(Boolean);
  for (const st of subtypes) for (const p of TYPE_PARTS[st] || []) parts[p] = parts[p] || 1;
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
  return { ok: true, card: { ...base, kind: 'spell', effect: ad.effect, bonus: ad.bonus || 0, cost: ad.cost ?? eff.cost, target: eff.target, range: eff.range, category: eff.category, text: eff.text, art: eff.art, vfx: ad.vfx, adaptationNote: ad.note } };
}
