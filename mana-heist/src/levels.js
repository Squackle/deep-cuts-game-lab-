import {VERSION} from "./engine.js";
const cards=list=>list.map(([id,card])=>({id,card}));
const spell=(name,cost,effect)=>({name,cost,...(effect?{effect}:{})});
const L=(id,chapter,rank,title,briefing,turnLimit,life,hand,field,library,stages)=>({
 id:"mh-"+id,version:VERSION,chapter,rank,title,briefing,turnLimit,life,hand:cards(hand),field:cards(field),library:cards(library),stages
});
export const LEVELS=[
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
export const CHAPTERS=[
 {name:"THE FIRST KEY",range:[0,2],subtitle:"Learn to channel"},
 {name:"FALSE SHORES",range:[3,6],subtitle:"Two colors, one choice"},
 {name:"THE LEDGER",range:[7,10],subtitle:"Life, tempo & mana"},
 {name:"THE DEEP SEARCH",range:[11,14],subtitle:"Dig, check & sequence"},
 {name:"THE GRAND HEIST",range:[15,17],subtitle:"Expert-level puzzles"}
];
