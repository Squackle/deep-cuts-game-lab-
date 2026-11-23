import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createEngine,ONSLAUGHT_GAP} from "../engine.mjs";
import {advance,clockRunning} from "../clock.mjs";

// Regression: the browser loop only stepped the game during a wave, so once the road was cleared
// the Onslaught countdown froze (the button sat on "Wave 2 in 1s") and the next wave never came.
test("the browser clock keeps Onslaught's countdown running after the road is cleared",()=>{
 const g=createEngine(1,"campaign","hollow");g.state.mana=9999;
 assert.ok(g.command({type:"onslaught",on:true}));assert.ok(g.command({type:"build",pad:4,kind:"pyre"}));assert.ok(g.command({type:"build",pad:5,kind:"pyre"}));
 assert.ok(g.command({type:"wave"}));
 let acc=0;for(let i=0;i<ONSLAUGHT_GAP&&g.state.phase==="active";i++)acc=advance(g,acc+100);
 assert.equal(g.state.phase,"ready","wave 1 is cleared before the timer runs out");
 assert.equal(g.state.wave,1);assert.ok(g.onslaughtLeft()>0&&clockRunning(g));
 const left=g.onslaughtLeft(),tick=g.state.tick;
 acc=advance(g,acc+1000);
 assert.equal(g.state.tick,tick+10,"one second of real time runs ten ticks between waves");
 assert.equal(g.onslaughtLeft(),left-10);
 for(let i=0;i<ONSLAUGHT_GAP&&g.state.wave===1;i++)acc=advance(g,acc+100);
 assert.equal(g.state.wave,2,"wave 2 arrives on time");
 assert.equal(g.state.waveCalls[1].tick,ONSLAUGHT_GAP,"exactly 30 s after wave 1 started");
});

test("without Onslaught the clock waits between waves, and stops when the run ends",()=>{
 const g=createEngine(1,"campaign","hollow");g.state.mana=9999;assert.ok(g.command({type:"build",pad:4,kind:"pyre"}));
 assert.equal(advance(g,5000),0);assert.equal(g.state.tick,0,"nothing runs before wave 1");
 assert.ok(g.command({type:"wave"}));let acc=0;for(let i=0;i<5000&&g.state.phase==="active";i++)acc=advance(g,acc+100);
 assert.equal(g.state.phase,"ready");const tick=g.state.tick;
 assert.equal(advance(g,5000),0);assert.equal(g.state.tick,tick,"time stands still between waves");
 g.state.phase="lost";assert.ok(!clockRunning(g));
});

test("the page's frame loop runs the game through the shared clock",()=>{
 const src=readFileSync(new URL("../main.mjs",import.meta.url),"utf8");
 assert.match(src,/import \{advance,clockRunning\} from '\.\/clock\.mjs'/);
 assert.match(src,/accumulator=advance\(game,accumulator\+elapsed\*speed\)/);
});
