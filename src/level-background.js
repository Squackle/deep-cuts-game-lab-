/**
 * HIVE RUN / Level 01: The Hatchery
 * Background art: original generated Gothic Alien Hive arena, user-approved.
 * Source preserved in the Deep Cuts Game Lab file library.
 * Optimized local WebP asset: /assets/backgrounds/hatchery.webp
 * The stage counter is currently a speed tier, not a separate location.
 */
export const LEVEL_ONE={
 id:1,
 name:"THE HATCHERY",
 asset:"/assets/backgrounds/hatchery.webp"
};

export function levelForStage(stage){
 // Future maps will select distinct environments; currently every arcade
 // speed tier plays in Hatchery instead of switching to a nonexistent map.
 return LEVEL_ONE;
}

export function loadLevelBackground(onReady=()=>{}){
 if(typeof Image==="undefined")return null;
 const image=new Image();
 image.decoding="async";
 image.addEventListener("load",()=>onReady(true),{once:true});
 image.addEventListener("error",()=>onReady(false),{once:true});
 image.src=LEVEL_ONE.asset;
 return image;
}

export function drawLevelBackground(ctx,canvas,background,cols,rows,cellSize){
 const width=canvas.width,height=canvas.height;
 ctx.save();
 ctx.fillStyle="#14251e";
 ctx.fillRect(0,0,width,height);
 if(background?.complete&&background.naturalWidth>0){
  // Stretch from the full original portrait to the board; retaining top
  // eggs, thorn arches, all five color-lit edges and purple nest below.
  // Do not cover-crop away the ornaments of the approved illustration.
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality="high";
  ctx.drawImage(background,0,0,width,height);
  // Low-opacity veil avoids visual conflict with collectibles, body and HUD.
  ctx.fillStyle="rgba(3,9,9,0.12)";
  ctx.fillRect(0,0,width,height);
 }else{
  // Offline/fetch-error fallback: still a readable, playable grid.
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   ctx.fillStyle=(x+y)%2===0?"#1b3427":"#1a3024";
   ctx.fillRect(x*cellSize,y*cellSize,cellSize,cellSize);
  }
 }
 // Subtle navigation grid for mobile; does not hide painted hive details.
 ctx.strokeStyle="rgba(213,203,160,.075)";
 ctx.lineWidth=.65;
 ctx.beginPath();
 for(let x=1;x<cols;x++){
  const pos=x*cellSize+.5;
  ctx.moveTo(pos,0);ctx.lineTo(pos,height);
 }
 for(let y=1;y<rows;y++){
  const pos=y*cellSize+.5;
  ctx.moveTo(0,pos);ctx.lineTo(width,pos);
 }
 ctx.stroke();
 ctx.restore();
}