/** Printed real Magic creature identity and separately labeled GRAFTBOUND encounter health.
 * Original M:TG power and toughness are NEVER replaced by encounter HP. */
export const LEGENDARY_BOSSES = Object.freeze([
  [
    { id: 'nemata', name: 'Nemata, Grove Guardian', power:4,toughness:5, vitality:22, sprite:'thornmother', ai:'legendary', theme:'hollow', ability:'{2}{G}: Create a 1/1 green Saproling. Sacrifice a Saproling: Saprolings you control get +1/+1 until end of turn.' },
    { id: 'arasta', name:'Arasta of the Endless Web', power:3,toughness:5,vitality:20,sprite:'thornmother',ai:'legendary',theme:'hollow',keywords:{reach:1},ability:'Whenever an opponent casts an instant or sorcery, create a 1/2 green Spider with reach.' },
  ],
  [
    { id:'drakuseth',name:'Drakuseth, Maw of Flames',power:7,toughness:7,vitality:32,sprite:'matron',ai:'legendary',theme:'warrens',keywords:{flying:1},ability:'Whenever Drakuseth attacks, deal 4 damage to one target and 3 to each of up to two other targets.' },
    { id:'krenko',name:'Krenko, Mob Boss',power:3,toughness:3,vitality:26,sprite:'matron',ai:'legendary',theme:'warrens',ability:'{T}: Create X 1/1 Goblins, where X is the number of Goblins you control.' },
  ],
  [
    { id:'scarab',name:'The Scarab God',power:5,toughness:5,vitality:38,sprite:'unwritten',ai:'legendary',theme:'nexus',ability:'At upkeep, you lose X life and it scries X (X = its Zombies). {2}{U}{B}: exile a creature card from any graveyard to create a 4/4 Zombie token copy. When it dies it returns to its owner\'s hand at the next end step.' },
    { id:'toxrill',name:'Toxrill, the Corrosive',power:7,toughness:7,vitality:40,sprite:'unwritten',ai:'legendary',theme:'nexus',ability:'At each end step, put a slime counter on each enemy creature. It gets -1/-1 per counter; deaths spawn 1/1 Slugs.' },
  ],
]);
export const BOSS_BY_ID = Object.fromEntries(LEGENDARY_BOSSES.flat().map(b=>[b.id,b]));
export const bossForSeed = (act, seed) => LEGENDARY_BOSSES[Math.max(0,Math.min(2,act|0))][((seed>>>0)>>>1)&1];
export const BOSS_VITALITY = Object.fromEntries(LEGENDARY_BOSSES.flat().map(b=>[b.id,b.vitality]));
