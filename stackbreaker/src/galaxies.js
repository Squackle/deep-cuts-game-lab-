import {CARDS,RULES_VERSION} from './cards.js';
/** Deterministic teaching windows: 30 preserved cases + 220 generated cases.
 * These are limited, validated stack interactions, not a universal MTG engine.
 */
export const GALAXIES=[
 {name:'Origin Spiral',icon:'✦',color:'#e8c274',terrain:'sunrise',subtitle:'Priority and the first response'},
 {name:'Verdant Expanse',icon:'♧',color:'#82d2a0',terrain:'forest',subtitle:'Damage, toughness and protection'},
 {name:'Tidal Nebula',icon:'≈',color:'#87c8f1',terrain:'coast',subtitle:'Counterspells and stack control'},
 {name:'Prismatic Rift',icon:'◇',color:'#bba5f2',terrain:'rift',subtitle:'Color management and interlocking threats'},
 {name:'Eclipse Crown',icon:'♜',color:'#efab86',terrain:'citadel',subtitle:'The final response'}
];
const WORLD_NAMES=[
 ['The First Spark','Briarwood Passage','Spellwater Crossing','Crimson Archive','Dawnwatch Bastion'],
 ['Mossfall Hollow','Emerald Sanctuary','Ashen Garden','Thornspire Grove','Ancient Canopy'],
 ['Mirror Shoals','Vault of Echoes','Countercurrent Isle','Frostglass Keep','Stormwake Reef'],
 ['The Mana Rift','Sunken Observatory','Chromatic Crucible','Arcane Foundry','Opal Gate'],
 ['Eclipse Outskirts','Citadel of Answers','Fivefold Labyrinth','Throne of Last Light','Final Constellation']
];
export function makeWorlds(){return GALAXIES.flatMap((g,gi)=>WORLD_NAMES[gi].map((name,wi)=>({
 id:'w'+(gi*5+wi+1),name,galaxy:gi,localWorld:wi,
 start:(gi*5+wi)*10+1,end:(gi*5+wi+1)*10,
 color:g.color,icon:g.icon,terrain:g.terrain,subtitle:['The approach','The crossing','The choice','The trap','The guardian'][wi],
 boss:wi===4?'Galaxy Gatekeeper':'World Finale'
})));}
const SOLUTIONS={
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
const ALIAS={
 'Grizzly Bears':['Grizzly Bears','Runeclaw Bear','Glory Seeker','Goblin Chariot'],
 'Runeclaw Bear':['Runeclaw Bear','Grizzly Bears','Glory Seeker','Goblin Chariot'],
 'Silvercoat Lion':['Silvercoat Lion','Glory Seeker','Grizzly Bears','Runeclaw Bear'],
 'Savannah Lions':['Savannah Lions','Elite Vanguard','Coral Merfolk','Goblin Piker'],
 'Hill Giant':['Hill Giant','Trained Armodon','Centaur Courser','War Mammoth'],
 'Centaur Courser':['Centaur Courser','Trained Armodon','Hill Giant','War Mammoth'],
 'Lightning Bolt':['Lightning Bolt','Lightning Strike','Searing Spear','Open Fire','Fiery Temper'],
 'Lightning Strike':['Lightning Strike','Searing Spear','Open Fire','Lightning Bolt','Fiery Temper'],
 'Counterspell':['Counterspell','Cancel','Stoic Rebuttal'],
 'Cancel':['Cancel','Counterspell','Stoic Rebuttal'],
 'Murder':['Murder',"Hero's Downfall"],
 'Doom Blade':['Doom Blade','Dark Banishing'],
 'Giant Growth':['Giant Growth','Brute Force'],
 'Unsummon':['Unsummon','Blink of an Eye'],
 'Wrath of God':['Wrath of God','Day of Judgment'],
 'Essence Scatter':['Essence Scatter','Remove Soul']
};
const BASICS={W:'Plains',U:'Island',B:'Swamp',R:'Mountain',G:'Forest',C:'Wastes'};
const COLORS=['W','U','B','R','G','C'];
const PREFIX=['Moonlit','Drowned','Emberbound','Silent','Crowned','Hidden','Ancient','Shattered','Thorned','Silver','Starborn','Cobalt','Sunken','Crimson','Gilded','Twilight','Obsidian','Astral','Verdant','Stormbound','Eternal','Arcane'];
const SUFFIX=['Retort','Gambit','Trap','Equation','Ultimatum','Trial','Crossroads','Sanctuary','Puzzle','Mirage','Interception','Threshold','Paradox','Standoff','Reversal','Countermove'];
const MOTIFS=[
 {label:'Ashfall Rescue',unit:[['lion','Savannah Lions']],stack:['Pyroclasm',null],hand:[['growth','Giant Growth']],objective:{type:'keepUnit',unitId:'lion'},line:[['growth','lion']],intro:'An area spell threatens a lion. Find the toughness needed to survive.',hint:'Pump the lion before two damage is marked.',explanation:'Giant Growth puts the lion above the two-damage threshold.'},
 {label:'The Unbreakable Fall',unit:[['bear','Grizzly Bears']],stack:['Languish',null],hand:[['titan','Titanic Growth'],['intervene','Heroic Intervention']],objective:{type:'keepUnit',unitId:'bear'},line:[['titan','bear']],intro:'Indestructible cannot help a creature with zero toughness.',hint:'Increase toughness before the negative modifier resolves.',explanation:'Titanic Growth counterbalances Languish. Indestructible alone does not save zero toughness.'},
 {label:'The Thin Edge',unit:[['bear','Grizzly Bears']],stack:['Disfigure','bear'],hand:[['growth','Giant Growth']],objective:{type:'keepUnit',unitId:'bear'},line:[['growth','bear']],intro:'A -2/-2 spell threatens the bear.',hint:'A toughness increase stops state-based actions from sending it to the graveyard.',explanation:'Giant Growth makes the bear 5/5; Disfigure reduces it to 3/3.'},
 {label:'Helix Paradox',unit:[],stack:['Lightning Helix','player'],hand:[['salve','Healing Salve']],objective:{type:'survive'},line:[['salve','player']],intro:'A Helix threatens your last two life.',hint:'Gain life while the burn spell is on the stack.',explanation:'Healing Salve resolves before the opposing Helix, leaving you alive.'},
 {label:'Safe Passage',unit:[['bear','Grizzly Bears']],stack:['Murder','bear'],hand:[['safe',"Tamiyo's Safekeeping"]],objective:{type:'keepUnit',unitId:'bear'},line:[['safe','bear']],intro:'Stop targeted destruction without countering the spell.',hint:'Grant hexproof to make the opposing target illegal.',explanation:"Tamiyo's Safekeeping grants hexproof and indestructible and gains 2 life."},
 {label:'Vanishing Target',unit:[['bear','Grizzly Bears']],stack:['Vapor Snag','bear'],hand:[['counter','Counterspell']],objective:{type:'keepUnit',unitId:'bear'},line:[['counter','threat']],intro:'A bounce spell would take your bear off the battlefield.',hint:'Counter the spell before it resolves.',explanation:'Counterspell stops Vapor Snag from returning the bear.'},
 {label:'Exile Window',unit:[['giant','Hill Giant']],stack:['Swords to Plowshares','giant'],hand:[['defend','Blossoming Defense']],objective:{type:'keepUnit',unitId:'giant'},line:[['defend','giant']],intro:'Exile bypasses indestructible, but still targets.',hint:'Make the creature an illegal target with hexproof.',explanation:'Blossoming Defense prevents Swords to Plowshares from legally targeting the creature on resolution.'},
 {label:'Burning Field',unit:[['lion','Savannah Lions'],['bear','Grizzly Bears']],stack:['Pyroclasm',null],hand:[['intervene','Heroic Intervention']],objective:{type:'keepN',count:2},line:[['intervene',null]],intro:'Protect two creatures against a damage sweeper.',hint:'Indestructible works against lethal damage, not against negative toughness.',explanation:'Heroic Intervention lets both creatures survive lethal damage from Pyroclasm.'},
 {label:'Winning the Race',unit:[],stack:['Lightning Helix','player'],hand:[['answer','Lightning Helix']],objective:{type:'win'},line:[['answer','opponent']],intro:'Both players are one burn spell from defeat. Win before theirs resolves.',hint:'Your spell will resolve first when placed on top of the stack.',explanation:'Your Lightning Helix deals lethal to the opponent before their spell resolves.'},
 {label:'False Shield',unit:[['bear','Grizzly Bears']],stack:['Languish',null],hand:[['intervene','Heroic Intervention'],['titan','Titanic Growth']],objective:{type:'keepUnit',unitId:'bear'},line:[['titan','bear']],intro:'Choose the right protection from a -4/-4 sweeper.',hint:'Indestructible cannot help zero toughness; choose the pump spell.',explanation:'Titanic Growth offsets the negative toughness from Languish.'}
];
function motif(m,i){return{
 id:'template-'+i,version:RULES_VERSION,tier:'Mastermind',title:m.label,intro:m.intro,hint:m.hint,explanation:m.explanation,
 life:{player:i===3?2:8,opponent:i===8?3:19},mana:{},
 units:m.unit.map(([id,card])=>({id,card,controller:'player'})),
 stack:[{id:'threat',card:m.stack[0],controller:'opponent',...(m.stack[1]?{targetId:m.stack[1]}:{})}],
 hand:m.hand.map(([id,card])=>({id,card})),objective:m.objective,
 activeActor:'opponent',opponentPolicy:'alwaysPass',lands:[],par:m.line.length,solution:m.line
};}
function landAllocation(p,line,seed){
 const c={W:0,U:0,B:0,R:0,G:0,C:0,generic:0};
 for(const [id] of line){const action=p.hand.find(a=>a.id===id);if(!action)throw Error('Missing solution card '+id);
  if(action.sourceId)continue;
  for(const key of Object.keys(c))c[key]+=(CARDS[action.card]?.cost?.[key]||0);
 }
 // Reserve true colorless for generic payments so automated solution lines
 // never accidentally spend a later colored spell's mandatory mana.
 c.C+=c.generic;
 return COLORS.flatMap(color=>Array.from({length:c[color]},()=>({card:BASICS[color],controller:'player'})))
 .map((v,j)=>({id:'land-'+(j+1),...v}));
}
// Difficulty is calibrated by required independent answers, not by changing
// cosmetic card names. Each added threat is a real opposing instant on the
// stack, and every added response is a distinct legal Commander singleton card.
const GRADES=[
 {name:'Apprentice',min:1,max:2},
 {name:'Adept',min:2,max:3},
 {name:'Tactician',min:3,max:4},
 {name:'Archmage',min:4,max:5},
 {name:'Last Response',min:5,max:7}
];
const COUNTER_ANSWERS=['Dispel','Negate','Arcane Denial','Counterspell','Cancel','Stoic Rebuttal',"Dovin's Veto"];
const BURN_THREATS=['Lightning Bolt','Lightning Strike','Searing Spear','Incinerate','Open Fire','Fiery Temper'];
function galaxyTarget(gi,stage){
 return [2,3,4,5,6][gi]+(gi===4&&stage===9?1:0);
}
function graduate(s,line,gi,stage){
 const target=galaxyTarget(gi,stage);
 const extra=Math.max(0,target-line.length);
 if(extra===0){s.difficulty={galaxy:gi+1,requiredResponses:line.length,addedThreats:0,discipline:GRADES[gi].name};return;}
 const own=new Set([...s.hand.filter(x=>!x.sourceId),...s.units.filter(x=>x.controller==='player'),...s.stack.filter(x=>x.controller==='player')].map(x=>x.card));
 const theirs=new Set(s.stack.filter(x=>x.controller==='opponent').map(x=>x.card));
 for(let k=0;k<extra;k++){
  // Some late cases present an uncounterable spell. Hallow prevents its
  // damage and gains life; simply firing another counterspell cannot help.
  const prevention=gi>=3&&stage%3===0&&k===0&&!own.has('Hallow')&&!theirs.has("Urza's Rage");
  const threat=prevention?"Urza's Rage":BURN_THREATS.find(x=>!theirs.has(x));
  const answer=prevention?'Hallow':COUNTER_ANSWERS.find(x=>!own.has(x));
  if(!threat||!answer)throw Error('No singleton-safe graduate '+s.id);
  theirs.add(threat);own.add(answer);
  const spellId='peril-'+(k+1),responseId='answer-'+(k+1);
  // Existing opponent stack spells are preserved; new threats resolve in LIFO
  // order unless the player recognizes and answers them first.
  s.stack.push({id:spellId,card:threat,controller:'opponent',targetId:'player'});
  s.hand.push({id:responseId,card:answer});
  line.push([responseId,spellId]);
 }
 // Without the new responses, the uncoun­tered burn sequence is lethal.
 // This deliberately narrows life totals in the advanced one-turn windows.
 s.life.player=Math.min(s.life.player,3);
 s.par=line.length;
 s.difficulty={galaxy:gi+1,requiredResponses:line.length,addedThreats:extra,discipline:GRADES[gi].name};
 s.intro+=' '+extra+' additional incoming stack '+(extra===1?'threat demands':'threats demand')+' exact responses. '+(gi>=3?'Every colored mana and target matters.':'Find the response to each threat.');
 s.hint=gi>=3?'Read every opposing stack object and plan how the entire stack will resolve. Protect colored mana for later replies.':gi===2?'Solve the full stack, not just the top threat.':s.hint;
 s.explanation+=' Also, '+extra+' extra burn '+(extra===1?'threat was':'threats were')+' answered before they could defeat you.'+(gi>=3&&stage%3===0?' The uncounterable Urza\'s Rage required Hallow to prevent damage, not a counterspell.':'');
}
export function generateStages(existing){
 if(existing.length!==30)throw Error('Expected the 30 approved core levels');
 const pool=[...existing,...MOTIFS.map(motif)],added=[];
 for(let n=31;n<=250;n++){
  const ix=n-31,gi=Math.floor((n-1)/50),wi=Math.floor(((n-1)%50)/10),stage=(n-1)%10;
  // Never regress to one-response exercises in the final galaxies.
  const minBase=gi<3?1:gi===3?2:3;
  const maxBase=gi===0?2:gi===1?3:gi===2?4:gi===3?5:5;
  const eligible=pool.filter(p=>{
   const length=(p.solution||SOLUTIONS[p.id])?.length||0;
   return length>=minBase&&length<=maxBase&&p.objective.type!=='win';
  });
  const chosen=(ix*13+Math.floor(ix/10)*7+gi*11)%eligible.length;
  const source=eligible[chosen],s=structuredClone(source),line=structuredClone(source.solution||SOLUTIONS[source.id]);
  if(!line)throw Error('Untested template '+source.id);
  const rename={};const originals=[...s.units,...s.stack,...s.hand].map(a=>a.card);
  for(let k=0;k<originals.length;k++){const name=originals[k];
   if(!(name in rename))rename[name]=ALIAS[name]?.[(n+k*3)%ALIAS[name].length]||name;
  }
  for(const a of [...s.units,...s.stack,...s.hand])a.card=rename[a.card]||a.card;
  for(const [name,newName] of Object.entries(rename))if(name!==newName)
   for(const textField of ['intro','hint','explanation'])s[textField]=s[textField].replaceAll(name,newName);
  s.id='sg-'+String(n).padStart(3,'0');s.tier=gi===0?'Investigator':'Mastermind';s.mana={};
  graduate(s,line,gi,stage);
  s.par=line.length;s.solution=line;
  s.lands=landAllocation(s,line,n);
  s.title=PREFIX[(n*7+gi)%PREFIX.length]+' '+SUFFIX[(n*3+stage)%SUFFIX.length]+': '+s.title;
  s.intro='Galaxy '+(gi+1)+', world '+(wi+1)+', stage '+(stage+1)+'. '+s.intro;
  added.push(s);
 }
 return added;
}
