// Cheap, exact observations of ONE supplied legal reference trace. These do
// not establish that its choices are necessary, unique, optimal or difficult.
import {initial,actions,reduce,completed} from "./engine.js";
import {choiceMenu} from "./strategy-graph.js";
export function profileReferenceRoute(level,trace){
 if(!Array.isArray(trace))throw new TypeError("Expected reference actions");
 let state=initial(level),singleOption=0,choiceVisits=0,castRun=0,maxCastRun=0;
 const menus=new Set(),kinds={};
 for(const move of trace){
  const legal=actions(level,state);
  const out=reduce(level,state,move);
  if(!out.ok)throw new Error("Invalid reference route: "+out.error);
  const menu=choiceMenu(level,state,legal);
  if(move.type!=="end"){
   if(menu.length===1)singleOption++;
   if(menu.length>1){choiceVisits++;menus.add(JSON.stringify(menu));}
  }
  kinds[move.type]=(kinds[move.type]||0)+1;
  castRun=move.type==="cast"?castRun+1:0;maxCastRun=Math.max(maxCastRun,castRun);
  state=out.state;
 }
 if(!completed(level,state))throw new Error("Reference route does not finish the vault");
 return {legalReplay:true,actions:trace.length,turns:state.turn,spentLife:state.spentLife,
  actionKinds:kinds,choiceVisits,distinctChoiceMenus:menus.size,
  repeatedChoiceMenus:choiceVisits-menus.size,singleOptionCommitments:singleOption,
  longestConsecutiveWardCasts:maxCastRun};
}
