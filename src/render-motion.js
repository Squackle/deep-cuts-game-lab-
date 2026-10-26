/* Presentation-only position interpolation for the canvas renderer.
 * Hitboxes, replay inputs and scoring remain on authoritative grid positions.
 * Ordinary one-segment growth is interpolated without snapping the whole
 * creature. Teleports, shrinking and any discontinuous movement still snap.
 */
const finiteCell=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
export function smoothBody(previous,current,phase,{enabled=true}={}){
 if(!Array.isArray(current)||!enabled||!Array.isArray(previous)||
  !current.length||!previous.length)return current;
 // Each engine tick may add exactly one segment. More drastic length changes
 // (molt, recovery and teleports) must never be drawn as a glide.
 const growing=current.length===previous.length+1;
 if(!growing&&current.length!==previous.length)return current;
 const t=Number.isFinite(phase)?Math.min(1,Math.max(0,phase)):1;
 if(t>=1)return current;
 // A growth tick adds a tail at the former tail tile. Keep the new tail
 // stationary while all existing parts move smoothly into their new cells.
 if(growing){
  const tail=previous.at(-1),added=current.at(-1);
  if(!finiteCell(tail)||!finiteCell(added)||tail.x!==added.x||tail.y!==added.y)
   return current;
 }
 for(let i=0;i<previous.length;i++){
  const a=previous[i],b=current[i];
  if(!finiteCell(a)||!finiteCell(b)||Math.abs(a.x-b.x)+Math.abs(a.y-b.y)>1)return current;
 }
 return current.map((b,i)=>i>=previous.length?{x:b.x,y:b.y}:{
  x:previous[i].x+(b.x-previous[i].x)*t,
  y:previous[i].y+(b.y-previous[i].y)*t
 });
}
export function motionPhase(accumulator,tickMs){
 if(!Number.isFinite(accumulator)||!Number.isFinite(tickMs)||tickMs<=0)return 1;
 return Math.max(0,Math.min(1,accumulator/tickMs));
}
