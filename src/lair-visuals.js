/** Presentation-only pixel warnings and capture/defeat bursts; never changes game state. */
const INKS=Object.freeze({stalker:"#c3a46a",warden:"#deb970",weaver:"#afb4a2",guardian:"#c4a0d0"});
export function lairFlashEvent(event,now=0){
 if(!event||!["phase","defeat"].includes(event.type)||!event.at)return null;
 return {kind:event.kind,type:event.type,at:{...event.at},started:now,
  until:now+(event.type==="defeat"?1350:760)};
}
export function drawLairEffects(ctx,run,cell,now=0,burst=null,reduced=false){
 if(!ctx||!run)return;
 const warns=[];
 if(run.encounter?.telegraph?.pos)warns.push({pos:run.encounter.telegraph.pos,ink:INKS.stalker});
 for(const tile of run.terrain||[])if(tile.warningMs>0&&tile.kind!=="rock")
  warns.push({pos:tile.pos,ink:INKS[run.encounter?.kind]||"#cbaf86"});
 for(const {pos,ink} of warns){
  const x=pos.x*cell,y=pos.y*cell,pulse=reduced?0:Math.floor(now/180)%2;
  ctx.save();ctx.strokeStyle=ink;ctx.lineWidth=pulse?2:1;
  ctx.setLineDash(pulse?[3,3]:[2,4]);
  ctx.strokeRect(x+2.5,y+2.5,cell-5,cell-5);ctx.setLineDash([]);
  ctx.fillStyle=ink;ctx.fillRect(x+8,y+3,4,4);ctx.fillRect(x+8,y+13,4,4);
  ctx.restore();
 }
 if(!burst||now>=burst.until)return;
 const p=Math.max(0,Math.min(1,(now-burst.started)/Math.max(1,burst.until-burst.started)));
 const x=(burst.at.x+.5)*cell,y=(burst.at.y+.5)*cell;
 const radius=cell*(reduced?.6:.5+2.1*p),ink=INKS[burst.kind]||"#ead59b";
 ctx.save();ctx.globalAlpha=Math.max(.15,1-p);ctx.lineWidth=burst.type==="defeat"?3:2;
 ctx.strokeStyle=ink;ctx.setLineDash([]);
 ctx.strokeRect(Math.round(x-radius)+.5,Math.round(y-radius)+.5,Math.round(radius*2),Math.round(radius*2));
 const n=burst.type==="defeat"?8:4;
 for(let i=0;i<n;i++){
  const angle=i*Math.PI*2/n,dist=radius*(.5+.5*p);
  ctx.fillStyle=i%2?"#f4e5ba":ink;
  ctx.fillRect(Math.round(x+Math.cos(angle)*dist)-2,Math.round(y+Math.sin(angle)*dist)-2,4,4);
 }
 ctx.restore();
}
