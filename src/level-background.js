import {BIOMES,biomeForEvolution} from "./environments.js";
/**
 * Four individually painted original cavern scenes, packed into one tiny WebP
 * texture atlas (two columns × two rows) for a single image load.
 * At 144×176 source pixels per scene, 360×440 display is deliberately crisp.
 */
export const TILE_WIDTH=144, TILE_HEIGHT=176;
export const BACKGROUNDS=Object.freeze(BIOMES.map((biome,index)=>Object.freeze({
 id:biome.id,name:biome.name,
 asset:new URL("../assets/backgrounds/hive-run-atlas.webp",import.meta.url).toString(),
 sourceX:(index%2)*TILE_WIDTH,
 sourceY:Math.floor(index/2)*TILE_HEIGHT,
 width:TILE_WIDTH,height:TILE_HEIGHT
})));
export const LEVEL_ONE=BACKGROUNDS[0];
export function levelForStage(stage){
 const biome=biomeForEvolution(Math.max(0,stage-1));
 return BACKGROUNDS[biome.id-1];
}
export function loadLevelBackground(onReady=()=>{}){
 if(typeof Image==="undefined")return null;
 const image=new Image();image.decoding="async";
 image.addEventListener("load",()=>onReady(true),{once:true});
 image.addEventListener("error",()=>onReady(false),{once:true});
 image.src=LEVEL_ONE.asset;
 return image;
}
/** Readable cell edges on top of decorative pixel-art cave flooring. */
export function drawArenaGrid(ctx,cols,rows,cellSize,biome=1){
 ctx.save();
 ctx.fillStyle=biome===1?"rgba(3,14,12,.12)":"rgba(4,8,15,.12)";
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  if((x+y)%2===0)ctx.fillRect(x*cellSize+1,y*cellSize+1,cellSize-1,cellSize-1);
 }
 for(let x=1;x<cols;x++){
  ctx.fillStyle=x%5===0?"rgba(244,213,159,.37)":"rgba(228,220,185,.24)";
  ctx.fillRect(x*cellSize-1,0,1,rows*cellSize);
 }
 for(let y=1;y<rows;y++){
  ctx.fillStyle=y%5===0?"rgba(244,213,159,.37)":"rgba(228,220,185,.24)";
  ctx.fillRect(0,y*cellSize-1,cols*cellSize,1);
 }
 ctx.restore();
}
export function drawLevelBackground(ctx,canvas,background,cols,rows,cellSize,biome=1){
 const width=canvas.width,height=canvas.height;
 const selected=BACKGROUNDS[Math.max(0,Math.min(BACKGROUNDS.length-1,biome-1))];
 ctx.save();
 ctx.fillStyle="#14251e";ctx.fillRect(0,0,width,height);
 if(background?.complete&&background.naturalWidth>0){
  // Source crop is determined solely by biome, so transitions are instant
  // and don't require extra image requests or simulation RNG.
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(background,selected.sourceX,selected.sourceY,selected.width,selected.height,0,0,width,height);
  // Pixel art is intentionally subdued so snakes, telegraphs, and pickups
  // remain readable even against the bright crystal / lava scenes.
  const veil=["rgba(3,8,11,0.36)","rgba(3,8,11,0.34)",
   "rgba(3,8,11,0.42)","rgba(3,8,11,0.49)"][selected.id-1];
  ctx.fillStyle=veil;ctx.fillRect(0,0,width,height);
  // Stronger perimeter shadow minimizes competition from scenery details.
  const shadow=selected.id===4?"rgba(3,8,11,0.50)":"rgba(3,8,11,0.42)";
  const left=ctx.createLinearGradient(0,0,width*.38,0);
  left.addColorStop(0,shadow);left.addColorStop(1,"rgba(3,8,11,0)");
  ctx.fillStyle=left;ctx.fillRect(0,0,width*.38,height);
  const right=ctx.createLinearGradient(width,0,width*.62,0);
  right.addColorStop(0,shadow);right.addColorStop(1,"rgba(3,8,11,0)");
  ctx.fillStyle=right;ctx.fillRect(width*.62,0,width*.38,height);
 }else if(selected.id>1){
  // Original built-in scenery remains as the offline/loading fallback.
  drawCavern(ctx,width,height,selected.id);
 }else{
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   ctx.fillStyle=(x+y)%2===0?"#1b3427":"#1a3024";
   ctx.fillRect(x*cellSize,y*cellSize,cellSize,cellSize);
  }
 }
 drawArenaGrid(ctx,cols,rows,cellSize,selected.id);
 ctx.restore();
}
/** Hand-built pixel architecture, fixed to the arena; no random frame noise. */
function drawCavern(ctx,w,h,biome){
 const stone=biome===2?['#171d18','#23281e','#32362a','#5c5541']:biome===3?['#141521','#20212e','#313040','#675873']:['#1e151b','#2b2029','#3c2a36','#765565'];
 ctx.imageSmoothingEnabled=false;ctx.fillStyle=stone[0];ctx.fillRect(0,0,w,h);
 // Cut-stone floor, inset ribbing and deeply recessed arches.
 for(let y=0;y<h;y+=16)for(let x=0;x<w;x+=24){
  const offset=y%32?12:0,n=(x*13+y*7)%17;
  ctx.fillStyle=stone[n<8?1:0];ctx.fillRect(x-offset+1,y+1,22,14);
  if(n<4){ctx.fillStyle=stone[2];ctx.fillRect(x-offset+4,y+3,6,1)}
 }
 for(let y=14;y<h;y+=72){
  for(const side of [0,1]){
   const x=side?w-30:8;
   ctx.fillStyle=stone[2];ctx.fillRect(x,y,22,54);
   ctx.fillStyle=stone[3];ctx.fillRect(x+2,y+2,3,48);ctx.fillRect(x+3,y,16,4);
   ctx.fillStyle=stone[0];ctx.fillRect(x+8,y+8,10,38);
   ctx.fillStyle=stone[1];ctx.fillRect(x-4,y+51,30,7);
   if(biome>=3){
    const glow=biome===3?'#786c91':'#945c72';
    ctx.fillStyle=glow;ctx.fillRect(x+8,y+18,4,15);ctx.fillRect(x+12,y+12,3,18);
    ctx.fillStyle='#b3a4bd';ctx.fillRect(x+12,y+13,1,9);
   }
  }
 }
 // Broken vault ribs stay on the periphery, leaving the central playfield quiet.
 for(let i=0;i<8;i++){
  ctx.fillStyle=stone[2];ctx.fillRect(30+i*5,4+i*3,5,5);ctx.fillRect(w-35-i*5,4+i*3,5,5);
  ctx.fillRect(30+i*5,h-9-i*3,5,5);ctx.fillRect(w-35-i*5,h-9-i*3,5,5);
 }
 ctx.fillStyle='rgba(3,8,11,.28)';ctx.fillRect(0,0,w,h);
}
