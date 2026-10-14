/** Browser gesture and tab-focus guards for the opt-in chiptune. */
export function canPlayMusic(enabled,status,hidden){
 return !!enabled&&!hidden&&(status==="ready"||status==="running");
}
export function resumeFromGesture(context,onRunning=()=>{}){
 if(!context||context.state==="closed")return false;
 if(context.state==="running"){onRunning();return true}
 if(typeof context.resume!=="function")return false;
 try{
  const result=context.resume();
  if(result&&typeof result.then==="function")
   result.then(()=>{if(context.state==="running")onRunning()}).catch(()=>{});
  else if(context.state==="running")onRunning();
  return true;
 }catch{return false}
}
