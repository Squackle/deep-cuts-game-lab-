/**
 * HIVE RUN / Level 01: The Hatchery
 * Original user-approved painted background, contrast-corrected for gameplay.
 */
export const LEVEL_ONE={
 id:1,
 name:"THE HATCHERY",
 asset:"/assets/backgrounds/hatchery.webp"
};
export function levelForStage(stage){return LEVEL_ONE}
export function loadLevelBackground(onReady=()=>{}){
 if(typeof Image==="undefined")return null;
 const image=new Image();image.decoding="async";
 image.addEventListener("load",()=>onReady(true),{once:true});
 image.addEventListener("error",()=>onReady(false),{once:true});
 image.src=LEVEL_ONE.asset;
 return image;
}
export function drawLevelBackground(ctx,canvas,background,cols,rows,cellSize){
 const width=canvas.width,height=canvas.height;
 ctx.save();
 ctx.fillStyle="#14251e";ctx.fillRect(0,0,width,height);
 if(background?.complete&&background.naturalWidth>0){
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
  ctx.drawImage(background,0,0,width,height);
  // Background is stage atmosphere, not gameplay information.
  ctx.fillStyle="rgba(3,8,11,0.36)";
  ctx.fillRect(0,0,width,height);
  // Bright border eggs must not compete with the small collectible.
  const left=ctx.createLinearGradient(0,0,width*.38,0);
  left.addColorStop(0,"rgba(3,8,11,0.42)");
  left.addColorStop(1,"rgba(3,8,11,0)");
  ctx.fillStyle=left;ctx.fillRect(0,0,width*.38,height);
  const right=ctx.createLinearGradient(width,0,width*.62,0);
  right.addColorStop(0,"rgba(3,8,11,0.42)");
  right.addColorStop(1,"rgba(3,8,11,0)");
  ctx.fillStyle=right;ctx.fillRect(width*.62,0,width*.38,height);
 }else{
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   ctx.fillStyle=(x+y)%2===0?"#1b3427":"#1a3024";
   ctx.fillRect(x*cellSize,y*cellSize,cellSize,cellSize);
  }
 }
 ctx.strokeStyle="rgba(226,216,180,.045)";
 ctx.lineWidth=.65;ctx.beginPath();
 for(let x=1;x<cols;x++){const pos=x*cellSize+.5;ctx.moveTo(pos,0);ctx.lineTo(pos,height)}
 for(let y=1;y<rows;y++){const pos=y*cellSize+.5;ctx.moveTo(0,pos);ctx.lineTo(width,pos)}
 ctx.stroke();ctx.restore();
}