/* Presentation-only position interpolation for the canvas renderer.
 * All hitboxes, replay inputs and score logic stay on engine grid coordinates.
 * This helper intentionally snaps after mutation, body-length changes,
 * teleports and non-neighbor movement rather than drawing false traversals.
 */
const finiteCell=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
export function smoothBody(previous,current,phase,{enabled=true}={}){
 if(!Array.isArray(current)||!enabled||!Array.isArray(previous)||
  current.length!==previous.length||!current.length)return current;
 const t=Number.isFinite(phase)?Math.min(1,Math.max(0,phase)):1;
 if(t>=1)return current;
 for(let i=0;i<current.length;i++){
  const a=previous[i],b=current[i];
  if(!finiteCell(a)||!finiteCell(b)||Math.abs(a.x-b.x)+Math.abs(a.y-b.y)>1)return current;
 }
 return current.map((b,i)=>({
  x:previous[i].x+(b.x-previous[i].x)*t,
  y:previous[i].y+(b.y-previous[i].y)*t
 }));
}
export function motionPhase(accumulator,tickMs){
 if(!Number.isFinite(accumulator)||!Number.isFinite(tickMs)||tickMs<=0)return 1;
 return Math.max(0,Math.min(1,accumulator/tickMs));
}
