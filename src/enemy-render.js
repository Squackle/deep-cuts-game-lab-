/** Distinct high-contrast retro prey shapes; never use third-party game sprites. */
import {PREY} from "./enemies.js";
const angle={right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2};
export function drawPrey(ctx,enemies,cell,time=0,reducedMotion=false){
 for(const enemy of enemies){
  if(enemy.kind==="stalker"||enemy.kind==="weaver")continue;
  const color=PREY[enemy.kind]?.accent||"#ffbc85";
  const x=enemy.pos.x*cell+cell/2,y=enemy.pos.y*cell+cell/2;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle[enemy.dir]||0);
  // Dark plate guarantees enemy readability over painted Hatchery egg clusters.
  ctx.fillStyle="#070f13";ctx.strokeStyle=color;ctx.lineWidth=2;
  ctx.beginPath();ctx.roundRect(-cell*.46,-cell*.46,cell*.92,cell*.92,3);ctx.fill();ctx.stroke();
  if(!reducedMotion){ctx.shadowColor=color;ctx.shadowBlur=4+Math.sin(time/240)*2}
  ctx.fillStyle=color;
  ctx.beginPath();
  if(enemy.kind==="runner"){ctx.moveTo(7,0);ctx.lineTo(-4,-6);ctx.lineTo(-1,0);ctx.lineTo(-4,6)}
  else{ctx.moveTo(7,0);ctx.lineTo(0,-7);ctx.lineTo(-7,-3);ctx.lineTo(-5,5);ctx.lineTo(0,7)}
  ctx.closePath();ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle="#fff5dd";
  ctx.fillRect(0,-3,2,2);ctx.fillRect(0,2,2,2);
  ctx.restore();
 }
}
export function drawCapture(ctx,location,cell,time=0,until=0,reducedMotion=false){
 if(!location||time>=until)return;
 const alpha=Math.max(0,Math.min(1,(until-time)/600)),x=location.x*cell+cell/2,y=location.y*cell+cell/2;
 ctx.save();ctx.strokeStyle="#ffe7ad";ctx.lineWidth=2;ctx.globalAlpha=alpha;
 const size=cell*(1+(reducedMotion?0:1-alpha));
 ctx.strokeRect(x-size/2,y-size/2,size,size);
 ctx.beginPath();ctx.moveTo(x-6,y);ctx.lineTo(x+6,y);ctx.moveTo(x,y-6);ctx.lineTo(x,y+6);ctx.stroke();
 ctx.restore();
}
