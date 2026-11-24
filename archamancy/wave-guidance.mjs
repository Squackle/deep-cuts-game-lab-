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

 // Give a nonblocking warning before deliberately overlapping a major boss wave.
 // pendingWaves is the engine's authoritative list of unfinished waves.
export function bossOverlapWarning(game,state,nextWave){
 if(state.phase!=="active"||!["campaign","endless"].includes(state.mode))return "";
 const unfinished=state.pendingWaves?.length||0;
 if(!unfinished)return "";
 const boss=game.waveSpec(nextWave).map(spec=>spec.split(":")[0]).find(kind=>kind!=="titan"&&game.types[kind]?.boss);
 if(!boss)return "";
 const name=game.types[boss].name;
 if(state.onslaught)return "Boss ahead — "+name+" (wave "+nextWave+") joins "+unfinished+" unfinished wave"+(unfinished===1?"":"s")+". Prepare your defenses.";
 return "Boss ahead — "+name+" (wave "+nextWave+"). Calling early overlaps "+unfinished+" unfinished wave"+(unfinished===1?"":"s")+". Clear earlier enemies first if you need breathing room.";
}

// The forecast diagnoses missing persistent counters, not a guaranteed loss. Commander,
// temporary troops, area effects and caldera vents may still handle isolated enemies.
export function counterplayWarning(game,state,nextWave){
 if(!["campaign","endless"].includes(state.mode)||!["ready","active"].includes(state.phase)||nextWave<1||state.mode==="campaign"&&nextWave>25)return "";
 const threats=game.waveSpec(nextWave).map(spec=>game.types[spec.split(":")[0]]);
 const towers=Object.values(state.towers),kind=t=>game.roster[t.kind]?.kind;
 const physical=towers.some(t=>["strike","splash","root","troops"].includes(kind(t))&&t.flightTarget!=="flying");
 const detection=towers.some(t=>["strike","hex","troops"].includes(kind(t)));
 const magic=threats.some(e=>e?.resist>=100)&&!physical;
 const shroud=threats.some(e=>e?.shroud)&&!detection;
 if(!magic&&!shroud)return "";
 const unlocked=k=>!state.locked?.includes(k);
 if(magic&&shroud)return "Magic-immune and shrouded ahead. No physical or detection tower."+(unlocked("judgment")?" Judgment Spire covers both.":" Use physical allies and reveal enemies.");
 if(magic)return "Magic-immune enemies ahead. No physical tower; "+(unlocked("judgment")?"build Judgment Spire or other physical damage.":"use physical troops or unlocked physical towers.");
 return "Shrouded enemies ahead. No detection tower; "+(unlocked("judgment")?"Judgment Spire reveals them.":unlocked("hex")?"Hex Sanctum reveals them.":"nearby allies or damage reveal them.");
}

// Keep advice restricted to cards whose engine target contract requires a troop tower.
// Ward is deliberately absent: it can target another tower and ward allies nearby.
const TROOP_TOWER_CARDS=new Set(["legion","twins","valor","raise","offering","funeral","bloom","forge","rally","bloodrush","verdant","blade"]);
const hasTroopTower=(game,state)=>Object.values(state.towers).some(t=>game.roster[t.kind]?.kind==="troops");
export function troopCardHint(game,state,id){
 return TROOP_TOWER_CARDS.has(id)&&!hasTroopTower(game,state)?"Needs a troop tower. Discard for free to make room for a later draw.":"";
}
export function handCycleHint(game,state){
 if(!["ready","active"].includes(state.phase)||state.hand.length<(state.handMax??5)||hasTroopTower(game,state))return "";
 return state.hand.some(id=>TROOP_TOWER_CARDS.has(id))?"Discard to draw":"";
}
