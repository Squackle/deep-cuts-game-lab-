// Offline authoring gate; no storage, telemetry, campaign mutation or network.
import {validate,VERSION} from "./engine.js";
import {solve} from "./solver.js";
import {boardFingerprint,replayPhysicalReference} from "./readiness-audit.js";
import {analyzeStrategy} from "./strategy-graph.js";
export function reviewAuthoredBoards(boards,{maxStates=3000,maxEdges=60000,solverStates=65000,graph=true}={}){
 for(const n of [maxStates,maxEdges,solverStates])if(!Number.isSafeInteger(n)||n<1)throw RangeError("Invalid review budget");
 const ids=new Set(),fingerprints=new Map(),rows=[];
 for(const level of boards){
  const flags=[];if(ids.has(level?.id))flags.push("DUPLICATE_ID");ids.add(level?.id);
  try{validate(level);}catch(e){rows.push({id:level?.id,status:"invalid",flags,error:e.message});continue;}
  const fingerprint=boardFingerprint(level),other=fingerprints.get(fingerprint);
  if(other)flags.push("SAME_BOARD_AS:"+other);else fingerprints.set(fingerprint,level.id);
  const reference=Array.isArray(level.referenceActions)?{status:"solved",actions:level.referenceActions}:solve(level,{maxStates:solverStates});
  let certificate=null;
  if(reference.status==="solved"){
   certificate=replayPhysicalReference(level,reference.actions);
   if(!certificate.ok)flags.push("INVALID_PHYSICAL_CERTIFICATE");
  }else flags.push(reference.status==="inconclusive"?"REFERENCE_INCONCLUSIVE":"REFERENCE_UNSOLVABLE");
  const search=graph?analyzeStrategy(level,{maxStates,maxEdges}):null;
  if(search?.status==="inconclusive")flags.push("GRAPH_INCONCLUSIVE");
  if(search?.status==="unsolvable")flags.push("GRAPH_UNSOLVABLE");
  if(search?.route&&!replayPhysicalReference(level,search.route).ok)flags.push("INVALID_GRAPH_PHYSICAL_WITNESS");
  if(search?.status==="complete"&&search.metrics.shortestCriticalCommitments.max===0)flags.push("NO_CONSEQUENTIAL_SHORTEST_COMMITMENT");
  rows.push({id:level.id,status:certificate?.ok?"reference-valid":reference.status==="inconclusive"?"inconclusive":"reference-invalid",
   flags,referenceActions:reference.actions?.length??null,certificateError:certificate?.error||null,
   graph:search?{status:search.status,reason:search.reason||null,states:search.states,edges:search.edges,metrics:search.metrics}:null});
 }
 return {engine:VERSION,budgets:{maxStates,maxEdges,solverStates},scope:"Read-only board similarity, physical route replay and bounded engine graph; no empirical rating.",rows};
}
