import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {newRun,start,RULES_VERSION} from "../src/engine.js";
import {LAIR_BOSSES} from "../src/lair.js";
import {
 DIRECTOR_ONLY,DIRECTOR_MODES,DIRECTOR_PHASES,DIRECTOR_SEED,createDirectorRun,
 jumpDirectorPhase,showcaseDirectorVictory,advanceDirectorRun,directorStatus
} from "../director/mode.js";
const read=(p)=>readFileSync(new URL(p,import.meta.url),"utf8");
test("Director Mode is marked permanently internal and available for both game modes",()=>{
 assert.equal(DIRECTOR_ONLY,true);
 assert.deepEqual(DIRECTOR_MODES,["hunt","classic"]);
 assert.deepEqual(DIRECTOR_PHASES,["first","final","victory"]);
 assert.equal(RULES_VERSION,"hive-1.5.3","Director adds no replay-facing engine rules");
});
test("Each of the five bosses can start instantly in first or final phase",()=>{
 for(const boss of LAIR_BOSSES){
  for(const phase of ["first","final"]){
   const run=createDirectorRun({mode:"hunt",boss:boss.id,phase});
   assert.equal(run.directorSession,true);
   assert.equal(run.status,"running");
   assert.equal(run.encounter?.kind,boss.id);
   assert.equal(run.encounter.phase,phase==="first"?1:run.encounter.phases);
   assert.equal(run.encounter.introMs,0);
   assert.equal(run.lairBoss,boss.id);
   assert.equal(run.seed,boss.seed);
   assert.match(directorStatus(run),/UNRANKED/);
  }
 }
 const a=createDirectorRun({boss:"broodmother"}),b=createDirectorRun({boss:"broodmother"});
 assert.deepEqual(a.enemies,b.enemies);
 assert.deepEqual(a.body,b.body);
});
test("Manual skip jumps to the last real boss phase without a win or reward",()=>{
 const run=createDirectorRun({boss:"guardian",phase:"first"});
 const oldScore=run.score;const oldBody=run.body.map(p=>({...p}));
 assert.equal(jumpDirectorPhase(run),true);
 assert.equal(run.encounter.phase,3);
 assert.equal(run.status,"running");
 assert.equal(run.score,oldScore);
 assert.deepEqual(run.body,oldBody);
 assert.equal(jumpDirectorPhase(run),true);
});
test("Unranked victory previews never produce a ranked score or change real runs",()=>{
 const hunt=createDirectorRun({mode:"hunt",boss:"broodmother",phase:"victory"});
 assert.equal(hunt.status,"won");assert.equal(hunt.encounter,null);
 assert.match(hunt.endReason,/VICTORY PREVIEW/);
 assert.equal(hunt.score,0);
 const trail=createDirectorRun({mode:"classic",phase:"victory"});
 assert.equal(trail.status,"won");assert.match(trail.endReason,/PERFECT CLEAR PREVIEW/);
 assert.equal(trail.score,0);assert.equal(trail.mode,"classic");
 const official=newRun({seed:DIRECTOR_SEED,mode:"classic"});
 assert.equal(showcaseDirectorVictory(official),false);
 assert.equal(official.status,"ready");
 assert.equal(official.directorSession,undefined);
});
test("Unmodified engine cannot use Director shortcuts or be silently invulnerable",()=>{
 const regular=newRun({seed:1,mode:"hunt"});start(regular);
 assert.throws(()=>advanceDirectorRun(regular),/Only Director Mode/);
 assert.equal(jumpDirectorPhase(regular),false);
 assert.equal(showcaseDirectorVictory(regular),false);
 assert.throws(()=>createDirectorRun({mode:"ranked"}),/Invalid Director game mode/);
 assert.throws(()=>createDirectorRun({boss:"invalid"}),/Unknown Director boss/);
 assert.throws(()=>createDirectorRun({phase:"unknown"}),/Invalid Director phase/);
});
test("Optional invulnerability protects Director's player even when steering into a wall",()=>{
 const run=createDirectorRun({boss:"broodmother",phase:"final"});
 run.body=[{x:run.cols-1,y:8},{x:run.cols-2,y:8},{x:run.cols-3,y:8}];
 run.direction="right";run.turnQueue=[];run.effects.shield=0;
 advanceDirectorRun(run,{invulnerable:true});
 assert.notEqual(run.status,"over");
 assert.ok(run.effects.shield>=1);
});
test("Turning off Director invulnerability uses ordinary lethal collisions",()=>{
 const run=createDirectorRun({boss:"broodmother",phase:"final"});
 run.body=[{x:run.cols-1,y:8},{x:run.cols-2,y:8},{x:run.cols-3,y:8}];
 run.direction="right";run.turnQueue=[];run.effects.shield=0;run.effects.molt=0;
 advanceDirectorRun(run,{invulnerable:false});
 assert.equal(run.status,"over");
});
test("Brood Trail can be rehearsed without changing its ordinary growth or replay state",()=>{
 const run=createDirectorRun({mode:"classic",phase:"first"});
 assert.equal(run.status,"running");assert.equal(run.food!==null,true);
 assert.equal(run.encounter,null);assert.equal(run.directorSession,true);
 assert.equal(jumpDirectorPhase(run),false);
 advanceDirectorRun(run,{invulnerable:true});
 assert.equal(run.status,"running");
 assert.ok(run.body.length>=7);
 const ordinary=newRun({mode:"classic",seed:DIRECTOR_SEED});
 assert.equal(ordinary.directorSession,undefined);
});
test("The Lab-only preview route has real controls but no network, storage, authentication or fake achievements",()=>{
 const html=read("../director/index.html"),ui=read("../director/main.js"),mode=read("../director/mode.js");
 const promo=read("../docs/MAIN-SITE-PROMOTION.md"),labIndex=read("../index.html");
 assert.match(html,/noindex,nofollow,noarchive/);
 assert.match(html,/DIRECTOR MODE/i);assert.match(html,/UNRANKED/);
 for(const id of ["directorGame","directorBoss","directorPhase","directorInvulnerable",
 "directorSlow","directorStart","directorSkip","directorWin","directorVictory","directorCanvas"])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(ui,/advanceDirectorRun/);assert.match(ui,/createDirectorRun/);
 assert.match(ui,/pointerup/);assert.match(ui,/keydown/);
 assert.match(ui,/effectiveTickMs\(run\)\*\(\$\("directorSlow"\)\.checked\?2:1\)/);
 assert.match(labIndex,/href="\.\/director\//);
 const patchNotes=labIndex.indexOf('class="mission mission--patch-notes"');
 const directorLink=labIndex.indexOf('class="director-portal"');
 const patchHeader=labIndex.indexOf('class="patch-notes-header"');
 assert.ok(patchNotes>=0&&directorLink>patchNotes&&patchHeader>directorLink,
  "Lab Director button appears immediately above the Patch Notes header");
 assert.equal((labIndex.match(/class="director-portal"/g)||[]).length,1,
  "Director Mode link is a single simple button, not a duplicate in the intro");
 assert.match(promo,/NEVER ship to production/);
 assert.match(promo,/director\/\*\*/);
 for(const source of [html,ui,mode]){
  assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|sendBeacon|WebSocket|\/api\/|HIVE_DB|score-submit/);
 }
 assert.doesNotMatch(read("../src/engine.js"),/director-mode|director\/mode|DIRECTOR_ONLY/);
 assert.doesNotMatch(read("../src/main.js"),/director\/mode|DIRECTOR_ONLY|advanceDirectorRun/);
});
