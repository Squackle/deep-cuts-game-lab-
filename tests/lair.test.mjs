import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createLairRun,completeLairRun,isLairChallenge,lairDetails,LAIR_BOSSES} from "../src/lair.js";
import {lairFlashEvent,drawLairEffects} from "../src/lair-visuals.js";
import {BRIEFINGS,BossBriefingGate} from "../src/boss-briefing.js";
import {newRun,start,step,RULES_VERSION} from "../src/engine.js";
import {ABILITIES} from "../src/miniboss.js";

test("four selectable Lair bosses match original encounter difficulty and correct depths",()=>{
 const ids=["stalker","warden","weaver","guardian"];
 assert.deepEqual(LAIR_BOSSES.map(b=>b.id),ids);
 for(const spec of LAIR_BOSSES){
  const run=createLairRun(spec.id);
  assert.equal(run.lairBoss,spec.id);
  assert.equal(run.status,"ready");
  assert.equal(run.mode,"hunt");
  assert.equal(run.evolutionsChosen,spec.evolution);
  assert.equal(run.encounter.kind,spec.id);
  assert.equal(run.encounter.phases,ABILITIES[spec.id].phases);
  assert.equal(run.encounter.phase,1);
  assert.equal(run.enemies.length,1);
  assert.equal(run.enemies[0].kind,spec.id);
  assert.equal(run.food,null);
  assert.equal(run.energy,0);
  assert.equal(run.mercy,0);
  assert.equal(run.biome,lairDetails(spec.id).biome);
  assert.equal(lairDetails(spec.id).name,BRIEFINGS[spec.id].name);
  assert.ok(!run.body.some(p=>p.x===run.enemies[0].pos.x&&p.y===run.enemies[0].pos.y));
 }
});
test("practice is deterministic, repeatable and never treated as ranked",()=>{
 for(const boss of LAIR_BOSSES){
  const a=createLairRun(boss.id),b=createLairRun(boss.id);
  assert.equal(a.seed,b.seed);
  assert.deepEqual(a.enemies,b.enemies);
  assert.deepEqual(a.terrain,b.terrain);
  assert.equal(a.runTicks,0);
  start(a);step(a);assert.notEqual(a.status,"over");
 }
 assert.equal(isLairChallenge("hunt","practice"),true);
 assert.equal(isLairChallenge("classic","practice"),false);
 assert.equal(isLairChallenge("hunt","daily"),false);
 assert.equal(RULES_VERSION,"hive-1.2","existing ranked replay rules version is unaffected");
});
test("practicing a boss ends in a dedicated victory instead of a mutation draft",()=>{
 const run=createLairRun("weaver");
 start(run);
 assert.equal(completeLairRun(run),false);
 run.lastEncounter={kind:"weaver",type:"phase",phase:2,at:{x:8,y:8}};
 assert.equal(completeLairRun(run),false);
 run.lastEncounter={kind:"weaver",type:"defeat",phase:2,at:{x:8,y:8}};
 run.status="draft";run.energy=5;run.draftOptions=["G","R","U"];
 assert.equal(completeLairRun(run),true);
 assert.equal(run.status,"won");
 assert.equal(run.energy,0);
 assert.deepEqual(run.draftOptions,[]);
 assert.match(run.endReason,/TUNNEL WEAVER defeated/);
 assert.equal(completeLairRun(run),false);
});
test("practice does not affect ordinary seeded gameplay fixtures",()=>{
 const run=newRun({seed:101,mode:"hunt"});
 assert.equal(run.lairBoss,undefined);
 assert.equal(run.encounter,null);
 assert.equal(completeLairRun(run),false);
 const brood=newRun({seed:101,mode:"classic"});
 assert.equal(brood.encounter,null);
 assert.equal(completeLairRun(brood),false);
});
test("practice opens existing briefing and safe countdown, without active ticks",()=>{
 const run=createLairRun("guardian"),gate=new BossBriefingGate();
 start(run);
 assert.equal(gate.begin(run.encounter),true);
 assert.equal(gate.phase,"briefing");
 const ticks=run.runTicks;
 assert.equal(gate.resume(1000),true);
 gate.advance(2500);assert.equal(gate.blocking,true);assert.equal(gate.seconds,2);
 assert.equal(run.runTicks,ticks);
 gate.advance(4200);assert.equal(gate.blocking,false);
 assert.equal(run.runTicks,ticks);
});
test("Lair flash draws pixel telegraphs and honors reduced motion",()=>{
 assert.equal(lairFlashEvent(null),null);
 const burst=lairFlashEvent({kind:"stalker",type:"defeat",at:{x:6,y:6}},1000);
 assert.ok(burst.until>2000);
 assert.equal(burst.kind,"stalker");
 const run=createLairRun("stalker");
 run.encounter.telegraph={pos:{x:9,y:10},from:{x:7,y:10},remainingMs:500};
 let count=0;
 const ctx={save(){},restore(){},setLineDash(){},strokeRect(){count++},fillRect(){count++}};
 drawLairEffects(ctx,run,20,1200,burst,true);
 assert.ok(count>8);
 drawLairEffects(ctx,run,20,4000,burst,false);
 assert.ok(count>8);
});
test("both page variants offer four accessible boss buttons and clear unranked status",()=>{
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const js=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
 assert.match(html,/value="practice"/);
 assert.match(html,/id="lairPicker" hidden/);
 for(const boss of LAIR_BOSSES)assert.match(html,new RegExp('data-lair-boss="'+boss.id+'"'));
 assert.match(html,/NO PUBLIC SCORES/);
 assert.match(js,/createLairRun\(selectedLairBoss,COLS,ROWS\)/);
 assert.match(js,/completeLairRun\(state\.run\)/);
 assert.match(js,/showBossBriefing\(\)/);
 assert.match(js,/RETRY BOSS/);
 assert.match(css,/\.lair-choices/);
 assert.match(html,/1\.2 · SNARE/);
});
