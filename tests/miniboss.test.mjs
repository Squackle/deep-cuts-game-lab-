import test from "node:test";
import assert from "node:assert/strict";
import {newRun,start,pause,step,turn,chooseMutation,effectiveTickMs,RULES_VERSION} from "../src/engine.js";
import {ABILITIES,BURROW_RANGE,WEB_LIFETIME_MS,WEB_STUN_MS,INTRO_MS,TELEGRAPH_MS,
 encounterKind,spawnMiniboss,tickMiniboss,triggerWeb,consumeEncounterFreeze,abilityState,
 dashCandidates} from "../src/miniboss.js";
import {validateIcons,chargePixels,ICON_PIXELS,OCHRE,drawAbilityMeter} from "../src/boss-art.js";
import {replayScore} from "../functions/api/leaderboard.js";

function evolve(r,n){
 for(let i=0;i<n;i++){
  r.status="draft";r.draftOptions=["W","G","R"];
  assert.equal(chooseMutation(r,"W"),true);
 }
}
function forcedBossCapture(r){
 r.encounter.introMs=0;
 r.body=[{x:9,y:10},{x:8,y:10},{x:6,y:6},{x:5,y:5},{x:5,y:7},{x:10,y:10}];
 r.direction="down";r.turnQueue=[];
 assert.equal(r.enemies.length,1,"expected one active miniboss");
 Object.assign(r.enemies[0],{pos:{x:5,y:6},dir:"right",period:1,clock:0});
 step(r);
}
test("Alpha 0.4 evolution milestones 2/6 and 10/14 repeat with full bosses on 4/8",()=>{
 assert.equal(RULES_VERSION,"hive-1.0.1");
 assert.deepEqual([0,1,2,3,4,5,6,7,8,9,10,14].map(encounterKind),
  [null,null,"stalker",null,"warden",null,"weaver",null,"guardian",null,"stalker","weaver"]);
 const r=newRun({seed:42});start(r);evolve(r,2);
 assert.equal(r.encounter.kind,"stalker");
 assert.equal(r.encounter.phase,1);assert.equal(r.encounter.phases,2);
 assert.equal(r.enemies.length,1);assert.equal(r.enemies[0].kind,"stalker");
 assert.ok(!r.body.some(p=>p.x===r.enemies[0].pos.x&&p.y===r.enemies[0].pos.y));
});
test("burrow telegraph occurs after ten seconds and actual exit is exactly five squares away",()=>{
 const r=newRun({seed:7});start(r);assert.ok(spawnMiniboss(r,"stalker"));
 r.encounter.introMs=0;
 assert.equal(abilityState(r).charge,0);
 r.encounter.abilityMs=9999;
 const ev=tickMiniboss(r,1);
 assert.equal(ev.type,"burrow-warning");
 assert.equal(abilityState(r).ready,true);
 assert.equal(r.encounter.telegraph.remainingMs,TELEGRAPH_MS);
 const original={...r.enemies[0].pos};
 const preview={...r.encounter.telegraph.pos};
 assert.equal(Math.abs(preview.x-original.x)+Math.abs(preview.y-original.y),BURROW_RANGE);
 tickMiniboss(r,TELEGRAPH_MS-1);
 assert.deepEqual(r.enemies[0].pos,original,"must not teleport before warning");
 const done=tickMiniboss(r,1);
 assert.equal(done.type,"burrow");
 assert.deepEqual(r.enemies[0].pos,preview);
 assert.equal(abilityState(r).charge,0);
 assert.equal(r.encounter.telegraph,null);
});
test("blocked burrow destination cancels without crushing the player or spending charge",()=>{
 const r=newRun({seed:19});start(r);spawnMiniboss(r,"stalker");r.encounter.introMs=0;
 r.encounter.abilityMs=10000;
 tickMiniboss(r,100);
 const landing={...r.encounter.telegraph.pos},original={...r.enemies[0].pos};
 r.body.push(landing);
 const done=tickMiniboss(r,TELEGRAPH_MS);
 assert.equal(done.type,"burrow-cancel");
 assert.deepEqual(r.enemies[0].pos,original);
 assert.equal(abilityState(r).ready,true);
});
test("weaver creates one web every ten active seconds, capped at two and expires in 15 seconds",()=>{
 const r=newRun({seed:5});start(r);spawnMiniboss(r,"weaver");r.encounter.introMs=0;
 assert.equal(ABILITIES.weaver.cooldownMs,10000);
 r.encounter.abilityMs=9999;assert.equal(tickMiniboss(r,1).type,"web");
 assert.equal(r.encounter.webs.length,1);
 const original={...r.encounter.webs[0].pos};
 assert.equal(r.encounter.webs[0].lifeMs,WEB_LIFETIME_MS);
 const next=tickMiniboss(r,10000);
 assert.equal(next.type,"web");
 assert.equal(r.encounter.webs.length,2);
 tickMiniboss(r,5001);
 assert.ok(!r.encounter.webs.some(w=>w.pos.x===original.x&&w.pos.y===original.y));
 assert.ok(r.encounter.webs.length<=2);
});
test("a web stuns for two seconds, freezes player and enemy and cannot cause a forced death",()=>{
 const r=newRun({seed:61});start(r);spawnMiniboss(r,"weaver");r.encounter.introMs=0;
 const next={x:r.body[0].x+1,y:r.body[0].y};
 r.encounter.webs=[{pos:next,lifeMs:15000}];
 r.enemies[0].pos={x:3,y:4};r.enemies[0].clock=0;
 step(r);
 assert.equal(r.encounter.stunMs,WEB_STUN_MS);
 assert.equal(r.encounter.webs.length,0);
 const head={...r.body[0]},enemy={...r.enemies[0].pos},charge=r.encounter.abilityMs;
 assert.equal(turn(r,"down"),false);
 for(let i=0;i<13;i++){step(r);assert.deepEqual(r.body[0],head);assert.deepEqual(r.enemies[0].pos,enemy);assert.equal(r.status,"running")}
 assert.equal(r.encounter.abilityMs,charge,"stun cannot charge another cast");
 assert.ok(r.encounter.stunMs<WEB_STUN_MS);
 while(r.encounter.stunMs>0)step(r);
 assert.equal(r.status,"running");
});
test("boss phase 1 has no reward; final phase grants +5 EV once and +750 points",()=>{
 const r=newRun({seed:42});start(r);evolve(r,2);
 forcedBossCapture(r);
 assert.equal(r.encounter.phase,2);
 assert.equal(r.kills,0);assert.equal(r.score,0);
 assert.equal(r.minibossWins,0);
 assert.equal(r.lastEncounter.type,"phase");
 forcedBossCapture(r);
 assert.equal(r.encounter,null);
 assert.equal(r.minibossWins,1);assert.equal(r.kills,1);
 assert.equal(r.score,750);assert.equal(r.earnedEnergy,5);
 assert.equal(r.status,"draft");
 assert.equal(r.lastEncounter.type,"defeat");
 const score=r.score;step(r);assert.equal(r.score,score,"reward must not repeat");
});
test("web timers freeze during pause and draft; intros use simulation ticks",()=>{
 const r=newRun({seed:7});start(r);spawnMiniboss(r,"weaver");
 assert.equal(r.encounter.introMs,INTRO_MS);
 const h={...r.body[0]},ticks=r.runTicks;
 assert.equal(turn(r,"up"),false);
 step(r);assert.equal(r.runTicks,ticks+1);assert.deepEqual(r.body[0],h);
 const now=r.encounter.introMs;pause(r);step(r);assert.equal(r.encounter.introMs,now);
 r.status="draft";step(r);assert.equal(r.encounter.introMs,now);
});
test("pixel art symbols are exactly 20x20, centered in the ring and weathered ochre is not neon",()=>{
 assert.equal(validateIcons(),true);
 assert.ok(Object.values(ICON_PIXELS).every(rows=>rows.length===20&&rows.every(r=>r.length===20)));
 assert.equal(OCHRE.fill,"#98824b");assert.equal(OCHRE.ready,"#b19a5a");
 const zero=chargePixels(0),half=chargePixels(.5),full=chargePixels(1);
 assert.ok(zero.length>100);
 assert.equal(zero.filter(p=>p.filled).length,0);
 assert.ok(half.filter(p=>p.filled).length>60);
 assert.ok(full.every(p=>p.filled));
 let centerPlaced=false;
 const mock={width:64,height:64,getContext(){return {clearRect(){},fillRect(x,y,w,h){if(x===30&&y===14&&w===2&&h===2)centerPlaced=true},save(){},restore(){},set imageSmoothingEnabled(v){},set fillStyle(v){}}}};
 drawAbilityMeter(mock,"stalker",.5);
 assert.ok(centerPlaced,"pixel emblem drawn in exact central 40x40 box");
});
test("leaderboard replay rejects fabricated boss-score in existing version",()=>{
 const seed=103,r=newRun({seed});start(r);
 for(let i=0;i<1000&&r.status==="running";i++)step(r);
 assert.equal(r.status,"over");
 const summary={score:r.score,kills:r.kills,evolutionsChosen:r.evolutionsChosen,ticks:r.runTicks};
 assert.equal(replayScore(seed,[],summary).ok,true);
 assert.equal(replayScore(seed,[],{...summary,score:summary.score+750}).ok,false);
});

test("enemy-exclusive powers: ordinary prey and the player cannot use boss signature abilities",()=>{
 assert.deepEqual(Object.keys(ABILITIES).sort(),["guardian","stalker","warden","weaver"]);
 assert.equal(ABILITIES.skitter,undefined);
 assert.equal(ABILITIES.runner,undefined);
 const ordinary=newRun({seed:66});start(ordinary);
 assert.equal(ordinary.encounter,null);
 assert.equal(abilityState(ordinary),null);
 assert.equal(tickMiniboss(ordinary,10000),null);
 assert.equal(spawnMiniboss(ordinary,"skitter"),false);
 assert.equal(spawnMiniboss(ordinary,"runner"),false);
 assert.equal(ordinary.enemies.length,1);
 assert.equal(ordinary.enemies[0].kind,"skitter");
 assert.equal(ordinary.encounter,null);
 // Only choosing a milestone mutation can introduce a miniboss encounter.
 evolve(ordinary,2);
 assert.equal(ordinary.encounter.kind,"stalker");
 assert.equal(ordinary.enemies[0].kind,"stalker");
 assert.ok(abilityState(ordinary));
});
