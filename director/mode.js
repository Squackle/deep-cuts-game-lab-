/**
 * Lab-exclusive Director Mode. Never import from the ranked Hive Run client/server.
 * This harness has no API, account, persistent storage or score submission.
 */
import {start,step,newRun} from "../src/engine.js";
import {createLairRun,completeLairRun,lairBossSpec} from "../src/lair.js";
export const DIRECTOR_ONLY=true;
export const DIRECTOR_MODES=Object.freeze(["hunt","classic"]);
export const DIRECTOR_PHASES=Object.freeze(["first","final","victory"]);
export const DIRECTOR_SEED=209901;
export function createDirectorRun({mode="hunt",boss="broodmother",phase="final"}={}){
 if(!DIRECTOR_MODES.includes(mode))throw Error("Invalid Director game mode");
 if(!DIRECTOR_PHASES.includes(phase))throw Error("Invalid Director phase");
 if(mode==="hunt"&&!lairBossSpec(boss))throw Error("Unknown Director boss");
 const run=mode==="hunt"?createLairRun(boss):newRun({mode:"classic",seed:DIRECTOR_SEED});
 // This marker is exclusively added to the isolated Lab preview object, not the engine.
 run.directorSession=true;
 run.directorBoss=mode==="hunt"?boss:null;
 if(mode==="hunt"){
  run.encounter.phase=phase==="first"?1:run.encounter.phases;
  run.encounter.introMs=0;
  run.encounter.abilityMs=0;
  run.mercy=0;
 }
 if(phase==="victory")return showcaseDirectorVictory(run);
 return start(run);
}
export function jumpDirectorPhase(run){
 if(!run?.directorSession||run.mode!=="hunt"||!run.encounter||run.status!=="running")return false;
 run.encounter.phase=run.encounter.phases;
 run.encounter.introMs=0;run.encounter.abilityMs=0;
 run.encounter.telegraph=null;run.encounter.webs=[];run.encounter.stunMs=0;
 if(run.enemies[0])run.enemies[0].clock=0;
 return true;
}
/** A rehearsal of the proposed celebration, never an actual earned victory. */
export function showcaseDirectorVictory(run){
 if(!run?.directorSession)return false;
 run.status="won";
 run.endReason=run.mode==="classic"?"BROOD TRAIL · PERFECT CLEAR PREVIEW":
  "PREDATOR HUNT · BROODMOTHER VICTORY PREVIEW";
 run.encounter=null;run.queuedEncounter=null;run.enemies=[];
 run.hatchlings=[];run.terrain=run.terrain.filter(t=>t.kind==="rock");
 run.draftOptions=[];run.turnQueue=[];
 return run;
}
export function advanceDirectorRun(run,{invulnerable=true}={}){
 if(!run?.directorSession)throw Error("Only Director Mode can use this unranked harness");
 if(run.status!=="running")return run;
 if(!invulnerable){
  step(run);
 }else{
  // Exercise the original unmodified engine with replenishing temporary shields.
  const priorBody=run.body.map(p=>({...p})),priorHeading=run.direction;
  const shields=run.effects.shield;
  run.effects.shield=Math.max(1,shields);
  step(run);
  if(run.status==="over"){
   // Extreme no-safe-recovery cases also stay inspectable in this harness.
   run.status="running";run.endReason="";run.body=priorBody;
   run.direction=priorHeading;run.turnQueue=[];run.effects.shield=1;
  }else{
   run.effects.shield=Math.max(1,run.effects.shield);
  }
 }
 if(run.mode==="hunt")completeLairRun(run);
 return run;
}
export function directorStatus(run){
 if(!run?.directorSession)return "NOT A DIRECTOR SESSION";
 if(run.status==="won")return "UNRANKED · VICTORY SHOWCASE";
 if(run.status==="over")return "UNRANKED · ENCOUNTER LOST";
 if(run.mode==="classic")return "UNRANKED · BROOD TRAIL";
 return "UNRANKED · "+run.directorBoss.toUpperCase()+" · PHASE "+run.encounter?.phase+"/"+run.encounter?.phases;
}
