import {applyAction,initialState,legalActions,stateKey,validateLevel} from "./engine.js";
// Every legal action has unit cost. BFS gives an optimal solution or an explicit limit result.
export function solve(level,{maxStates=60000}={}){
  validateLevel(level);
  const start=initialState(level);
  const visited=new Set([stateKey(start)]);
  const nodes=[{state:start,parent:-1,action:null}];
  for(let i=0;i<nodes.length;i++){
    const node=nodes[i];
    if(node.state.opened){
      const actions=[];let j=i;
      while(nodes[j].parent!==-1){actions.push(nodes[j].action);j=nodes[j].parent;}
      return {status:"solved",moves:actions.length,actions:actions.reverse(),explored:visited.size};
    }
    for(const action of legalActions(level,node.state)){
      const result=applyAction(level,node.state,action);
      if(!result.ok)throw Error("Reducer rejected its own legal action");
      const key=stateKey(result.state);
      if(visited.has(key))continue;
      if(visited.size>=maxStates)return {status:"inconclusive",reason:"Search limit reached",explored:visited.size};
      visited.add(key);
      nodes.push({state:result.state,parent:i,action});
    }
  }
  return {status:"unsolvable",explored:visited.size};
}
export function replay(level,actions){
  let state=initialState(level);
  for(const action of actions){
    const result=applyAction(level,state,action);
    if(!result.ok)return {ok:false,error:result.error,state};
    state=result.state;
  }
  return {ok:state.opened,state,error:state.opened?null:"Vault remains locked"};
}
