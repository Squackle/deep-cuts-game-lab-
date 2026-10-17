// Mana Heist card dragging: one pointer path for mouse, pen and touch.
// Visual-only gesture layer: the existing reducer still determines legal land plays.
export function withinDropZone(x,y,rect) {
 return Number.isFinite(x)&&Number.isFinite(y)&&!!rect&&
 x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom;
}
export function distance(x,y,startX,startY) {
 return Math.hypot(x-startX,y-startY);
}
export function installLandDragging({hand,battlefield,onDrop,onHint,onInspect}) {
 if(!hand||!battlefield||typeof onDrop!=="function")throw Error("Missing drag components");
 const zone=battlefield.closest(".table-card");
 let active=null,keyboardId=null;
 const hit=(x,y)=>withinDropZone(x,y,zone.getBoundingClientRect());
 // On short phones the full-size cards can be below the visible fold.
 // Let a held card scroll the DOCUMENT as the finger approaches the screen
 // edge, so dragging into the battlefield below remains possible.
 let scrollFrame=0;
 function stopAutoScroll(){if(scrollFrame){cancelAnimationFrame(scrollFrame);scrollFrame=0;}}
 function autoScroll(){
  scrollFrame=0;
  if(!active||!active.dragging)return;
  const edge=75,height=window.innerHeight||document.documentElement.clientHeight;
  const y=active.clientY??active.y;
  let delta=0;
  if(y>height-edge)delta=2+(y-(height-edge))/edge*10;
  else if(y<edge)delta=-(2+(edge-y)/edge*10);
  if(delta){
   const el=document.scrollingElement||document.documentElement;
   const previous=el.scrollTop;
   window.scrollBy(0,delta);
   if(el.scrollTop!==previous){
    active.ghost.style.top=y+"px";
    zone.classList.toggle("drop-target",hit(active.clientX??active.x,y));
   }
  }
  scrollFrame=requestAnimationFrame(autoScroll);
 }
 function restore(){
  stopAutoScroll();
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
  active.clientX=x;active.clientY=y;
  if(!scrollFrame)scrollFrame=requestAnimationFrame(autoScroll);
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
  else if(didDrag)onHint?.("Drop the card on the battlefield to play a land; cast mana instants from your hand.",true);
  else onInspect?.(id);
 });
 hand.addEventListener("pointercancel",()=>restore());
 hand.addEventListener("lostpointercapture",()=>restore());
 hand.addEventListener("dragstart",e=>e.preventDefault());
 // Keyboard equivalence: Enter/Space uses the selected hand card immediately; I opens inspection.
 hand.addEventListener("keydown",e=>{
  const card=e.target.closest('[data-zone="hand"][data-cardid]');
  if(!card||!["Enter"," "].includes(e.key))return;
  e.preventDefault();
  cancel();
  onDrop(card.dataset.cardid);
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
