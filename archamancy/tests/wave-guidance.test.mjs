import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createEngine} from "../engine.mjs";
import {firstFlyerWarning,bossOverlapWarning,earlyOverlapWarning,counterplayWarning,troopCardHint,handCycleHint} from "../wave-guidance.mjs";

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
 assert.match(firstFlyerWarning(g,g.state,4),/Switch to Both or Flying first/);
 assert.ok(g.command({type:"flightTarget",pad:0,mode:"both"}));
 assert.match(firstFlyerWarning(g,g.state,4),/1 tower can hit flyers/);
});

test("a Tier III Beast Pack with Reach counts as air coverage, while Colossal Titan does not",()=>{
 for(const branch of ["A","B"]){
  const g=start();g.state.mana=10000;
  assert.ok(g.command({type:"build",pad:0,kind:"beast"}));
  assert.ok(g.command({type:"upgrade",pad:0}));
  assert.match(firstFlyerWarning(g,g.state,4),/Mono-Green.*Beast Pack/);
  assert.ok(g.command({type:"upgrade",pad:0,branch}));
  const hint=firstFlyerWarning(g,g.state,4);
  if(branch==="A")assert.match(hint,/1 tower can hit flyers/);
  else assert.match(hint,/Mono-Green.*Beast Pack/);
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

test("major boss early calls reveal name and exact count of unfinished waves",()=>{
 const g=createEngine(1,"campaign","confluence");
 g.state.wave=4;g.state.phase="active";g.state.pendingWaves=[3,4];
 const first=bossOverlapWarning(g,g.state,5);
 assert.match(first,/Lovisa Coldeyes/);
 assert.match(first,/wave 5/);
 assert.match(first,/2 unfinished waves/);
 assert.match(first,/Calling early overlaps/);
 g.state.wave=24;g.state.pendingWaves=[24];
 const last=bossOverlapWarning(g,g.state,25);
 assert.match(last,/Lorthos/);
 assert.match(last,/1 unfinished wave\./);
});

test("early-call boss warning respects available actions and does not alter wave state",()=>{
 const g=createEngine(1,"campaign","confluence");
 g.state.wave=19;g.state.phase="active";g.state.pendingWaves=[18,19];
 const before=JSON.stringify(g.state);
 assert.match(bossOverlapWarning(g,g.state,20),/Iona/);
 assert.equal(bossOverlapWarning(g,g.state,21),"");
 g.state.onslaught=true;
 const onslaught=bossOverlapWarning(g,g.state,20);
 assert.match(onslaught,/Prepare your defenses/);
 assert.doesNotMatch(onslaught,/Calling early/);
 g.state.onslaught=false;
 g.state.phase="ready";
 assert.equal(bossOverlapWarning(g,g.state,20),"");
 g.state.phase="active";g.state.pendingWaves=[];
 assert.equal(bossOverlapWarning(g,g.state,20),"");
 g.state.pendingWaves=[19];g.state.mode="sandbox";
 assert.equal(bossOverlapWarning(g,g.state,20),"");
 assert.ok(before.includes('"pendingWaves":[18,19]'),"fixture covers a real overlapping state");
});

test("boss overlap advice stays visible in collapsed forecast and accessible wave-call label",()=>{
 const js=readFileSync(new URL("../main.mjs",import.meta.url),"utf8");
 const html=readFileSync(new URL("../../archemancy/index.html",import.meta.url),"utf8");
 assert.match(js,/bossOverlapWarning\(game,s,n\)/);
 assert.match(js,/firstFlyerWarning\(game,s,n\)\|\|overlap/);
 assert.match(js,/\|\|!!overlap/);
 assert.match(js,/startText\+\(risk\?" "\+risk:""\)/);
 assert.match(html,/id="waveCounterHint"/);
});

test("caldera mono-blue forecast warns before the reported Stalker and Warden waves without changing rules",()=>{
 const g=createEngine(1,"campaign","caldera");
 assert.ok(g.command({type:"build",pad:0,kind:"arcanum"}));
 assert.ok(g.command({type:"build",pad:1,kind:"mirror"}));
 const before=JSON.stringify(g.state);
 assert.equal(counterplayWarning(g,g.state,5),"");
 assert.match(counterplayWarning(g,g.state,6),/Mono-Blue: shroud.*Deep Freeze/);
 assert.match(counterplayWarning(g,g.state,8),/Mono-Blue: magic immunity.*Endless Reflections/);
 assert.match(counterplayWarning(g,g.state,16),/Mono-Blue: magic immunity.*Endless Reflections.*shroud.*Deep Freeze/);
 assert.equal(counterplayWarning(g,g.state,26),"");
 assert.equal(JSON.stringify(g.state),before);
 g.state.mana=10000;
 assert.ok(g.command({type:"build",pad:3,kind:"judgment"}));
 assert.equal(counterplayWarning(g,g.state,16),"","Judgment covers both threats");
 assert.ok(g.command({type:"flightTarget",pad:3,mode:"flying"}));
 assert.doesNotMatch(counterplayWarning(g,g.state,16),/No physical tower/,"Flying first retains physical ground fallback");
});
test("counterplay hints respect progression locks and do not invent a missing spell or tower",()=>{
 const g=createEngine(1,"campaign","caldera");g.state.locked=["judgment","hex"];
 assert.doesNotMatch(counterplayWarning(g,g.state,16),/Judgment Spire|Hex Sanctum/);
 assert.ok(g.command({type:"build",pad:0,kind:"legion"}));
 assert.match(counterplayWarning(g,g.state,16),/Mono-White.*flyers/,"troop tower provides physical damage and detection but not anti-air");
 g.state.phase="lost";assert.equal(counterplayWarning(g,g.state,16),"");
});
test("reported stalled hand advises free discard but does not mislabel Ward",()=>{
 const g=createEngine(1,"campaign","caldera");
 g.state.hand=["funeral","offering","legion","ward","bloom"];
 assert.equal(handCycleHint(g,g.state),"Discard for next draw");
 for(const id of ["funeral","offering","legion","bloom"])assert.match(troopCardHint(g,g.state,id),/Needs a troop tower.*Discard for free/);
 assert.equal(troopCardHint(g,g.state,"ward"),"");
 const mana=g.state.mana;assert.ok(g.command({type:"discard",index:0}));
 assert.equal(g.state.mana,mana);assert.equal(handCycleHint(g,g.state),"");
 assert.ok(g.command({type:"build",pad:0,kind:"legion"}));
 assert.equal(troopCardHint(g,g.state,"legion"),"");
});
test("new guidance remains wired to the collapsed forecast, wave button and hand controls",()=>{
 const js=readFileSync(new URL("../main.mjs",import.meta.url),"utf8");
 assert.match(js,/counter=counterplayWarning\(game,s,n\)/);
 assert.match(js,/\|\|!!counter/);
 assert.match(js,/counterplayWarning\(game,s,s\.wave\+1\)/);
 assert.match(js,/troopCardHint\(game,s,s\.hand\[selectedCard\]\)/);
 assert.match(js,/handCycleHint\(game,s\)/);
});

test("all mono colors receive their own air and immunity advice, including sold towers",()=>{
 const cases=[["W","legion","Judgment Spire"],["B","necropolis","Hex Sanctum"],["R","goblin","Storm Engine"],["G","grove","Beast Pack"],["U","library","Arcanum"]];
 for(const [color,kind,word] of cases){
  const g=start();g.state.mana=10000;assert.ok(g.command({type:"build",pad:0,kind}));
  const hint=firstFlyerWarning(g,g.state,4);assert.ok(hint.includes(word));assert.match(hint,/Other tower colors invalidate/);
  assert.equal(g.playtestReport().monoColor,color);assert.deepEqual(g.playtestReport().towerColors,[color]);
  assert.ok(g.command({type:"sell",pad:0}));assert.equal(g.playtestReport().monoColor,color);
  assert.ok(firstFlyerWarning(g,g.state,4).includes(word));
  const other=color==="U"?"legion":"arcanum";assert.ok(g.command({type:"build",pad:0,kind:other}));assert.equal(g.playtestReport().monoColor,null);
 }
});
test("green forecast recommends Reach before flyers and poison before physical immunity",()=>{
 const g=start();g.state.mana=10000;assert.ok(g.command({type:"build",pad:0,kind:"beast"}));
 assert.match(counterplayWarning(g,g.state,11),/physical immunity.*Venom Thicket.*flyers.*Beast Pack/);
 assert.ok(g.command({type:"upgrade",pad:0}));assert.ok(g.command({type:"upgrade",pad:0,branch:"A"}));
 assert.match(counterplayWarning(g,g.state,11),/physical immunity.*Venom Thicket/);
 assert.ok(g.command({type:"build",pad:1,kind:"thorn"}));assert.ok(g.command({type:"upgrade",pad:1}));assert.ok(g.command({type:"upgrade",pad:1,branch:"B"}));
 assert.equal(counterplayWarning(g,g.state,11),"");
});

test("rapid ordinary wave calls warn without changing Onslaught or early-call rules",()=>{
 const g=start();g.state.phase="active";g.state.wave=3;g.state.pendingWaves=[3];g.state.onslaught=true;const before=JSON.stringify(g.state);
 assert.match(earlyOverlapWarning(g,g.state,4),/1 unfinished wave.*Let the timer run/);g.state.pendingWaves=[3,4];assert.match(earlyOverlapWarning(g,g.state,5),/2 unfinished waves/);g.state.pendingWaves=[3];assert.equal(JSON.stringify(g.state),before);
 g.state.wave=9;g.state.pendingWaves=[9];assert.equal(earlyOverlapWarning(g,g.state,10),"");g.state.phase="ready";assert.equal(earlyOverlapWarning(g,g.state,10),"");
});
