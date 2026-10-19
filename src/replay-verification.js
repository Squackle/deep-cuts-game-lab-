/* Regression-only deterministic replay, not an online leaderboard. */
import {newRun,start,step,turn,chooseMutation} from "./engine.js";
import {placeHatchlingWard} from "./hatchling-ward.js";
const MAX_EVENTS=14000,MAX_TICKS=6000;
function validEvents(events){
 if(!Array.isArray(events)||events.length>MAX_EVENTS)return false;
 let last=0;
 for(const ev of events){
  if(!Array.isArray(ev)||ev.length!==3||!Number.isInteger(ev[0])||ev[0]<last||ev[0]>MAX_TICKS)return false;
  if(ev[1]==="turn"&&!["up","down","left","right"].includes(ev[2]))return false;
  if(ev[1]==="choose"&&!["W","U","B","R","G"].includes(ev[2]))return false;
  if(ev[1]==="ward"&&ev[2]!==null)return false;
  if(ev[1]!=="turn"&&ev[1]!=="choose"&&ev[1]!=="ward")return false;
  last=ev[0];
 }
 return true;
}
export function replayScore(seed,events,expected,mode="hunt"){
 if(!validEvents(events)||!expected||!Number.isInteger(expected.ticks)||expected.ticks<0||expected.ticks>MAX_TICKS)
  return {ok:false,reason:"Invalid replay format."};
 const run=newRun({cols:18,rows:22,seed,mode});
 start(run);
 let index=0,loops=0;
 while(loops++<MAX_TICKS+events.length+10){
  while(index<events.length&&events[index][0]===run.runTicks){
   const [at,kind,value]=events[index++];
   if(kind==="turn"){if(!turn(run,value))return {ok:false,reason:"Invalid turn in replay."}}
   else if(kind==="ward"){if(!placeHatchlingWard(run))return {ok:false,reason:"Invalid Hatchling Ward placement."}}
   else if(!chooseMutation(run,value))return {ok:false,reason:"Invalid mutation selection."};
  }
  if(run.status==="draft")return {ok:false,reason:"Missing mutation choice."};
  if(run.status==="over"||run.status==="won")break;
  if(run.runTicks>expected.ticks)return {ok:false,reason:"Run exceeds submitted ticks."};
  step(run);
 }
 if(index!==events.length||!["over","won"].includes(run.status))return {ok:false,reason:"Replay was incomplete."};
 const keys=["score","kills","evolutionsChosen"];
 if(!keys.every(k=>Number.isInteger(expected[k])&&expected[k]===run[k]))
  return {ok:false,reason:"Score or evolution tally does not match replay."};
 if(run.runTicks!==expected.ticks)return {ok:false,reason:"Step count does not match replay."};
 // New 1.5.4 callers can verify the exact outcome as well as the score. Legacy
 // local test fixtures without 'outcome' remain valid. Public server integration
 // must REQUIRE it when adopting this rules version.
 if(expected.outcome!==undefined&&expected.outcome!==run.outcome)
  return {ok:false,reason:"Terminal outcome does not match replay."};
 return {ok:true,score:run.score,kills:run.kills,evolutions:run.evolutionsChosen,
  ticks:run.runTicks,outcome:run.outcome};
}
