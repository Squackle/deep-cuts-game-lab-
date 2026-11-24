// Offline diagnostic for the existing Classic rules subset. No UI, score,
// campaign, daily manifest or replay contract is changed. A finite search
// of this engine is not a proof about full Magic or human difficulty.
import {CARDS,LANDS} from './cards.js';
import {createGame,tapLand,playLand,activate,pass,legalActions,legalTargets,paymentOptions} from './engine.js';
export const STRATEGY_SEARCH_VERSION='sb-strategy-search-1';
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const signature=x=>JSON.stringify(stable(x));
// Only the narrative log is discarded. Keep step count (engine cap),
// battlefield/stack order, resource identities and all gameplay flags.
function stateKey(s){
 const {log,...game}=s;
 return signature({...game,used:[...game.used].sort()});
}
function legalMoves(s){
 if(s.status!=='playing')return [];
 const moves=[{type:'pass'}];
 for(const l of s.lands)if(!l.tapped&&l.controller==='player'&&LANDS[l.card]?.mana)moves.push({type:'tap',id:l.id});
 if(s.activeActor==='player'&&s.phase==='main'&&!s.stack.length&&!s.landPlayed)
  for(const a of s.hand)if(!s.used.includes(a.id)&&LANDS[a.card]&&!a.sourceId)moves.push({type:'land',id:a.id});
 for(const id of legalActions(s)){
  const a=s.hand.find(x=>x.id===id);
  const options=a.sourceId?[{spend:null}]:paymentOptions(s,CARDS[a.card].cost);
  // The existing payment enumerator caps its result. Do not present a
  // truncated payment space as exhaustive, even if it contains a win.
  if(options.length>=65)throw Error('payment-budget');
  for(const target of legalTargets(s,a))for(const p of options)moves.push({type:'activate',id,target,payment:p.spend});
 }
 return moves;
}
function apply(s,m){
 if(m.type==='pass')return pass(s);
 if(m.type==='tap')return tapLand(s,m.id);
 if(m.type==='land')return playLand(s,m.id);
 if(m.type==='activate')return activate(s,m.id,m.target,m.payment);
 throw Error('unknown diagnostic move');
}
export function replayStrategy(scene,route){
 let s=createGame(scene);
 for(const move of route)s=apply(s,move);
 return s;
}
export function searchStrategy(scene,{maxStates=3000,maxEdges=20000,reverseActions=false}={}){
 for(const [name,n] of Object.entries({maxStates,maxEdges}))if(!Number.isSafeInteger(n)||n<1)throw new RangeError('Invalid '+name);
 const start=createGame(scene),nodes=[{state:start,prev:[],next:[],parent:-1,move:null}],seen=new Map([[stateKey(start),0]]);
 let edges=0,winner=-1;
 const routeTo=i=>{
  const route=[];while(i>=0&&nodes[i].parent!==-1){route.push(nodes[i].move);i=nodes[i].parent;}
  return route.reverse();
 };
 const result=(status,reason=null)=>({version:STRATEGY_SEARCH_VERSION,status,reason,states:nodes.length,edges,
  witness:winner<0?null:routeTo(winner),metrics:null});
 for(let at=0;at<nodes.length;at++){
  const node=nodes[at];
  if(node.state.status!=='playing')continue;
  let moves;
  try{moves=legalMoves(node.state);}catch(e){return result('inconclusive',e.message==='payment-budget'?'payment-budget':'unsupported-action');}
  if(reverseActions)moves.reverse();
  const successors=new Set();
  for(const move of moves){
   let next;try{next=apply(node.state,move);}catch{return result('inconclusive','unsupported-transition');}
   const key=stateKey(next);let to=seen.get(key);
   if(to===undefined){
    if(nodes.length>=maxStates)return result('inconclusive','state-budget');
    to=nodes.length;seen.set(key,to);
    nodes.push({state:next,prev:[],next:[],parent:at,move});
    if(winner<0&&next.status==='won')winner=to;
   }
   if(successors.has(to))continue;
   if(edges>=maxEdges)return result('inconclusive','edge-budget');
   successors.add(to);edges++;node.next.push(to);nodes[to].prev.push(at);
  }
 }
 const winning=new Set(),queue=[];
 nodes.forEach((node,i)=>{if(node.state.status==='won'){winning.add(i);queue.push(i);}});
 for(let at=0;at<queue.length;at++)for(const prior of nodes[queue[at]].prev)if(!winning.has(prior)){winning.add(prior);queue.push(prior);}
 if(!winning.has(0))return result('unsolvable');
 const root=nodes[0].next,winningFirst=root.filter(i=>winning.has(i)).length;
 return {...result('complete'),metrics:{shortestActions:routeTo(winner).length,firstDistinctSuccessors:root.length,
  winningFirstSuccessors:winningFirst,losingFirstSuccessors:root.length-winningFirst}};
}
