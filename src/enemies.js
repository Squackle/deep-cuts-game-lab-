/**
 * Hive Run 0.3: deterministic always-moving prey.
 * Enemies take a step every "period" player simulation ticks, score safe space
 * via bounded flood-fill, avoid sudden reversals, and can be cornered into the
 * player's trail. Collision outcomes never mutate scores here.
 */
export const VECTORS=Object.freeze({up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]});
export const HEADINGS=Object.freeze(Object.keys(VECTORS));
export const PREY=Object.freeze({
 skitter:Object.freeze({name:"SKITTER",period:4,accent:"#ffaf75",icon:"◆"}),
 runner:Object.freeze({name:"BURROW RUNNER",period:4,accent:"#e399f5",icon:"◇"}),
 stalker:Object.freeze({name:"BURROW STALKER",period:3,accent:"#c2a56a",icon:"◈"}),
 weaver:Object.freeze({name:"TUNNEL WEAVER",period:4,accent:"#a99a8b",icon:"⌁"})
});
export function inside(run,p){return p.x>=0&&p.y>=0&&p.x<run.cols&&p.y<run.rows}
export const same=(a,b)=>a.x===b.x&&a.y===b.y;
const k=p=>p.x+","+p.y;
const point=(p,dir)=>({x:p.x+VECTORS[dir][0],y:p.y+VECTORS[dir][1]});
const inverse={up:"down",down:"up",left:"right",right:"left"};
export function safePreyTile(run,p,id=null){
 return inside(run,p)&&!run.body.some(b=>same(b,p))&&
  !run.enemies.some(e=>e.id!==id&&same(e.pos,p));
}
export function reachableArea(run,start,id,cap=run.cols*run.rows){
 if(!safePreyTile(run,start,id))return 0;
 const queue=[start],seen=new Set([k(start)]),limit=Math.min(500,Math.max(1,cap));
 for(let i=0;i<queue.length&&queue.length<limit;i++){
  for(const dir of HEADINGS){
   const next=point(queue[i],dir),key=k(next);
   if(seen.has(key)||!safePreyTile(run,next,id))continue;
   seen.add(key);queue.push(next);
   if(queue.length>=limit)break;
  }
 }
 return queue.length;
}
export function spawnPrey(run,kind="skitter"){
 const occupied=run.enemies||[];
 const reserved=run.food;
 const available=[];
 for(let y=2;y<run.rows-2;y++)for(let x=2;x<run.cols-2;x++){
  const p={x,y},dist=Math.abs(x-run.body[0].x)+Math.abs(y-run.body[0].y);
  if(dist<6||reserved&&same(p,reserved)||!safePreyTile(run,p))continue;
  const exits=HEADINGS.filter(d=>safePreyTile(run,point(p,d))).length;
  if(exits>=3)available.push(p);
 }
 if(!available.length)return null;
 const choose=Math.min(available.length-1,Math.floor(run.random()*available.length));
 const pos=available[choose],directions=HEADINGS.filter(d=>safePreyTile(run,point(pos,d)));
 const id=++run.enemySerial;
 return {id,kind,pos,dir:directions[Math.floor(run.random()*directions.length)],period:PREY[kind]?.period??4,clock:0,moves:0};
}
export function decidePrey(run,enemy){
 const viable=[],head=run.body[0];
 for(const dir of HEADINGS){
  if(dir===inverse[enemy.dir])continue;
  const dest=point(enemy.pos,dir);
  if(!safePreyTile(run,dest,enemy.id))continue;
  const area=reachableArea(run,dest,enemy.id);
  const distance=Math.abs(dest.x-head.x)+Math.abs(dest.y-head.y);
  const wallDistance=Math.min(dest.x,run.cols-1-dest.x,dest.y,run.rows-1-dest.y);
  const forward=dir===enemy.dir?1:0;
  // Survival-first AI, but fallible: novice Skitters underestimate space,
  // Runners favor the heading they already have and open corridors.
  const spaceWeight=enemy.kind==="runner"?.11:enemy.kind==="stalker"?.15:enemy.kind==="weaver"?.105:.07;
  const score=Math.min(area,110)*spaceWeight+Math.min(distance,16)*.25+
   Math.min(wallDistance,5)*(enemy.kind==="weaver"?.08:.24)+forward*(enemy.kind==="runner"?2:enemy.kind==="stalker"?1.0:enemy.kind==="weaver"?.45:.7)+run.random()*(enemy.kind==="skitter"?2.4:enemy.kind==="stalker"?.45:1.0);
  viable.push({dir,dest,score});
 }
 viable.sort((a,b)=>b.score-a.score);
 return viable[0]||null;
}
export function advancePrey(run,enemy){
 enemy.clock++;
 if(enemy.clock<enemy.period)return {type:"waiting"};
 enemy.clock=0;enemy.moves++;
 const chosen=decidePrey(run,enemy);
 if(chosen){enemy.pos=chosen.dest;enemy.dir=chosen.dir;return {type:"moved",id:enemy.id,pos:chosen.dest}}
 // Mandatory movement when trapped; run into a player wall whenever it is
 // responsible for closing an exit. Otherwise an uncredited wall loss.
 const candidates=HEADINGS.filter(dir=>dir!==inverse[enemy.dir]).map(dir=>point(enemy.pos,dir));
 const bodyImpact=candidates.some(pos=>run.body.some(b=>same(b,pos)));
 const id=enemy.id;
 if(bodyImpact)return {type:"captured",id,kind:enemy.kind};
 return {type:"escaped",id,kind:enemy.kind};
}
