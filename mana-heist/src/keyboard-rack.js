// Keyboard navigation for the existing DOM card racks. This is UI-only:
// activation still goes through existing click handlers and pure game reducer.
export const RACK_NAV_KEYS=Object.freeze(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"]);
export function cardNavigationIndex(current,length,key){
 if(!Number.isInteger(current)||!Number.isInteger(length)||length<1||current<0||current>=length)return null;
 if(key==="ArrowLeft"||key==="ArrowUp")return Math.max(0,current-1);
 if(key==="ArrowRight"||key==="ArrowDown")return Math.min(length-1,current+1);
 if(key==="Home")return 0;
 if(key==="End")return length-1;
 return null;
}
export function navigateCardRack(zone,event){
 if(!zone||!event||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||
    !RACK_NAV_KEYS.includes(event.key))return false;
 const current=event.target?.closest?.(".land-card[data-cardid]");
 if(!current||!zone.contains(current))return false;
 const visible=[...zone.querySelectorAll(".land-card[data-cardid]")].filter(node=>!node.disabled&&!node.hidden);
 const index=visible.indexOf(current);
 const nextIndex=cardNavigationIndex(index,visible.length,event.key);
 if(nextIndex===null)return false;
 event.preventDefault();
 const next=visible[nextIndex];
 if(next&&next!==current){
  next.focus({preventScroll:true});
  // Advanced battlefield racks overflow horizontally. Scroll *inside the
  // rack* rather than jumping the fixed tabletop/document.
  next.scrollIntoView?.({block:"nearest",inline:"nearest",behavior:"instant"});
 }
 return true;
}
