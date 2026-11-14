// Compatibility layer: converts a NORMALIZED Scryfall record into a playable GRAFTBOUND card, or rejects it
// with reasons. Nothing in Oracle text is ever executed.
import { KEYWORDS } from '../data/keywords.js';
import { getCard } from '../data/cards.js';
import { ATTACHMENT_BY_NAME } from './attachments.js';
import { traitOf } from './trait-registry.js';

export const MTG_TO_GAME_KEYWORD = Object.fromEntries(Object.entries(KEYWORDS).filter(([, d]) => d.mtg).map(([id, d]) => [d.mtg.toLowerCase(), id]));
const KEYWORD_PARTS = { flying: 'wings', deathtouch: 'venom', trample: 'horns', firstStrike: 'blades', doubleStrike: 'claws', lifelink: 'tendrils', vigilance: 'antlers', haste: 'tail' };
/** Creature subtypes -> visual traits, so every grafted creature visibly changes the body. */
export const TYPE_PARTS = {
  Angel: ['wings', 'aura'], Bird: ['wings', 'beak'], Drake: ['wings', 'tail'], Dragon: ['wings', 'horns', 'tail'], Djinn: ['aura', 'eyes'], Thopter: ['wings'],
  Rat: ['tail'], Cat: ['claws', 'tail'], Bear: ['claws', 'bulk'], Beast: ['claws', 'bulk'], Dinosaur: ['horns', 'tail', 'bulk'], Thrull: ['claws', 'tendrils'],
  Wurm: ['tail', 'bulk'], Elephant: ['tusks', 'bulk'], Ox: ['horns', 'bulk'], Giant: ['bulk', 'armor'], Ogre: ['bulk', 'claws'], Unicorn: ['horns'],
  Snake: ['tail', 'venom'], Zombie: ['tendrils'], Elemental: ['aura', 'eyes'], Spirit: ['aura'], Sable: ['claws'],
  Vampire: ['tendrils', 'eyes'], Aetherborn: ['aura'], Goblin: ['claws'], Elf: ['moss'], Merfolk: ['eyes'], Wizard: ['eyes'], Centaur: ['armor'],
  Cleric: ['aura'], Pegasus: ['wings'], Horse: ['bulk'], Illusion: ['aura'], Crocodile: ['claws', 'tail'], Scorpion: ['venom', 'tail'], Minotaur: ['horns'],
  Human: [], Soldier: ['armor'], Knight: ['armor', 'crown'], Kithkin: [], Warrior: ['armor'], Berserker: ['claws'], Shaman: ['eyes'],
};
const COLOR_MAP = { W: 'radiant', U: 'tide', B: 'umbral', R: 'ember', G: 'verdant' };

// Scryfall includes ability words such as Magecraft in its keywords metadata,
// even though Magic rules 207.2c gives them no standalone gameplay meaning.
// Permit only specifically reviewed, implemented traits; never grant a generic keyword.
export function isReviewedAbilityWord(name, word) {
  return name === 'Archmage Emeritus' && String(word).toLowerCase() === 'magecraft' && traitOf(name)?.id === 'archmage';
}


/** Explicit, reviewed spell adaptations: { effect template, number bonus, gem cost, vfx id, honest note }.
 *  v0.5 costs were raised because spells now reach the whole battlefield. */
export const SPELL_ADAPTATIONS = {
  'Shock':              { effect: 'ember_dart', cost: 1, vfx: 'shock',      note: 'Adapted: 2 damage to one foe anywhere on the battlefield.' },
  'Lightning Bolt':     { effect: 'ember_dart', bonus: 1, cost: 2, vfx: 'lightningBolt', note: 'Adapted: 3 damage to one foe anywhere on the battlefield (costs 2 gems here).' },
  'Flame Slash':        { effect: 'ember_dart', bonus: 2, cost: 3, vfx: 'flameSlash',  note: 'Adapted: 4 damage to one foe (costs 3 gems here).' },
  'Arc Lightning':      { effect: 'chain_lightning', bonus: -1, cost: 3, vfx: 'chain', note: 'Adapted: 2 damage, then 1 arcs to up to two other foes anywhere (the real card divides 3 damage).' },
  'Fireball':           { effect: 'starfall', cost: 4, vfx: 'fireball', note: 'Adapted: a fixed blast — 4 to the target tile and 2 to adjacent foes. X is not modeled.' },
  'Giant Growth':       { effect: 'sap_surge', cost: 1, vfx: 'growth',  note: 'Adapted: give target creature exactly +3/+3 until end of turn, following printed numbers.' },
  'Drain Life':         { effect: 'soul_siphon', cost: 2, vfx: 'drain', note: 'Adapted: choose X at cast time (1–available mana); pay 2 + X mana, deal X damage and heal the actual health removed. Black-mana restriction is not modeled.', text: 'Choose X: pay 2 + X mana, deal X damage to a foe, heal damage dealt.' },
  'Infest':             { effect: 'venom_mist', cost: 2, vfx: 'poison', note: 'Adapted: Poison 2 to foes in a 3×3 area (instead of −2/−2 to all creatures).' },
  'Raise the Alarm':    { effect: 'call_sproutling', cost: 2, vfx: 'summon', note: 'Adapted: create two separate 1/1 white Soldier creature tokens on empty nearby tiles; they remain for this battle.', text: 'Create two 1/1 white Soldier creature tokens on two empty nearby tiles.' },
  'Healing Hands':      { effect: 'mending_rain', cost: 2, vfx: 'heal',  note: 'Adapted: heal 4 and cleanse poison and weakness; card draw is not modeled.' },
  'Healing Salve':      { effect: 'mending_rain', bonus: -1, cost: 1, vfx: 'salve', note: 'Adapted: heal 3 and cleanse.' },
  'Feat of Resistance': { effect: 'barkskin', cost: 1, vfx: 'shield', note: 'Adapted: give one friendly creature 3 shield; counters and protection are not modeled.' },
  'Frost Breath':       { effect: 'rootsnare', cost: 2, vfx: 'frost', note: 'Adapted: 1 damage and Stun one foe (one target, not two).' },
  // v0.8 additions — each fills a role the first 13 did not cover.
  'Disfigure':          { effect: 'wither', cost: 1, vfx: 'disfigure', note: 'Adapted: −2/−2 becomes 1 damage plus Weaken 2 (the foe strikes for 2 less on its next action).' },
  'Titanic Growth':     { effect: 'sap_surge', bonus: 1, cost: 2, vfx: 'titanic', note: 'Adapted: give target creature exactly +4/+4 until end of turn, following printed numbers.' },
  'Snakeskin Veil':    { effect: 'barkskin', bonus: -1, cost: 1, vfx: 'snakeskin', note: 'Adapted: give one friendly creature 2 shield for this battle. Hexproof and the permanent +1/+1 counter are not modeled.' },
  'Pyroclasm':          { effect: 'firestorm', cost: 3, vfx: 'pyroclasm', note: 'Adapted: 2 damage to every foe (it never damages you or your allies here).' },
  'Lightning Strike':   { effect: 'ember_dart', bonus: 1, cost: 2, vfx: 'strikeBolt', note: 'Adapted: 3 damage to one target anywhere.' },
  'Murder':             { effect: 'ember_dart', bonus: 3, cost: 3, vfx: 'murder', note: 'Adapted: 5 void damage, not unrestricted destroy (Legendary Vitality still applies).' },
  'Revitalize':         { effect: 'mending_rain', bonus: -1, cost: 2, vfx: 'revitalize', note: 'Adapted: heal 3 and cleanse; printed card draw is not modeled.' },
  'Divination':         { effect: 'page_draw', cost: 3, vfx: 'divination', note: 'Adapted: draw two cards from your encounter library; has no effect outside deck mode.' },
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
    for (const k of sf.keywords) {
      const g = MTG_TO_GAME_KEYWORD[k.toLowerCase()];
      if (g) kws[g] = 1;
      else if (!isReviewedAbilityWord(sf.name, k)) reasons.push('unsupported keyword: ' + k);
    }
    if (sf.oracleText != null) {
      const lines = stripReminder(sf.oracleText).split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (traitOf(sf.name)) continue; // Printed text has a reviewed, disclosed tactical adaptation below.
        const parts = line.split(/,\s*/).map(p => p.trim().toLowerCase());
        if (!parts.every(p => MTG_TO_GAME_KEYWORD[p] && sf.keywords.some(k => k.toLowerCase() === p))) reasons.push('unmodeled rules text: "' + line.slice(0, 60) + '"');
      }
    }
    if (reasons.length) return { ok: false, reasons };
    const type = (sf.typeLine.split('—')[1] || 'Creature').trim();
    return { ok: true, card: { ...base, trait: traitOf(sf.name)?.id || null, adaptationNote: traitOf(sf.name)?.note || '', kind: 'creature', type, power: +sf.power, toughness: +sf.toughness, keywords: kws, parts: partsFor(kws, sf.typeLine), art: null, flavor: '' } };
  }
  const special = ATTACHMENT_BY_NAME[sf.name] || Object.entries(ATTACHMENT_BY_NAME).find(([name]) => name.toLowerCase() === sf.name.toLowerCase())?.[1];
  if(special){
    return { ok:true, card: {...base,kind:special.kind,effect:special.kind,cost:special.cmc,equipCost:special.equip||0,
      target:special.target||'self',category:special.kind,text:special.oracle,keywords:Object.fromEntries(special.keywords.map(k=>[k,1])),
      powerBonus:special.pt[0],toughnessBonus:special.pt[1],moveBonus:special.move||0,
      oneLevel:special.kind==='aura',adaptationNote:special.adaptation,art:special.kind==='equipment'?'shield':'swirl',vfx:'shield'} };
  }
  const ad = SPELL_ADAPTATIONS[sf.name];
  if (!ad) return { ok: false, reasons: ['spell has no reviewed adaptation'] };
  const eff = getCard(ad.effect);
  return { ok: true, card: { ...base, kind: 'spell', effect: ad.effect, bonus: ad.bonus || 0, cost: ad.cost ?? eff.cost, target: ['Giant Growth','Titanic Growth'].includes(sf.name)?'creature':eff.target, range: eff.range, category: eff.category, text: ad.text || eff.text, art: eff.art, vfx: ad.vfx, adaptationNote: ad.note } };
}
