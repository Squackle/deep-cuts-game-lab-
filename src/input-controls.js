/** Single keyboard routing, shared by the browser and deterministic tests. */
export const KEY_DIRECTIONS=Object.freeze({
 ArrowUp:"up",ArrowRight:"right",ArrowDown:"down",ArrowLeft:"left",
 w:"up",a:"left",s:"down",d:"right",
 W:"up",A:"left",S:"down",D:"right"
});
export function keyboardDirection(key,repeat=false){
 return repeat?null:(KEY_DIRECTIONS[key]??null);
}

export const MUTATION_SELECTION_KEYS=Object.freeze({
 "1":0,"w":0,"W":0,"ArrowUp":0,
 "2":1,"a":1,"A":1,"ArrowLeft":1,
 "3":2,"s":2,"S":2,"ArrowDown":2
});
export function mutationSelectionIndex(key,repeat=false){
 return repeat?null:(Object.hasOwn(MUTATION_SELECTION_KEYS,key)?MUTATION_SELECTION_KEYS[key]:null);
}
export function isTouchMutationSelection(event,coarsePointer=false){
 if(event?.pointerType==="touch")return true;
 if(event?.pointerType==="mouse"||event?.pointerType==="pen")return false;
 return !!(coarsePointer&&event?.detail>0);
}
/** Reject reverse and duplicate turns; allow intentional forward resume. */
export function resumeHeading(run,heading,queueTurn){
 if(!run||run.status!=="running"||!Object.hasOwn(KEY_DIRECTIONS,heading))return false;
 const keyHeading=KEY_DIRECTIONS[heading];
 if(keyHeading===run.direction)return true;
 return queueTurn(keyHeading);
}
