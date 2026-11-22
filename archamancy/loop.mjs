// The page's animation loop. An error in one frame is reported and the next frame still runs,
// so a single bad frame can't freeze the game for good.
export function animationLoop(frame,{raf=globalThis.requestAnimationFrame?.bind(globalThis),onError=()=>{}}={}){
 const tick=now=>{try{frame(now);}catch(e){try{onError(e);}catch{}}finally{raf(tick);}};
 return ()=>raf(tick);
}
