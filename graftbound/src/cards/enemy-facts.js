/** Curated real Magic identities for every ordinary / Elite GRAFTBOUND encounter.
 * Printed power/toughness is authoritative. Original art and encounter tile layout remain original.
 * Encounter tactics are not silently attributed to the printed card. */
export const ENEMY_FACTS = Object.freeze({
  grub: { name:'Caustic Caterpillar', power:1, toughness:1, ai:'caterpillar', tribe:'Insect', mana_cost:'{G}', oracle:'{1}{G}, Sacrifice this creature: Destroy target artifact or enchantment.', keywords:{} },
  hound: { name:'Timberpack Wolf', power:2, toughness:2, ai:'flanker', tribe:'Wolf', mana_cost:'{1}{G}', oracle:'Timberpack Wolf gets +1/+1 for each other creature named Timberpack Wolf you control.', keywords:{} },
  archer: { name:'Elvish Archers', power:2, toughness:1, ai:'archer', tribe:'Elf Archer', mana_cost:'{1}{G}', oracle:'First strike. The encounter equips this archer with Viridian Longbow (a separate real card).', keywords:{'firstStrike': 1} },
  tortoise: { name:'Dauntless Escort', power:3, toughness:3, ai:'escort', tribe:'Rhino Soldier', mana_cost:'{1}{G}{W}', oracle:'Sacrifice this creature: Creatures you control gain indestructible until end of turn.', keywords:{} },
  moth: { name:'Plague Stinger', power:1, toughness:1, ai:'melee', tribe:'Phyrexian Insect', mana_cost:'{1}{B}', oracle:'Flying, infect.', keywords:{'flying': 1, 'infect': 1} },
  hexer: { name:'Blightcaster', power:2, toughness:3, ai:'blightcaster', tribe:'Human Wizard', mana_cost:'{3}{B}', oracle:'Whenever you cast an enchantment spell, target creature gets -2/-2 until end of turn.', keywords:{} },
  alpha: { name:'Nightpack Ambusher', power:4, toughness:4, ai:'alpha', tribe:'Wolf', mana_cost:'{2}{G}{G}', oracle:'Flash. Other Wolves and Werewolves you control get +1/+1. At end step, if you cast no spell this turn, create a 2/2 Wolf.', keywords:{} },
  cinderling: { name:'Mudbutton Torchrunner', power:1, toughness:1, ai:'melee', tribe:'Goblin Warrior', mana_cost:'{2}{R}', oracle:'When this creature dies, it deals 3 damage to any target.', keywords:{} },
  ashbrute: { name:'Rageblood Shaman', power:2, toughness:3, ai:'melee', tribe:'Minotaur Shaman', mana_cost:'{1}{R}{R}', oracle:'Trample. Other Minotaur creatures you control get +1/+1 and have trample.', keywords:{'trample': 1} },
  harpooner: { name:'Spikeshot Goblin', power:1, toughness:2, ai:'spikeshot', tribe:'Goblin Shaman', mana_cost:'{2}{R}', oracle:'{R}, {T}: This creature deals damage equal to its power to any target.', keywords:{} },
  emberseer: { name:'Thermo-Alchemist', power:0, toughness:3, ai:'alchemist', tribe:'Human Shaman', mana_cost:'{1}{R}', oracle:'Defender. {T}: Deal 1 damage to each opponent. Whenever you cast an instant or sorcery, untap this creature.', keywords:{} },
  champion: { name:'Combustible Gearhulk', power:6, toughness:6, ai:'melee', tribe:'Artifact Construct', mana_cost:'{4}{R}{R}', oracle:'First strike. On entering: target opponent chooses whether you draw three cards or mill three and deal damage equal to total mana values to them.', keywords:{'firstStrike': 1} },
  riftstalker: { name:'Fallen Shinobi', power:5, toughness:4, ai:'stalker', tribe:'Zombie Ninja', mana_cost:'{3}{U}{B}', oracle:"Ninjutsu {2}{U}{B}. When this creature deals combat damage to a player, exile the top two cards of that player's library; you may play them for free this turn.", keywords:{} },
  nullwarden: { name:'Lodestone Golem', power:5, toughness:3, ai:'melee', tribe:'Artifact Golem', mana_cost:'{4}', oracle:'Nonartifact spells cost {1} more to cast.', keywords:{} },
  shardling: { name:'Faerie Duelist', power:1, toughness:2, ai:'melee', tribe:'Faerie Rogue', mana_cost:'{1}{U}', oracle:'Flash, flying. When this creature enters, target creature an opponent controls gets -2/-0 until end of turn.', keywords:{'flying': 1} },
  sentinel: { name:'Triplicate Titan', power:9, toughness:9, ai:'melee', tribe:'Artifact Golem', mana_cost:'{9}', oracle:'Flying, vigilance, trample. On death, create three 3/3 Golem artifact creature tokens, one each with flying, vigilance and trample.', keywords:{'flying': 1, 'vigilance': 1, 'trample': 1} },
});
