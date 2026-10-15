import {drawApprovedCreature,hasApprovedSprite} from "./approved-creature-art.js";
/**
 * Original hand-pixelled gothic burrow minibosses and charge symbols.
 * 20x20 source art, 64x64 display, zero smoothing, mathematically centered.
 */
const BURROW=[
"....................",".........k..........",".......ksskk........",".....kssshssk.......",
"....ksghssggss......","...kssgghsssggsk...","...ssggsdddddsgsk..","..ksggsdddddddggs..",
"..ssggddddddddddsk.",".ksghdddddddddddgsk",".ssggdddkkkdddddssk",".ssggddkkkdkddddgsk",
"..sggddkkkdkddddss.","..ssggddddddddggss.","...ssggddddddggss..","...ksssggddggsssk..",
"....ksgsssssgsssk..",".....kssskksssk....",".......kkkkkkk......","...................."
].map(row=>row.padEnd(20,"."));
const WEB=[
"....................","....k..........k....","...ksk........ksk...","..ksgkk......kgsk..",
"..ksggskk..kksggsk.","...kssggs..sggssk..","....kssghkkhgssk...","......ksggggsk.....",
"..k....ksddsk....k.","..kskksghddhgskksk.","..ksssggddddggsssk.",".....sggddkddgg....",
"...ksgghddkdhggsk..","...ksgghkkkdhggsk..","..kssggsskkssggssk.","..ksggsk....ksggsk.",
"...ksk........ksk..","....k..........k....","....................","...................."
].map(row=>row.padEnd(20,"."));
const PALETTE=Object.freeze({".":null,k:"#090e0c",s:"#383b30",g:"#706b53",h:"#afa487",d:"#17221c"});
// A crowned stone carapace and a split crystal eye, each in a centered 20px field.
const WARDEN=[
"....................","....h....hh....h....","....sh..hssh..hs....","....gshhsssshsg.....",
"....ggssssssggg.....","...kggghhhhhhgggk...","..ksgghgggggghggsk..","..ksgggssssssgggsk..",
"..ksggshhsshhsggsk..","..ksggshdssdhsggsk..","..ksggssssssssggsk..","...ksgggssssgggsk...",
"...kssgghhhhgssk....","....kssgssssgssk....",".....kssggggssk.....",".....ksgssssgsk.....",
"......ksshhssk......",".......kssssk.......","........kkkk........","...................."
].map(r=>r.padEnd(20,'.').slice(0,20));
const GUARDIAN=[
"....................",".........hh.........","........hssh........",".......hssssh.......",
"...h..hssddssh..h...","..hsshssddddsshssh..","...hssgghhhhggssh...","....hsgghddhggsh....",
".....sgghddhggs.....","..hhssgghddhggsshh..","..hhssgghddhggsshh..",".....sgghddhggs.....",
"....hsgghddhggsh....","...hssgghhhhggssh...","..hsshssddddsshssh..","...h..hssddssh..h...",
".......hssssh.......","........hssh........",".........hh.........","...................."
].map(r=>r.padEnd(20,'.').slice(0,20));
// An original egg-crowned matriarch, wider than the existing stone/void bosses.
const BROODMOTHER=[
"....................",
"......h......h......",
".....hgh....hgh.....",
"....hsggh..hggsh....",
"...ksssgghhggsssk...",
"..ksgggsshhssgggsk..",
"..ksgghhhhhhhhggsk..",
".ksggghddssddhgggsk.",
".ksggshdkkddkdhsggsk",
".ksggshdkkkkdhsggsk.",
".ksggshdkkddkdhsggsk",
".ksggghddddddhgggsk.",
"..ksgggshhhhsgggsk..",
"..kssggssssssggssk..",
"...kssggssggssgssk..",
"....kssghhhhgssk....",
".....ksgssssgsk.....",
"......ksshssk.......",
".......kkkkkk.......",
"...................."
].map(r=>r.padEnd(20,'.').slice(0,20));
export const ICON_PIXELS=Object.freeze({stalker:BURROW,weaver:WEB,warden:WARDEN,guardian:GUARDIAN,broodmother:BROODMOTHER});
export const OCHRE=Object.freeze({track:"#414335",fill:"#98824b",ready:"#b19a5a",stone:"#b2ab8f"});
// Legible against both painted fracture backgrounds. Presentation only.
export const HIGH_VISIBILITY_BOSSES=Object.freeze({
 guardian:Object.freeze({locator:"#e4c2ff",ring:"#cb91f5",ready:"#f2dbff",background:"#251633"}),
 broodmother:Object.freeze({locator:"#ffe4a1",ring:"#eeb46d",ready:"#fff0ba",background:"#2d1b20"})
});
export function validateIcons(){return Object.values(ICON_PIXELS).every(a=>a.length===20&&a.every(row=>row.length===20&&[...row].every(c=>Object.hasOwn(PALETTE,c))))}
export function chargePixels(charge){
 const c=Math.max(0,Math.min(1,Number.isFinite(charge)?charge:0)),out=[];
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){
  const dx=x-15.5,dy=y-15.5,r=Math.hypot(dx,dy);
  if(r<12.35||r>14.55)continue;
  const theta=(Math.atan2(dy,dx)+Math.PI*2.5)%(Math.PI*2);
  out.push({x,y,filled:c>=1||theta/(2*Math.PI)<c});
 }
 return out;
}
export function drawBossPixelIcon(ctx,kind,x,y,size=20){
 if(hasApprovedSprite(kind)){drawApprovedCreature(ctx,kind,x,y,size);return}
 const rows=ICON_PIXELS[kind];if(!ctx||!rows)return;
 const scale=size/20;
 ctx.save();ctx.imageSmoothingEnabled=false;
 for(let row=0;row<20;row++)for(let col=0;col<20;col++){
  const color=PALETTE[rows[row][col]];
  if(!color)continue;
  ctx.fillStyle=color;
  const xx=Math.round(col*scale),yy=Math.round(row*scale);
  ctx.fillRect(x+xx,y+yy,Math.max(1,Math.round((col+1)*scale)-xx),Math.max(1,Math.round((row+1)*scale)-yy));
 }
 ctx.restore();
}
export function drawAbilityMeter(canvas,kind,charge){
 if(!canvas||!ICON_PIXELS[kind])return;
 const ctx=canvas.getContext("2d");if(!ctx)return;
 if(canvas.width!==64)canvas.width=64;
 if(canvas.height!==64)canvas.height=64;
 ctx.clearRect(0,0,64,64);ctx.imageSmoothingEnabled=false;
 const high=HIGH_VISIBILITY_BOSSES[kind];
 ctx.fillStyle=high?.background||"#132019";ctx.fillRect(8,8,48,48);
 for(const pixel of chargePixels(charge)){
  ctx.fillStyle=pixel.filled?(high?(charge>=1?high.ready:high.ring):(charge>=1?OCHRE.ready:OCHRE.fill)):OCHRE.track;
  ctx.fillRect(pixel.x*2,pixel.y*2,2,2);
 }
 // An exact 40 x 40 centered bounding box at (12,12) inside 64 x 64.
 drawBossPixelIcon(ctx,kind,12,12,40);
 if(charge>=1){ctx.fillStyle=OCHRE.ready;ctx.fillRect(30,1,4,4)}
}
export function drawMiniboss(ctx,enemies,cell,phase=1){
 for(const enemy of enemies){
  if(!ICON_PIXELS[enemy.kind])continue;
  const high=HIGH_VISIBILITY_BOSSES[enemy.kind];
  const box=high?36:30,x=enemy.pos.x*cell+(cell-box)/2,y=enemy.pos.y*cell+(cell-box)/2;
  if(high){
   const tileX=enemy.pos.x*cell,tileY=enemy.pos.y*cell;
   // A thin grounded position cue, behind the model. No opaque square over art.
   ctx.save();
   ctx.fillStyle="rgba(8,10,16,.46)";
   ctx.fillRect(tileX+2,tileY+2,cell-4,cell-4);
   ctx.strokeStyle=high.locator;ctx.lineWidth=1;
   ctx.strokeRect(tileX+1.5,tileY+1.5,cell-3,cell-3);
   ctx.restore();
  }else{
   ctx.fillStyle="#11191a";ctx.fillRect(x+4,y+box-4,box-8,2);
  }
  drawBossPixelIcon(ctx,enemy.kind,x,y,box);
  if(high){
   // Small pin above the sprite remains visible when it overlaps darker terrain.
   ctx.fillStyle=high.locator;ctx.fillRect(enemy.pos.x*cell+cell/2-2,y-5,4,3);
  }else if(phase>=2){
   ctx.fillStyle="#d2a269";ctx.fillRect(x+box/2-1,y-2,2,2);
  }
 }
}
export function drawWebs(ctx,webs,cell){
 for(const web of webs||[]){
  const x=web.pos.x*cell,y=web.pos.y*cell;
  ctx.strokeStyle=web.lifeMs<3500?"#85728b":"#ddd6dd";ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x+2,y+2);ctx.lineTo(x+cell-2,y+cell-2);
  ctx.moveTo(x+cell-2,y+2);ctx.lineTo(x+2,y+cell-2);
  ctx.moveTo(x+cell/2,y+1);ctx.lineTo(x+cell/2,y+cell-1);
  ctx.moveTo(x+1,y+cell/2);ctx.lineTo(x+cell-1,y+cell/2);
  ctx.moveTo(x+5,y+5);ctx.lineTo(x+cell-5,y+5);ctx.lineTo(x+cell-5,y+cell-5);
  ctx.lineTo(x+5,y+cell-5);ctx.closePath();ctx.stroke();
  ctx.fillStyle="#ac73cc";ctx.fillRect(x+cell/2-1,y+cell/2-1,2,2);
 }
}
export function drawBurrowWarning(ctx,warning,cell){
 if(!warning)return;
 const p=warning.pos,x=p.x*cell,y=p.y*cell;
 ctx.strokeStyle="#e3a65a";ctx.lineWidth=1;ctx.setLineDash([3,2]);
 ctx.strokeRect(x+2,y+2,cell-4,cell-4);ctx.setLineDash([]);
 ctx.fillStyle="#86532b";ctx.fillRect(x+5,y+9,10,2);
 ctx.fillRect(x+9,y+5,2,10);
 ctx.fillStyle="#eec484";ctx.fillRect(x+9,y+9,2,2);
}
