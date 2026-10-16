import test from "node:test";
import assert from "node:assert/strict";
import {LEVELS} from "../src/levels.js";
import {actions,initial,key,reduce,completed} from "../src/engine.js";
import {chooseAutomaticCast,resolveAutomaticCasts} from "../src/auto-cast.js";
import {readFileSync} from "node:fs";

test("a ward automatically resolves on the first sufficient mana without a Cast click",()=>{
 const level=LEVELS[0];
 const first=initial(level);
 assert.equal(chooseAutomaticCast(level,first),null);
 const tap=actions(level,first).find(a=>a.type==="tap");
 const charged=reduce(level,first,tap).state;
 const auto=chooseAutomaticCast(level,charged);
 assert.equal(auto.type,"cast");
 const result=resolveAutomaticCasts(level,charged);
 assert.equal(result.casts.length,1);
 assert.equal(completed(level,result.state),true);
 assert.equal(result.state.pool.U,0);
});

test("all 18 puzzles remain beatable in the optional auto-cast mode",()=>{
 const outcomes=[];
 for(const level of LEVELS.slice(0,18)){
  const start=resolveAutomaticCasts(level,initial(level));
  const queue=[start.state],seen=new Set([key(start.state)]);
  let solved=completed(level,start.state),checked=0;
  for(let i=0;i<queue.length&&!solved;i++){
   const state=queue[i];checked++;
   if(checked>40000)break;
   for(const action of actions(level,state)){
    if(action.type==="cast")continue; // the user cannot postpone or choose to cast
    const out=reduce(level,state,action);
    if(!out.ok)throw Error(out.error);
    const settled=resolveAutomaticCasts(level,out.state).state;
    if(completed(level,settled)){solved=true;break;}
    const signature=key(settled);
    if(!seen.has(signature)){seen.add(signature);queue.push(settled);}
   }
  }
  outcomes.push({stage:level.id,solved,checked});
  assert.equal(solved,true,level.id+" cannot be beaten with automatic casting (checked "+checked+" states)");
 }
 assert.equal(outcomes.length,18);
});

test("the tabletop teaches deliberate spending while retaining opt-in auto-cast",()=>{
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const js=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 assert.match(html,/id="castButton"/);
 assert.match(html,/id="autoCastToggle"/);
 assert.match(html,/id="lessonPrompt"/);
 assert.match(html,/id="playSelectedLand"/);
 assert.match(js,/function updateCastButton\(\)/);
 assert.match(js,/let autoCastEnabled=false/);
 assert.match(js,/if\(!autoCastEnabled\|\|pendingFlights\.size/);
 assert.doesNotMatch(html,/class="mana-ledger-grid"/);
 assert.doesNotMatch(html,/id="poolTotal"/);
 assert.doesNotMatch(html,/class="side-box pool-box"/);
 assert.match(html,/id="autoCastStatus"/);
 assert.match(js,/queueAutoCast\(\)/);
 assert.match(js,/onArrival:/);
 assert.match(js,/target:null,destination:el\("wardTarget"\)/);
 assert.match(js,/el\("castButton"\)\.addEventListener\("click"/);
});
