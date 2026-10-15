// Mana Heist card dragging: one pointer path for mouse, pen and touch.
// Visual-only gesture layer: the existing reducer still determines legal land plays.
export function withinDropZone(x,y,rect) {
 return Number.isFinite(x)&&Number.isFinite(y)&&!!rect&&
 x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom;
}
export function distance(x,y,startX,startY) {
 return Math.hypot(x-startX,y-startY);
}
export function installLandDragging({hand,battlefield,onDrop,onHint}) {
 if(!hand||!battlefield||typeof onDrop!=="function")throw Error("Missing drag components");
 const zone=battlefield.closest(".table-card");
 let active=null,keyboardId=null;
 const hit=(x,y)=>withinDropZone(x,y,zone.getBoundingClientRect());
 function restore(){
  if(!active)return;
  active.ghost?.remove();
  active.source.classList.remove("drag-origin");
  zone.classList.remove("drop-target");
  active=null;
 }
 function cancel(){
  restore();keyboardId=null;
  zone.classList.remove("keyboard-armed");
  hand.querySelectorAll(".keyboard-picked").forEach(x=>x.classList.remove("keyboard-picked"));
 }
 function update(x,y){
  if(!active)return;
  if(!active.dragging&&distance(x,y,active.x,active.y)>7){
   active.dragging=true;
   const ghost=active.source.cloneNode(true);
   ghost.removeAttribute("id");
   ghost.classList.add("land-drag-ghost");
   ghost.classList.remove("is-tapped");
   ghost.setAttribute("aria-hidden","true");
   ghost.style.width=active.width+"px";ghost.style.height=active.height+"px";
   document.body.append(ghost);
   active.ghost=ghost;
   active.source.classList.add("drag-origin");
  }
  if(!active.dragging)return;
  active.ghost.style.left=x+"px";
  active.ghost.style.top=y+"px";
  zone.classList.toggle("drop-target",hit(x,y));
 }
 hand.addEventListener("pointerdown",e=>{
  const source=e.target.closest('[data-zone="hand"][data-cardid]');
  if(!source||!hand.contains(source)||e.isPrimary===false||e.pointerType==="mouse"&&e.button!==0)return;
  cancel();
  const rect=source.getBoundingClientRect();
  active={source,id:source.dataset.cardid,pointerId:e.pointerId,x:e.clientX,y:e.clientY,width:rect.width,height:rect.height,dragging:false,ghost:null};
  try{source.setPointerCapture(e.pointerId);}catch{}
 });
 hand.addEventListener("pointermove",e=>{
  if(!active||active.pointerId!==e.pointerId)return;
  update(e.clientX,e.clientY);
  if(active.dragging&&e.cancelable)e.preventDefault();
 });
 hand.addEventListener("pointerup",e=>{
  if(!active||active.pointerId!==e.pointerId)return;
  const id=active.id;
  update(e.clientX,e.clientY);
  const didDrag=active.dragging,accepted=didDrag&&hit(e.clientX,e.clientY);
  restore();
  if(accepted)onDrop(id);
  else if(didDrag)onHint?.("Drop the land inside the highlighted battlefield to play it.",true);
 });
 hand.addEventListener("pointercancel",()=>restore());
 hand.addEventListener("lostpointercapture",()=>restore());
 hand.addEventListener("dragstart",e=>e.preventDefault());
 // Keyboard equivalence: Enter/Space to pick up a land, Enter/Space on the battlefield to put it down.
 hand.addEventListener("keydown",e=>{
  const card=e.target.closest('[data-zone="hand"][data-cardid]');
  if(!card||!["Enter"," "].includes(e.key))return;
  e.preventDefault();
  cancel();
  keyboardId=card.dataset.cardid;
  card.classList.add("keyboard-picked");zone.classList.add("keyboard-armed");
  onHint?.("Land picked up. Focus the battlefield and press Enter or Space to play; Esc cancels.");
  battlefield.focus();
 });
 battlefield.addEventListener("keydown",e=>{
  if(!keyboardId||!["Enter"," "].includes(e.key))return;
  e.preventDefault();
  const id=keyboardId;
  cancel();onDrop(id);
 });
 document.addEventListener("keydown",e=>{if(e.key==="Escape")cancel();});
 return {cancel};
}
