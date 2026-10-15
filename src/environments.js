/** Original deterministic terrain. New obstacles always warn before activation. */
export const BIOMES=Object.freeze([
 {id:1,name:'THE HATCHERY',short:'HATCHERY',color:'#79a783',bpm:80},
 {id:2,name:'THE BURROWS',short:'BURROWS',color:'#b49a6b',bpm:105},
 {id:3,name:'THE FRACTURE',short:'FRACTURE',color:'#9d8bbd',bpm:132},
 {id:4,name:'THE DEEP FRACTURE',short:'DEEP FRACTURE',color:'#c08281',bpm:165}
]);
export const biomeForEvolution=n=>BIOMES[Math.min(3,Math.floor(n/4))];
const same=(a,b)=>a.x===b.x&&a.y===b.y;
export const terrainBlocks=(run,p)=>!!run.terrain?.some(t=>t.warningMs<=0&&same(t.pos,p));
export const reservedTerrain=(run,p)=>!!run.terrain?.some(t=>same(t.pos,p));
function safeActivation(run,p){
 return !run.body.some(b=>same(b,p))&&!run.enemies.some(e=>same(e.pos,p))&&
  !(run.food&&same(run.food,p))&&!(run.hatchlings||[]).some(h=>same(h.pos,p))&&
  Math.abs(run.body[0].x-p.x)+Math.abs(run.body[0].y-p.y)>=4;
}
export function setBiome(run){
 const next=biomeForEvolution(run.evolutionsChosen).id;
 if(next===run.biome)return false;
 run.biome=next;run.terrain=[];run.hazardMs=0;run.biomeNoticeMs=1800;
 // Small rock islands leave wide continuous routes and the outer circuit open.
 if(next>=2){
  for(const x of [4,run.cols-5])for(const y of [5,run.rows-6]){
   for(let i=0;i<2;i++)run.terrain.push({pos:{x:x+i,y},kind:'rock',warningMs:1800,lifeMs:null});
  }
 }
 return true;
}
export function warnTerrain(run,positions,kind,warningMs,lifeMs){
 for(const p of positions){
  if(p.x<2||p.y<2||p.x>=run.cols-2||p.y>=run.rows-2||reservedTerrain(run,p)||!safeActivation(run,p))continue;
  run.terrain.push({pos:{...p},kind,warningMs,lifeMs});
 }
}
export function tickTerrain(run,dt){
 run.biomeNoticeMs=Math.max(0,run.biomeNoticeMs-dt);
 run.terrain=run.terrain.filter(t=>{
  if(t.warningMs>0){
   t.warningMs=Math.max(0,t.warningMs-dt);
   if(t.warningMs===0&&!safeActivation(run,t.pos))return false; // cancel, never appear under a moving body
  }else if(t.lifeMs!==null){t.lifeMs-=dt;if(t.lifeMs<=0)return false}
  return true;
 });
 if(run.biome<3||run.encounter)return;
 run.hazardMs+=dt;
 if(run.hazardMs<9000)return;
 run.hazardMs=0;
 const x=3+Math.floor(run.random()*(run.cols-6)),y=3+Math.floor(run.random()*(run.rows-6));
 warnTerrain(run,[{x,y},{x:x+1,y}],'rift',1500,2200);
}
export function drawTerrain(ctx,run,cell){
 for(const t of run.terrain){
  const x=t.pos.x*cell,y=t.pos.y*cell,warn=t.warningMs>0;
  if(t.kind==="egg"){
   // Warm marbled shell cracks before a spider breaks free.
   ctx.fillStyle="#24191a";ctx.fillRect(x+4,y+3,cell-8,cell-6);
   ctx.fillStyle=warn?"#c29873":"#d9b18d";ctx.fillRect(x+6,y+3,cell-12,cell-7);
   ctx.fillStyle="#9a4252";ctx.fillRect(x+8,y+6,2,3);ctx.fillRect(x+12,y+10,2,3);
   ctx.fillStyle="#f9d9a1";ctx.fillRect(x+10,y+5,2,4);ctx.fillRect(x+11,y+9,2,2);
   ctx.strokeStyle="#cc9176";ctx.lineWidth=1;ctx.strokeRect(x+4.5,y+3.5,cell-9,cell-7);
   continue;
  }
  if(t.kind==="seal"){
   ctx.fillStyle=warn?"#443521":"#492919";
   ctx.fillRect(x+3,y+3,cell-6,cell-6);
   ctx.fillStyle="#dc8a3f";ctx.fillRect(x+8,y+4,4,12);
   ctx.fillRect(x+4,y+8,12,4);
   ctx.fillStyle="#f6c879";ctx.fillRect(x+9,y+7,2,6);
   if(warn){ctx.strokeStyle="#f5bf73";ctx.lineWidth=1;ctx.strokeRect(x+2.5,y+2.5,cell-5,cell-5)}
   continue;
  }
  if(t.kind==="rift"){
   ctx.fillStyle=warn?"#342044":"#190d32";ctx.fillRect(x+2,y+2,cell-4,cell-4);
   ctx.fillStyle="#633898";ctx.fillRect(x+5,y+4,10,12);
   ctx.fillStyle="#21103d";ctx.fillRect(x+7,y+5,6,10);
   ctx.fillStyle="#c77cea";ctx.fillRect(x+9,y+3,2,4);ctx.fillRect(x+9,y+13,2,4);
   if(warn){ctx.strokeStyle="#c77cea";ctx.lineWidth=1;ctx.strokeRect(x+2.5,y+2.5,cell-5,cell-5)}
   continue;
  }
  ctx.fillStyle=warn?'#1d211d':t.kind==='rock'?'#615744':t.kind==='seal'?'#5c5536':'#584364';
  ctx.fillRect(x+2,y+2,cell-4,cell-4);
  ctx.strokeStyle=warn?'#c1ad7e':t.kind==='rock'?'#b5a080':t.kind==='egg'?'#c8ce88':'#d8b4e5';ctx.lineWidth=1;
  ctx.setLineDash(warn?[3,3]:[]);ctx.strokeRect(x+2.5,y+2.5,cell-5,cell-5);ctx.setLineDash([]);
  ctx.fillStyle=warn?'#d8c08d':'#22231e';
  if(warn){ctx.fillRect(x+9,y+5,2,6);ctx.fillRect(x+9,y+13,2,2)}
  else if(t.kind==='rock'){ctx.fillRect(x+5,y+5,8,3);ctx.fillRect(x+11,y+11,4,3)}
  else{for(let i=0;i<4;i++)ctx.fillRect(x+4+i*3,y+4+(i%2)*5,3,8)}
 }
}
