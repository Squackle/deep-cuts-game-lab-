// All 500 route profiles plus a declared representative state-graph sample.
// No game UI, score, save, telemetry or production integration.
import {LEVELS,BASE_LEVELS} from "./levels.js";
import {VERSION} from "./engine.js";
import {createReferenceCache,referenceFor} from "./readiness-audit.js";
import {evaluateVault} from "./difficulty-metrics.js";
import {profileReferenceRoute} from "./route-decision-profile.js";
import {analyzeStrategy,STRATEGY_GRAPH_VERSION} from "./strategy-graph.js";
export function representativeLevels(levels=LEVELS){
 const picked=new Set(BASE_LEVELS.map(p=>p.id)),families=new Set();
 for(const p of levels){
  const family=p.revision?[p.curated,p.mastery?.family||"",p.revision].join(":"):null;
  if(family&&!families.has(family)){families.add(family);picked.add(p.id);}
 }
 for(let i=49;i<levels.length;i+=50)picked.add(levels[i].id);
 return levels.filter(p=>picked.has(p.id));
}
export function campaignDecisionAudit({graphIds=representativeLevels().map(p=>p.id),maxStates=3000,maxEdges=60000,onProgress=()=>{}}={}){
 const ids=new Set(graphIds);
 if(ids.size!==graphIds.length||graphIds.some(id=>!LEVELS.some(p=>p.id===id)))throw new Error("Unknown or duplicate graph puzzle IDs");
 for(const value of [maxStates,maxEdges])if(!Number.isSafeInteger(value)||value<1)throw new RangeError("Invalid graph budget");
 const cache=createReferenceCache(),rows=[];
 for(const [i,level] of LEVELS.entries()){
  const reference=referenceFor(level,cache);
  if(reference.proof?.status!=="solved")throw new Error("Missing legal reference: "+level.id);
  const profile=profileReferenceRoute(level,reference.proof.actions),rating=evaluateVault(level);
  const graph=ids.has(level.id)?analyzeStrategy(level,{maxStates,maxEdges}):null;
  if(graph?.status==="complete")profileReferenceRoute(level,graph.route); // Verify every graph witness against the reducer too.
  rows.push({id:level.id,galaxy:Math.floor(i/50)+1,family:level.mastery?.family||level.curated||level.templateId||"original",
   legacyEstimatedDifficulty:rating.difficulty,referenceKind:reference.kind,profile,graph});
  onProgress({index:i+1,id:level.id,graph:graph?.status||"not-selected"});
 }
 const complete=rows.filter(r=>r.graph?.status==="complete");
 const summary={vaults:rows.length,legalReferenceReplays:rows.filter(r=>r.profile.legalReplay).length,
  graphSelected:ids.size,graphComplete:complete.length,
  graphInconclusive:rows.filter(r=>r.graph?.status==="inconclusive").length,
  graphUnsolvable:rows.filter(r=>r.graph?.status==="unsolvable").length,
  humanPlaytests:0,empiricalDifficulty:"not-calibrated"};
 if(summary.graphUnsolvable)throw new Error("Complete graph contradicts a replayed reference");
 return {format:"mana-heist-campaign-decisions",version:1,engineVersion:VERSION,analysisVersion:STRATEGY_GRAPH_VERSION,
  scope:"All 500 legal reference routes; complete graphs only for the explicit selected IDs. Reference menus are descriptions, not proven strategic choices. No scalar human-difficulty score.",
  budgets:{maxStates,maxEdges},selectedIds:[...ids],summary,rows};
}
export function campaignDecisionSummary(report){
 const galaxies=Array.from({length:10},(_,g)=>{
  const rows=report.rows.filter(r=>r.galaxy===g+1);
  const mean=fn=>Math.round(100*rows.reduce((s,r)=>s+fn(r),0)/Math.max(1,rows.length))/100;
  return {galaxy:g+1,vaults:rows.length,meanEstimatedDifficulty:mean(r=>r.legacyEstimatedDifficulty),
   meanReferenceActions:mean(r=>r.profile.actions),meanChoiceVisits:mean(r=>r.profile.choiceVisits),
   meanDistinctMenus:mean(r=>r.profile.distinctChoiceMenus),meanConsecutiveWardCasts:mean(r=>r.profile.longestConsecutiveWardCasts)};
 });
 return {format:report.format,version:report.version,engineVersion:report.engineVersion,analysisVersion:report.analysisVersion,
  scope:report.scope,budgets:report.budgets,summary:report.summary,galaxies,
  graphs:report.rows.filter(r=>r.graph).map(({id,legacyEstimatedDifficulty,profile,graph})=>({id,legacyEstimatedDifficulty,
   referenceActions:profile.actions,referenceChoiceMenus:profile.distinctChoiceMenus,
   graphStatus:graph.status,reason:graph.reason||null,states:graph.states,edges:graph.edges,metrics:graph.metrics}))};
}
