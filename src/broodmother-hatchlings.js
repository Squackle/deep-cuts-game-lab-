/** Matriarch-only deterministic spider hatchlings: hostile, blind, short-lived. */
import {reservedTerrain} from "./environments.js";
import {drawApprovedCreature} from "./approved-creature-art.js";
export const BROODMOTHER_PERIOD=7;
export const EGG_INCUBATION_MS=1400;
export const MAX_HATCHLINGS=4;
export const HATCHLING_LIFETIME_MS=7500;
export const HATCHLING_MOVE_MS=700;
const DIRS=Object.freeze([{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}]);
const same=(a,b)=>a.x===b.x&&a.y===b.y;
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export const isHatchlingAt=(run,p)=>!!run.hatchlings?.some(h=>same(h.pos,p));
export function availableHatchlingSlots(run){
 const eggs=(run.terrain||[]).filter(t=>t.kind==="egg").length;
 return Math.max(0,MAX_HATCHLINGS-(run.hatchlings?.length||0)-eggs);
}
function openForHatch(run,p){
 return p.x>=1&&p.y>=1&&p.x<run.cols-1&&p.y<run.rows-1&&
 !run.body.some(b=>same(b,p))&&!run.enemies.some(e=>same(e.pos,p))&&
 !(run.food&&same(run.food,p))&&!reservedTerrain(run,p)&&!isHatchlingAt(run,p);
}
export function hatchMatureEggs(run){
 if(run.encounter?.kind!=="broodmother")return 0;
 let born=0;
 const eggs=run.terrain.filter(t=>t.kind==="egg"&&t.warningMs<=0);
 run.terrain=run.terrain.filter(t=>!eggs.includes(t));
 for(const egg of eggs){
  if(availableHatchlingSlots(run)<=0||!openForHatch(run,egg.pos))continue;
  const id=++run.hatchlingSerial;
  run.hatchlings.push({id,pos:{...egg.pos},dir:id%4,ageMs:0,moveMs:0});
  born++;
 }
 return born;
}
function clearChaseTile(run,p,id){
 if(p.x<1||p.y<1||p.x>=run.cols-1||p.y>=run.rows-1)return false;
 if(reservedTerrain(run,p)||run.enemies.some(e=>same(e.pos,p))||
    run.hatchlings.some(h=>h.id!==id&&same(h.pos,p)))return false;
 // Blind hatchlings may HIT the head. They avoid colliding with the tail.
 return !run.body.slice(1).some(b=>same(b,p));
}
/** Active-simulation-millisecond chase. Moves at most one tile per update.
 * Return contact for the engine to apply normal shield/molt or death rules.
 */
export function tickHatchlings(run,dt){
 if(run.encounter?.kind!=="broodmother"){run.hatchlings=[];return null}
 if(!Number.isFinite(dt)||dt<=0)return null;
 for(const h of run.hatchlings){
  h.ageMs=(h.ageMs||0)+dt;
  if(h.ageMs>=HATCHLING_LIFETIME_MS)continue;
  h.moveMs=(h.moveMs||0)+dt;
  if(h.moveMs<HATCHLING_MOVE_MS)continue;
  h.moveMs-=HATCHLING_MOVE_MS;
  const head=run.body[0];
  const candidates=DIRS.map((delta,dir)=>({dir,pos:{x:h.pos.x+delta.x,y:h.pos.y+delta.y}}))
   .filter(c=>clearChaseTile(run,c.pos,h.id))
   .sort((a,b)=>dist(a.pos,head)-dist(b.pos,head)||
      (a.dir===h.dir?-1:b.dir===h.dir?1:0)||a.dir-b.dir);
  if(!candidates.length)continue;
  const next=candidates[0];
  h.pos=next.pos;h.dir=next.dir;
  if(same(next.pos,head)){
   run.hatchlings=run.hatchlings.filter(x=>x.ageMs<HATCHLING_LIFETIME_MS);
   return {type:"hatchling-hit",id:h.id,pos:{...next.pos}};
  }
 }
 run.hatchlings=run.hatchlings.filter(h=>h.ageMs<HATCHLING_LIFETIME_MS);
 return null;
}
export function clearBroodmotherHatchlings(run){
 run.hatchlings=[];
 run.terrain=run.terrain.filter(t=>t.kind!=="egg");
}
export function drawBroodmotherHatchlings(ctx,run,cell=20,time=0){
 if(!run.hatchlings?.length)return;
 for(const h of run.hatchlings){
  const frame=Math.floor(time/190+h.id)%4,size=cell+6;
  drawApprovedCreature(ctx,"hatchling",h.pos.x*cell+(cell-size)/2,
   h.pos.y*cell+(cell-size)/2,size,frame);
 }
}
