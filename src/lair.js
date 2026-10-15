/** Isolated, deterministic, unranked boss practice; never imported by score replay. */
import {newRun,PLAYER_BASE_TICK_MS,PLAYER_MIN_TICK_MS,PLAYER_ACCELERATION_MS} from "./engine.js";
import {spawnMiniboss,ABILITIES} from "./miniboss.js";
import {setBiome} from "./environments.js";
import {BRIEFINGS} from "./boss-briefing.js";
export const LAIR_BOSSES=Object.freeze([
 Object.freeze({id:"stalker",evolution:2,seed:401821}),
 Object.freeze({id:"warden",evolution:4,seed:401822}),
 Object.freeze({id:"weaver",evolution:6,seed:401823}),
 Object.freeze({id:"guardian",evolution:8,seed:401824}),
 Object.freeze({id:"broodmother",evolution:12,seed:401825})
]);
export const isLairChallenge=(mode,challenge)=>mode==="hunt"&&challenge==="practice";
export const lairBossSpec=kind=>LAIR_BOSSES.find(boss=>boss.id===kind)||null;
export function createLairRun(kind,cols=18,rows=22){
 const spec=lairBossSpec(kind);
 if(!spec)throw Error("Unknown Lair boss");
 const run=newRun({cols,rows,seed:spec.seed,mode:"hunt"});
 run.enemies=[];run.food=null;run.orbIn=10000000;run.respawnIn=0;
 run.energy=0;run.earnedEnergy=0;run.evolutionsChosen=spec.evolution;run.stage=spec.evolution+1;
 run.tickMs=PLAYER_BASE_TICK_MS; // Identical real-time movement cadence across all five Lair bosses.
 run.openingGraceMs=0;run.mercy=0;
 setBiome(run);run.biomeNoticeMs=0;
 if(!spawnMiniboss(run,kind))throw Error("No safe spawn for Lair boss");
 run.lairBoss=kind;
 return run;
}
export function completeLairRun(run){
 if(!run?.lairBoss||!run.lastEncounter||run.lastEncounter.kind!==run.lairBoss||
  run.lastEncounter.type!=="defeat"||run.status==="over"||run.status==="won")return false;
 run.status="won";run.endReason=BRIEFINGS[run.lairBoss].name+" defeated. The Lair is yours.";
 run.draftOptions=[];run.energy=0;run.turnQueue=[];return true;
}
export function lairDetails(kind){
 const spec=lairBossSpec(kind);
 return spec?{name:BRIEFINGS[kind].name,ability:ABILITIES[kind].ability,
  captures:ABILITIES[kind].phases,tip:BRIEFINGS[kind].tip,
  biome:Math.min(4,Math.floor(spec.evolution/4)+1)}:null;
}
