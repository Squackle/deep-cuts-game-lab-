/** Stationary hatchling ward — explicit W+G combo, deterministic and solo-Lab only. */
export const WARD_STEPS=24;
export function canPlaceWard(run){
 return !!run&&run.mode==="hunt"&&run.status==="running"&&!run.encounter&&!run.queuedEncounter&&
  !!run.mutations?.W&&!!run.mutations?.G&&run.effects?.shield>0&&run.effects?.greenPickups>0&&
  (!run.wards||run.wards.length===0);
}
export function placeHatchlingWard(run){
 if(!canPlaceWard(run))return false;
 run.effects.shield--;run.effects.greenPickups--;
 run.wards=[{pos:{...run.body[0]},steps:WARD_STEPS}];
 return true;
}
export function ageHatchlingWards(run){
 if(!run.wards?.length)return;
 for(const ward of run.wards)ward.steps--;
 run.wards=run.wards.filter(w=>w.steps>0);
}
export function wardDeters(run,p){
 return !!run.wards?.some(w=>Math.max(Math.abs(w.pos.x-p.x),Math.abs(w.pos.y-p.y))<=1);
}
export function wardOccupies(run,p){
 return !!run.wards?.some(w=>w.pos.x===p.x&&w.pos.y===p.y);
}
export function drawHatchlingWards(ctx,run,cell=20){
 if(!run.wards?.length)return;
 ctx.save();
 for(const ward of run.wards){
  const x=ward.pos.x*cell,y=ward.pos.y*cell;
  ctx.fillStyle="#102a1f";ctx.fillRect(x+4,y+6,12,11);
  ctx.strokeStyle="#c2d49a";ctx.lineWidth=1;ctx.strokeRect(x+5.5,y+7.5,9,8);
  ctx.fillStyle="#9bd28b";ctx.fillRect(x+8,y+5,4,5);
  ctx.fillStyle="#e9dbaa";ctx.fillRect(x+9,y+7,2,2);
 }
 ctx.restore();
}
