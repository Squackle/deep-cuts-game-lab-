// C = structural complexity, D = estimated execution difficulty.
// Both are reproducible, bounded indices calibrated so former final mh-250
// scores 50/100. NOT empirical player success rates or solver-optimality
// claims. Source diversity, paid activation chains, sequencing and multiple
// ward payments—not simply a puzzle's index—drive the scores.
import {LEVELS} from "./levels.js";
import {CARDS} from "./engine.js";
const clamp=(n)=>Math.max(1,Math.min(100,Math.round(n)));
const PAID=new Set(["signet","bluffs","coffers","nykthos"]);
const SPECIAL=new Set(["ritual","pyretic","treasure","petal","solring","signet","bluffs","coffers","nykthos","lotus","urborg","ziggurat"]);
function profile(level){
 const cards=[...level.field,...level.hand,...level.library].map(i=>i.card);
 const special=new Set(cards.filter(k=>SPECIAL.has(k)));
 const modalities=new Set(cards.map(k=>CARDS[k]?.v2||CARDS[k]?.kind));
 const paid=new Set(cards.filter(k=>PAID.has(k)));
 const stages=level.stages.length,turns=level.turnLimit;
 const colors=new Set(level.stages.flatMap(s=>Object.entries(s.cost).filter(([c,v])=>c!=="N"&&v>0).map(([c])=>c)));
 const pips=level.stages.reduce((n,s)=>n+Object.values(s.cost).reduce((a,b)=>a+b,0),0);
 const lifeRisk=cards.some(k=>CARDS[k]?.kind==="pain"||CARDS[k]?.kind==="shock");
 const oneUse=cards.some(k=>["ritual","pyretic","treasure","petal"].includes(k));
 const restricted=cards.some(k=>k==="ziggurat"||k==="command");
 // A reference route's action count is known only for curated certificate
 // families; for older generated cases this is a stated structural estimate.
 const estimatedActions=level.curated==="mana-masteries-2.0"?
  level.mastery.turns*12+stages+level.mastery.turns-1:
  level.curated==="coffers-1.0"?9:
  level.curated==="capstone-1.0"?14:
  3+stages*3+Math.min(level.field.length,5)+(level.hand.length?1:0);
 const complexity=level.field.length*1.15+level.hand.length*.9+
  modalities.size*2.6+special.size*3.3+paid.size*5.2+
  stages*10.8+colors.size*2.1+
  (stages-1)*(paid.size*3.4+Math.max(1,special.size)*1.5)+
  (oneUse?3:0)+(restricted?4:0);
 const difficulty=estimatedActions*2.45+
  colors.size*2.2+pips*.82+stages*5.2+
  paid.size*4.5+Math.max(0,stages-1)*6.5+
  (lifeRisk?3:0)+(oneUse?3:0)+(restricted?5:0);
 return {complexity,difficulty,stages,turns,sourceCount:cards.length,
  paidTypes:paid.size,mechanicTypes:modalities.size,colors:colors.size,
  estimatedActions,lifeRisk,oneUse,restricted,pips};
}
const benchmark=profile(LEVELS[249]);
export function evaluateVault(level){
 const p=profile(level);
 return {
  complexity:clamp(50*p.complexity/benchmark.complexity),
  difficulty:clamp(50*p.difficulty/benchmark.difficulty),
  methodology:"structural complexity and estimated execution difficulty; calibrated at 50 for the previous Galaxy V finale",
  factors:{sources:p.sourceCount,mechanics:p.mechanicTypes,paidActivations:p.paidTypes,
   wards:p.stages,turns:p.turns,coloredRequirements:p.colors,lifeRisk:p.lifeRisk,
   oneUseMana:p.oneUse,restrictedMana:p.restricted},
 };
}
