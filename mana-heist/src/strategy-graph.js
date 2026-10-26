// Offline analysis of the existing reducer. A complete graph proves engine
// reachability, not human difficulty or full Magic rules fidelity.
import {initial,actions,reduce,key,completed,validate,lookup} from "./engine.js";
export const STRATEGY_GRAPH_VERSION="mh-strategy-graph-1";
const cardKey=(level,id)=>lookup(level,id)?{card:lookup(level,id).card,charge:level.charges?.[id]||0}:null;
const costEntries=cost=>Object.entries(cost||{}).filter(([,n])=>n!==0).sort(([a],[b])=>a.localeCompare(b));
export function commitmentSignature(level,state,action){
 const spend=Array.isArray(action.spend)?action.spend.map(id=>state.manaUnits.find(u=>u.id===id)?.color).sort():action.spend?costEntries(action.spend):undefined;
 // Coarse menu-pattern description only. Never used to merge engine states.
 // Charges matter even on two otherwise identical card identities.
 return JSON.stringify({type:action.type,card:cardKey(level,action.id),color:action.color,
  mode:action.mode,output:action.output,spend,shock:action.shock,
  target:cardKey(level,action.targetId),
  returned:cardKey(level,action.returnId),untap:cardKey(level,action.untapId||action.untapTarget),
  ward:action.type==="cast"?{cost:costEntries(level.stages[state.stage].cost),effect:level.stages[state.stage].effect,spellType:level.stages[state.stage].spellType||"sorcery"}:undefined});
}
export function choiceMenu(level,state,moves){
 return [...new Set(moves.filter(a=>a.type!=="end").map(a=>commitmentSignature(level,state,a)))].sort();
}
function reach(nodes,seeds){
 const marked=new Uint8Array(nodes.length),queue=[...seeds];
 for(const i of queue)marked[i]=1;
 for(let p=0;p<queue.length;p++)for(const prior of nodes[queue[p]].prev)if(!marked[prior]){marked[prior]=1;queue.push(prior);}
 return marked;
}
function minimumCommitments(nodes,winning,cost){
 // Reverse 0/1 shortest path. End-turn actions are measured separately from
 // productive commitments, so every extra deadline does not add a decision.
 const distance=Array(nodes.length).fill(Infinity),buckets=[[]];
 nodes.forEach((n,i)=>{if(n.win){distance[i]=0;buckets[0].push(i);}});
 for(let d=0;d<buckets.length;d++){
  const bucket=buckets[d]||[];
  for(let j=0;j<bucket.length;j++){
   const at=bucket[j];if(distance[at]!==d)continue;
   for(const p of nodes[at].prev){
    if(!winning[p])continue;
    for(const edge of nodes[p].next.filter(e=>e.to===at)){
     const next=d+(edge.action.type==="end"?0:cost[p]);
     if(next<distance[p]){distance[p]=next;(buckets[next]??=[]).push(p);}
    }
   }
  }
 }
 return distance[0];
}
export function analyzeStrategy(level,{maxStates=3000,maxEdges=60000}={}){
 validate(level);
 for(const [name,value] of Object.entries({maxStates,maxEdges}))if(!Number.isSafeInteger(value)||value<1)throw new RangeError("Invalid "+name);
 const start=initial(level),nodes=[{state:start,next:[],prev:[],parent:-1,move:null,win:false}],seen=new Map([[key(start),0]]);
 let edges=0;
 const bounded=reason=>({version:STRATEGY_GRAPH_VERSION,status:"inconclusive",reason,states:nodes.length,edges,metrics:null,route:null});
 for(let at=0;at<nodes.length;at++){
  const node=nodes[at];node.win=completed(level,node.state);
  if(node.win)continue;
  const successors=new Set();
  for(const action of actions(level,node.state)){
   const out=reduce(level,node.state,action);if(!out.ok)throw new Error("Engine action parity failed");
   const signature=key(out.state);let to=seen.get(signature);
   if(to===undefined){
    if(nodes.length>=maxStates)return bounded("state-budget");
    to=nodes.length;seen.set(signature,to);
    nodes.push({state:out.state,next:[],prev:[],parent:at,move:action,win:false});
   }
   if(successors.has(to))continue;
   if(edges>=maxEdges)return bounded("edge-budget");
   successors.add(to);edges++;node.next.push({to,action});nodes[to].prev.push(at);
  }
 }
 const targets=nodes.flatMap((n,i)=>n.win?[i]:[]),winning=reach(nodes,targets);
 if(!winning[0])return {version:STRATEGY_GRAPH_VERSION,status:"unsolvable",states:nodes.length,edges,metrics:null,route:null};
 const advance=level.stages.map((_,stage)=>reach(nodes,nodes.flatMap((n,i)=>n.state.stage>stage?[i]:[])));
 const critical=[],deferred=[];
 for(const node of nodes){
  const choices=node.next.filter(e=>e.action.type!=="end");
  const wins=choices.filter(e=>winning[e.to]).length;
  critical.push(Number(wins>0&&wins<choices.length));
  deferred.push(Number(wins>0&&choices.some(e=>!winning[e.to]&&advance[node.state.stage]?.[e.to])));
 }
 // BFS insertion order gives one shortest ACTION route. This reference is
 // distinct from the lower bounds across ALL winning routes below.
 let at=targets[0],route=[],referenceCritical=0,referenceDeferred=0,prematureEnds=0;
 const patterns=new Set();
 while(nodes[at].parent!==-1){
  const p=nodes[at].parent,node=nodes[p],move=nodes[at].move;
  route.push(move);
  if(move.type!=="end"&&critical[p]){
   referenceCritical++;referenceDeferred+=deferred[p];
   // Names, stage number and instance IDs are cosmetic for menu repetition.
   // Winning/losing labels distinguish a changed resource obligation.
   patterns.add(JSON.stringify([...new Set(node.next.filter(e=>e.action.type!=="end").map(e=>commitmentSignature(level,node.state,e.action)+":"+winning[e.to]))].sort()));
  }
  if(node.next.some(e=>e.action.type==="end"&&!winning[e.to]))prematureEnds++;
  at=p;
 }
 route.reverse();
 return {version:STRATEGY_GRAPH_VERSION,status:"complete",states:nodes.length,edges,route,
  metrics:{shortestActions:route.length,
   minimumCriticalCommitments:minimumCommitments(nodes,winning,critical),
   minimumDeferredCommitments:minimumCommitments(nodes,winning,deferred),
   referenceCriticalCommitments:referenceCritical,referenceDeferredCommitments:referenceDeferred,
   referenceDecisionPatterns:patterns.size,referencePrematureEndOpportunities:prematureEnds}};
}
