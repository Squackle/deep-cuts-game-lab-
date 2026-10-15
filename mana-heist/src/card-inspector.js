// Full-size view for a real Magic land used by Mana Heist.
// The puzzle reducer remains authoritative for simplified land actions.
import {referenceFor} from "./card-references.js";
export function installCardInspector({dialog,trigger,closeButton}){
 if(!dialog||!trigger||!closeButton)throw Error("Inspector controls missing");
 const $=id=>dialog.querySelector("#"+id);
 const heading=$("inspectorTitle"),caption=$("inspectorGameCard"),image=$("inspectorImage"),fallback=$("inspectorImageFallback"),link=$("inspectorLink");
 let previousFocus=null;
 function hide({restore=true}={}){
  if(dialog.hidden)return;
  dialog.hidden=true;
  image.removeAttribute("src");
  image.alt="";
  if(restore&&previousFocus?.isConnected&&typeof previousFocus.focus==="function")previousFocus.focus();
  previousFocus=null;
 }
 function show(cardKey,gameName){
  const real=referenceFor(cardKey);
  if(!real)return false;
  previousFocus=document.activeElement;
  heading.textContent=real.name;
  caption.textContent=gameName+" · the full-size card currently used in this puzzle";
  link.href=real.page;
  link.textContent="View "+real.name+" on Scryfall ↗";
  image.hidden=false;fallback.hidden=true;
  image.alt="Full, unaltered Magic card reference: "+real.name;
  image.onload=()=>{if(!dialog.hidden){image.hidden=false;fallback.hidden=true;}};
  image.onerror=()=>{image.hidden=true;fallback.hidden=false;};
  dialog.hidden=false;
  // The named-card image endpoint redirects to a full, unmodified card scan.
  image.src=real.image;
  closeButton.focus();
  return true;
 }
 trigger.addEventListener("click",()=>trigger.dispatchEvent(new CustomEvent("inspect-current-land",{bubbles:true})));
 closeButton.addEventListener("click",()=>hide());
 dialog.addEventListener("click",e=>{if(e.target===dialog)hide();});
 document.addEventListener("keydown",e=>{
  if(dialog.hidden)return;
  if(e.key==="Escape"){e.preventDefault();e.stopPropagation();hide();}
  if(e.key==="Tab"){
   const focusables=[closeButton,link].filter(el=>!el.hidden);
   const active=document.activeElement;
   if(e.shiftKey&&active===focusables[0]){e.preventDefault();focusables[focusables.length-1].focus();}
   else if(!e.shiftKey&&active===focusables[focusables.length-1]){e.preventDefault();focusables[0].focus();}
  }
 },true);
 return {show,hide};
}
