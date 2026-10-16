/** Internal-only collectible sprite: original tiny 16x16 pixel cheeseburger. */
export const BURGER_PIXELS=Object.freeze([
"................",
".....000000.....",
"...0011111100...",
"..011122221110..",
".01121121121110.",
".01111111111110.",
".00333333333300.",
".03444444444430.",
".03555555555530.",
"..066666666660..",
".07777777777770.",
".07111111111170.",
"..071111111170..",
"...0000000000...",
"................",
"................"
]);
export const BURGER_COLORS=Object.freeze({
"0":"#3a2025","1":"#e6a34c","2":"#fff0aa","3":"#62ba52",
"4":"#e7c543","5":"#613630","6":"#a52d32","7":"#f9c975"
});
export function drawSuperBurger(ctx,x,y,size=24,time=0){
 if(!ctx)return false;
 const scale=size/16,dy=Math.sin(time/240)>0?0:-1;
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.fillStyle="rgba(7,10,13,.82)";ctx.fillRect(x+1,y+size-3,size-2,3);
 for(let r=0;r<16;r++)for(let col=0;col<16;col++){
  const color=BURGER_COLORS[BURGER_PIXELS[r][col]];
  if(!color)continue;
  const x0=Math.round(col*scale),x1=Math.round((col+1)*scale);
  const y0=Math.round(r*scale),y1=Math.round((r+1)*scale);
  ctx.fillStyle=color;ctx.fillRect(x+x0,y+y0+dy,Math.max(1,x1-x0),Math.max(1,y1-y0));
 }
 ctx.restore();return true;
}
