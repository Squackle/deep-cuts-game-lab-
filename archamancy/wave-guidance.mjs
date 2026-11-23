// Pure player guidance for the first flying wave; never changes combat rules or unlocks.
import {FLIGHT_CAPABLE} from "./engine.mjs";

export function firstFlyerWarning(game,state,nextWave){
 if(state.mode!=="campaign"||nextWave!==4||!game.waveSpec(nextWave).some(x=>game.types[x.split(":")[0]]?.flying))return "";
 const towers=Object.values(state.towers);
 const canHitFlyers=t=>FLIGHT_CAPABLE.includes(game.roster[t.kind]?.kind)&&t.flightTarget!=="ground"||
  t.kind==="beast"&&t.tier>=3&&t.branch==="A";
 const ready=towers.filter(canHitFlyers);
 if(ready.length)return "Wave 4 brings flying enemies. "+ready.length+" tower"+(ready.length===1?" can":"s can")+" hit flyers. Check their road coverage before calling.";
 if(towers.some(t=>FLIGHT_CAPABLE.includes(game.roster[t.kind]?.kind)&&t.flightTarget==="ground"))
  return "Wave 4 brings flying enemies! Your anti-air tower targeting is set to Ground. Switch it to Both or Flying before calling.";
 const unlocked=k=>!state.locked?.includes(k);
 const starter=unlocked("arcanum")?"Build Arcanum (available from Level 1)":unlocked("storm")?"Build a Storm Engine":unlocked("judgment")?"Build a Judgment Spire":"Use an anti-air spell or unlocked tower";
 const reach=unlocked("beast")?" Beast Pack gains Reach at Tier III.":"";
 return "Wave 4 brings flying enemies! Ground-only towers and troops cannot hit them. "+starter+" before calling."+reach;
}
