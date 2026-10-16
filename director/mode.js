/**
 * Lab-exclusive Director Mode. Never import from the ranked Hive Run client/server.
 * This harness has no API, account, persistent storage or score submission.
 */
import {start,step,newRun} from "../src/engine.js";
import {createLairRun,completeLairRun,lairBossSpec} from "../src/lair.js";
import {reservedTerrain,terrainBlocks} from "../src/environments.js";
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
 run.directorBurger=null;
 run.directorBurgerCollected=0;
 run.directorNotice="";
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
 run.directorBurger=null;
 run.draftOptions=[];run.turnQueue=[];
 return run;
}
/** Key 1 summons an original pixel cheeseburger to a safe, unoccupied tile.
 * It is never a standard game orb and may be collected in either preview mode.
 */
export const DIRECTOR_SUPER_ORB_SEGMENTS=10;
export function spawnDirectorSuperOrb(run){
 if(!run?.directorSession||run.status!=="running")return null;
 const occupied=pos=>run.body.some(p=>p.x===pos.x&&p.y===pos.y)||
  run.enemies.some(e=>e.pos.x===pos.x&&e.pos.y===pos.y)||
  run.hatchlings.some(h=>h.pos.x===pos.x&&h.pos.y===pos.y)||
  (run.food&&run.food.x===pos.x&&run.food.y===pos.y)||
  (run.encounter?.webs||[]).some(w=>w.pos.x===pos.x&&w.pos.y===pos.y)||
  terrainBlocks(run,pos)||reservedTerrain(run,pos);
 const empty=[];
 for(let y=1;y<run.rows-1;y++)for(let x=1;x<run.cols-1;x++){
  const p={x,y};
  if(!occupied(p))empty.push(p);
 }
 if(empty.length===0)return null;
 const pos=empty[Math.floor(run.random()*empty.length)];
 run.directorBurger={...pos};
 run.directorNotice="PIXEL CHEESEBURGER SPAWNED · FIND IT!";
 return {...pos};
}
export function consumeDirectorSuperOrb(run){
 if(!run?.directorSession||!run.directorBurger||run.status==="over")return false;
 const head=run.body[0];
 if(head.x!==run.directorBurger.x||head.y!==run.directorBurger.y)return false;
 run.directorBurger=null;
 // Growth debt extends one additional tail segment on each of the next ten moves.
 // Do not replicate occupied coordinates and create impossible collision geometry.
 run.growthDebt+=DIRECTOR_SUPER_ORB_SEGMENTS;
 run.directorBurgerCollected++;
 run.directorNotice="CHEESEBURGER EATEN · +10 SWARM SEGMENTS";
 return true;
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
 if(run.status!=="over"&&run.status!=="won")consumeDirectorSuperOrb(run);
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
