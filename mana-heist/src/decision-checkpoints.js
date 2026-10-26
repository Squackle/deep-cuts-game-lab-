// Authored review points. Every alternative is drawn from the real engine;
// these are representative decision probes, not exhaustive puzzle ratings.
import {actions,initial,reduce} from "./engine.js";
export function checkpoint(level,prefix,select){
 let state=initial(level);
 for(const predicate of prefix){
  const move=actions(level,state).find(predicate);
  if(!move)throw new Error("Invalid checkpoint prefix: "+level.id);
  state=reduce(level,state,move).state;
 }
 return {state,alternatives:actions(level,state).filter(select)};
}
const tap=(id,color)=>a=>a.type==="tap"&&a.id===id&&a.color===color;
const source=id=>a=>(a.type==="tap"||a.type==="activate")&&a.id===id;
const plays=a=>a.type==="play";
export const DECISION_CHECKPOINTS=[
 {level:0,concept:"exact colors",prefix:[],select:source("dual")},
 {level:1,concept:"reserve a flexible source",prefix:[],select:source("dual")},
 {level:2,concept:"fund a filter without losing its output",prefix:[tap("blue1","U")],select:source("filter")},
 {level:3,concept:"life budget across turns",prefix:[],select:plays},
 {level:4,concept:"land order under coupled life and filter constraints",prefix:[],select:plays}
];
