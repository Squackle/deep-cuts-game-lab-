// Distinct legal-source families for the *existing* 250 mastery IDs.
// An ID is never shuffled or deleted. Prior revised scores require versioned
// results because this changes the actual puzzle, not just its illustration.
import {VERSION} from "./engine.js";
const item=(id,card)=>({id,card});
const base={
 tide:[
  "island","island","island","dualUR","dualWU","lotus",
  "arcane","nyxlotus","relic","mindstone","forest"
 ],
 prism:[
  "relic","thran","signet","prism","arcane","bluffs",
  "gilded","lotus","nyxlotus","lantern","mindstone","island","plains"
 ],
 geyser:[
  "mountain","mountain","mountain","island","plains","mindstone",
  "thran","arcane","gilded","prism","relic","lantern","nyxlotus"
 ],
 rite:[
  "mountain","mountain","island","plains","forest","thran",
  "arcane","gilded","prism","relic","nyxlotus","lantern"
 ],
 key:[
  "mountain","mountain","island","plains","relic","thran",
  "basalt","key","gilded","arcane","mindstone","prism","worn"
 ]
};
function resourceCost(family,cycle,half,moreRed=0){
 if(family==="tide")return half===0?{U:7,R:1,C:1,G:1}:half===1?{U:6,W:1,C:1}:{U:13,R:1,W:1,C:1};
 if(family==="prism")return half===0?{B:2,R:3,U:2,W:1,G:3,C:1}:half===1?
  {B:1,R:2,U:2,W:2,G:2,C:1}:{W:2,U:4,R:5,G:5};
 if(family==="geyser")return half===0?{R:5+moreRed,B:3,U:1,W:1,G:1}:half===1?
  {R:4,B:3,U:1,W:1,G:1,C:1}:{R:9+moreRed,B:5-moreRed,U:1,W:1};
 if(family==="rite")return half===0?{R:4+cycle,B:2,U:1,W:1,G:1,C:1}:half===1?
  {R:4,B:1,U:1,W:1,G:2,C:2}:{R:8+cycle,B:3-cycle,U:2,W:1,G:1,C:1};
 return half===0?{R:5,U:1,W:1,C:4}:{R:4,U:1,W:1,C:5};
}
const familyLabels={
 tide:"THE ISLAND TIDE",prism:"THE CHROMATIC WORKS",geyser:"OPPONENT'S FURNACE",
 rite:"THE GROWING FLAME",key:"THE MONOLITH LOCK"
};
export const DIVERSE_FAMILIES=Object.freeze(Object.keys(base));
export function diverseFor(i){
 if(!Number.isInteger(i)||i<250||i>=500)return null;
 const galaxy=Math.floor(i/50),world=Math.floor(i/10)%5,position=i%10;
 // The black mana family remains the fifth, minority archetype in G VII–X.
 const family=["tide","prism","geyser",galaxy===5?"key":null,"rite"][world];
 if(!family)return null;
 const turns=galaxy===5?1:galaxy<=7?2:3,wardCount=galaxy===5?2:galaxy===6?3:galaxy===7?4:galaxy===8?5:6;
 const field=base[family].map((card,n)=>item("f"+n,card)),hand=[],spell=family==="tide"?"tide":family==="prism"?"pyretic":family==="geyser"?"geyser":family==="rite"?"rite":"song";
 if(family==="tide"&&position%2===1)field.find(f=>f.id==="f10").card="painBG";
 if(family==="prism"){
  if(position%2===1)field.find(f=>f.id==="f10").card="vessel";
  if(position%3===2)field.find(f=>f.id==="f12").card="dualWU";
  if(position%3===1)spell="desperate";
 }
 if(family==="rite"&&position%2===1)field.find(f=>f.id==="f8").card="cylix";
 for(let n=0;n<turns;n++){
  hand.push(item("h"+n,spell));
  if(n>0&&["prism","geyser","rite"].includes(family))field.push(item("f"+(13+n),"treasure"));
 }
 if(["prism","geyser","rite"].includes(family))field.push(item("f13","treasure"));
 const stages=[];
 let slot=0;
 for(let round=0;round<turns;round++){
  const count=round*2+1<wardCount?2:1;
  for(let half=0;half<count;half++){
   const cost=resourceCost(family,round,count===1?2:half,family==="geyser"?position%3:0);
   stages.push({name:["Unlock the Source","Break the Circuit","Unseal the Memory","Crack the Engine","Release the Pressure","Unbind the Nexus"][slot++],cost});
  }
 }
 const id="mh-"+String(i+1).padStart(3,"0");
 const special=family==="tide"?"Cast High Tide before tapping Islands. Even an Island tapped for red can add extra blue.":
  family==="prism"?"Pay the Signet and Lens, then use Cascade Bluffs to make two blue. Pyretic or Desperate Ritual is an actual instant with its own cost.":
  family==="geyser"?"Mana Geyser depends on the opponent's tapped lands, not yours. Count them before choosing your red mana allocation.":
  family==="rite"?"Rite of Flame strengthens as previous copies enter graveyards. Later turns need those additional red mana units.":
  "Basalt Monolith does not untap normally. Spend one mana on Voltaic Key to untap it, then use its three colorless mana again.";
 return {
  id,version:VERSION,chapter:familyLabels[family],rank:5,galaxy,world,
  revision:3,curated:"mana-diversity-3.0",
  title:id==="mh-500"?"THE FINAL MANA CIRCUIT":familyLabels[family]+" · "+String(position+1).padStart(2,"0"),
  briefing:special+" Make the right colors across "+wardCount+" wards.",
  life:family==="tide"&&position%2===1?turns+1:20,turnLimit:turns,
  field,hand,library:[],stages,
  ...(family==="geyser"?{opponentTappedLands:8+position%3}:{}),
  ...(["tide","prism","geyser","rite"].includes(family)?{devotion:family==="tide"?{U:3}:family==="prism"?{G:3}:family==="geyser"?{B:3}:{R:5}}:{}),
  ...(family==="prism"?{commanderColors:["W","U","B","R","G"]}:{}),
  mastery:{family,turns,wards:wardCount,world,position,uniqueMechanic:family==="tide"?"island-extra-mana":family==="prism"?"paid-color-network":family==="geyser"?"opponent-tapped-lands":family==="rite"?"graveyard-scaling":"artifact-untap"}
 };
}
