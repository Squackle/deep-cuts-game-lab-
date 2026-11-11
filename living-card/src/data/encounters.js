// Authored encounter tables by campaign depth. Layouts are generated per node seed.
export const ENCOUNTERS = {
  tutorial: [{ name: 'The Waking Glade', enemies: ['grub', 'grub'], rocks: 3, brambles: 2, leylines: 1 }],
  early: [
    { name: 'Hound Tracks',        enemies: ['hound', 'grub'],            rocks: 5, brambles: 3, leylines: 2 },
    { name: 'Moth-Lit Hollow',     enemies: ['moth', 'grub', 'grub'],     rocks: 4, brambles: 4, leylines: 2 },
    { name: 'Sentry Post',         enemies: ['archer', 'grub'],           rocks: 6, brambles: 2, leylines: 2 },
  ],
  mid: [
    { name: 'Thornbow Crossing',   enemies: ['archer', 'hound', 'grub'],  rocks: 6, brambles: 3, leylines: 2 },
    { name: 'Cairn of Wardens',    enemies: ['tortoise', 'hound', 'moth'],rocks: 5, brambles: 3, leylines: 2 },
    { name: 'The Pack Gathers',    enemies: ['hound', 'hound', 'moth'],   rocks: 5, brambles: 4, leylines: 2 },
    { name: 'Hexer\u2019s Circle',  enemies: ['hexer', 'hound', 'grub'],  rocks: 5, brambles: 3, leylines: 2 },
  ],
  late: [
    { name: 'Bastion Ruins',       enemies: ['tortoise', 'archer', 'archer', 'grub'], rocks: 7, brambles: 3, leylines: 2 },
    { name: 'Gloaming Swarm',      enemies: ['moth', 'moth', 'hound', 'hound'],       rocks: 5, brambles: 4, leylines: 2 },
    { name: 'Shieldwall',          enemies: ['tortoise', 'hound', 'archer', 'moth'],  rocks: 6, brambles: 3, leylines: 2 },
    { name: 'The Witch Ring',      enemies: ['hexer', 'tortoise', 'hound', 'archer'], rocks: 6, brambles: 3, leylines: 2 },
  ],
  elite: [
    { name: 'Den of the Alpha',    enemies: ['alpha', 'hound'],           rocks: 5, brambles: 3, leylines: 2 },
    { name: 'The Alpha\u2019s Sentries', enemies: ['alpha', 'archer', 'moth'], rocks: 6, brambles: 2, leylines: 2 },
    { name: 'Gloam Coven',         enemies: ['alpha', 'hexer'],           rocks: 5, brambles: 3, leylines: 2 },
  ],
  boss: [{ name: 'Heart of the Hollow', enemies: ['thornmother', 'hound', 'archer'], rocks: 4, brambles: 4, leylines: 2, boss: true }],
};

/** Reinforcement pools by depth (see engine/encounters.js reinforcements()). */
export const REINFORCEMENTS = { early: ['grub', 'hound'], mid: ['hound', 'moth', 'archer'], late: ['hound', 'hexer', 'archer', 'moth'] };
