import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createEngine} from "../engine.mjs";
import {firstFlyerWarning} from "../wave-guidance.mjs";

const start=()=>createEngine(1,"campaign","hollow");

test("the first flying wave recommends an unlocked level-one counter, not locked towers",()=>{
 const g=start();
 assert.equal(firstFlyerWarning(g,g.state,3),"");
 const hint=firstFlyerWarning(g,g.state,4);
 assert.match(hint,/Wave 4.*flying enemies/i);
 assert.match(hint,/Arcanum.*Level 1/i);
 assert.match(hint,/Ground-only towers and troops cannot hit them/i);
 assert.equal(firstFlyerWarning(g,g.state,5),"");
 assert.equal(firstFlyerWarning(createEngine(1,"sandbox"),createEngine(1,"sandbox").state,4),"");
});

test("already-built anti-air is acknowledged, and Ground-only targeting is called out",()=>{
 const g=start();
 assert.ok(g.command({type:"build",pad:0,kind:"arcanum"}));
 assert.match(firstFlyerWarning(g,g.state,4),/1 tower can hit flyers/);
 assert.ok(g.command({type:"flightTarget",pad:0,mode:"ground"}));
 assert.match(firstFlyerWarning(g,g.state,4),/Switch it to Both or Flying/);
 assert.ok(g.command({type:"flightTarget",pad:0,mode:"both"}));
 assert.match(firstFlyerWarning(g,g.state,4),/1 tower can hit flyers/);
});

test("a Tier III Beast Pack with Reach counts as air coverage, while Colossal Titan does not",()=>{
 for(const branch of ["A","B"]){
  const g=start();g.state.mana=10000;
  assert.ok(g.command({type:"build",pad:0,kind:"beast"}));
  assert.ok(g.command({type:"upgrade",pad:0}));
  assert.match(firstFlyerWarning(g,g.state,4),/Build Arcanum/);
  assert.ok(g.command({type:"upgrade",pad:0,branch}));
  const hint=firstFlyerWarning(g,g.state,4);
  if(branch==="A")assert.match(hint,/1 tower can hit flyers/);
  else assert.match(hint,/Build Arcanum/);
 }
});

test("suggestions honor progression locks instead of recommending unavailable towers",()=>{
 const g=start();
 g.state.locked=["arcanum"];
 assert.match(firstFlyerWarning(g,g.state,4),/Build a Storm Engine/);
 g.state.locked=["arcanum","storm"];
 assert.match(firstFlyerWarning(g,g.state,4),/Build a Judgment Spire/);
 g.state.locked=["arcanum","storm","judgment","beast"];
 assert.doesNotMatch(firstFlyerWarning(g,g.state,4),/Build Arcanum|Build a Storm|Build a Judgment/);
});

test("UI renders the first-flyers warning before wave four, even if the preview is collapsed or early calls are capped",()=>{
 const js=readFileSync(new URL("../main.mjs",import.meta.url),"utf8");
 const html=readFileSync(new URL("../../archemancy/index.html",import.meta.url),"utf8");
 const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
 assert.match(html,/id="waveCounterHint"[^>]*role="status"/);
 assert.match(js,/firstFlyerWarning\(game,s,n\)/);
 assert.match(js,/text\(\$\("waveCounterHint"\),hint\)/);
 assert.match(js,/s\.mode==="campaign"&&n===4/);
 assert.match(css,/\.wave-peek\.closed ul\{display:none\}/);
 assert.match(css,/\.wave-counter-hint\[hidden\]\{display:none\}/);
});
