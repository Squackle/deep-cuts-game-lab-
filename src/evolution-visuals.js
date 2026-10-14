/**
 * WUBRG whole-swarm aura and evolution burst drawn behind/over real sprites.
 * Visual-only. Never changes collision rules or RNG.
 */
export const EFFECT_TINTS=Object.freeze({
 W:"#f3e2a6",U:"#74c7ff",B:"#d2a0e4",R:"#ff7951",G:"#8ede8a"
});
function center(p,cell){return [p.x*cell+cell/2,p.y*cell+cell/2]}
export function renderMutationEffects(ctx,run,cell,time=0,burst=null,reducedMotion=false){
 if(!run?.body?.length)return;
 const head=run.body[0],[hx,hy]=center(head,cell),e=run.effects;
 ctx.save();
 if(e.shield>0){
  ctx.strokeStyle=EFFECT_TINTS.W;ctx.lineWidth=2.4;
  ctx.globalAlpha=.7;
  ctx.beginPath();ctx.arc(hx,hy,cell*.85,0,Math.PI*2);ctx.stroke();
  ctx.globalAlpha=1;
 }
 if(e.blueTicks>0){
  ctx.strokeStyle=EFFECT_TINTS.U;ctx.lineWidth=2;
  const spread=1+(reducedMotion?0:.08*Math.sin(time/250));
  ctx.beginPath();ctx.arc(hx,hy,cell*spread,Math.PI*.18,Math.PI*1.7);ctx.stroke();
 }
 if(e.redTicks>0){
  ctx.strokeStyle=EFFECT_TINTS.R;ctx.lineWidth=2;
  for(let i=0;i<4;i++){
   const phase=(time/240+i*.7)%(Math.PI*2);
   const sx=hx+Math.cos(phase)*cell*.8,sy=hy+Math.sin(phase)*cell*.8;
   ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+2.8,sy-2.8);ctx.stroke();
  }
 }
 if(e.molt>0){
  const tail=run.body.at(-1),[tx,ty]=center(tail,cell);
  ctx.strokeStyle=EFFECT_TINTS.B;ctx.lineWidth=2;ctx.globalAlpha=.7;
  ctx.beginPath();ctx.arc(tx,ty,cell*.75,0,Math.PI*2);ctx.stroke();
  ctx.globalAlpha=1;
 }
 if(e.greenPickups>0){
  ctx.strokeStyle=EFFECT_TINTS.G;ctx.lineWidth=1.2;ctx.globalAlpha=.56;
  for(let i=1;i<run.body.length;i+=2){
   const [x,y]=center(run.body[i],cell);
   ctx.beginPath();ctx.arc(x,y,cell*.5,0,Math.PI*2);ctx.stroke();
  }
  ctx.globalAlpha=1;
 }
 if(burst&&time<burst.until){
  const amount=reducedMotion?.35:Math.max(0,Math.min(1,(burst.until-time)/1050));
  const radius=cell*(1.2+(1-amount)*2.2);
  ctx.strokeStyle=EFFECT_TINTS[burst.color]||EFFECT_TINTS.W;
  ctx.lineWidth=2+amount*2;ctx.globalAlpha=.65*amount;
  ctx.beginPath();ctx.arc(hx,hy,radius,0,Math.PI*2);ctx.stroke();
 }
 ctx.restore();
}
