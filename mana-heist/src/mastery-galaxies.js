// Mastery expansion. The original mh-001–mh-250, including the prior final
// challenge mh-250, retain their index, ID, save keys and complete board.
// New Galaxies VI–X use certified two-spell mana circuits that evolve from
// one demanding turn to five linked spells over three turns.
import {VERSION} from "./engine.js";
export const MASTERY_GALAXY_DATA=[
 ["THE ASTRAL FORGE","Two spells, one pool: build complete conversion networks",["THE EMBER CIRCUIT","RAINBOW THRESHOLD","RITUAL LEDGER","THE SUNDERED FILTER","THE PAID KEY"]],
 ["THE SAPPHIRE MAELSTROM","Life and payment constraints meet repeated mana circuits",["PAINWATER MACHINE","THE ECHO CHAMBER","FOUR-COLOR TRIAL","THE SIGNET CHAIN","THE SEVENFOLD LOCK"]],
 ["THE OBSIDIAN CLOCK","Build the engine, spend it, then rebuild it next turn",["THE NEXT-TURN TRAP","SHADOW REFLECTIONS","CROSS-TURN PLANNING","EXPENSIVE SHORTCUTS","THE RECURSIVE VAULT"]],
 ["THE PARADOX ENGINE","Multiple wards force repeated conversion and resource planning",["THE DOUBLE HEIST","BLACK-MANA ACCOUNTING","TRIPLE CONVERSION","THE LONG CIRCUIT","BEYOND THE HORIZON"]],
 ["THE ETERNAL CITADEL","Six demanding wards across three turns",["THE OUTER GATE","THE CELESTIAL LEDGER","THE GRAVITY WELL","THE FINAL RECKONING","THE GRAND MANA HEIST"]]
];
const card=(id,kind)=>({id,card:kind});
const base=[
 card("f0","swamp"),card("f1","swamp"),card("f2","island"),card("f3","island"),
 card("f4","mountain"),card("f5","plains"),card("f6","relic"),card("f7","solring"),
 card("f8","signet"),card("f9","bluffs"),card("f10","treasure"),
 card("f12","coffers"),card("f13","urborg")
];
export function masteryFor(i){
 if(!Number.isInteger(i)||i<250||i>=500)return null;
 const galaxy=Math.floor(i/50),world=Math.floor(i/10)%5,position=i%10,advanced=galaxy-5;
 const turns=galaxy===5?1:galaxy<=7?2:3;
 const wards=galaxy===5?2:galaxy===6?3:galaxy===7?4:galaxy===8?5:6;
 const field=base.map(x=>({...x})),hand=[];
 // Five rule-consistent families: the chosen replacement retains its
 // necessary certificate color, but changes alternative legal choices.
 const variants=[
  ["f5","dualWU"],["f4","painUR"],["f3","painUB"],
  ["f2","dualUG"],["f1","dualWB"]
 ];
 const [id,variant]=variants[world];
 field.find(x=>x.id===id).card=variant;
 for(let cycle=0;cycle<turns;cycle++){
  if(cycle>0)field.push(card("f"+(13+cycle),"treasure"));
  hand.push(card("h"+cycle,"ritual"));
 }
 // Natural decoys and alternate routes emerge at later positions.
 // Artifact additions never change Urborg's Swamp count.
 const extra=position>=5?1:0;
 if(extra&&field.length+hand.length<22)field.push(card("d0",position%2?"petal":"treasure"));
 if(position>=8&&field.length+hand.length<22)field.push(card("d1","petal"));
 const stageCosts=[];
 for(let n=0;n<wards;n++){
  const first=n%2===0;
  // Each turn's pair must collectively consume 14B, 4U, 2R and 1W.
  // The player must feed Signet and Coffers with exactly three C, filter
  // an Island via Cascade Bluffs, and cast an actual Dark Ritual.
  const black=7+((position+world+advanced)%3);
  const blue=1+((position+world)%3);
  const red=(position+world+n)%2;
  const white=(position+world)%2;
  const cost=first?
   {B:black,U:blue,R:red,...(white?{W:1}:{})}:
   {B:14-black,U:4-blue,R:2-((position+world+n-1)%2),...(!white?{W:1}:{})};
  stageCosts.push({name:"Disarm "+["the Outer Seal","the Inner Circuit","the Echo Gate","the Lunar Seal","the Eternal Ward","the Final Nexus"][n],cost});
 }
 const code=String(i+1).padStart(3,"0");
 const last=i===499;
 return {
  id:"mh-"+code,version:VERSION,chapter:MASTERY_GALAXY_DATA[advanced][2][world],
  rank:5,galaxy,world,revision:2,curated:"mana-masteries-2.0",
  title:last?"THE ETERNAL CITADEL · FINAL MANA HEIST":
   ["Chromatic Double-Cast","The Life-Fueled Forge","Black-Mana Recursion","The Three-Turn Ledger","The Master Circuit"][world]+
   " · "+String(position+1).padStart(2,"0"),
  briefing:"Charge the Signet and Coffers, filter blue through Cascade Bluffs, cast a Dark Ritual from hand, and divide your colored mana across "+wards+" wards in "+turns+" turn"+(turns===1?"":"s")+". Every new turn requires rebuilding your circuit. Card choices matter.",
  turnLimit:turns,life:20,hand,field,library:[],stages:stageCosts,
  mastery:{profile:"paid-conversion+coffers+ritual",turns,wards,world,position}
 };
}
