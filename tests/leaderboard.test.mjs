import test from "node:test";
import assert from "node:assert/strict";
import {newRun,start,step,turn,chooseMutation} from "../src/engine.js";
import {replayScore} from "../src/replay-verification.js";
import {createSoloSession} from "../src/solo-session.js";
function finished(seed,actions=[]){
 const run=newRun({seed});start(run);
 let index=0;
 for(let i=0;i<1000&&run.status!=="over"&&run.status!=="won";i++){
  while(index<actions.length&&actions[index][0]===run.runTicks){
   const [,action,value]=actions[index++];
   if(action==="turn")assert.ok(turn(run,value));
   if(action==="choose")assert.ok(chooseMutation(run,value));
  }
  if(run.status==="draft"){assert.fail("Test run missing draft choice")}
  step(run);
 }
 assert.ok(["over","won"].includes(run.status),"test run must finish");
 return {run,events:actions};
}
test("server replay accepts authentic zero-input ended run",()=>{
 const {run,events}=finished(103);
 const summary={score:run.score,kills:run.kills,evolutionsChosen:run.evolutionsChosen,ticks:run.runTicks};
 const replay=replayScore(103,events,summary);
 assert.equal(replay.ok,true,JSON.stringify(replay));
 assert.equal(replay.score,summary.score);
});
test("server replay rejects spoofed score and claimed kills",()=>{
 const {run,events}=finished(103);
 const summary={score:run.score+100000,kills:run.kills+50,evolutionsChosen:0,ticks:run.runTicks};
 assert.equal(replayScore(103,events,summary).ok,false);
});
test("server replay rejects incomplete or fabricated movement",()=>{
 const {run}=finished(103);
 assert.equal(replayScore(103,[],{score:0,kills:0,evolutionsChosen:0,ticks:3}).ok,false);
 assert.equal(replayScore(103,[[0,"turn","left"]],{score:0,kills:0,evolutionsChosen:0,ticks:run.runTicks}).ok,false);
 assert.equal(replayScore(103,[[3,"fake","up"]],{score:0,kills:0,evolutionsChosen:0,ticks:run.runTicks}).ok,false);
});
test("server replay verifies real recorded turn input",()=>{
 const events=[[0,"turn","up"]];
 const {run}=finished(32,events);
 const expected={score:run.score,kills:run.kills,evolutionsChosen:run.evolutionsChosen,ticks:run.runTicks};
 assert.equal(replayScore(32,events,expected).ok,true);
});
test("daily solo test seeds are repeatable and never ranked",()=>{
 const date=new Date("2026-10-14T13:00:00Z");
 const a=createSoloSession("classic","daily",date),b=createSoloSession("classic","daily",date);
 assert.deepEqual(a,b);assert.equal(a.ranked,false);
 assert.notEqual(createSoloSession("hunt","daily",date).seed,a.seed);
 const arcade=createSoloSession("classic","arcade",date);
 assert.equal(arcade.day,"");assert.equal(arcade.ranked,false);
});
