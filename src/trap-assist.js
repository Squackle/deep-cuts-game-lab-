import {HEADINGS,VECTORS,safePreyTile} from "./enemies.js";
const INVERSE=Object.freeze({up:"down",right:"left",down:"up",left:"right"});
/** Simple training cue. No AI decisions or random calls occur in rendering. */
export function trapSignal(run,enemy){
 if(run.mode!=="hunt"||run.encounter||run.evolutionsChosen>=3||
  (enemy.kind!=="skitter"&&enemy.kind!=="runner"))return null;
 const exits=HEADINGS.filter(dir=>{
  if(dir===INVERSE[enemy.dir])return false;
  const [dx,dy]=VECTORS[dir];
  return safePreyTile(run,{x:enemy.pos.x+dx,y:enemy.pos.y+dy},enemy.id);
 });
 if(exits.length>1)return null;
 return {exits:exits.length,escape:exits[0]??null};
}
export function drawTrapHints(ctx,run,cell=20){
 for(const enemy of run.enemies){
  const hint=trapSignal(run,enemy);
  if(!hint)continue;
  const x=enemy.pos.x*cell,y=enemy.pos.y*cell;
  ctx.save();
  ctx.strokeStyle=hint.exits===0?"#f4d49a":"#bc9757";
  ctx.lineWidth=2;
  ctx.setLineDash(hint.exits===0?[]:[3,2]);
  ctx.strokeRect(x+1,y+1,cell-2,cell-2);
  ctx.setLineDash([]);
  if(hint.escape){
   const offset={up:[cell/2-1,1],down:[cell/2-1,cell-4],
    left:[1,cell/2-1],right:[cell-4,cell/2-1]}[hint.escape];
   ctx.fillStyle="#f4dcaa";
   ctx.fillRect(x+offset[0],y+offset[1],3,3);
  }
  ctx.restore();
 }
}
