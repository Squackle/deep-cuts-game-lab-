// Pure player guidance for the first flying wave; never changes combat rules or unlocks.
import {FLIGHT_CAPABLE} from "./engine.mjs";

const COLOR_NAMES={W:"White",U:"Blue",B:"Black",R:"Red",G:"Green"};
// A sold tower still counts toward the actual trial, so do not infer eligibility from the current board alone.
export function monoTowerColor(game,state){const history=[...Object.values(state.towers),...(state.towerHistory||[])];const colors=new Set(history.map(t=>game.roster[t.kind]?.color));return colors.size===1&&COLOR_NAMES[[...colors][0]]?[...colors][0]:null;}
function airAdvice(game,state,color){const unlocked=k=>!state.locked?.includes(k);const choice={W:["judgment","Judgment Spire; reserve Crown of Arrows for air"],U:["arcanum","Arcanum or Deep Freeze"],B:["hex","Hex Sanctum; use curses against flyers"],R:["storm","Storm Engine; Chain Tempest handles groups"],G:["beast","Beast Pack at Tier III (Reach); fund it before more Groves and rally on the road"]}[color];return choice&&unlocked(choice[0])?choice[1]:color==="U"&&unlocked("mirror")?"Mirrorworks":"available air-capable allies or ground-targeted damage spells";}
const airReady=(game,t)=>FLIGHT_CAPABLE.includes(game.roster[t.kind]?.kind)&&t.flightTarget!=="ground"||t.kind==="beast"&&t.tier>=3&&t.branch==="A";
export function firstFlyerWarning(game,state,nextWave){
 if(state.mode!=="campaign"||nextWave!==4||!game.waveSpec(nextWave).some(x=>game.types[x.split(":")[0]]?.flying))return "";
 const towers=Object.values(state.towers);
 const ready=towers.filter(t=>airReady(game,t));
 if(ready.length)return "Wave 4 brings flying enemies. "+ready.length+" tower"+(ready.length===1?" can":"s can")+" hit flyers. Check their road coverage before calling.";
 if(towers.some(t=>FLIGHT_CAPABLE.includes(game.roster[t.kind]?.kind)&&t.flightTarget==="ground"))
  return "Wave 4 brings flying enemies! Your anti-air towers prioritize ground enemies but can still hit flyers. Switch to Both or Flying first for stronger air coverage.";
 const color=monoTowerColor(game,state);
 if(color)return "Wave 4 brings flying enemies! Mono-"+COLOR_NAMES[color]+": use "+airAdvice(game,state,color)+". Other tower colors invalidate the trial.";
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

// The owner's Black Confluence run lost 16 HP before wave 5 cleared after rapid early calls.
// Warn rather than restrict ordinary wave calls; Onslaught retains its automatic cadence.
export function earlyOverlapWarning(game,state,nextWave){
 if(state.phase!=="active"||!["campaign","endless"].includes(state.mode)||state.mode==="campaign"&&nextWave>25)return "";
 const n=state.pendingWaves?.length||0;if(!n||nextWave>5&&n<2)return "";
 return "Wave "+nextWave+" overlaps "+n+" unfinished wave"+(n===1?"":"s")+". "+(state.onslaught?"Let the timer run unless your defenses are ready.":"Wait for the road to clear if your defenses are struggling.");
}
// The forecast diagnoses missing persistent counters, not a guaranteed loss. Commander,
// temporary troops, area effects and caldera vents may still handle isolated enemies.
export function counterplayWarning(game,state,nextWave){
 if(!["campaign","endless"].includes(state.mode)||!["ready","active"].includes(state.phase)||nextWave<1||state.mode==="campaign"&&nextWave>25)return "";
 const threats=game.waveSpec(nextWave).map(spec=>game.types[spec.split(":")[0]]);
 const towers=Object.values(state.towers),kind=t=>game.roster[t.kind]?.kind;
 const physical=towers.some(t=>(["strike","splash","root","troops"].includes(kind(t))||game.bonus(t,"physicalEcho")) );
 const detection=towers.some(t=>["strike","hex","troops"].includes(kind(t))||game.bonus(t,"reveal"));
 const magic=threats.some(e=>e?.resist>=100)&&!physical;
 const shroud=threats.some(e=>e?.shroud)&&!detection;
 const color=monoTowerColor(game,state);
 const armorCounter=towers.some(t=>(["arcane","mirror","chain","hex"].includes(kind(t))||game.bonus(t,"pierce")||game.bonus(t,"toxic")||game.bonus(t,"smite")) );
 const armor=!!color&&threats.some(e=>e?.armor>=100)&&!armorCounter;
 const flyers=!!color&&nextWave!==4&&threats.some(e=>e?.flying)&&!towers.some(t=>airReady(game,t));
 if(!magic&&!shroud&&!armor&&!flyers)return "";
 const unlocked=k=>!state.locked?.includes(k);
 if(color){
  const physicalAdvice={W:unlocked("judgment")?"Judgment Spire or Legion soldiers":"physical allies",U:unlocked("mirror")?"Endless Reflections (Mirrorworks III) provides physical counterplay":"Urza Constructs or other physical allies",B:unlocked("necropolis")?"Necropolis troops":"physical allies",R:unlocked("pyre")?"Pyre Battery or goblin troops":"physical allies",G:unlocked("beast")?"Beast Den or Thornheart":"physical allies"}[color];
  const revealAdvice={W:unlocked("judgment")?"Judgment Spire reveals enemies":"nearby allies or damage",U:unlocked("arcanum")?"Deep Freeze (Arcanum III) reveals enemies":"nearby allies or damage",B:unlocked("hex")?"Hex Sanctum reveals enemies":"nearby allies or damage",R:unlocked("goblin")?"rally goblins near the road, or reveal with area damage":"nearby allies or damage",G:unlocked("beast")?"rally beasts near the road, or reveal with area damage":"nearby allies or damage"}[color];
  const armorAdvice={W:unlocked("judgment")?"Titan Slayer / Godpiercer (Judgment III/IV)":"magical damage spells",U:airAdvice(game,state,color),B:unlocked("hex")?"Hex Sanctum curses and magic":"magical damage spells",R:unlocked("storm")?"Storm Engine lightning or burn spells":"magical damage spells",G:unlocked("thorn")?"Venom Thicket (Thornheart III) pierces armor with poison":"magical damage spells"}[color];
  return "Mono-"+COLOR_NAMES[color]+": "+[magic?"magic immunity — "+physicalAdvice:"",shroud?"shroud — "+revealAdvice:"",armor?"physical immunity — "+armorAdvice:"",flyers?"flyers — "+airAdvice(game,state,color):""].filter(Boolean).join("; ")+". Other tower colors invalidate the trial.";
 }
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
 return state.hand.some(id=>TROOP_TOWER_CARDS.has(id))?"Discard for next draw":"";
}
