import {missingMana,MANA_NAMES} from "./ward-feedback.js";

// A level's turn limit is part of its puzzle, not a timer to extend.
// UI hints must never recommend "end turn" when the reducer forbids it.
export function isFinalTurn(level,state){
 return state.turn>=level.turnLimit;
}
export function requiredManaText(level,state){
 const cost=level.stages[state.stage]?.cost||{};
 const missing=missingMana(state.pool,cost);
 const entries=Object.entries(missing);
 return entries.map(([color,amount])=>amount+" "+(MANA_NAMES[color]||color)+" mana").join(" and ");
}
export function finalTurnMessage(level,state){
 const needed=requiredManaText(level,state);
 return "Turn "+state.turn+" / "+level.turnLimit+" is the final permitted turn. "+
  (needed?"This ward still needs "+needed+". ":"")+
  "There is no next turn to untap lands. Undo your last move or Restart to try a different mana choice.";
}
export function tappedLandMessage(level,state){
 if(isFinalTurn(level,state))
  return "This land is tapped. "+finalTurnMessage(level,state);
 return "This land is tapped. End your turn to untap it.";
}
