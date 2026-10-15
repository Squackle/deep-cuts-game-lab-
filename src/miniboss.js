import {reservedTerrain,warnTerrain} from "./environments.js";
/**
 * Alpha 0.4: deterministic two-capture miniboss encounters.
 * Only simulation milliseconds advance timers, never Date.now or animation frames.
 * HUD-only presentation is isolated in boss-art.js.
 */
import {spawnPrey,same,inside,reachableArea,HEADINGS,VECTORS} from "./enemies.js";

export const ABILITIES=Object.freeze({
 warden:Object.freeze({name:"HATCHERY WARDEN",ability:"BROOD SEAL",cooldownMs:10000,phases:3,icon:"seal"}),
 guardian:Object.freeze({name:"RIFT GUARDIAN",ability:"RIFT PULSE",cooldownMs:4000,phases:3,icon:"rift"}),
 stalker:Object.freeze({name:"BURROW STALKER",ability:"BURROW DASH",cooldownMs:10000,phases:2,icon:"burrow"}),
 weaver:Object.freeze({name:"TUNNEL WEAVER",ability:"WEB SNARE",cooldownMs:5000,phases:2,icon:"web"}),
 broodmother:Object.freeze({name:"BROODMOTHER",ability:"EGG BLOOM",cooldownMs:6500,phases:3,icon:"egg"})
});
export const WEB_LIFETIME_MS=15000;
export const WEB_STUN_MS=2000;
export const BURROW_RANGE=5;
export const TELEGRAPH_MS=500;
export const INTRO_MS=840;
export const MAX_WEBS=3;

const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const occupied=(run,p,id=null)=>run.body.some(b=>same(p,b))||
 run.enemies.some(e=>e.id!==id&&same(p,e.pos))||
 !!run.food&&same(p,run.food);
const available=(run,p,id=null)=>inside(run,p)&&!reservedTerrain(run,p)&&!isEnemyWeb(run,p)&&!occupied(run,p,id);
export function encounterKind(evolutions){
 if(evolutions===12)return "broodmother"; // Fifth boss at a new full-boss milestone.
 if(evolutions>=2&&evolutions%4===2)return evolutions%8===2?"stalker":"weaver";
 if(evolutions>=4&&evolutions%4===0)return evolutions%8===4?"warden":"guardian";
 return null;
}
export function spawnMiniboss(run,kind){
 if(!ABILITIES[kind]||run.encounter)return false;
 const backup=run.enemies;
 run.enemies=[];const newEnemy=spawnPrey(run,kind);
 if(!newEnemy){run.enemies=backup;return false}
 run.encounter={kind,phase:1,phases:ABILITIES[kind].phases,clockMs:0,abilityMs:0,stunMs:0,
  introMs:INTRO_MS,telegraph:null,webs:[],lastAbility:null};
 run.enemies=[newEnemy];run.respawnIn=0;
 return true;
}
export function spawnNextPhase(run){
 const encounter=run.encounter;
 if(!encounter)return false;
 run.enemies=[];
 const enemy=spawnPrey(run,encounter.kind);
 if(!enemy)return false;
 enemy.period=4; // All bosses share the same movement cadence in every phase.
 run.enemies=[enemy];
 encounter.abilityMs=0;
 encounter.introMs=INTRO_MS;
 encounter.telegraph=null;
 encounter.stunMs=0;
 encounter.webs=[];
 encounter.lastAbility=null;
 return true;
}
export function isEnemyWeb(run,p){
 return !!run.encounter?.webs.some(web=>same(web.pos,p));
}
export function triggerWeb(run,at){
 const e=run.encounter;
 if(!e||e.kind!=="weaver")return false;
 const i=e.webs.findIndex(web=>same(web.pos,at));
 if(i<0)return false;
 e.webs.splice(i,1);
 e.stunMs=WEB_STUN_MS;
 e.lastAbility={type:"snare",at:{...at},tick:run.runTicks};
 return true;
}
export function dashCandidates(run,enemy){
 const candidates=[];
 for(let dy=-BURROW_RANGE;dy<=BURROW_RANGE;dy++){
  const dx=BURROW_RANGE-Math.abs(dy);
  for(const xDelta of dx===0?[0]:[-dx,dx]){
   const pos={x:enemy.pos.x+xDelta,y:enemy.pos.y+dy};
   if(!available(run,pos,enemy.id))continue;
   // Landing must allow an immediate safe move, so no ambush softlocks.
   const exits=HEADINGS.filter(dir=>{
    const [vx,vy]=VECTORS[dir],tile={x:pos.x+vx,y:pos.y+vy};
    return available(run,tile,enemy.id);
   }).length;
   if(exits<2||distance(pos,run.body[0])<4)continue;
   const area=reachableArea(run,pos,enemy.id);
   candidates.push({pos,score:area*.2+distance(pos,run.body[0])*.6+exits*2+run.random()*1.5});
  }
 }
 return candidates.sort((a,b)=>b.score-a.score);
}
export function selectWebTile(run,enemy){
 const candidates=[];
 for(const dir of HEADINGS){
  const [vx,vy]=VECTORS[dir],pos={x:enemy.pos.x+vx,y:enemy.pos.y+vy};
  if(!available(run,pos,enemy.id)||isEnemyWeb(run,pos))continue;
  // Warn near an enemy, never place a trap underneath an existing player tile.
  const dist=distance(pos,run.body[0]);
  candidates.push({pos,score:6-Math.min(dist,10)*.24+run.random()});
 }
 candidates.sort((a,b)=>b.score-a.score);
 return candidates[0]?.pos||null;
}
export function abilityState(run){
 const e=run.encounter;
 if(!e)return null;
 const spec=ABILITIES[e.kind];
 const ready=e.abilityMs>=spec.cooldownMs;
 return {kind:e.kind,name:spec.ability,charge:Math.min(1,e.abilityMs/spec.cooldownMs),
  remainingMs:Math.max(0,spec.cooldownMs-e.abilityMs),
  ready,phase:e.phase,phases:e.phases,introMs:e.introMs,stunMs:e.stunMs};
}
/** Progress cooldown, web life and telegraph only during active pursuit. */
export function tickMiniboss(run,dt){
 const e=run.encounter;
 if(!e)return null;
 if(e.introMs>0)return null; // Web snare does not halt the Weaver or its powers.
 e.clockMs+=dt;
 for(const web of e.webs)web.lifeMs-=dt;
 e.webs=e.webs.filter(web=>web.lifeMs>0);
 const enemy=run.enemies.find(b=>b.kind===e.kind);
 if(!enemy)return null;
 if(e.telegraph){
  e.telegraph.remainingMs-=dt;
  if(e.telegraph.remainingMs>0)return null;
  const {pos}=e.telegraph;
  e.telegraph=null;
  if(available(run,pos,enemy.id)&&distance(pos,enemy.pos)===BURROW_RANGE&&
   distance(pos,run.body[0])>=4){
   enemy.pos={...pos};enemy.clock=0;
   e.abilityMs=0;
   e.lastAbility={type:"burrow",at:{...pos},tick:run.runTicks};
   return e.lastAbility;
  }
  // If player reached the marked tile, cancel burrow instead of crushing them.
  return {type:"burrow-cancel"};
 }
 e.abilityMs=Math.min(ABILITIES[e.kind].cooldownMs,e.abilityMs+dt);
 if(e.abilityMs<ABILITIES[e.kind].cooldownMs)return null;
 if(e.kind==="stalker"){
  const candidate=dashCandidates(run,enemy)[0];
  if(!candidate)return null;
  e.telegraph={pos:candidate.pos,from:{...enemy.pos},remainingMs:TELEGRAPH_MS};
  return {type:"burrow-warning",at:candidate.pos};
 }
 if(e.kind==="broodmother"){
  const x=enemy.pos.x,y=enemy.pos.y;
  const petals=[{x:x-2,y},{x:x+2,y},{x,y:y-2},{x,y:y+2}];
  warnTerrain(run,petals,"egg",900,3200);
  e.abilityMs=0;e.lastAbility={type:"boss-power",at:{...enemy.pos},tick:run.runTicks};
  return e.lastAbility;
 }
 if(e.kind==="warden"||e.kind==="guardian"){
  const x=enemy.pos.x,y=enemy.pos.y;
  const positions=e.kind==="warden"?
   (e.phase%2?[{x:x-1,y:y+2},{x,y:y+2},{x:x+1,y:y+2}]:[{x:x+2,y:y-1},{x:x+2,y},{x:x+2,y:y+1}]):
   [{x:x-2,y},{x:x+2,y},{x,y:y-2},{x,y:y+2}];
  warnTerrain(run,positions,e.kind==="warden"?"seal":"rift",1400,e.kind==="warden"?3500:2200);
  e.abilityMs=0;e.lastAbility={type:"boss-power",at:{...enemy.pos},tick:run.runTicks};
  return e.lastAbility;
 }
 if(e.webs.length>=MAX_WEBS)return null;
 const pos=selectWebTile(run,enemy);
 if(!pos)return null;
 e.webs.push({pos:{...pos},lifeMs:WEB_LIFETIME_MS});
 e.abilityMs=0;
 e.lastAbility={type:"web",at:{...pos},tick:run.runTicks};
 return e.lastAbility;
}
export function consumeEncounterFreeze(run,dt){
 const e=run.encounter;
 if(!e)return false;
 if(e.introMs>0){
  e.introMs=Math.max(0,e.introMs-dt);
  run.runTicks++;
  return true;
 }

 return false;
}
