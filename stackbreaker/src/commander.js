import {CARDS,LANDS} from './cards.js';
import {createGame,legalTargets,paymentOptions} from './engine.js';
// Single response window, one-copy-per-nonbasic card *per participant*.
// Activating a battlefield permanent uses its source and is NOT a second copy.
// Basic lands remain repeatable under Commander singleton rules.
// Existing thirty curated lesson IDs and authored winning action IDs are stable.
const CORE_LINES={
 'sb-01':[['ward',null]],
 'sb-02':[['counter','bolt']],
 'sb-03':[['growth','bear']],
 'sb-04':[['negate','wrath']],
 'sb-05':[['intervene',null]],
 'sb-06':[['salve','player'],['dispel','theircounter']],
 'sb-07':[['ward',null],['counter','murder']],
 'sb-08':[['ward',null],['salve','player'],['counter','murder']],
 'sb-09':[['salve','player'],['dispel1','theircounter'],['dispel2','theirbolt']],
 'sb-10':[['salve1','player'],['salve2','player'],['dispel','theircounter']],
 'sb-11':[['salve','player'],['dispel','theircounter']],
 'sb-12':[['salve1','player'],['salve2','player'],['dispel1','theircounter'],['dispel2','bolt1']],

 'sb-13':[['defend','bear']],
 'sb-14':[['defend','lion']],
 'sb-15':[['dive','giant']],
 'sb-16':[['titan','bear'],['blossom','lion']],
 'sb-17':[['dive','giant'],['blossom','bear']],
 'sb-18':[['titan','bear'],['cancel','wrath']],
 'sb-19':[['blossom','bear'],['dive','giant']],
 'sb-20':[['ward',null],['dive','giant']],
 'sb-21':[['ward',null],['dive','giant'],['salve','player']],
 'sb-22':[['cancel','counterspell'],['salve','player'],['blossom','giant']],
 'sb-23':[['salve','player'],['counter','shock']],
 'sb-24':[['salve1','player'],['salve2','player'],['dispel1','enemycounter'],['dispel2','bolt1']],
 'sb-25':[['ward',null],['blossom','bear']],
 'sb-26':[['blossom','giant'],['salve','player']],
 'sb-27':[['ward',null],['dive','giant'],['salve','player']],
 'sb-28':[['blossom','giant'],['salve','player'],['dispel','enemycounter']],
 'sb-29':[['ward',null],['blossom','giant'],['salve','player'],['dispel','enemycounter']],
 'sb-30':[['ward',null],['blossom','giant'],['salve','player'],['dispel1','enemycounter'],['dispel2','bolt']]
};
const REPLACEMENTS={
 'Dispel':['Arcane Denial','Dovin\'s Veto','Negate','Cancel'],
 'Healing Salve':['Soothing Balm'],
 'Lightning Bolt':['Lightning Strike','Searing Spear','Incinerate','Open Fire','Fiery Temper'],
 'Lightning Strike':['Searing Spear','Incinerate','Open Fire','Fiery Temper','Lightning Bolt'],
 'Counterspell':['Cancel','Arcane Denial','Stoic Rebuttal'],
 'Grizzly Bears':['Runeclaw Bear','Glory Seeker','Goblin Chariot'],
 'Runeclaw Bear':['Grizzly Bears','Glory Seeker','Goblin Chariot'],
 'Savannah Lions':['Elite Vanguard','Coral Merfolk','Goblin Piker'],
 'Hill Giant':['Centaur Courser','Trained Armodon','War Mammoth'],
 'Murder':["Hero's Downfall",'Mortify','Terminate'],
 'Doom Blade':['Dark Banishing'],
 'Giant Growth':['Brute Force','Titanic Growth'],
 'Wrath of God':['Day of Judgment']
};
const SHARED_ALIASES=[
 ['Lightning Bolt','Lightning Strike','Searing Spear','Incinerate','Open Fire','Fiery Temper'],
 ['Counterspell','Cancel','Stoic Rebuttal','Arcane Denial'],
 ['Grizzly Bears','Runeclaw Bear','Glory Seeker','Goblin Chariot'],
 ['Savannah Lions','Elite Vanguard','Coral Merfolk','Goblin Piker'],
 ['Hill Giant','Centaur Courser','Trained Armodon','War Mammoth'],
 ['Healing Salve','Soothing Balm'],
 ['Giant Growth','Brute Force'],
 ['Murder',"Hero's Downfall",'Mortify','Terminate']
];
const COMMANDER_BASICS={W:'Plains',U:'Island',B:'Swamp',R:'Mountain',G:'Forest',C:'Wastes'};
const COMMANDER_COLORS=['W','U','B','R','G','C'];
const INSTANT_OPTIONS=[
 'Giant Growth',"Ranger's Guile",'Snakeskin Veil','Blossoming Defense','Dive Down',
 'Healing Salve','Soothing Balm','Swords to Plowshares',"Tamiyo's Safekeeping",
 'Lightning Bolt','Shock','Lightning Strike','Searing Spear','Incinerate','Abrade','Lightning Helix',
 'Unsummon','Vapor Snag','Doom Blade','Murder',"Hero's Downfall",'Mortify','Terminate',
 'Dispel','Negate','Counterspell','Arcane Denial',"Dovin's Veto",'Cancel',
 'Essence Scatter','Remove Soul','Dissipate','Brute Force','Titanic Growth',
 'Dissipate'
].filter(name=>CARDS[name]?.type==='Instant');
export const HAND_SIZE=7;
const commanderClone=v=>structuredClone(v);
const commanderRand=n=>{n|=0;n=Math.imul(n^n>>>16,0x7feb352d);n=Math.imul(n^n>>>15,0x846ca68b);return (n^n>>>16)>>>0;};
const commanderPalette=(p)=>COMMANDER_COLORS.filter(color=>color!=='C'&&
 [...p.units,...p.hand,...p.stack].some(x=>x.controller==='player'||p.hand.includes(x)?
  CARDS[x.card]?.colors?.includes(color):false));
function appendLand(p,color){p.lands.push({id:'commander-land-'+(p.lands.length+1),card:COMMANDER_BASICS[color],controller:'player'});}
function ensureMana(p,line){
 const required=Object.fromEntries(COMMANDER_COLORS.map(c=>[c,0]));let generic=0;
 for(const [id] of line){
  const a=p.hand.find(x=>x.id===id);if(!a||a.sourceId)continue;
  const cost=CARDS[a.card]?.cost||{};for(const c of COMMANDER_COLORS)required[c]+=cost[c]||0;generic+=cost.generic||0;
 }
 const supplied=Object.fromEntries(COMMANDER_COLORS.map(c=>[c,p.lands.filter(l=>LANDS[l.card]?.mana===c).length]));
 for(const c of COMMANDER_COLORS)while(supplied[c]<required[c]){appendLand(p,c);supplied[c]++;}
 const total=COMMANDER_COLORS.reduce((s,c)=>s+supplied[c],0),mandatory=COMMANDER_COLORS.reduce((s,c)=>s+required[c],0);
 for(let n=total-mandatory;n<generic;n++)appendLand(p,'C');
 // Small, varied mana reserves make alternative one-mana responses playable;
 // no infinite mana or auto-casting is introduced.
 const colors=commanderPalette(p),first=colors[0]||'G',second=colors[1]||(first==='U'?'W':'U');
 if(p.lands.length<6)appendLand(p,first);
 if(p.lands.length<6)appendLand(p,second);
}
function normalizeOwner(p,owner){
 const items=[...p.units.filter(x=>x.controller===owner),...p.stack.filter(x=>x.controller===owner),...(owner==='player'?p.hand.filter(x=>!x.sourceId):[])];
 const seen=new Set();
 for(const x of items){
  if(!seen.has(x.card)){seen.add(x.card);continue;}
  const shared=SHARED_ALIASES.find(group=>group.includes(x.card))||[];
  const alternatives=[...shared.filter(name=>name!==x.card),...(REPLACEMENTS[x.card]||[])];
  const substitute=alternatives.find(c=>!!CARDS[c]&&!seen.has(c));
  if(!substitute)throw Error('Cannot make '+p.id+' singleton for '+owner+': '+x.card);
  const before=x.card;x.card=substitute;seen.add(substitute);
  // Card identity changes, action IDs and targeting stay stable.
  p.singletonSubstitutions??=[];
  p.singletonSubstitutions.push({owner,from:before,to:substitute,id:x.id});
 }
}
function currentPool(p){return Object.fromEntries(COMMANDER_COLORS.map(c=>[c,p.lands.filter(l=>LANDS[l.card]?.mana===c).length]));}
function candidateScore(p,name,seed){
 const cost=CARDS[name]?.cost;if(!cost)return -9999;
 const pool=currentPool(p);
 const affordable=paymentOptions({mana:pool},cost).length>0;
 const sample=createGame({...p,hand:[...p.hand,{id:'commander-candidate',card:name}]});
 const possibleTargets=legalTargets(sample,{id:'commander-candidate',card:name});
 // Playable alternate answers appear first, followed by deliberately less
 // useful or unaffordable options—recognizing that distinction is the exercise.
 return (affordable?100:0)+(possibleTargets.length?40:0)+commanderRand(seed+name.length*97+name.charCodeAt(0))%25;
}
// Card roles model a midgame Commander hand, not seven interchangeable instants.
// There is always at least one land, creature and enchantment in these curated
// reaction windows; high-complexity cases can start with 8 cards (draw-heavy turn).
const COMMANDER_CREATURES=[
 'Llanowar Elves','Birds of Paradise','Elvish Mystic','Ambush Viper','Skylasher',
 'Serra Angel','Soul Warden','Wall of Omens','Aven Mindcensor','Archivist of Oghma',
 'Mulldrifter','Archaeomancer','Blood Artist','Gray Merchant of Asphodel',
 'Goblin Instigator','Young Pyromancer'
];
const COMMANDER_ENCHANTMENTS=[
 'Rhystic Study','Smothering Tithe','Ghostly Prison','Propaganda',
 'Phyrexian Arena','Black Market Connections','Impact Tremors',
 'Goblin Bombardment','Sylvan Library','Fecundity',"Mirari's Wake"
];
const COMMANDER_SUPPORT=[
 'Sol Ring','Arcane Signet','Swiftfoot Boots','Lightning Greaves',
 'Skullclamp','Cultivate',"Kodama's Reach",'Farseek','Ponder','Harmonize','Read the Bones'
];
function fitCommanderCard(name,identities){
 const c=CARDS[name];return !!c&&c.colors.every(color=>identities.has(color));
}
function chooseCommanderPermanent(p,index,role,seen){
 const ids=new Set(commanderPalette(p));for(const land of p.lands){const color=LANDS[land.card]?.mana;if(color&&color!=='C')ids.add(color);}
 const list=role==='creature'?COMMANDER_CREATURES:role==='enchantment'?COMMANDER_ENCHANTMENTS:COMMANDER_SUPPORT;
 const candidates=list.filter(n=>!seen.has(n)&&fitCommanderCard(n,ids));
 if(!candidates.length)throw Error('No Commander-compatible '+role+' for '+p.id);
 const chosen=candidates[commanderRand(index*31+role.length)%candidates.length];seen.add(chosen);return chosen;
}
function chooseCommanderLand(p,index){
 const allowed=[...new Set(p.lands.map(l=>LANDS[l.card]?.mana).filter(Boolean))];
 const colors=allowed.length?allowed:[...commanderPalette(p)];
 const color=colors[commanderRand(index*17+111)%colors.length]||'C';
 return COMMANDER_BASICS[color];
}
export function commanderScenario(input,index=0){
 const p=commanderClone(input);const solution=p.solution||CORE_LINES[p.id];
 if(!solution)throw Error('No vetted solution for '+p.id);
 normalizeOwner(p,'player');normalizeOwner(p,'opponent');
 ensureMana(p,solution);
 const seen=new Set([...p.units.filter(x=>x.controller==='player'),...p.stack.filter(x=>x.controller==='player'),...p.hand.filter(x=>!x.sourceId&&!LANDS[x.card])].map(x=>x.card));
 const existing=p.hand.filter(x=>!x.sourceId).length;
 const minimum=Math.max(HAND_SIZE,existing+3);
 // Physical basics may repeat; one land card in hand is not a new mana source.
 p.hand.push({id:'real-hand-land',card:chooseCommanderLand(p,index)});
 p.hand.push({id:'real-hand-creature',card:chooseCommanderPermanent(p,index,'creature',seen)});
 p.hand.push({id:'real-hand-enchantment',card:chooseCommanderPermanent(p,index+7,'enchantment',seen)});
 const pool=INSTANT_OPTIONS.filter(n=>!seen.has(n)).map(name=>({name,score:candidateScore(p,name,index*101+37)}))
  .sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
 let choiceIndex=0,supportAdded=false;
 while(p.hand.filter(x=>!x.sourceId).length<minimum){
  const remaining=minimum-p.hand.filter(x=>!x.sourceId).length;
  // Some hands also contain a Commander staple or a sorcery-speed ramp spell.
  if(remaining>2&&index%4===0&&!supportAdded){
   const other=chooseCommanderPermanent(p,index+choiceIndex+19,'support',seen);
   p.hand.push({id:'real-hand-support',card:other});supportAdded=true;continue;
  }
  const next=pool.find(x=>!seen.has(x.name));
  if(!next)throw Error('Insufficient distinct response spells for '+p.id);
  p.hand.push({id:'choice-'+choiceIndex++,card:next.name});seen.add(next.name);
 }
 p.commanderPractice=true;p.format='singleton-realistic-hand';
 p.solution=commanderClone(solution);p.companionColors=commanderPalette(p);
 return p;
}
