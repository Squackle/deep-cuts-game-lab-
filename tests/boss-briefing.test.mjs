import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BRIEFINGS,BRIEFING_SECONDS,BossBriefingGate} from "../src/boss-briefing.js";
import {ABILITIES,BURROW_RANGE,WEB_LIFETIME_MS,WEB_STUN_MS,TELEGRAPH_MS} from "../src/miniboss.js";
import {newRun,start,step} from "../src/engine.js";
import {spawnMiniboss} from "../src/miniboss.js";

test("four authentic encounter dossiers match actual boss types and captures",()=>{
 assert.deepEqual(Object.keys(BRIEFINGS).sort(),Object.keys(ABILITIES).sort());
 for(const [kind,info] of Object.entries(BRIEFINGS)){
  assert.equal(info.name,ABILITIES[kind].name);
  assert.equal(info.captures,ABILITIES[kind].phases);
  assert.equal(info.mechanics.length,3);
  assert.ok(info.mechanics.every(line=>line.length>30&&line.length<110));
  assert.ok(info.tip.length>30);
  assert.match(info.accent,/^#[0-9a-fA-F]{6}$/);
 }
 assert.equal(BRIEFING_SECONDS,3);
 assert.equal(BURROW_RANGE,5);
 assert.equal(TELEGRAPH_MS,500);
 assert.equal(WEB_LIFETIME_MS,15000);
 assert.equal(WEB_STUN_MS,2000);
 for(const info of Object.values(ABILITIES))assert.equal(info.cooldownMs,10000);
});
test("the full encounter pauses once and not again for later capture phases",()=>{
 const gate=new BossBriefingGate();
 const encounter={kind:"stalker",phase:1};
 assert.equal(gate.begin(encounter),true);
 assert.equal(gate.phase,"briefing");
 assert.equal(gate.begin(encounter),false);
 assert.equal(gate.resume(100),true);
 assert.equal(gate.resume(200),false);
 assert.equal(gate.seconds,3);
 assert.equal(gate.advance(1100),false);
 assert.equal(gate.seconds,2);
 assert.equal(gate.advance(2100),false);
 assert.equal(gate.seconds,1);
 assert.equal(gate.advance(3100),true);
 assert.equal(gate.phase,"idle");
 encounter.phase=2;
 assert.equal(gate.begin(encounter),false,"no new dossier between phases");
 assert.equal(gate.begin({kind:"weaver",phase:1}),true,"new encounter receives a new dossier");
});
test("foreground loss returns to a held dossier rather than silently completing countdown",()=>{
 const gate=new BossBriefingGate();
 assert.equal(gate.begin({kind:"warden"}),true);
 assert.equal(gate.resume(500),true);
 gate.advance(700);
 assert.equal(gate.interrupt(),true);
 assert.equal(gate.phase,"briefing");
 assert.equal(gate.advance(9000),false);
 assert.equal(gate.blocking,true);
 assert.equal(gate.resume(10000),true);
 assert.equal(gate.advance(12999),false);
 assert.equal(gate.advance(13000),true);
});
test("unknown encounters, backwards time, resets and invalid transitions are safe",()=>{
 const gate=new BossBriefingGate();
 assert.equal(gate.resume(0),false);
 assert.equal(gate.begin({kind:"skitter"}),false);
 assert.equal(gate.begin(null),false);
 const boss={kind:"guardian",phase:1};
 assert.equal(gate.begin(boss),true);
 assert.equal(gate.resume(1000),true);
 gate.advance(900);assert.equal(gate.seconds,3);
 assert.equal(gate.advance(3999),false);
 assert.equal(gate.advance(4000),true);
 gate.reset();
 assert.equal(gate.begin(boss),true,"new run can introduce the same encounter instance anew");
});
test("an active dossier and regroup countdown never mutate the run or boss timers",()=>{
 const run=newRun({seed:20});
 start(run);
 assert.equal(spawnMiniboss(run,"guardian"),true);
 const gate=new BossBriefingGate();
 assert.equal(gate.begin(run.encounter),true);
 const tick=run.runTicks,ability=run.encounter.abilityMs,intro=run.encounter.introMs;
 const body=JSON.stringify(run.body),enemies=JSON.stringify(run.enemies);
 const snapshots=[250,1250,2250,3250,4250];
 gate.resume(250);
 for(const now of snapshots){if(gate.blocking)gate.advance(now);}
 assert.equal(run.runTicks,tick);
 assert.equal(run.encounter.abilityMs,ability);
 assert.equal(run.encounter.introMs,intro);
 assert.equal(JSON.stringify(run.body),body);
 assert.equal(JSON.stringify(run.enemies),enemies);
 step(run);
 assert.equal(run.runTicks,tick+1,"only a real gameplay tick changes the simulation");
});
test("the browser places blocking UI above the arena and guards replay-steering",()=>{
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const js=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
 for(const id of ["bossBriefing","bossBriefingIcon","bossBriefingResume","bossBriefingMechanics",
                    "bossBriefingTips","bossCountdown","bossCountdownNumber"]){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(html,/aria-modal="true"/);
 assert.match(css,/\.boss-briefing\[hidden\]/);
 assert.match(css,/\.arena:has\(\.boss-briefing:not\(\[hidden\]\)\)/);
 assert.ok(js.indexOf("if(bossGate.blocking){\n  if(bossGate.phase")<js.indexOf("state.accumulator+=dt"),
  "UI gate must be evaluated before the simulation accumulates time");
 assert.match(js,/if\(bossGate.blocking\|\|awaitingMutationResume\|\|state\.run\.status!=="running"\)return false/);
 assert.match(js,/if\(state\.run\.status==="running"&&showBossBriefing\(\)\)break/);
 assert.match(js,/if\(!showBossBriefing\(\)\)/);
 assert.match(js,/resetBossBriefing\(\)/);
 assert.match(js,/reopenBossBriefing\(\)/);
});
