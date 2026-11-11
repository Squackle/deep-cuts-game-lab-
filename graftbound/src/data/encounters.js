// Authored encounter tables per act (v0.5). Layouts are generated per node seed. Hazards: lava (Act II),
// rifts (Act III). leylines grant +1 mana.
const E = (name, enemies, o = {}) => ({ name, enemies, rocks: 5, brambles: 2, leylines: 2, lava: 0, rifts: 0, crystals: 0, ...o });
export const ACTS = [
  { id: 'hollow', name: 'The Forgotten Hollow', boss: 'The Thornmother', theme: 'hollow', music: 0,
    tutorial: [E('The Waking Glade', ['grub', 'grub'], { rocks: 3, leylines: 1 })],
    early: [E('Hound Tracks', ['hound', 'grub']), E('Moth-Lit Hollow', ['moth', 'grub', 'grub'], { brambles: 4 }), E('Sentry Post', ['archer', 'grub'], { rocks: 6 })],
    mid: [E('Thornbow Crossing', ['archer', 'hound', 'grub'], { rocks: 6 }), E('Cairn of Wardens', ['tortoise', 'hound', 'moth']), E('The Pack Gathers', ['hound', 'hound', 'moth'], { brambles: 4 }), E('Hexer\u2019s Circle', ['hexer', 'hound', 'grub'])],
    late: [E('Bastion Ruins', ['tortoise', 'archer', 'archer', 'grub'], { rocks: 7 }), E('Gloaming Swarm', ['moth', 'moth', 'hound', 'hound'], { brambles: 4 }), E('The Witch Ring', ['hexer', 'tortoise', 'hound', 'archer'], { rocks: 6 })],
    elite: [E('Den of the Alpha', ['alpha', 'hound', 'hound']), E('The Alpha\u2019s Sentries', ['alpha', 'archer', 'moth']), E('Gloam Coven', ['alpha', 'hexer', 'tortoise'])],
    boss: [E('Heart of the Hollow', ['thornmother', 'hound', 'archer'], { rocks: 4, brambles: 4, crystals: 1, boss: true })] },
  { id: 'warrens', name: 'The Ashen Warrens', boss: 'The Pyre Matron', theme: 'warrens', music: 1,
    early: [E('Cinder Run', ['cinderling', 'cinderling', 'grub'], { lava: 3, brambles: 0 }), E('Harpoon Ledge', ['harpooner', 'cinderling'], { lava: 2, rocks: 6, brambles: 0 }), E('Brute Gate', ['ashbrute', 'hound'], { lava: 3, brambles: 0 })],
    mid: [E('Seer\u2019s Kiln', ['emberseer', 'cinderling', 'ashbrute'], { lava: 4, brambles: 0, crystals: 1 }), E('Ash Pack', ['hound', 'hound', 'harpooner'], { lava: 3, brambles: 1 }), E('Slag Choir', ['emberseer', 'emberseer', 'cinderling'], { lava: 4, brambles: 0 }), E('Iron Line', ['ashbrute', 'ashbrute', 'harpooner'], { lava: 3, rocks: 6, brambles: 0 })],
    late: [E('The Smelting Floor', ['ashbrute', 'emberseer', 'cinderling', 'harpooner'], { lava: 5, brambles: 0 }), E('Burning Swarm', ['cinderling', 'cinderling', 'cinderling', 'emberseer'], { lava: 4, brambles: 0 }), E('Watch of Hooks', ['harpooner', 'harpooner', 'ashbrute', 'hexer'], { lava: 3, rocks: 7, brambles: 0 })],
    elite: [E('Champion\u2019s Pit', ['champion', 'cinderling', 'cinderling', 'harpooner'], { lava: 4, brambles: 0 }), E('Obsidian Vigil', ['champion', 'emberseer', 'harpooner', 'ashbrute'], { lava: 3, brambles: 0 })],
    boss: [E('The Pyre Throne', ['matron', 'harpooner', 'cinderling'], { lava: 5, rocks: 3, brambles: 0, crystals: 1, boss: true })] },
  { id: 'nexus', name: 'The Fractured Nexus', boss: 'The Unwritten', theme: 'nexus', music: 2,
    early: [E('Broken Threshold', ['riftstalker', 'shardling'], { crystals: 2, rifts: 3, brambles: 0 }), E('Null Gate', ['nullwarden', 'shardling', 'cinderling'], { crystals: 2, rifts: 2, brambles: 0 }), E('Shard Storm', ['shardling', 'shardling', 'harpooner'], { crystals: 2, rifts: 3, brambles: 0 })],
    mid: [E('Stalker Hall', ['riftstalker', 'riftstalker', 'nullwarden'], { crystals: 2, rifts: 3, brambles: 0 }), E('Echo Garden', ['nullwarden', 'emberseer', 'shardling', 'hound'], { crystals: 2, rifts: 3, brambles: 0 }), E('Unmade Battery', ['ashbrute', 'shardling', 'hexer', 'riftstalker'], { crystals: 2, rifts: 4, brambles: 0 })],
    late: [E('The Torn Atlas', ['riftstalker', 'nullwarden', 'emberseer', 'harpooner'], { crystals: 2, rifts: 4, brambles: 0 }), E('Mirror Swarm', ['shardling', 'shardling', 'riftstalker', 'cinderling', 'hexer'], { crystals: 2, rifts: 4, brambles: 0 }), E('Silent Bastion', ['nullwarden', 'nullwarden', 'ashbrute', 'shardling'], { crystals: 2, rifts: 3, rocks: 7, brambles: 0 })],
    elite: [E('Sentinel Spire', ['sentinel', 'shardling', 'shardling', 'riftstalker'], { crystals: 2, rifts: 3, brambles: 0 }), E('The Last Vigil', ['sentinel', 'riftstalker', 'nullwarden', 'emberseer'], { crystals: 2, rifts: 3, brambles: 0 })],
    boss: [E('The Blank Page', ['unwritten', 'nullwarden', 'shardling'], { crystals: 2, rifts: 4, rocks: 3, brambles: 0, boss: true })] },
];
/** Reinforcement pools per act (see engine/encounters.js reinforcements()). */
export const REINFORCEMENTS = [['grub', 'hound', 'moth'], ['cinderling', 'harpooner', 'hound'], ['shardling', 'riftstalker', 'cinderling']];
