// Read-only authoring review. Exact board similarity is a review flag, not
// proof of equivalent strategy or empirical difficulty.
import {validateScenario,createGame,tapLand,activate,autoplay} from "./engine.js";
import {referenceSubsetEvidence} from "./strategy-trials.js";
import {searchStrategy,replayStrategy} from "./strategy-search.js";
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==="object"?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
export function authoringFingerprint(p){
 const ids=new Map();
 for(const [zone,items] of [["land",p.lands],["unit",p.units],["stack",p.stack],["hand",p.hand]])items.forEach((x,i)=>ids.set(x.id,zone+i));
 const ref=id=>ids.get(id)||id;
 const zone=items=>items.map(x=>({...x,id:ref(x.id),...(x.targetId?{targetId:ref(x.targetId)}:{}),...(x.sourceId?{sourceId:ref(x.sourceId)}:{})}));
 return JSON.stringify(stable({version:p.version,life:p.life,mana:p.mana,activeActor:p.activeActor,phase:p.phase,opponentPolicy:p.opponentPolicy,
  lands:zone(p.lands),units:zone(p.units),stack:zone(p.stack),hand:zone(p.hand),objective:{...p.objective,...(p.objective.unitId?{unitId:ref(p.objective.unitId)}:{})}}));
}
export function reviewBoards(boards,{graph=true,maxStates=3000,maxEdges=20000}={}){
 const seen=new Map(),ids=new Set(),rows=[];
 for(const p of boards){
  const validation=validateScenario(p),flags=[];
  if(ids.has(p?.id))flags.push("DUPLICATE_ID");ids.add(p?.id);
  if(!validation.valid){rows.push({id:p?.id,status:"invalid",errors:validation.errors,flags});continue;}
  const fingerprint=authoringFingerprint(p),similar=seen.get(fingerprint);
  if(similar)flags.push("SAME_BOARD_AS:"+similar);else seen.set(fingerprint,p.id);
  let referenceOK=false,noResponseWins=false;
  try{
   noResponseWins=autoplay(createGame(p)).status==="won";
   let s=createGame(p);for(const l of s.lands)if(!l.tapped)s=tapLand(s,l.id);
   if(Array.isArray(p.solution)&&p.solution.length){for(const [id,target,payment] of p.solution)s=activate(s,id,target,payment??null);referenceOK=autoplay(s).status==="won";}
  }catch{}
  if(noResponseWins)flags.push("NO_RESPONSE_WINS");
  if(!referenceOK)flags.push("INVALID_OR_MISSING_REFERENCE");
  const subset=referenceSubsetEvidence(p);
  if(subset.avoidablyLong)flags.push("SHORTER_REFERENCE_SUBSET");
  const search=graph?searchStrategy(p,{maxStates,maxEdges}):null;
  if(search?.witness&&replayStrategy(p,search.witness).status!=="won")throw Error("Unreplayable witness "+p.id);
  if(search?.status==="inconclusive")flags.push("GRAPH_INCONCLUSIVE");
  if(search?.status==="unsolvable")flags.push("GRAPH_UNSOLVABLE");
  rows.push({id:p.id,status:referenceOK?"reference-valid":"reference-invalid",flags,referenceOK,noResponseWins,subset,graph:search});
 }
 return {scope:"Exact ordered board similarity and legal reference replay; graph results conditional on budgets; no human difficulty rating.",budgets:{maxStates,maxEdges},rows};
}
