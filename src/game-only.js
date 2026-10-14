/**
 * Hive Run Game Only mode.
 * Locks the document against touch scrolling and expands the arcade to the
 * visual viewport. Native fullscreen is optional (iOS Safari does not support
 * requestFullscreen on ordinary elements on many versions).
 * Does not touch the gameplay simulation or leaderboard replay inputs.
 */
export function createGameOnlyMode({doc,win,root,button}){
 if(!doc?.body||!doc.documentElement||!root||!button)throw Error("Game Only requires document, window, arcade, and button");
 let active=false,nativeWasActive=false,scrollY=0;
 const viewport=()=>{
  if(!active)return;
  const height=win.visualViewport?.height||win.innerHeight;
  if(Number.isFinite(height)&&height>0)doc.documentElement.style.setProperty("--game-only-height",Math.round(height)+"px");
 };
 const blockScroll=event=>{
  if(!active||!event.cancelable)return;
  // The mutation draft can scroll *inside the dialog* on especially short
  // viewports, but its gestures must never scroll the underlying document.
  if(event.target?.closest?.(".mutation-overlay:not([hidden])"))return;
  event.preventDefault();
 };
 const updateButton=()=>{
  button.textContent=active?"↙ EXIT GAME ONLY":"⛶ GAME ONLY";
  button.setAttribute("aria-pressed",String(active));
  button.setAttribute("aria-label",active?"Exit Game Only mode":"Expand to Game Only fullscreen mode");
 };
 function leave(){
  if(!active)return false;
  active=false;
  doc.body.classList.remove("game-only");
  doc.documentElement.classList.remove("game-only");
  doc.documentElement.style.removeProperty("--game-only-height");
  doc.removeEventListener("touchmove",blockScroll,true);
  win.removeEventListener("resize",viewport);
  win.visualViewport?.removeEventListener?.("resize",viewport);
  updateButton();
  // Only dismiss fullscreen if this arcade owns it.
  if(doc.fullscreenElement===root){
   try{const result=doc.exitFullscreen?.();result?.catch?.(()=>{})}catch{}
  }
  nativeWasActive=false;
  // Restore the reader to their original page location.
  try{win.scrollTo({top:scrollY,left:0,behavior:"instant"})}catch{}
  return true;
 }
 async function enter(){
  if(active)return true;
  scrollY=win.scrollY||0;
  active=true;
  doc.body.classList.add("game-only");
  doc.documentElement.classList.add("game-only");
  doc.addEventListener("touchmove",blockScroll,{passive:false,capture:true});
  win.addEventListener("resize",viewport);
  win.visualViewport?.addEventListener?.("resize",viewport);
  viewport();updateButton();
  // CSS viewport lock is always enabled first, so Safari works even if
  // native Fullscreen API is unsupported or the request is rejected.
  if(typeof root.requestFullscreen==="function"&&!doc.fullscreenElement){
   try{
    await root.requestFullscreen({navigationUI:"hide"});
    nativeWasActive=doc.fullscreenElement===root;
   }catch{nativeWasActive=false}
  }
  return active;
 }
 function onFullscreenChange(){
  if(doc.fullscreenElement===root){nativeWasActive=true;return}
  // Browser/OS Escape or swipe may dismiss native fullscreen.
  if(active&&nativeWasActive)leave();
 }
 function handleEscape(event){
  if(active&&event.key==="Escape"){
   event.preventDefault();event.stopImmediatePropagation?.();leave();
  }
 }
 button.addEventListener("click",()=>{if(active)leave();else void enter()});
 doc.addEventListener("fullscreenchange",onFullscreenChange);
 doc.addEventListener("keydown",handleEscape,true);
 updateButton();
 return {enter,leave,isActive:()=>active};
}
