import {actions} from "./engine.js";
export function manualCastOptions(level,state){
 return actions(level,state).filter(a=>a.type==="cast");
}
// History contains the state immediately BEFORE each action. Only automatic
// casts are consequences; a manual Cast is a deliberate independent move.
export function popUndoFrame(history){
 let previous=history.pop();
 while(previous?.automatic===true&&history.length)previous=history.pop();
 return previous;
}
