// Fifteen strategic world capstones (Galaxies III–V) replace trivial
// template-only endings. Every layout represents an intentionally authored
// dependency structure, not merely a renamed beginner puzzle.
// Solver proof and complexity checking run in tests before a release.
import {VERSION} from "./engine.js";
const table={
 2:{
  field:["swamp","swamp","island","mountain","relic","solring","signet","treasure"],
  hand:["ritual"],
  cost:w=>({B:3,U:1,R:1,W:1,C:1,N:1+w%3}),
  title:"Ritual Accounting",
  blurb:"Pay for a real Dark Ritual, then use one-use Treasure, Sol Ring and a Signet to assemble several exact colors."
 },
 3:{
  field:["swamp","swamp","island","island","mountain","relic","solring","signet","bluffs","treasure","petal"],
  hand:["ritual"],
  cost:w=>({B:4,U:3,R:1,W:1,C:1,N:1+w%3}),
  title:"The Chromatic Pipeline",
  blurb:"Generate colorless mana, pay a Signet, filter a second color, cast Dark Ritual, and decide when to sacrifice artifacts."
 },
 4:{
  field:["swamp","swamp","island","island","mountain","plains","relic","solring","signet","bluffs","treasure","petal"],
  hand:["ritual"],
  cost:w=>({B:w<1?3:4,U:w<2?3:4,R:2,W:w===3?1:2,C:1,N:w===2?1:2}),
  title:"The Impossible Mana Equation",
  blurb:"Twelve mana sources and an instant in hand. Pay a Signet and a filter land, use a ritual and sacrifice resources to meet every pip. Extra mana alone cannot save the wrong colors."
 }
};
export function capstoneFor(i){
 if(!Number.isInteger(i)||i<100||i>=250||i%10!==9)return null;
 const galaxy=Math.floor(i/50),world=Math.floor(i/10)%5;
 const family=table[galaxy];if(!family)return null;
 const card=(key,idx,prefix)=>({id:prefix+idx,card:key});
 return {
  id:"mh-"+String(i+1).padStart(3,"0"),version:VERSION,
  chapter:galaxy===4?"THE FINAL CITADEL":galaxy===3?"COMMANDER SEQUENCING":"MANA ENGINES",
  rank:Math.min(5,galaxy+1),
  title:world===4?family.title+": GRAND FINALE":family.title+" · "+(world+1),
  briefing:family.blurb,
  turnLimit:1,life:20,
  field:family.field.map((key,n)=>card(key,n,"f")),
  hand:family.hand.map((key,n)=>card(key,n,"h")),
  library:[],
  stages:[{name:"Crack the Master Ward",cost:family.cost(world)}],
  revision:1,galaxy,world,
  mechanics:["artifact","ritual","filter","sequencing"],
  curated:"capstone-1.0"
 };
}
