import {actions,initial,reduce,key,completed,validate} from "./engine.js";
class Queue{
 constructor(){this.heap=[];}
 add(item){const h=this.heap;h.push(item);let i=h.length-1;while(i){const p=(i-1)>>1;if(h[p].cost<=item.cost)break;h[i]=h[p];i=p;}h[i]=item;}
 take(){const h=this.heap;if(!h.length)return null;const top=h[0],last=h.pop();if(h.length){let i=0;while(true){let c=i*2+1;if(c>=h.length)break;if(c+1<h.length&&h[c+1].cost<h[c].cost)c++;if(h[c].cost>=last.cost)break;h[i]=h[c];i=c;}h[i]=last;}return top;}
 get length(){return this.heap.length;}
}
export function solve(level,{maxStates=200000,startState=null}={}){
 validate(level);
 const start=startState||initial(level),heap=new Queue(),best=new Map([[key(start),0]]);
 const nodes=[{state:start,parent:-1,action:null}];
 heap.add({index:0,cost:0});
 while(heap.length){
  const next=heap.take(),node=nodes[next.index],s=node.state;
  if(completed(level,s)){
   const trace=[];let at=next.index;
   while(nodes[at].parent!==-1){trace.push(nodes[at].action);at=nodes[at].parent;}
   return {status:"solved",turn:s.turn,spentLife:s.spentLife,actions:trace.reverse(),steps:trace.length,explored:best.size};
  }
  for(const act of actions(level,s)){
   const out=reduce(level,s,act);
   if(!out.ok)throw Error("Engine parity broken: "+out.error);
   const n=out.state, k=key(n);
   const cost=(n.turn-1)*1000000+n.spentLife*1000+n.actions;
   if(best.has(k)&&best.get(k)<=cost)continue;
   if(best.size>=maxStates)return {status:"inconclusive",reason:"State bound reached",explored:best.size};
   best.set(k,cost);
   const index=nodes.push({state:n,parent:next.index,action:act})-1;
   heap.add({index,cost});
  }
 }
 return {status:"unsolvable",explored:best.size};
}
export function replay(level,trace){
 let state=initial(level);
 for(const action of trace){const result=reduce(level,state,action);if(!result.ok)return {ok:false,error:result.error,state};state=result.state;}
 return {ok:completed(level,state),state};
}
