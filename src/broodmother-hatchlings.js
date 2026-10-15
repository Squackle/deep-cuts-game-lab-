/** Matriarch-only, deterministic hatchlings: moving obstacles, NOT score-bearing prey. */
import {reservedTerrain} from "./environments.js";
export const BROODMOTHER_PERIOD=7; // Other bosses take one grid step per four player steps.
export const EGG_INCUBATION_MS=1400;
export const MAX_HATCHLINGS=4;
export const HATCHLING_MOVE_EVERY=9;
export const HATCHLING_LIFE_STEPS=72;
const DIRS=Object.freeze([{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}]);
const same=(a,b)=>a.x===b.x&&a.y===b.y;
export const isHatchlingAt=(run,p)=>!!run.hatchlings?.some(h=>same(h.pos,p));
export function availableHatchlingSlots(run){
 const eggs=(run.terrain||[]).filter(t=>t.kind==="egg").length;
 return Math.max(0,MAX_HATCHLINGS-(run.hatchlings?.length||0)-eggs);
}
function clearTile(run,p,ownId=null){
 return p.x>=1&&p.y>=1&&p.x<run.cols-1&&p.y<run.rows-1&&
  !run.body.some(b=>same(b,p))&&!run.enemies.some(e=>same(e.pos,p))&&
  !(run.food&&same(run.food,p))&&!reservedTerrain(run,p)&&
  !run.hatchlings.some(h=>h.id!==ownId&&same(h.pos,p));
}
/** Convert fully warned, safe eggs into slow creatures; never hatch under the player. */
export function hatchMatureEggs(run){
 if(run.encounter?.kind!=="broodmother")return 0;
 let born=0;
 run.terrain=run.terrain.filter(t=>{
  if(t.kind!=="egg"||t.warningMs>0)return true;
  // Remove the egg before checking occupancy: reservedTerrain includes itself.
  const otherTerrain=run.terrain.filter(v=>v!==t),saved=run.terrain;
  run.terrain=otherTerrain;
  const safe=run.hatchlings.length<MAX_HATCHLINGS&&clearTile(run,t.pos);
  run.terrain=saved;
  if(safe){
   const id=++run.hatchlingSerial;
   run.hatchlings.push({id,pos:{...t.pos},dir:id%4,clock:0,life:HATCHLING_LIFE_STEPS});
   born++;
  }
  return false;
 });
 return born;
}
/** Move only on active simulation steps; wandering, not homing or teleporting.
 * Never advance onto the Sliver, boss, eggs or other hatchlings.
 */
export function tickHatchlings(run){
 if(run.encounter?.kind!=="broodmother"){run.hatchlings=[];return}
 for(const h of run.hatchlings){
  h.life--;
  if(h.life<=0)continue;
  if(++h.clock<HATCHLING_MOVE_EVERY)continue;
  h.clock=0;
  for(const turn of [0,1,3,2]){
   const dir=(h.dir+turn)%4,delta=DIRS[dir];
   const p={x:h.pos.x+delta.x,y:h.pos.y+delta.y};
   if(!clearTile(run,p,h.id))continue;
   h.pos=p;h.dir=dir;break;
  }
 }
 run.hatchlings=run.hatchlings.filter(h=>h.life>0);
}
export function clearBroodmotherHatchlings(run){
 run.hatchlings=[];
 run.terrain=run.terrain.filter(t=>t.kind!=="egg");
}
export function drawBroodmotherHatchlings(ctx,run,cell=20){
 if(!run.hatchlings?.length)return;
 ctx.save();
 for(const h of run.hatchlings){
  const x=h.pos.x*cell,y=h.pos.y*cell,s=cell/20;
  ctx.fillStyle="#172821";
  ctx.fillRect(x+4*s,y+7*s,12*s,9*s);
  ctx.fillStyle="#8fa877";
  ctx.fillRect(x+5*s,y+5*s,10*s,10*s);
  ctx.fillStyle="#d5c88e";
  ctx.fillRect(x+7*s,y+7*s,2*s,2*s);
  ctx.fillRect(x+12*s,y+7*s,2*s,2*s);
  ctx.fillStyle="#566845";
  ctx.fillRect(x+3*s,y+10*s,3*s,3*s);
  ctx.fillRect(x+14*s,y+10*s,3*s,3*s);
 }
 ctx.restore();
}
