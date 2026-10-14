import {terrainBlocks,reservedTerrain} from "./environments.js";
/**
 * Two tiers of deterministic, always-moving prey:
 * ordinary Skitters/Runners make simple, short-sighted decisions and can be
 * baited into a trap; encounter bosses analyze reachable escape routes.
 * Neither may reverse or walk through occupied tiles. Collision outcomes
 * never mutate scores here.
 */
export const VECTORS=Object.freeze({up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]});
export const HEADINGS=Object.freeze(Object.keys(VECTORS));
export const PREY=Object.freeze({
 warden:Object.freeze({name:"HATCHERY WARDEN",period:4,accent:"#c2a56a"}),
 guardian:Object.freeze({name:"RIFT GUARDIAN",period:4,accent:"#b19ac2"}),
 skitter:Object.freeze({name:"SKITTER",period:4,accent:"#ffaf75",icon:"◆"}),
 runner:Object.freeze({name:"BURROW RUNNER",period:4,accent:"#e399f5",icon:"◇"}),
 stalker:Object.freeze({name:"BURROW STALKER",period:4,accent:"#c2a56a",icon:"◈"}),
 weaver:Object.freeze({name:"TUNNEL WEAVER",period:4,accent:"#a99a8b",icon:"⌁"})
});
export function inside(run,p){return p.x>=0&&p.y>=0&&p.x<run.cols&&p.y<run.rows}
export const same=(a,b)=>a.x===b.x&&a.y===b.y;
const k=p=>p.x+","+p.y;
const point=(p,dir)=>({x:p.x+VECTORS[dir][0],y:p.y+VECTORS[dir][1]});
const inverse={up:"down",down:"up",left:"right",right:"left"};
/** Do not path through our own ability, including its warning phase. */
export function ownAbilityHazard(run,p){
 const encounter=run.encounter;
 if(!encounter)return false;
 if(encounter.kind==="weaver")return !!encounter.webs?.some(w=>same(w.pos,p));
 const tileKind=encounter.kind==="guardian"?"rift":encounter.kind==="warden"?"seal":null;
 return !!tileKind&&!!run.terrain?.some(t=>t.kind===tileKind&&same(t.pos,p));
}
export function safePreyTile(run,p,id=null){
 return inside(run,p)&&!terrainBlocks(run,p)&&!ownAbilityHazard(run,p)&&!run.body.some(b=>same(b,p))&&
  !run.enemies.some(e=>e.id!==id&&same(e.pos,p));
}
export function reachableArea(run,start,id,cap=run.cols*run.rows){
 if(!safePreyTile(run,start,id))return 0;
 const total=run.cols*run.rows,blocked=new Uint8Array(total),seen=new Uint8Array(total);
 for(const p of run.body)if(inside(run,p))blocked[p.y*run.cols+p.x]=1;
 for(const e of run.enemies)if(e.id!==id)blocked[e.pos.y*run.cols+e.pos.x]=1;
 for(const t of run.terrain||[])if(t.warningMs<=0||
 (run.encounter?.kind==="guardian"&&t.kind==="rift")||
 (run.encounter?.kind==="warden"&&t.kind==="seal"))
 blocked[t.pos.y*run.cols+t.pos.x]=1;
 if(run.encounter?.kind==="weaver")for(const w of run.encounter.webs||[])
  if(inside(run,w.pos))blocked[w.pos.y*run.cols+w.pos.x]=1;
 const queue=new Int32Array(total),limit=Math.min(500,Math.max(1,cap));
 queue[0]=start.y*run.cols+start.x;seen[queue[0]]=1;let count=1;
 for(let i=0;i<count&&count<limit;i++){
  const tile=queue[i],x=tile%run.cols,y=Math.floor(tile/run.cols);
  const neighbors=[y>0?tile-run.cols:-1,x<run.cols-1?tile+1:-1,y<run.rows-1?tile+run.cols:-1,x>0?tile-1:-1];
  for(const next of neighbors){
   if(next<0||seen[next]||blocked[next])continue;
   seen[next]=1;queue[count++]=next;if(count>=limit)break;
  }
 }
 return count;
}
export function spawnPrey(run,kind="skitter"){
 const occupied=run.enemies||[];
 const reserved=run.food;
 const available=[];
 for(let y=2;y<run.rows-2;y++)for(let x=2;x<run.cols-2;x++){
  const p={x,y},dist=Math.abs(x-run.body[0].x)+Math.abs(y-run.body[0].y);
  if(dist<6||reservedTerrain(run,p)||reserved&&same(p,reserved)||!safePreyTile(run,p))continue;
  const exits=HEADINGS.filter(d=>safePreyTile(run,point(p,d))).length;
  if(exits>=3)available.push(p);
 }
 if(!available.length)return null;
 const choose=Math.min(available.length-1,Math.floor(run.random()*available.length));
 const pos=available[choose],directions=HEADINGS.filter(d=>safePreyTile(run,point(pos,d)));
 const id=++run.enemySerial;
 return {id,kind,pos,dir:directions[Math.floor(run.random()*directions.length)],period:PREY[kind]?.period??4,clock:0,moves:0};
}
export const ORDINARY_PREY=Object.freeze(["skitter","runner"]);
export function decidePrey(run,enemy){
 const viable=[];
 for(const dir of HEADINGS){
  if(dir===inverse[enemy.dir])continue;
  const dest=point(enemy.pos,dir);
  if(safePreyTile(run,dest,enemy.id))viable.push({dir,dest});
 }
 if(!viable.length)return null;
 // Ordinary prey are prey, not strategic hunters: they only inspect the next
 // tile. Skitters sometimes zigzag; Runners commit to straight corridors.
 // They do not calculate reachable area, avoid future dead ends, or react to
 // the player's distant body. All randomness comes from the seeded run RNG.
 if(ORDINARY_PREY.includes(enemy.kind)){
  const forward=viable.find(candidate=>candidate.dir===enemy.dir);
  const forwardChance=enemy.kind==="runner"?.85:.65;
  if(forward&&run.random()<forwardChance)return forward;
  const turns=viable.filter(candidate=>candidate.dir!==enemy.dir);
  if(turns.length)return turns[Math.floor(run.random()*turns.length)];
  return forward||viable[0];
 }
 // Bosses retain long-range route evaluation, making them a distinct threat.
 const head=run.body[0];
 for(const candidate of viable){
  const {dir,dest}=candidate;
  const area=reachableArea(run,dest,enemy.id,150);
  const distance=Math.abs(dest.x-head.x)+Math.abs(dest.y-head.y);
  const wallDistance=Math.min(dest.x,run.cols-1-dest.x,dest.y,run.rows-1-dest.y);
  const forward=dir===enemy.dir?1:0;
  // Flood fill alone incorrectly treats walking backwards as an escape.
  // Bosses anticipate one move ahead, avoiding non-reversible dead ends.
  const onward=HEADINGS.filter(nextDir=>
   nextDir!==inverse[dir]&&safePreyTile(run,point(dest,nextDir),enemy.id)).length;
  const spaceWeight=enemy.kind==="stalker"?.19:enemy.kind==="weaver"?.16:.18;
  candidate.score=Math.min(area,150)*spaceWeight+Math.min(distance,16)*.25+
   Math.min(wallDistance,5)*(enemy.kind==="weaver"?.08:.24)+
   forward*(enemy.kind==="stalker"?1.0:enemy.kind==="weaver"?.45:.7)+
   onward*1.5-(onward===0?90:0)+
   run.random()*(enemy.kind==="stalker"?.45:1.0);
 }
 viable.sort((a,b)=>b.score-a.score);
 return viable[0];
}
export function advancePrey(run,enemy){
 enemy.clock++;
 // Only natural-cadence ordinary prey slow during the opening. Bosses and
 // forced one-tick capture fixtures keep their original movement periods.
 const grace=run.openingGraceMs>0&&ORDINARY_PREY.includes(enemy.kind)&&
  enemy.period>=PREY[enemy.kind].period;
 const period=enemy.period+(grace?3:0);
 if(enemy.clock<period)return {type:"waiting"};
 enemy.clock=0;enemy.moves++;
 const chosen=decidePrey(run,enemy);
 if(chosen){enemy.pos=chosen.dest;enemy.dir=chosen.dir;return {type:"moved",id:enemy.id,pos:chosen.dest}}
 // Mandatory movement when trapped; run into a player wall whenever it is
 // responsible for closing an exit. Otherwise an uncredited wall loss.
 const candidates=HEADINGS.filter(dir=>dir!==inverse[enemy.dir]).map(dir=>point(enemy.pos,dir));
 const bodyImpact=candidates.some(pos=>run.body.some(b=>same(b,pos)));
 const id=enemy.id;
 if(bodyImpact)return {type:"captured",id,kind:enemy.kind};
 // An enemy boxed in by its own temporary powers must not vanish.
 if(run.encounter?.kind===enemy.kind&&candidates.some(p=>ownAbilityHazard(run,p)))
  return {type:"waiting",id,kind:enemy.kind};
 return {type:"escaped",id,kind:enemy.kind};
}
