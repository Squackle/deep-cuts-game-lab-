// Stackbreaker 0.2 — limited, curated MTG card-reference catalog.
// Card text and statistics are reference data, not a full executable card interpreter.
export const RULES_VERSION='sb-mtg-training-0.3.0';
export const CARDS={
  'Selfless Spirit':{type:'Creature — Spirit Cleric',cost:{generic:1,W:1},power:2,toughness:1,colors:['W'],oracle:'Flying. Sacrifice Selfless Spirit: Creatures you control gain indestructible until end of turn.',effect:'ward',tags:['Flying']},
  'Grizzly Bears':{type:'Creature — Bear',cost:{generic:1,G:1},power:2,toughness:2,colors:['G'],oracle:'',effect:null,tags:[]},
  'Runeclaw Bear':{type:'Creature — Bear',cost:{generic:1,G:1},power:2,toughness:2,colors:['G'],oracle:'',effect:null,tags:[]},
  'Hill Giant':{type:'Creature — Giant',cost:{generic:3,R:1},power:3,toughness:3,colors:['R'],oracle:'',effect:null,tags:[]},
  'Savannah Lions':{type:'Creature — Cat',cost:{W:1},power:2,toughness:1,colors:['W'],oracle:'',effect:null,tags:[]},
  'Silvercoat Lion':{type:'Creature — Cat',cost:{generic:1,W:1},power:2,toughness:2,colors:['W'],oracle:'',effect:null,tags:[]},
  'Centaur Courser':{type:'Creature — Centaur Warrior',cost:{generic:2,G:1},power:3,toughness:3,colors:['G'],oracle:'',effect:null,tags:[]},
  'Alpine Grizzly':{type:'Creature — Bear',cost:{generic:2,G:1},power:4,toughness:2,colors:['G'],oracle:'',effect:null,tags:[]},
  'Wrath of God':{type:'Sorcery',cost:{generic:2,W:2},colors:['W'],oracle:'Destroy all creatures. They can’t be regenerated.',effect:'destroyAll'},
  'Lightning Bolt':{type:'Instant',cost:{R:1},colors:['R'],oracle:'Lightning Bolt deals 3 damage to any target.',effect:'damage',amount:3},
  'Shock':{type:'Instant',cost:{R:1},colors:['R'],oracle:'Shock deals 2 damage to any target.',effect:'damage',amount:2},
  'Counterspell':{type:'Instant',cost:{U:2},colors:['U'],oracle:'Counter target spell.',effect:'counter',targetRule:'stack:spell'},
  'Negate':{type:'Instant',cost:{generic:1,U:1},colors:['U'],oracle:'Counter target noncreature spell.',effect:'counter',targetRule:'stack:noncreature'},
  'Dispel':{type:'Instant',cost:{U:1},colors:['U'],oracle:'Counter target instant spell.',effect:'counter',targetRule:'stack:instant'},
  'Essence Scatter':{type:'Instant',cost:{generic:1,U:1},colors:['U'],oracle:'Counter target creature spell.',effect:'counter',targetRule:'stack:creature'},
  'Healing Salve':{type:'Instant',cost:{W:1},colors:['W'],oracle:'Choose one — Target player gains 3 life; or prevent the next 3 damage that would be dealt to any target this turn.',effect:'heal',amount:3,targetRule:'player',note:'Training mode: gain 3 life only.'},
  'Giant Growth':{type:'Instant',cost:{G:1},colors:['G'],oracle:'Target creature gets +3/+3 until end of turn.',effect:'pump',amount:3,targetRule:'creature'},
  'Heroic Intervention':{type:'Instant',cost:{generic:1,G:1},colors:['G'],oracle:'Permanents you control gain hexproof and indestructible until end of turn.',effect:'intervention'},
  'Murder':{type:'Instant',cost:{generic:1,B:2},colors:['B'],oracle:'Destroy target creature.',effect:'destroy',targetRule:'creature'},
  'Doom Blade':{type:'Instant',cost:{generic:1,B:1},colors:['B'],oracle:'Destroy target nonblack creature.',effect:'destroy',targetRule:'creature:nonblack'},
  'Swords to Plowshares':{type:'Instant',cost:{W:1},colors:['W'],oracle:'Exile target creature. Its controller gains life equal to its power.',effect:'exile',targetRule:'creature'},
  'Titanic Growth':{type:'Instant',cost:{generic:1,G:1},colors:['G'],oracle:'Target creature gets +4/+4 until end of turn.',effect:'pump',amount:4,targetRule:'creature'},
  'Blossoming Defense':{type:'Instant',cost:{G:1},colors:['G'],oracle:'Target creature you control gets +2/+2 and gains hexproof until end of turn.',effect:'blossom',amount:2,targetRule:'creature:own'},
  'Dive Down':{type:'Instant',cost:{U:1},colors:['U'],oracle:'Target creature you control gets +0/+3 and gains hexproof until end of turn.',effect:'dive',amount:3,targetRule:'creature:own'},
  'Lightning Strike':{type:'Instant',cost:{generic:1,R:1},colors:['R'],oracle:'Lightning Strike deals 3 damage to any target.',effect:'damage',amount:3,targetRule:'any'},
  'Cancel':{type:'Instant',cost:{generic:1,U:2},colors:['U'],oracle:'Counter target spell.',effect:'counter',targetRule:'stack:spell'},
  'Unsummon':{type:'Instant',cost:{U:1},colors:['U'],oracle:'Return target creature to its owner’s hand.',effect:'bounce',targetRule:'creature'},
  "Glory Seeker":{"type":"Creature — Human Soldier","cost":{"generic":1,"W":1},"power":2,"toughness":2,"colors":["W"],"oracle":"","effect":null,"tags":[]},
  "Goblin Chariot":{"type":"Creature — Goblin Warrior","cost":{"generic":2,"R":1},"power":2,"toughness":2,"colors":["R"],"oracle":"Haste","effect":null,"tags":["Haste"]},
  "Elite Vanguard":{"type":"Creature — Human Soldier","cost":{"W":1},"power":2,"toughness":1,"colors":["W"],"oracle":"","effect":null,"tags":[]},
  "Coral Merfolk":{"type":"Creature — Merfolk","cost":{"generic":1,"U":1},"power":2,"toughness":1,"colors":["U"],"oracle":"","effect":null,"tags":[]},
  "Goblin Piker":{"type":"Creature — Goblin Warrior","cost":{"generic":1,"R":1},"power":2,"toughness":1,"colors":["R"],"oracle":"","effect":null,"tags":[]},
  "Trained Armodon":{"type":"Creature — Elephant","cost":{"generic":1,"G":2},"power":3,"toughness":3,"colors":["G"],"oracle":"","effect":null,"tags":[]},
  "War Mammoth":{"type":"Creature — Elephant","cost":{"generic":3,"G":1},"power":3,"toughness":3,"colors":["G"],"oracle":"Trample","effect":null,"tags":["Trample"]},
  "Searing Spear":{"type":"Instant","cost":{"generic":1,"R":1},"colors":["R"],"oracle":"Searing Spear deals 3 damage to any target.","effect":"damage","amount":3,"targetRule":"any"},
  "Open Fire":{"type":"Instant","cost":{"generic":2,"R":1},"colors":["R"],"oracle":"Open Fire deals 3 damage to any target.","effect":"damage","amount":3,"targetRule":"any"},
  "Fiery Temper":{"type":"Instant","cost":{"generic":1,"R":2},"colors":["R"],"oracle":"Fiery Temper deals 3 damage to any target. Madness {R}.","effect":"damage","amount":3,"targetRule":"any","note":"Normal casting cost only, madness not simulated."},
  "Stoic Rebuttal":{"type":"Instant","cost":{"generic":1,"U":2},"colors":["U"],"oracle":"Metalcraft — This spell costs {1} less to cast if you control three or more artifacts. Counter target spell.","effect":"counter","targetRule":"stack:spell","note":"Metalcraft not active in supported board states."},
  "Hero's Downfall":{"type":"Instant","cost":{"generic":1,"B":2},"colors":["B"],"oracle":"Destroy target creature or planeswalker.","effect":"destroy","targetRule":"creature"},
  "Dark Banishing":{"type":"Instant","cost":{"generic":2,"B":1},"colors":["B"],"oracle":"Destroy target nonblack creature. It can't be regenerated.","effect":"destroy","targetRule":"creature:nonblack"},
  "Blink of an Eye":{"type":"Instant","cost":{"generic":1,"U":1},"colors":["U"],"oracle":"Kicker {1}{U}. Return target nonland permanent to its owner's hand. If this spell was kicked, draw a card.","effect":"bounce","targetRule":"creature","note":"Only non-kicked cast mode and creature targets supported."},
  "Day of Judgment":{"type":"Sorcery","cost":{"generic":2,"W":2},"colors":["W"],"oracle":"Destroy all creatures.","effect":"destroyAll"},
  "Brute Force":{"type":"Instant","cost":{"R":1},"colors":["R"],"oracle":"Target creature gets +3/+3 until end of turn.","effect":"pump","amount":3,"targetRule":"creature"},
  "Remove Soul":{"type":"Instant","cost":{"generic":1,"U":1},"colors":["U"],"oracle":"Counter target creature spell.","effect":"counter","targetRule":"stack:creature"},
  "Pyroclasm":{"type":"Sorcery","cost":{"generic":1,"R":1},"colors":["R"],"oracle":"Pyroclasm deals 2 damage to each creature.","effect":"sweepDamage","amount":2},
  "Languish":{"type":"Sorcery","cost":{"generic":2,"B":2},"colors":["B"],"oracle":"All creatures get -4/-4 until end of turn.","effect":"weakenAll","amount":4},
  "Disfigure":{"type":"Instant","cost":{"B":1},"colors":["B"],"oracle":"Target creature gets -2/-2 until end of turn.","effect":"shrink","amount":2,"targetRule":"creature"},
  "Tamiyo's Safekeeping":{"type":"Instant","cost":{"G":1},"colors":["G"],"oracle":"Target permanent you control gains hexproof and indestructible until end of turn. You gain 2 life.","effect":"safekeeping","targetRule":"creature:own"},
  "Lightning Helix":{"type":"Instant","cost":{"R":1,"W":1},"colors":["R","W"],"oracle":"Lightning Helix deals 3 damage to any target and you gain 3 life.","effect":"helix","amount":3,"targetRule":"any"},
  "Vapor Snag":{"type":"Instant","cost":{"U":1},"colors":["U"],"oracle":"Return target creature to its owner's hand. Its controller loses 1 life.","effect":"vapor","targetRule":"creature"}
};
export const cardLink = name => 'https://scryfall.com/search?q='+encodeURIComponent('!"'+name+'"');
export const isCreature = name => CARDS[name]?.type.startsWith('Creature') || false;

// Curated real land cards. The game models the listed basic mana abilities only.
export const LANDS={
 'Plains':{type:'Basic Land — Plains',mana:'W',oracle:'{T}: Add {W}.'},
 'Island':{type:'Basic Land — Island',mana:'U',oracle:'{T}: Add {U}.'},
 'Swamp':{type:'Basic Land — Swamp',mana:'B',oracle:'{T}: Add {B}.'},
 'Mountain':{type:'Basic Land — Mountain',mana:'R',oracle:'{T}: Add {R}.'},
 'Forest':{type:'Basic Land — Forest',mana:'G',oracle:'{T}: Add {G}.'},
 'Wastes':{type:'Basic Land',mana:'C',oracle:'{T}: Add {C}.'}
};