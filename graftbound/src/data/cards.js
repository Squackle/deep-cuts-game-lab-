// LEGACY original cards from v0.1–v0.4 (fictional, original to this project).
// v0.5: these are NEVER offered as rewards. They remain resolvable so v0.4 saves that already grafted
// or inscribed them keep working unchanged (see engine/save.js migration 2->3 and DECISIONS_AND_RISKS.md).
// The SPELLS below also serve as the mechanical EFFECT TEMPLATES that real-card spell adaptations reuse.
export const RARITY = {
  common:   { name: 'Common',   weight: 60, gem: '#9aa39a' },
  uncommon: { name: 'Uncommon', weight: 28, gem: '#7fb7c9' },
  rare:     { name: 'Rare',     weight: 10, gem: '#d9b45a' },
  mythic:   { name: 'Mythic',   weight: 3,  gem: '#e0703a' },
};
const L = { legacy: true };
export const CREATURES = [
  { id: 'nightcap_toad',      name: 'Nightcap Toad',       type: 'Toad',     rarity: 'common',   color: 'umbral',  power: 2, toughness: 2, keywords: { deathtouch: 1 }, parts: { venom: 1 }, art: 'toad', flavor: 'Its spots are a warning nobody reads twice.' },
  { id: 'mossback_brute',     name: 'Mossback Brute',      type: 'Ogre',     rarity: 'common',   color: 'verdant', power: 2, toughness: 3, keywords: { regenerate: 1 }, parts: { moss: 1, bulk: 1 }, art: 'brute', flavor: 'Wounds close over with lichen by morning.' },
  { id: 'ridgehorn_boar',     name: 'Ridgehorn Boar',      type: 'Boar',     rarity: 'common',   color: 'ember',   power: 2, toughness: 1, keywords: { trample: 1, haste: 1 }, parts: { tusks: 1 }, art: 'boar', flavor: 'It has never once considered stopping.' },
  { id: 'ashwing_kestrel',    name: 'Ashwing Kestrel',     type: 'Bird',     rarity: 'common',   color: 'radiant', power: 1, toughness: 1, keywords: { flying: 1 }, parts: { wings: 1 }, art: 'bird', flavor: 'Born in the updraft of a burning field.' },
  { id: 'bloodmoss_leech',    name: 'Bloodmoss Leech',     type: 'Leech',    rarity: 'common',   color: 'umbral',  power: 1, toughness: 2, keywords: { lifelink: 1 }, parts: { tendrils: 1 }, art: 'leech', flavor: 'Patient. Grateful. Thirsty.' },
  { id: 'cairnshell_tortoise',name: 'Cairnshell Tortoise', type: 'Tortoise', rarity: 'common',   color: 'tide',    power: 0, toughness: 4, keywords: { ward: 2 }, parts: { shell: 1 }, art: 'tortoise', flavor: 'Travelers stack stones on it for luck. It allows this.' },
  { id: 'longneck_heron',     name: 'Longneck Heron',      type: 'Bird',     rarity: 'common',   color: 'tide',    power: 1, toughness: 2, keywords: { reach: 1 }, parts: { beak: 1 }, art: 'heron', flavor: 'Strikes from farther than fish believe possible.' },
  { id: 'briarback_hedgehog', name: 'Briarback Hedgehog',  type: 'Beast',    rarity: 'common',   color: 'verdant', power: 1, toughness: 3, keywords: { spines: 2 }, parts: { spikes: 1 }, art: 'hedgehog', flavor: 'Hugging it is a lesson learned once.' },
  { id: 'glassblade_mantis',  name: 'Glassblade Mantis',   type: 'Insect',   rarity: 'uncommon', color: 'verdant', power: 2, toughness: 1, keywords: { firstStrike: 1 }, parts: { blades: 1 }, art: 'mantis', flavor: 'The prayer is for you.' },
  { id: 'sentinel_stag',      name: 'Sentinel Stag',       type: 'Elk',      rarity: 'uncommon', color: 'radiant', power: 2, toughness: 2, keywords: { vigilance: 1 }, parts: { antlers: 1 }, art: 'stag', flavor: 'It watches the treeline long after the hunt has passed.' },
  { id: 'galecrest_roc',      name: 'Galecrest Roc',       type: 'Bird',     rarity: 'uncommon', color: 'radiant', power: 3, toughness: 2, keywords: { flying: 1 }, parts: { wings: 1 }, art: 'roc', flavor: 'Its shadow arrives a full breath before it does.' },
  { id: 'hollow_owl',         name: 'Hollow Owl',          type: 'Bird',     rarity: 'uncommon', color: 'tide',    power: 0, toughness: 1, keywords: { flying: 1, attuned: 1 }, parts: { wings: 1, eyes: 1 }, art: 'owl', flavor: 'There is starlight where its heart should be.' },
  { id: 'inkwell_wisp',       name: 'Inkwell Wisp',        type: 'Spirit',   rarity: 'uncommon', color: 'umbral',  power: 0, toughness: 1, keywords: { arcane: 2 }, parts: { aura: 1, eyes: 1 }, art: 'wisp', flavor: 'Spilled from the margin of a forbidden book.' },
  { id: 'sable_adder',        name: 'Sable Adder',         type: 'Serpent',  rarity: 'rare',     color: 'umbral',  power: 1, toughness: 1, keywords: { deathtouch: 1, firstStrike: 1 }, parts: { tail: 1, venom: 1 }, art: 'adder', flavor: 'You will not see it. That is the point.' },
  { id: 'twinfang_lynx',      name: 'Twinfang Lynx',       type: 'Cat',      rarity: 'rare',     color: 'ember',   power: 1, toughness: 2, keywords: { doubleStrike: 1 }, parts: { claws: 1, tail: 1 }, art: 'lynx', flavor: 'One pounce. Two wounds.' },
  { id: 'deeproot_wyrm',      name: 'Deeproot Wyrm',       type: 'Wyrm',     rarity: 'rare',     color: 'verdant', power: 3, toughness: 3, keywords: { trample: 1, regenerate: 1 }, parts: { horns: 1, tail: 1, moss: 1, bulk: 1 }, art: 'wyrm', flavor: 'The forest floor is its skin.' },
  { id: 'thousandscale_drake',name: 'Thousandscale Drake', type: 'Dragon',   rarity: 'mythic',   color: 'ember',   power: 3, toughness: 3, keywords: { flying: 1, ward: 2 }, parts: { wings: 1, horns: 1, tail: 1, crown: 1 }, art: 'drake', flavor: 'Each scale was once a knight\u2019s shield.' },
].map(c => ({ ...c, ...L }));

// Effect templates. target = enemy | self | tile | empty. `range` now applies ONLY to 'empty' targets
// (movement / summon placement). v0.5: offensive and area spells reach the whole battlefield, no line of sight.
export const SPELLS = [
  { id: 'ember_dart',     name: 'Ember Dart',     rarity: 'common',   color: 'ember',   cost: 1, target: 'enemy', art: 'flame',  category: 'damage',     text: 'Deal {2} damage to a foe anywhere on the battlefield.' },
  { id: 'barkskin',       name: 'Barkskin',       rarity: 'common',   color: 'verdant', cost: 1, target: 'self',  art: 'shield', category: 'protection', text: 'Gain {3} shield for this battle.' },
  { id: 'sap_surge',      name: 'Sap Surge',      rarity: 'common',   color: 'verdant', cost: 1, target: 'self',  art: 'sap',    category: 'enhance',    text: '+{3} power until end of turn.' },
  { id: 'gale_push',      name: 'Gale Push',      rarity: 'common',   color: 'tide',    cost: 1, target: 'enemy', art: 'wind',   category: 'control',    text: 'Push a foe 2 tiles away from you. If it collides, it and what it hits take {2}.' },
  { id: 'blink_step',     name: 'Blink Step',     rarity: 'uncommon', color: 'tide',    cost: 1, target: 'empty', range: 3, art: 'swirl',  category: 'movement',   text: 'Teleport to an empty tile up to {3} away.' },
  { id: 'rootsnare',      name: 'Rootsnare',      rarity: 'uncommon', color: 'verdant', cost: 2, target: 'enemy', art: 'root',   category: 'disable',    text: 'Deal {1} and Stun a foe: it loses its next action.' },
  { id: 'venom_mist',     name: 'Venom Mist',     rarity: 'uncommon', color: 'umbral',  cost: 2, target: 'tile',  art: 'mist',   category: 'area',       text: 'Poison {2} to foes in a 3×3 area.' },
  { id: 'mending_rain',   name: 'Mending Rain',   rarity: 'uncommon', color: 'tide',    cost: 2, target: 'self',  art: 'rain',   category: 'healing',    text: 'Heal {4} and cleanse poison and weakness.' },
  { id: 'soul_siphon',    name: 'Soul Siphon',    rarity: 'uncommon', color: 'umbral',  cost: 2, target: 'enemy', art: 'siphon', category: 'damage',     text: 'Deal {2} damage and heal that much.' },
  { id: 'call_sproutling',name: 'Call Sproutling',rarity: 'uncommon', color: 'verdant', cost: 2, target: 'empty', range: 2, art: 'sprout', category: 'summon',     text: 'Summon a {2}/{2} ally beside you for this battle. It fights foes on its own.' },
  { id: 'chain_lightning',name: 'Chain Lightning',rarity: 'rare',     color: 'ember',   cost: 3, target: 'enemy', art: 'bolt',   category: 'damage',     text: 'Deal {3}, then {2} leaps to up to two nearby foes.' },
  { id: 'starfall',       name: 'Starfall',       rarity: 'rare',     color: 'radiant', cost: 4, target: 'tile',  art: 'star',   category: 'area',       text: 'Deal {4} to a tile and {2} to adjacent foes.' },
].map(c => ({ ...c, ...L }));

export const ALL_CARDS = [...CREATURES.map(c => ({ ...c, kind: 'creature' })), ...SPELLS.map(s => ({ ...s, kind: 'spell' }))];
export const CARD_BY_ID = Object.fromEntries(ALL_CARDS.map(c => [c.id, c]));
export const getCard = id => CARD_BY_ID[id];
