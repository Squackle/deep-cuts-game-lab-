/** Visual-only score stamp. Three short blinks in place; no RNG or replay edits. */
export const SCORE_FLASH_DURATION_MS=840;
export const SCORE_FLASH_BEAT_MS=140;
export function captureFlash(pos,score,now=0){
 if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y))return null;
 return {pos:{x:pos.x,y:pos.y},score:Math.max(0,Math.floor(score||0)),started:now,until:now+SCORE_FLASH_DURATION_MS};
}
/** Reduced-motion players get one steady, stationary stamp instead of blinking. */
export function isScoreFlashVisible(flash,now,reducedMotion=false){
 if(!flash||!Number.isFinite(now)||now<flash.started||now>=flash.until)return false;
 return reducedMotion||Math.floor((now-flash.started)/SCORE_FLASH_BEAT_MS)%2===0;
}
/** Keep the points just outside the tile, not over the captured prey's square.
 * Above by default; below the square at the top edge. Position never animates.
 */
export function scoreStampPosition(pos,cell,canvasWidth=Infinity,textWidth=0){
 const center=pos.x*cell+cell/2;
 const hasBounds=Number.isFinite(canvasWidth)&&canvasWidth>textWidth+4&&textWidth>=0;
 const x=hasBounds?Math.max(textWidth/2+2,Math.min(center,canvasWidth-textWidth/2-2)):center;
 const y=pos.y===0?cell+14:pos.y*cell-4;
 return {x,y};
}
export function drawCaptureFlash(ctx,flash,cell,now,reducedMotion=false){
 if(!isScoreFlashVisible(flash,now,reducedMotion))return;
 const x=flash.pos.x*cell,y=flash.pos.y*cell;
 ctx.save();
 ctx.globalAlpha=1;
 // Outline marks the actual capture square; the number sits outside it.
 ctx.strokeStyle="#f5d798";ctx.lineWidth=2;
 ctx.strokeRect(x+2,y+2,cell-4,cell-4);
 ctx.fillStyle="#f6e3ac";
 ctx.font="bold 11px monospace";ctx.textAlign="center";ctx.textBaseline="alphabetic";
 ctx.shadowColor="#10221c";ctx.shadowBlur=4;
 const label=flash.score>0?"+"+flash.score:"CAPTURE";
 const textWidth=typeof ctx.measureText==="function"?ctx.measureText(label).width:0;
 const where=scoreStampPosition(flash.pos,cell,ctx.canvas?.width,textWidth);
 ctx.fillText(label,where.x,where.y);
 ctx.restore();
}
