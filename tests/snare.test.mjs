import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {newRun,start,step,turn,RULES_VERSION,PLAYER_BASE_TICK_MS} from "../src/engine.js";
import {ABILITIES,spawnMiniboss,tickMiniboss,abilityState,WEB_STUN_MS,consumeEncounterFreeze} from "../src/miniboss.js";
import {PREY} from "../src/enemies.js";
import {LAIR_BOSSES,createLairRun} from "../src/lair.js";
import {boardKey} from "../src/modes.js";
test("Snare creates an independent, versioned and deterministic replay ruleset",()=>{
 assert.equal(RULES_VERSION,"hive-1.3");
 assert.equal(boardKey("classic"),"classic|arcade");
 assert.equal(boardKey("hunt"),"hunt|arcade");
});
test("all four bosses keep one uniform movement period and fixed practice-time cadence",()=>{
 for(const spec of LAIR_BOSSES){
  const run=createLairRun(spec.id);
  assert.equal(PREY[spec.id].period,4);
  assert.equal(run.enemies[0].period,4);
  assert.equal(run.tickMs,PLAYER_BASE_TICK_MS);
  const after=run.encounter;
  after.phase=after.phases;
  after.introMs=0;
  // Final-phase speed must never accelerate relative to the other bosses.
  assert.equal(PREY[spec.id].period,4);
 }
});
test("Weaver web freezes the swarm but continues enemy movement, web expiry and casting",()=>{
 const run=createLairRun("weaver");
 start(run);run.encounter.introMs=0;
 // Force a visible, unoccupied web one square ahead.
 const next={x:run.body[0].x+1,y:run.body[0].y};
 run.encounter.webs=[{pos:next,lifeMs:15000},{pos:{x:2,y:2},lifeMs:15000}];
 run.enemies[0].pos={x:3,y:4};run.enemies[0].clock=0;
 step(run);
 assert.equal(run.encounter.stunMs,WEB_STUN_MS);
 assert.equal(run.body[0].x,next.x);
 assert.equal(run.encounter.webs.length,1);
 const head={...run.body[0]},moves=run.moves,enemyMoves=run.enemies[0].moves;
 const clock=run.runTicks,oldLife=run.encounter.webs[0].lifeMs;
 run.encounter.abilityMs=ABILITIES.weaver.cooldownMs-1;
 for(let i=0;i<5;i++){
  step(run);
  assert.deepEqual(run.body[0],head);
  assert.equal(run.moves,moves);
 }
 assert.equal(run.status,"running");
 assert.ok(run.runTicks>clock);
 assert.ok(run.enemies[0].moves>enemyMoves);
 assert.ok(run.encounter.webs[0].lifeMs<oldLife);
 assert.ok(run.encounter.webs.length>=1);
 assert.ok(run.encounter.lastAbility);
 assert.equal(turn(run,"up"),false);
 while(run.encounter.stunMs>0)step(run);
 assert.equal(run.encounter.stunMs,0);
});
test("the Rift Guardian recharges and pulses after each 4-second combat window",()=>{
 const run=createLairRun("guardian");
 start(run);run.encounter.introMs=0;
 assert.equal(ABILITIES.guardian.cooldownMs,4000);
 assert.equal(abilityState(run).remainingMs,4000);
 let cast=tickMiniboss(run,3999);
 assert.equal(cast,null);assert.equal(abilityState(run).ready,false);
 cast=tickMiniboss(run,1);
 assert.equal(cast?.type,"boss-power");
 assert.equal(abilityState(run).charge,0);
 const n=run.terrain.length;assert.ok(n>0);
 assert.ok(run.terrain.every(t=>t.warningMs>0));
 cast=tickMiniboss(run,4000);
 assert.equal(cast?.type,"boss-power");
 assert.ok(run.terrain.length>=n);
});
test("paused runs and encounter introductions do not artificially progress the stun",()=>{
 const run=createLairRun("weaver");
 start(run);
 run.encounter.stunMs=2000;
 const tick=run.runTicks,stun=run.encounter.stunMs;
 step(run);
 assert.equal(run.encounter.stunMs,stun);
 assert.equal(run.runTicks,tick+1);
 run.encounter.introMs=0;
 run.status="paused";step(run);
 assert.equal(run.encounter.stunMs,stun);
 run.status="draft";step(run);
 assert.equal(run.encounter.stunMs,stun);
});
test("Brood Trail has no expedition control; neither game page exposes Daily Ritual",()=>{
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const main=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
 assert.doesNotMatch(html,/value="daily"|DAILY RITUAL|DAILY TEST SEED/i);
 assert.match(html,/1\.4 · BEACON/);
 assert.match(main,/function syncExpeditionChoice\(/);
 assert.match(main,/\$\("gameChallenge"\)\.hidden=selectedMode==="classic"/);
 assert.match(main,/\$\("gameChallengeLabel"\)\.hidden=selectedMode==="classic"/);
 assert.match(css,/#gameChallenge\[hidden\],#gameChallengeLabel\[hidden\]/);
});
