import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {KEY_DIRECTIONS,mutationSelectionIndex,isTouchMutationSelection,resumeHeading,swipeHeading,SWIPE_RESUME_KEYS} from "../src/input-controls.js";
import {createMutationButton,mutationDescription,showMutationDraft} from "../src/evolution-ui.js";
import {newRun,start,chooseMutation,turn,step,RULES_VERSION} from "../src/engine.js";
import {createSessionBest} from "../src/session-best.js";
import {boardKey} from "../src/modes.js";

test("mutation choices map to W/up/1, A/left/2, S/down/3 without a movement turn",()=>{
 for(const keys of [["w","W","ArrowUp","1"],["a","A","ArrowLeft","2"],["s","S","ArrowDown","3"]]){
  const n=[["w","a","s"].indexOf(keys[0])][0];
  for(const key of keys){assert.equal(mutationSelectionIndex(key),n);assert.equal(mutationSelectionIndex(key,true),null);}
 }
 for(const key of ["d","D","ArrowRight","Escape","4",null])assert.equal(mutationSelectionIndex(key),null);
 assert.equal(KEY_DIRECTIONS.ArrowRight,"right");
});
test("desktop mouse and keyboard selections wait; real touch taps resume immediately",()=>{
 assert.equal(isTouchMutationSelection({pointerType:"touch",detail:1}),true);
 assert.equal(isTouchMutationSelection({pointerType:"mouse",detail:1},true),false);
 assert.equal(isTouchMutationSelection({pointerType:"pen",detail:1},true),false);
 assert.equal(isTouchMutationSelection({detail:1},true),true);
 assert.equal(isTouchMutationSelection({detail:0},true),false);
 assert.equal(isTouchMutationSelection(undefined,false),false);
});
test("keyboard gated resume cannot reverse into tail or tick forward without input",()=>{
 const r=newRun({seed:44,mode:"classic"});
 start(r);
 r.body=Array.from({length:7},(_,i)=>({x:17-i,y:10}));
 r.direction="right";r.turnQueue=[];
 r.status="draft";r.draftOptions=["R","G","U"];
 assert.equal(chooseMutation(r,"R"),true);
 const tick=r.runTicks,effect=r.effects.redTicks,head={...r.body[0]};
 assert.equal(resumeHeading(r,"ArrowLeft",direction=>turn(r,direction)),false);
 assert.equal(r.runTicks,tick);assert.deepEqual(r.body[0],head);
 assert.equal(resumeHeading(r,"ArrowUp",direction=>turn(r,direction)),true);
 assert.equal(r.runTicks,tick,"a direction can be queued without advancing time");
 assert.equal(r.effects.redTicks,effect);
 step(r);
 assert.deepEqual(r.body[0],{x:17,y:9});
 assert.notEqual(r.status,"over");
});
test("forward key may intentionally resume; unrelated keys cannot",()=>{
 const run=newRun({seed:7,mode:"classic"});start(run);
 assert.equal(resumeHeading(run,"ArrowRight",direction=>turn(run,direction)),true);
 assert.equal(resumeHeading(run,"Escape",direction=>turn(run,direction)),false);
});
test("Rapid Brood, Blood Rush and Blue card text match the chosen mode",()=>{
 assert.match(mutationDescription("G","classic"),/orbs/);
 assert.doesNotMatch(mutationDescription("G","classic"),/capture|kill|enem/i);
 assert.match(mutationDescription("G","hunt"),/captures or orbs/);
 assert.doesNotMatch(mutationDescription("R","classic"),/hunt|kill|enem/i);
 assert.match(mutationDescription("R","classic"),/brood orbs/i);
 assert.doesNotMatch(mutationDescription("U","classic"),/traps?|enem|capture/i);
 for(const color of ["W","U","B","R","G"])assert.ok(mutationDescription(color,"hunt").length>12);
});
function fake(tag="span"){
 const o={tag,children:[],textContent:"",attributes:{},listeners:{},
  setAttribute(k,v){this.attributes[k]=v},
  append(...items){this.children.push(...items)},
  addEventListener(k,fn){this.listeners[k]=fn},
  focus(){this.focused=true},
  replaceChildren(...items){this.children=items},
  querySelector(k){return k==="button"?this.children[0]:null},
 };
 return o;
}
test("mutation cards show new shortcuts and only mention Brood Trail rewards",()=>{
 const doc={createElement:tag=>fake(tag)};
 const root=fake("section");root.ownerDocument=doc;
 const overlay={hidden:true};const selected=[];
 showMutationDraft(overlay,root,["G","R","U"],(color,event)=>selected.push([color,event]),"classic");
 assert.equal(overlay.hidden,false);
 assert.equal(root.children.length,3);
 assert.equal(root.children[0].children[0].textContent,"W / ↑ / 1");
 assert.equal(root.children[1].children[0].textContent,"A / ← / 2");
 assert.equal(root.children[2].children[0].textContent,"S / ↓ / 3");
 for(const card of root.children)assert.doesNotMatch(card.attributes["aria-label"],/capture|kill/i);
 const event={pointerType:"touch",detail:1};
 root.children[0].listeners.click(event);
 assert.deepEqual(selected,[["G",event]]);
});
test("SESSION BEST resets on reload and is scoped per mode and expedition",()=>{
 const current=createSessionBest();
 const hunt=boardKey("hunt"),classic=boardKey("classic");
 assert.equal(current.get(hunt),0);
 assert.equal(current.record(hunt,2500),2500);
 assert.equal(current.record(hunt,1500),2500);
 assert.equal(current.record(classic,6500),6500);
 assert.notEqual(hunt,classic);
 assert.equal(current.get(classic),6500);
 assert.equal(createSessionBest().get(hunt),0,"fresh visit resets all session records");
 assert.equal(createSessionBest().get(classic),0);
});
test("browser gate freezes the frame loop and retains replay-rules version",()=>{
 const main=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 assert.match(main,/if\(awaitingMutationResume\)\{[\s\S]*?draw\(\);requestAnimationFrame\(loop\);return;/);
 assert.match(main,/state\.lastFrame=0;state\.accumulator=0;/);
 assert.match(main,/resumeMutationByKey\(event\.key\)/);
 assert.match(main,/!event\.repeat/);
 assert.match(main,/showMutationDraft\([^\n]*state\.run\.mode\)/);
 assert.match(html,/id="mutationResume"[^>]*hidden/);
 assert.match(html,/SESSION BEST/);
 assert.match(html,/1\.3 · SPINDLE/);
 assert.equal(RULES_VERSION,"hive-1.3","UI-only release does not alter replay rules");
});
test("permanent release naming instruction is kept in source control",()=>{
 const naming=readFileSync(new URL("../docs/HIVE-RUN-RELEASE-NAMING.md",import.meta.url),"utf8");
 assert.match(naming,/single-word|exactly one/i);
 assert.match(naming,/thematic/i);
 assert.match(naming,/Instinct/);
});

test("Instinct Ready can resume with a safe mobile swipe, not a reverse or tap",()=>{
 for(const mode of ["hunt","classic"]){
  const run=newRun({seed:77,mode});start(run);
  run.status="draft";run.draftOptions=["W","G","U"];
  assert.equal(chooseMutation(run,"W"),true);
  const ticks=run.runTicks,head={...run.body[0]};
  const trySwipe=(dx,dy)=>{
   const heading=swipeHeading(dx,dy);
   return heading===null?false:resumeHeading(run,SWIPE_RESUME_KEYS[heading],direction=>turn(run,direction));
  };
  assert.equal(trySwipe(2,3),false,"a tap cannot resume");
  assert.equal(trySwipe(-50,0),false,"reversing into the trail stays blocked");
  assert.equal(run.runTicks,ticks);assert.deepEqual(run.body[0],head);
  assert.equal(trySwipe(0,-35),true,"swipe upward queues a safe turn");
  assert.equal(run.runTicks,ticks,"resume must not advance simulation time");
  assert.equal(run.turnQueue[0],"up");
 }
 for(const [dx,dy,heading] of [[20,0,"right"],[-20,0,"left"],[0,20,"down"],[0,-20,"up"]]){
  assert.equal(swipeHeading(dx,dy),heading);
  assert.ok(SWIPE_RESUME_KEYS[heading]);
 }
 assert.equal(swipeHeading(NaN,25),null);
 const main=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 assert.match(main,/awaitingMutationResume\s*\?\s*resumeMutationByKey\(SWIPE_RESUME_KEYS\[heading\]\)\s*:\s*handleDirection\(heading\)/);
 assert.match(html,/SWIPE OR PRESS A MOVEMENT KEY TO RESUME/);
});
