/** Visual-only pixel score effect. Does not change RNG, engine or leaderboard. */
export function captureFlash(pos,score,now=0){
 if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y))return null;
 return {pos:{x:pos.x,y:pos.y},score:Math.max(0,Math.floor(score||0)),started:now,until:now+850};
}
export function drawCaptureFlash(ctx,flash,cell,now,reducedMotion=false){
 if(!flash||now>=flash.until)return;
 const life=Math.max(0,Math.min(1,(flash.until-now)/850)),x=flash.pos.x*cell,y=flash.pos.y*cell;
 ctx.save();ctx.globalAlpha=reducedMotion?1:Math.max(.2,life);
 ctx.strokeStyle="#f5d798";ctx.lineWidth=2;ctx.strokeRect(x+2,y+2,cell-4,cell-4);
 ctx.fillStyle="#f6e3ac";ctx.font="bold 11px monospace";ctx.textAlign="center";
 ctx.shadowColor="#10221c";ctx.shadowBlur=4;
 ctx.fillText(flash.score>0?"+"+flash.score:"CAPTURE",x+cell/2,y-5-(reducedMotion?0:(1-life)*13));
 ctx.restore();
}
