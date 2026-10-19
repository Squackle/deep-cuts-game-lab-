import {setBiome,tickTerrain,terrainBlocks,reservedTerrain} from "./environments.js";
/**
 * HIVE RUN 0.3 — deterministic Hunt • Trap • Evolve rules.
 * The same module runs in browser, CI and score replay verification.
 */
import {PREY,spawnPrey,advancePrey,same,inside,VECTORS} from "./enemies.js";
import {encounterKind,spawnMiniboss,spawnNextPhase,tickMiniboss,triggerWeb,consumeEncounterFreeze,ABILITIES} from "./miniboss.js";
import {ageHatchlingWards} from "./hatchling-ward.js";
import {isHatchlingAt,hatchMatureEggs,tickHatchlings,clearBroodmotherHatchlings} from "./broodmother-hatchlings.js";
import {compostMoltCost,driftRushMultiplier} from "./mutation-synergies.js";
export const DIRECTIONS=Object.freeze(Object.fromEntries(Object.entries(VECTORS).map(([k,v])=>[k,{x:v[0],y:v[1]}])));
export const COLORS=Object.freeze(["W","U","B","R","G"]);
export const EVOLUTION_COST=5;
export const OPENING_GRACE_MS=9000;
export const OPENING_EVOLUTIONS=2;
export const OPENING_ORB_MIN=70;
export const OPENING_ORB_SPREAD=35;
export const RULES_VERSION="hive-1.5.4";
export const ENDINGS=Object.freeze({PERFECT_CLEAR:"perfect_clear",BROODMOTHER_DEFEATED:"broodmother_defeated",STEP_LIMIT:"step_limit",DEATH:"death",LAIR_PRACTICE:"lair_practice"});
/** Lab balance trial: Predator Hunt focuses on trapping, not filling the board. */
export const HUNT_SWARM_LENGTH=7;
// Player speed is set in milliseconds per grid step (larger = easier).
// Playtest adjustment: about 10% less movement per second at every stage.
export const PLAYER_BASE_TICK_MS=150;
export const PLAYER_MIN_TICK_MS=105;
export const PLAYER_ACCELERATION_MS=4;
export const MUTATIONS=Object.freeze({
 W:{color:"W",name:"Hardened Shell",school:"CARAPACE",icon:"◈",description:"Gain one shield. Survive a fatal impact and evade danger.",short:"+1 shield"},
 U:{color:"U",name:"Temporal Drift",school:"ADAPTATION",icon:"◷",description:"Slow your hive's movement for 28 steps to steer tighter traps.",short:"28 slow steps"},
 B:{color:"B",name:"Emergency Molt",school:"REGENERATION",icon:"✦",description:"Spend a molt charge, briefly shed three segments to dodge death, then regrow them.",short:"+1 molt"},
 R:{color:"R",name:"Blood Rush",school:"FRENZY",icon:"✹",description:"Hunt faster and score double points for 24 movements.",short:"24 frenzy steps"},
 G:{color:"G",name:"Rapid Brood",school:"BROOD",icon:"✿",description:"Your next four captures or orbs each grant bonus evolution energy instead of growth.",short:"4 bonus EV rewards"}
});
export function seededRandom(seed){
 let t=(Number(seed)>>>0)||1;
 return ()=>{t=(t+0x6d2b79f5)>>>0;let x=t;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296};
}
const val=random=>{const n=Number(random());return Number.isFinite(n)?Math.max(0,Math.min(.999999999,n)):0};
export function emptyTile(body,cols,rows,random=Math.random){
 const cells=new Set(body.map(p=>p.x+","+p.y)),free=[];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(!cells.has(x+","+y))free.push({x,y});
 return free.length?free[Math.floor(val(random)*free.length)]:null;
}
export function draftMutationOptions(random=Math.random){
 const remaining=[...COLORS],out=[];
 for(let i=0;i<3;i++)out.push(remaining.splice(Math.floor(val(random)*remaining.length),1)[0]);
 return out;
}
export function newRun({cols=18,rows=22,random,seed,mode="hunt"}={}){
 if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<8||rows<8)throw Error("Invalid arena dimensions");
 if(!["hunt","classic"].includes(mode))throw Error("Invalid game mode");
 const rng=random||((seed===undefined)?Math.random:seededRandom(seed));
 const y=Math.floor(rows/2),x=Math.max(6,Math.floor(cols/2));
 const run={cols,rows,mode,biome:1,terrain:[],hazardMs:0,biomeNoticeMs:0,bossWins:0,random:rng,seed:seed??null,body:Array.from({length:mode==="hunt"?HUNT_SWARM_LENGTH:7},(_,i)=>({x:x-i,y})),
  direction:"right",turnQueue:[],food:null,orbIn:mode==="hunt"?72:145,
  openingGraceMs:mode==="hunt"?OPENING_GRACE_MS:0,
  mercy:mode==="hunt"?1:0,
  score:0,brood:0,kills:0,energy:0,earnedEnergy:0,stage:1,tickMs:PLAYER_BASE_TICK_MS,
  evolutionsChosen:0,draftCount:0,draftOptions:[],mutations:{W:0,U:0,B:0,R:0,G:0},
  effects:{shield:0,molt:0,blueTicks:0,redTicks:0,greenPickups:0},growthDebt:0,
  enemies:[],enemySerial:0,respawnIn:0,runTicks:0,moves:0,saves:0,wards:[],hatchlings:[],hatchlingSerial:0,
  encounter:null,queuedEncounter:null,minibossWins:0,lastEncounter:null,
  status:"ready",outcome:null,endReason:"",lastMutation:null,event:null,eventSerial:0};
 if(mode==="hunt"){const prey=spawnPrey(run);if(prey)run.enemies.push(prey)}
 else run.food=emptyTile(run.body,cols,rows,rng);
 return run;
}
export function start(run){
 if(run.status==="ready"||run.status==="paused")run.status="running";
 return run;
}
export function pause(run){if(run.status==="running")run.status="paused";return run}
export function turn(run,heading){
 if(run.status!=="running"||run.encounter&&(run.encounter.introMs>0||run.encounter.stunMs>0)||!Object.hasOwn(DIRECTIONS,heading)||run.turnQueue.length>=2)return false;
 const last=run.turnQueue.at(-1)??run.direction,a=DIRECTIONS[last],b=DIRECTIONS[heading];
 if(a.x+b.x===0&&a.y+b.y===0)return false;
 if(a.x===b.x&&a.y===b.y)return false;
 run.turnQueue.push(heading);return true;
}
export function chooseMutation(run,color){
 if(run.status!=="draft"||!run.draftOptions.includes(color)||!MUTATIONS[color])return false;
 const e=run.effects;
 run.mutations[color]++;
 if(color==="W")e.shield++;
 if(color==="U")e.blueTicks=Math.min(84,e.blueTicks+28);
 if(color==="B")e.molt++;
 if(color==="R")e.redTicks=Math.min(72,e.redTicks+24);
 if(color==="G")e.greenPickups=Math.min(12,e.greenPickups+4);
 run.evolutionsChosen++;
 run.stage=run.evolutionsChosen+1;
 setBiome(run);
 run.tickMs=Math.max(PLAYER_MIN_TICK_MS,PLAYER_BASE_TICK_MS-Math.floor(run.evolutionsChosen/2)*PLAYER_ACCELERATION_MS);
 run.lastMutation={color,name:MUTATIONS[color].name,move:run.moves};
 run.status="running";run.draftOptions=[];run.turnQueue=[];
 emit(run,{type:"mutation",color,name:MUTATIONS[color].name});
 // Milestones are *completed choices*, never energy or draft openings.
 const kind=run.mode==="hunt"?encounterKind(run.evolutionsChosen):null;
 if(kind){
  if(run.encounter)run.queuedEncounter=kind;
  else if(spawnMiniboss(run,kind))emit(run,{type:"encounter-start",kind,name:ABILITIES[kind].name});
  else run.queuedEncounter=kind;
 }
 if(run.energy>=EVOLUTION_COST){
  run.energy-=EVOLUTION_COST;run.status="draft";run.draftCount++;
  run.draftOptions=draftMutationOptions(run.random);
 }
 return true;
}
export function effectiveTickMs(run){
 return Math.max(65,Math.round(run.tickMs*(run.effects.blueTicks>0?driftRushMultiplier(run):1)*(run.effects.redTicks>0?.78:1)));
}
const emit=(run,event)=>{run.event=event;run.eventSerial++};
/** One authoritative simulation termination, independent of presentation.
 * A 6,000-step boundary is a run limit, not an earned board-fill victory.
 */
function finishRun(run,outcome,reason,event={}){
 if(run.status==="won"||run.status==="over")return false;
 run.outcome=outcome;run.endReason=reason;
 run.status=outcome===ENDINGS.PERFECT_CLEAR||outcome===ENDINGS.BROODMOTHER_DEFEATED?"won":"over";
 run.turnQueue=[];run.draftOptions=[];run.queuedEncounter=null;
 emit(run,{type:run.status==="won"?"victory":outcome===ENDINGS.STEP_LIMIT?"run-limit":"death",outcome,name:reason,...event});
 return true;
}
/** A true perfect clear fills every enterable cell with distinct body cells.
 * Permanent rock islands are excluded; temporary warnings/rifts are not.
 * An orb can be temporarily unspawnable without making the board complete.
 */
export function isPerfectClear(run){
 if(run.mode!=="classic")return false;
 const body=new Set(run.body.map(p=>p.x+","+p.y));
 if(body.size!==run.body.length)return false;
 const rock=new Set(run.terrain.filter(t=>t.kind==="rock"&&t.lifeMs===null)
  .map(t=>t.pos.x+","+t.pos.y));
 for(let y=0;y<run.rows;y++)for(let x=0;x<run.cols;x++){
  const id=x+","+y;
  if(!body.has(id)&&!rock.has(id))return false;
 }
 return true;
}
function decay(run){if(run.effects.blueTicks>0)run.effects.blueTicks--;if(run.effects.redTicks>0)run.effects.redTicks--}
function target(run,heading){
 const d=DIRECTIONS[heading],head=run.body[0],next={x:head.x+d.x,y:head.y+d.y};
 const wall=!inside(run,next)||terrainBlocks(run,next),eating=!!run.food&&same(next,run.food);
 const occupied=eating||run.growthDebt>0?run.body:run.body.slice(0,-1);
 return {next,wall,body:occupied.some(p=>same(p,next)),enemy:run.enemies.some(e=>same(e.pos,next)),hatchling:isHatchlingAt(run,next),eating};
}
function recover(run,failed,freePreyDodge=false){
 const e=run.effects;
 let color=null;
 if(freePreyDodge&&run.mercy>0){run.mercy--;color="G"}
 else if(e.shield>0){e.shield--;color="W"}
 else if(e.molt>0&&run.body.length>=5){
  e.molt--;color="B";
  const shed=compostMoltCost(run);
  if(shed===2)e.greenPickups--;
  const toShed=Math.min(shed,run.body.length-3);
  run.body.splice(run.body.length-toShed,toShed);
  // Hunt has a tactical seven-segment length; a molt shrinks temporarily,
  // then the lost tail returns over the next few safe movement steps.
  if(run.mode==="hunt")run.growthDebt+=toShed;
 }
 if(!color)return false;
 const compass=["up","right","down","left"],i=compass.indexOf(failed);
 const bend=[compass[(i+3)%4],compass[(i+1)%4]].find(h=>{
  const t=target(run,h);return !t.wall&&!t.body&&!t.enemy&&!t.hatchling;
 });
 if(bend){run.direction=bend;run.turnQueue=[]}
 else {
  // Teleport only as defensive emergency fallback, selecting a genuinely
  // unoccupied triple instead of blindly occupying the board center.
  const occupied=[...run.body,...run.enemies.map(e=>e.pos),...run.hatchlings.map(h=>h.pos),...run.terrain.map(t=>t.pos),...(run.encounter?.webs||[]).map(w=>w.pos)];
  if(run.food)occupied.push(run.food);
  let found=null;
  for(let y=2;y<run.rows-1&&!found;y++)for(let x=3;x<run.cols-1&&!found;x++){
   const trial=[{x,y},{x:x-1,y},{x:x-2,y}];
   if(!trial.some(p=>occupied.some(o=>same(p,o))))found=trial;
  }
  if(found){const oldLength=run.body.length;run.body=found;run.growthDebt+=Math.max(0,oldLength-3);run.direction="right";run.turnQueue=[]}
  else{finishRun(run,ENDINGS.DEATH,"No safe recovery tile.");return false}
 }
 run.saves++;emit(run,{type:"rescue",color,name:freePreyDodge?"Brood Instinct":MUTATIONS[color].name});
 decay(run);ageHatchlingWards(run);run.moves++;run.runTicks++;
 return true;
}
function reward(run,{energy,score,growth,type,at,terminal=false}){
 let bonusEnergy=0;
 if(run.effects.greenPickups>0){
  run.effects.greenPickups--;
  // Hunt Green is a progression tool; Brood Trail Green stays a growth tool.
  if(run.mode==="hunt")bonusEnergy=1;
  else run.growthDebt++;
 }
 const awardedEnergy=energy+bonusEnergy;
 run.earnedEnergy+=awardedEnergy;run.energy+=awardedEnergy;
 run.score+=score*(run.effects.redTicks>0?2:1);
 if(run.mode==="classic")run.growthDebt+=growth;
 if(type==="kill")run.kills++;
 emit(run,{type,energy:awardedEnergy,score:score*(run.effects.redTicks>0?2:1),at});
 if(!terminal&&run.energy>=EVOLUTION_COST){
  run.energy-=EVOLUTION_COST;
  run.status="draft";run.draftCount++;
  run.draftOptions=draftMutationOptions(run.random);
  emit(run,{type:"draft",name:"Choose a mutation",from:type});
 }
}
function schedulePrey(run){
 // One ordinary enemy at a time until the third chosen evolution.
 const desired=run.evolutionsChosen>=3?2:1;
 if(run.mode==="classic"||run.encounter||run.queuedEncounter||run.enemies.length>=desired)return;
 if(run.respawnIn>0){run.respawnIn--;return}
 const kind=run.evolutionsChosen>=1&&run.enemies.some(e=>e.kind==="skitter")?"runner":"skitter";
 const prey=spawnPrey(run,kind);
 if(prey){run.enemies.push(prey);run.respawnIn=12}
}
export function orbInterval(run){
 // During the first two evolutions, catch-up energy is easier to acquire.
 if(run.mode==="hunt"&&run.evolutionsChosen<OPENING_EVOLUTIONS)
  return OPENING_ORB_MIN+Math.floor(val(run.random)*OPENING_ORB_SPREAD);
 return 145+Math.floor(val(run.random)*85);
}
function spawnOrb(run){
 if(run.food)return;
 if(run.mode!=="classic"&&--run.orbIn>0)return;
 const exclusions=[...run.body,...run.terrain.map(t=>t.pos),...run.enemies.map(e=>e.pos),...run.hatchlings.map(h=>h.pos),...(run.encounter?.webs||[]).map(w=>w.pos)];
 run.food=emptyTile(exclusions,run.cols,run.rows,run.random);
 if(!run.food&&run.mode==="classic"&&isPerfectClear(run)){
  finishRun(run,ENDINGS.PERFECT_CLEAR,"Every open tile belongs to your brood.");
 }
 // No unoccupied orb tile can exist temporarily due to rifts/terrain.
 // Retry on the next moving beat; never claim a perfect clear on that alone.
 if(run.status==="running"||run.status==="draft")run.orbIn=orbInterval(run); // early hunt: ~10–15s; later: ~20–31s
}
export function step(run){
 if(run.status!=="running")return run;
 if(run.runTicks>=6000){
  finishRun(run,ENDINGS.STEP_LIMIT,"Expedition ended after 6,000 steps. The board was not fully conquered.");
  return run;
 }
 // Intro freezes the arena. A web, however, immobilizes ONLY the player:
 // the Weaver, cooldowns, webs and terrain continue advancing deterministically.
 const elapsed=effectiveTickMs(run);
 if(run.encounter?.awaitSpawn){
  if(!spawnNextPhase(run)){
   const savedLength=run.body.length;
   const cx=Math.floor(run.cols/2),cy=Math.floor(run.rows/2);
   run.body=[{x:cx,y:cy},{x:cx-1,y:cy},{x:cx-2,y:cy}];run.direction="right";run.turnQueue=[];
   run.growthDebt+=Math.max(0,savedLength-3);run.terrain=[];run.food=null;
   spawnNextPhase(run);
  }
  if(run.enemies.length){run.encounter.awaitSpawn=false;emit(run,{type:"boss-phase",kind:run.encounter.kind,phase:run.encounter.phase})}
  run.runTicks++;
  return run;
 }
 if(consumeEncounterFreeze(run,elapsed))return run;
 if(run.queuedEncounter&&!run.encounter&&spawnMiniboss(run,run.queuedEncounter)){
  const kind=run.queuedEncounter;run.queuedEncounter=null;
  emit(run,{type:"encounter-start",kind,name:ABILITIES[kind].name});
  run.runTicks++;return run;
 }
 const webbed=!!(run.encounter?.kind==="weaver"&&run.encounter.stunMs>0);
 if(webbed){
  const e=run.encounter;
  e.stunMs=Math.max(0,e.stunMs-elapsed);
  if(!e.stunMs)e.lastAbility={type:"stun-ended",tick:run.runTicks};
  run.turnQueue=[]; // held or buffered inputs cannot force a death on release
 }
 tickTerrain(run,elapsed);
 if(!webbed){
 const heading=run.turnQueue.shift()??run.direction,t=target(run,heading);
 if(t.wall||t.body||t.enemy||t.hatchling){
  run.direction=heading;
  // Ranked Hunt still forgives ONLY ordinary prey. Unranked Lair practice
  // may instead spend its first free life on boss or hatchling contact.
  // The player is never rescued for a wall or own-body collision.
  const ordinary=run.mode==="hunt"&&!run.encounter&&t.enemy&&
   run.enemies.some(e=>(e.kind==="skitter"||e.kind==="runner")&&same(e.pos,t.next));
  const practiceEnemy=!!run.lairBoss&&(t.enemy||t.hatchling);
  if(recover(run,heading,(ordinary||practiceEnemy)&&run.mercy>0))return run;
  if(run.status==="over")return run; // failed emergency recovery already ended the run
  finishRun(run,ENDINGS.DEATH,t.hatchling?"A hatchling blocked your path.":t.enemy?"A hunter collided with you.":t.wall?"You hit the arena wall.":"You crossed your own swarm.");
  return run;
 }
 run.direction=heading;
 run.body.unshift(t.next);
 if(t.eating)run.food=null;
 if(run.growthDebt>0)run.growthDebt--;else run.body.pop();
 decay(run);ageHatchlingWards(run);run.moves++;run.runTicks++;
 if(t.eating){
  const completesBoard=run.mode==="classic"&&isPerfectClear(run);
  run.brood++;reward(run,{energy:1,score:100,growth:1,type:"orb",at:t.next,terminal:completesBoard});
  run.orbIn=orbInterval(run);
 }
 // Entering a web costs two seconds of movement, not two seconds of combat.
 if(triggerWeb(run,t.next)){emit(run,{type:"web-stun",at:t.next});return run}
 // Brood Trail can fill its very last square on a reward that also opens a draft.
 // Check authentic board occupancy before allowing that draft to interrupt victory.
 if(run.mode==="classic"){spawnOrb(run);return run}
 if(run.status!=="running")return run;
 }else{
  run.runTicks++; // simulation time and enemy actions continue while head is stuck
 }
 // Opening grace advances only when the player can move.
 if(!webbed)run.openingGraceMs=Math.max(0,run.openingGraceMs-elapsed);
 const abilityEvent=tickMiniboss(run,elapsed);
 if(run.encounter?.kind==="broodmother"){
  hatchMatureEggs(run);
  const contact=tickHatchlings(run,elapsed);
  if(contact){
   // A baby spider blindly ran into the head. Normal defenses may still save it.
   run.hatchlings=run.hatchlings.filter(h=>h.id!==contact.id);
   if(recover(run,run.direction,!!run.lairBoss&&run.mercy>0))return run;
   finishRun(run,ENDINGS.DEATH,"A blind hatchling struck your swarm.",{at:contact.pos});
   return run;
  }
 }
 if(abilityEvent?.type==="burrow-warning"||abilityEvent?.type==="burrow"||abilityEvent?.type==="web")
  emit(run,abilityEvent);
 // The body is a moving wall: prey avoid it until forced into collision.
 const survivors=[];
 for(const enemy of run.enemies){
  // A burrow wind-up shows a fixed entrance and target; no gliding while
  // the player watches the telegraph. Enemy still visible and trap-able.
  const encounter=run.encounter;
  const result=encounter?.telegraph&&enemy.kind===encounter.kind?
   {type:"waiting"}:advancePrey(run,enemy);
  if(result.type==="captured"){
   if(encounter&&enemy.kind===encounter.kind){
    if(encounter.kind==="broodmother")clearBroodmotherHatchlings(run);
    if(encounter.phase<encounter.phases){
     encounter.phase++;
     run.lastEncounter={kind:encounter.kind,type:"phase",phase:encounter.phase,at:{...enemy.pos},tick:run.runTicks};
     // Spawn the next phase from a certified safe gate; delay until a gate
     // is free instead of teleporting onto the player's body.
     run.enemies=survivors;
     encounter.telegraph=null;encounter.webs=[];
     if(!spawnNextPhase(run)){encounter.introMs=840;encounter.awaitSpawn=true}
     emit(run,{type:"boss-phase",kind:encounter.kind,phase:encounter.phase});
     return run;
    }
    const kind=encounter.kind;
    run.encounter=null;run.enemies=[];
    const full=encounter.phases===3;
    if(full)run.bossWins++;else run.minibossWins++;run.kills++;
    run.terrain=run.terrain.filter(t=>t.kind==="rock");
    run.lastEncounter={kind,type:"defeat",phase:encounter.phases,at:{...enemy.pos},tick:run.runTicks};
    const earnedFinalVictory=kind==="broodmother"&&run.mode==="hunt"&&
     !run.lairBoss&&run.evolutionsChosen>=12&&encounter.phase===encounter.phases;
    reward(run,{energy:full?8:5,score:full?1500:750,growth:full?3:2,type:full?"boss":"miniboss",at:{...enemy.pos},terminal:earnedFinalVictory});
    if(earnedFinalVictory){
     finishRun(run,ENDINGS.BROODMOTHER_DEFEATED,
      "The Broodmother has fallen. The hive reigns.",{kind,at:{...enemy.pos}});
    }else run.respawnIn=full?36:18;
    return run;
   }
   reward(run,{energy:3,score:300,growth:1,type:"kill",at:{...enemy.pos}});
   run.respawnIn=10;
  }else if(result.type==="escaped"){
   if(encounter&&enemy.kind===encounter.kind){
    // A miniboss must not vanish without giving the player its encounter.
    run.enemies=survivors;
    encounter.introMs=840;encounter.awaitSpawn=true;
    emit(run,{type:"boss-reposition",kind:encounter.kind});
    return run;
   }
   emit(run,{type:"escaped",name:"Prey escaped outside your trap."});
   run.respawnIn=10;
  }else survivors.push(enemy);
 }
 run.enemies=survivors;
 if(run.status==="running"){schedulePrey(run);spawnOrb(run)}
 return run;
}
export function progress(run){
 return {stage:run.stage,untilNext:EVOLUTION_COST-run.energy,speedMs:effectiveTickMs(run),drafts:run.draftCount,
  energy:run.energy,kills:run.kills,evolutions:run.evolutionsChosen,minibossWins:run.minibossWins,encounter:run.encounter?.kind||null};
}
export function activeEffects(run){
 const e=run.effects,a=[];
 if(e.shield)a.push({color:"W",count:e.shield,label:e.shield+" shield"+(e.shield===1?"":"s")});
 if(e.blueTicks)a.push({color:"U",count:e.blueTicks,label:e.blueTicks+" slow steps"});
 if(e.molt)a.push({color:"B",count:e.molt,label:e.molt+" molt"+(e.molt===1?"":"s")});
 if(e.redTicks)a.push({color:"R",count:e.redTicks,label:e.redTicks+" frenzy steps"});
 if(e.greenPickups)a.push({color:"G",count:e.greenPickups,label:e.greenPickups+(run.mode==="hunt"?" bonus EV captures":" bonus growth orbs")});
 return a;
}
