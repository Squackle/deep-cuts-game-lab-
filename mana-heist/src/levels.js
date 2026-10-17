import {VERSION} from "./engine.js";
import {capstoneFor,coffersFor} from "./advanced-capstones.js";
import {MASTERY_GALAXY_DATA,masteryFor} from "./mastery-galaxies.js";
import {diverseFor} from "./mana-variety-puzzles.js";
const cards=list=>list.map(([id,card])=>({id,card}));
const spell=(name,cost,effect)=>({name,cost,...(effect?{effect}:{})});
const L=(id,chapter,rank,title,briefing,turnLimit,life,hand,field,library,stages)=>({
 id:"mh-"+id,version:VERSION,chapter,rank,title,briefing,turnLimit,life,hand:cards(hand),field:cards(field),library:cards(library),stages
});
export const BASE_LEVELS=[
 L("01","I · THE FIRST KEY",1,"First Charge","Tap the Island-like basic land, collect blue mana, then cast the seal-breaking spell.",1,20,[],[["a","island"]],[],[spell("Break the Azure Seal",{U:1})]),
 L("02","I · THE FIRST KEY",1,"A Land Drop","Your land starts in hand. Play it, tap it for red mana, and cast the lock.",1,20,[["a","mountain"]],[],[],[spell("Ignite the Door",{R:1})]),
 L("03","I · THE FIRST KEY",1,"Paired Sigils","One land play per turn. Your mana pool empties when the turn ends, so plan both colors.",2,20,[["a","island"],["b","mountain"]],[],[ ],[spell("Read the Glyph",{U:1}),spell("Burn the Seal",{R:1})]),
 L("04","II · FALSE SHORES",2,"Two Roads","A dual land taps for one of two colors, never both. Make each turn count.",2,20,[["a","dualUR"]],[],[],[spell("Echo the Deep",{U:1}),spell("Kindle the Door",{R:1})]),
 L("05","II · FALSE SHORES",2,"The Split Lock","Choose your dual land's mana carefully. The final spell needs two colors simultaneously.",2,20,[["a","island"]],[["b","dualUR"]],[],[spell("Quiet the Sentinel",{U:1}),spell("Split the Seal",{U:1,R:1})]),
 L("06","II · FALSE SHORES",2,"Shock Entry","A shock land may enter tapped safely, or untapped if you pay 2 life. You only have this turn.",1,4,[["a","shockUR"]],[],[],[spell("Redline Break",{R:1})]),
 L("07","II · FALSE SHORES",3,"A Costly Shortcut","You need black and red together next turn. The shock choice matters.",2,3,[["a","shockBR"]],[["b","island"],["c","mountain"]],[],[spell("Interrogate the Seal",{U:1,R:2}),spell("Smash the Ward",{B:1,R:1})]),
 L("08","III · THE LEDGER",3,"A Drop of Blood","Pain lands produce colorless freely, but colored mana costs 1 life. You must survive.",2,2,[["a","painUB"]],[["b","island"]],[],[spell("Read the Lock",{U:1}),spell("Pay the Ferryman",{B:1,U:1})]),
 L("09","III · THE LEDGER",3,"Check the Coast","Check lands enter untapped only if you already control the indicated basic land type.",2,20,[["a","checkUB"],["b","swamp"]],[],[],[spell("Mark the Shadow",{B:1}),spell("Unlock the Undercroft",{U:1,B:1})]),
 L("10","III · THE LEDGER",3,"Colorless Toll","Generic costs accept any mana, including colorless. Colored requirements are exact.",2,20,[["a","relic"]],[["b","mountain"]],[],[spell("Kindle the Lantern",{R:1}),spell("Settle the Toll",{R:1,N:1})]),
 L("11","III · THE LEDGER",3,"The Last Blue","Generic mana payment can consume any surplus color. Keep what the spell still needs.",2,20,[["a","island"]],[["b","dualUR"]],[],[spell("Read the Chart",{U:1}),spell("Open the Crossing",{R:1,N:1})]),
 L("12","IV · THE DEEP SEARCH",4,"Fetch the Peak","Sacrifice the fetch land, pay 1 life, and choose a compatible land from the reserve. Only one choice leads to the door.",1,3,[["a","fetchUR"]],[],[["b","island"],["c","mountain"]],[spell("Break the Red Seal",{R:1})]),
 L("13","IV · THE DEEP SEARCH",4,"Deeper Extraction","A fetch activation isn't a land play. You need both blue and red on the final turn.",2,4,[["a","fetchUR"]],[["b","island"]],[["c","mountain"]],[spell("Trace the Map",{U:1}),spell("Force the Gate",{U:1,R:1})]),
 L("14","IV · THE DEEP SEARCH",4,"Shock and Awe","You must produce two red mana on the final turn. Spend life for tempo, or fail the deadline.",2,3,[["a","shockUR"]],[["b","island"],["c","mountain"]],[],[spell("Sound the Alarm",{U:1,R:2}),spell("Break Both Locks",{R:2})]),
 L("15","IV · THE DEEP SEARCH",4,"Echo Spell","Some original heist spells untap one land after resolving. Choose which source to refresh.",2,20,[["a","dualUR"]],[["b","island"],["c","mountain"]],[],[spell("Rewind the Mechanism",{U:1,R:1},"untap"),spell("Crack the Beacon",{U:2,R:1})]),
 L("16","V · THE GRAND HEIST",5,"Return to Sender","A bounce land enters tapped and returns one of your other lands to hand. Replay it to reach three simultaneous mana.",4,20,[["a","forest"],["b","bounceUG"]],[["c","island"]],[],[spell("Study the Gate",{U:1}),spell("Mark the Roots",{G:1}),spell("Break the Triple Seal",{U:1,G:1,N:1})]),
 L("17","V · THE GRAND HEIST",5,"The False Shortcut","Both a shock land and a pain land can fix your colors. One costs less life when only one extra blue is needed.",2,4,[["a","shockUR"],["b","painUR"]],[["c","island"],["d","mountain"]],[],[spell("Disarm the Twin Ward",{U:2,R:1}),spell("Slip Through",{U:1,R:1})]),
 L("18","V · THE GRAND HEIST",5,"The Impossible Vault","Three wards. A four-turn deadline. Two black mana in the middle, then white-blue-black at the end. Every land choice matters.",4,6,[["a","painUB"],["b","shockBR"],["c","dualWB"]],[["d","island"],["e","mountain"]],[],[spell("Shatter the Outer Mask",{U:1,R:2}),spell("Buy the Shadow Key",{B:2,R:1}),spell("Crack the Crown",{W:1,U:1,B:1})])
];

// 5 galaxies × 5 worlds × 10 vaults. Every variant preserves a proven
// original puzzle route while introducing alternate land/card decisions.
// The original 18 IDs and their indices are retained for legacy save files.
const GALAXY_DATA=[
 ["THE FIRST SPARK","Foundations of the mana arts",["THE FIRST KEY","FALSE SHORES","LIVING CHANNELS","FIERY CROSSROADS","THE BRONZE GATE"]],
 ["THE SHATTERED MOON","Life and dangerous shortcuts",["THE LEDGER","SCARLET TOLL","THE SHOCK MAZE","ASHEN ESTUARY","THE SILVER VAULT"]],
 ["THE TIDAL NEBULA","Search, tempo and shifting colors",["THE DEEP SEARCH","FLOODED PASSAGE","REFLECTION ENGINE","THE TWILIGHT LOCK","THE PRISMATIC KEEP"]],
 ["THE OBSIDIAN REACH","Punishing decisions",["THE GRAND HEIST","PAINWATER PASS","DUALITY SPIRE","BLACKGLASS SANCTUM","THE HIDDEN CROWN"]],
 ["THE LAST CONSTELLATION","Masters of the vault",["THE IMPOSSIBLE KEY","SEVENFOLD ECHOES","THE CHROMATIC LABYRINTH","THE FINAL CITADEL","THE COSMIC VAULT"]]
];
GALAXY_DATA.push(...MASTERY_GALAXY_DATA);
export const GALAXIES=GALAXY_DATA.map(([name,subtitle],i)=>({
 id:i,name,subtitle,range:[i*50,i*50+49],worldRange:[i*5,i*5+4]
}));
export const CHAPTERS=GALAXY_DATA.flatMap(([galaxyName,,worldNames],g)=>worldNames.map((name,w)=>({
 name,galaxy:g,world:w,range:[g*50+w*10,g*50+w*10+9],
 subtitle:["Landcraft and first choices","Colors and cost","Tempo versus life","Disrupt the seal","Ten-vault showdown"][w]
})));
const DECOYS=["plains","island","mountain","forest","swamp","dualWU","dualUG","dualBR","relic","painUR","checkUR","painBG","shockWU","fetchUR","dualUR"];
const OPENERS=["Violet","Crimson","Fractured","Silver","Azure","Obsidian","Hidden","Prismatic","Midnight","Solar","Luminous","Twilight","Stormbound","Golden","Shifting","Arcane"];
const FINISHERS=["Equation","Interlock","Passage","Convergence","Trial","Resonance","Detour","Horizon","Key","Cipher","Threshold","Paradox","Beacon","Crossing","Seal","Mandate"];
const equivalent={
 island:["island","dualUR","dualWU","dualUG"],
 mountain:["mountain","dualUR","dualBR"],
 plains:["plains","dualWU","dualWB"],
 swamp:["swamp","dualBR","dualWB"],
 forest:["forest","dualUG"],
 relic:["relic","painUR","painUB"]
};
function templateFor(i){
 const galaxy=Math.floor(i/50),world=Math.floor(i/10)%5,stage=i%10;
 if(stage===9&&galaxy>=2)return 14+((world+galaxy)%4);
 const [start,span]=[[2,10],[5,10],[8,10],[11,7],[14,4]][galaxy];
 return start+((i*17+world*7+stage*3)%span);
}
function variant(i){
 const g=Math.floor(i/50),w=Math.floor(i/10)%5,l=i%10;
 const root=BASE_LEVELS[templateFor(i)];
 const clone=list=>list.map(c=>({...c}));
 const hand=clone(root.hand),field=clone(root.field),library=clone(root.library);
 // Substitute one original basic with a strictly more flexible dual. This
 // preserves the original solution because the basic's mana/type remains valid.
 const convertible=[...field,...hand].filter(c=>equivalent[c.card]);
 if(convertible.length&&i%3!==0){
  const picked=convertible[(i*7+w)%convertible.length],alternates=equivalent[picked.card];
  picked.card=alternates[1+(i%Math.max(1,alternates.length-1))]||picked.card;
 }
 // Optional red-herring choices are in hand, never removed from the source
 // route. Each world changes its decoy palette and decision complexity.
 const occupied=new Set([...hand,...field,...library].map(c=>c.id));
 const candidate=DECOYS[(i*13+w*5+g*3)%DECOYS.length];
 if(occupied.size<9){
  hand.push({id:"bonus1",card:candidate});
  occupied.add("bonus1");
 }
 if(g>=2&&l>=6&&occupied.size<10){
  hand.push({id:"bonus2",card:DECOYS[(i*11+3)%DECOYS.length]});
 }
 // Advanced mana sources are integrated into the same land-mana campaign,
 // not a separate game. Existing solution routes are retained: these
 // optional field sources never replace an original required card.
 if(i>=18&&i%11===4&&occupied.size<10){
  const advanced=i<50?["signet","bluffs","solring"]:
   ["signet","bluffs","solring","confluence","coffers","urborg","petal","treasure","lotus","ziggurat"];
  field.push({id:"mana2",card:advanced[(g*3+w+l)%advanced.length]});
 }
 const name=OPENERS[(i+w*3)%OPENERS.length]+" "+FINISHERS[(i*7+g)%FINISHERS.length];
 const galaxyName=GALAXIES[g].name;
 const title=l===9?CHAPTERS[g*5+w].name+": FINAL WARD":name;
 const briefing=galaxyName+" · World "+(w+1)+" of 5, challenge "+(l+1)+
  " of 10. Decide which mana sources to trust. More lands are not always better; timing, colors and life still matter.";
 return {
  ...root,id:"mh-"+String(i+1).padStart(3,"0"),
  chapter:CHAPTERS[g*5+w].name,rank:Math.max(root.rank,Math.min(5,g+1)),
  title,briefing,hand,field,library,
  templateId:root.id,galaxy:g,world:w
 };
}
export const LEVELS=Array.from({length:500},(_,i)=>i>=250?(diverseFor(i)||masteryFor(i)):i<BASE_LEVELS.length?BASE_LEVELS[i]:(capstoneFor(i)||coffersFor(i)||variant(i)));
if(LEVELS.length!==500||CHAPTERS.length!==50||GALAXIES.length!==10)throw Error("Campaign atlas is incomplete");
