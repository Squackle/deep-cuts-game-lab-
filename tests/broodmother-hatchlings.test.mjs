import test from "node:test";
import assert from "node:assert/strict";
import {createLairRun} from "../src/lair.js";
import {start,step,RULES_VERSION} from "../src/engine.js";
import {PREY,safePreyTile,advancePrey} from "../src/enemies.js";
import {spawnNextPhase,tickMiniboss} from "../src/miniboss.js";
import {tickTerrain} from "../src/environments.js";
import {APPROVED_ART,drawApprovedCreature} from "../src/approved-creature-art.js";
import {drawBossPixelIcon} from "../src/boss-art.js";
import {
 BROODMOTHER_PERIOD,EGG_INCUBATION_MS,MAX_HATCHLINGS,HATCHLING_MOVE_MS,HATCHLING_LIFETIME_MS,
 hatchMatureEggs,tickHatchlings,isHatchlingAt,availableHatchlingSlots,drawBroodmotherHatchlings
} from "../src/broodmother-hatchlings.js";
const same=(a,b)=>a.x===b.x&&a.y===b.y;
function mother(){
 const run=createLairRun("broodmother");start(run);run.encounter.introMs=0;
 return run;
}
test("Matriarch 1.5.2 keeps the Broodmother catchable across every phase",()=>{
 assert.equal(RULES_VERSION,"hive-1.5.3");
 assert.equal(PREY.broodmother.period,BROODMOTHER_PERIOD);
 assert.equal(BROODMOTHER_PERIOD,7);
 for(const id of ["stalker","weaver","warden","guardian"])assert.equal(PREY[id].period,4);
 const run=mother();
 assert.equal(run.enemies[0].period,7);
 assert.equal(spawnNextPhase(run),true);
 assert.equal(run.enemies[0].period,7);
});
test("Broodmother eggs incubate and safely hatch as non-scoring spider enemies",()=>{
 const run=mother(),score=run.score;
 run.encounter.abilityMs=6499;
 assert.equal(tickMiniboss(run,1).type,"boss-power");
 const eggs=run.terrain.filter(t=>t.kind==="egg");
 assert.ok(eggs.length>0&&eggs.length<=MAX_HATCHLINGS);
 assert.ok(eggs.every(t=>t.warningMs===EGG_INCUBATION_MS&&t.lifeMs===null));
 tickTerrain(run,EGG_INCUBATION_MS-1);
 assert.equal(hatchMatureEggs(run),0);
 tickTerrain(run,1);
 const n=hatchMatureEggs(run);
 assert.ok(n>0);assert.equal(run.hatchlings.length,n);
 assert.equal(run.terrain.filter(t=>t.kind==="egg").length,0);
 for(const h of run.hatchlings){
  assert.equal(h.ageMs,0);
  assert.equal(h.moveMs,0);
  assert.equal(isHatchlingAt(run,h.pos),true);
  assert.ok(!run.body.some(b=>same(b,h.pos)));
  assert.ok(!run.enemies.some(e=>same(e.pos,h.pos)));
  assert.equal(safePreyTile(run,h.pos,run.enemies[0].id),false);
 }
 assert.equal(run.score,score);
});
test("Hatchlings visibly chase the player every ~700ms, not once every nine steps",()=>{
 const run=mother();run.enemies[0].pos={x:3,y:3};
 const h={id:21,pos:{x:4,y:6},dir:1,ageMs:0,moveMs:0};run.hatchlings=[h];
 const old={...h.pos},before=Math.abs(old.x-run.body[0].x)+Math.abs(old.y-run.body[0].y);
 assert.equal(tickHatchlings(run,HATCHLING_MOVE_MS-1),null);
 assert.deepEqual(h.pos,old);
 assert.equal(tickHatchlings(run,1),null);
 const distance=Math.abs(h.pos.x-run.body[0].x)+Math.abs(h.pos.y-run.body[0].y);
 assert.equal(distance,before-1,"baby spider chases the player rather than wandering");
 assert.equal(Math.abs(h.pos.x-old.x)+Math.abs(h.pos.y-old.y),1,"no teleport");
 assert.equal(h.ageMs,HATCHLING_MOVE_MS);
});
test("Exactly 7500 active simulation milliseconds, with paused/draft time frozen",()=>{
 const run=mother(),h={id:22,pos:{x:4,y:5},dir:0,ageMs:0,moveMs:0};run.hatchlings=[h];
 tickHatchlings(run,7400);assert.equal(run.hatchlings.length,1);
 run.status="draft";const old=h.ageMs;step(run);assert.equal(h.ageMs,old);
 run.status="running";tickHatchlings(run,99);
 assert.equal(run.hatchlings.length,1);
 tickHatchlings(run,1);
 assert.equal(run.hatchlings.length,0);
});
test("Blind hatchlings CAN run into the player's head and cause a lethal collision",()=>{
 const run=mother();run.enemies[0].pos={x:3,y:3};run.effects.shield=0;run.effects.molt=0;
 const head=run.body[0];
 run.hatchlings=[{id:23,pos:{x:head.x,y:head.y-1},dir:2,ageMs:0,moveMs:0}];
 const event=tickHatchlings(run,HATCHLING_MOVE_MS);
 assert.equal(event?.type,"hatchling-hit");assert.deepEqual(event.pos,head);
 const actual=mother();actual.enemies[0].pos={x:3,y:3};
 actual.hatchlings=[{id:24,pos:{x:actual.body[0].x+2,y:actual.body[0].y},dir:3,ageMs:0,moveMs:HATCHLING_MOVE_MS-1}];
 step(actual);
 assert.equal(actual.status,"over");
 assert.match(actual.endReason,/hatchling/i);
});
test("Hatchlings never spawn on a Sliver and cannot phase through its trailing body",()=>{
 const run=mother();run.terrain=[{pos:{x:5,y:5},kind:"egg",warningMs:0,lifeMs:null}];run.body.push({x:5,y:5});
 assert.equal(hatchMatureEggs(run),0);assert.deepEqual(run.hatchlings,[]);
 run.terrain=[];run.enemies[0].pos={x:3,y:3};
 const h={id:25,pos:{x:7,y:10},dir:2,ageMs:0,moveMs:0};run.hatchlings=[h];
 const tail=run.body.slice(1).map(x=>({...x}));
 tickHatchlings(run,HATCHLING_MOVE_MS);
 assert.ok(!tail.some(p=>same(p,h.pos)),"slow spider cannot teleport through the tail");
 assert.ok(Math.abs(h.pos.x-7)+Math.abs(h.pos.y-10)<=1);
});
test("Population cap, boss capture cleanup, and no unwanted passive rewards",()=>{
 const run=mother();
 run.hatchlings=Array.from({length:MAX_HATCHLINGS},(_,i)=>({id:i+1,pos:{x:i+2,y:3},dir:1,ageMs:0,moveMs:0}));
 assert.equal(availableHatchlingSlots(run),0);
 run.encounter.abilityMs=6499;tickMiniboss(run,1);
 assert.ok(!run.terrain.some(t=>t.kind==="egg"));
 run.hatchlings=[{id:99,pos:{x:13,y:17},dir:0,ageMs:0,moveMs:0}];
 run.terrain=[{pos:{x:3,y:4},kind:"egg",warningMs:1400,lifeMs:null}];
 run.body=[{x:9,y:10},{x:8,y:10},{x:6,y:6},{x:5,y:5},{x:5,y:7},{x:10,y:10}];
 run.direction="down";run.turnQueue=[];
 Object.assign(run.enemies[0],{pos:{x:5,y:6},dir:"right",period:1,clock:0});
 const score=run.score;step(run);
 assert.equal(run.encounter?.phase,2);
 assert.deepEqual(run.hatchlings,[]);
 assert.equal(run.terrain.some(t=>t.kind==="egg"),false);
 assert.equal(run.enemies[0].period,BROODMOTHER_PERIOD);
 assert.equal(run.score,score);
});
test("Broodmother cannot unfairly escape when blocked by her own spider children",()=>{
 const run=mother(),boss=run.enemies[0];
 Object.assign(boss,{pos:{x:8,y:8},dir:"right",period:1,clock:0});
 run.hatchlings=[{id:1,pos:{x:8,y:7}},{id:2,pos:{x:9,y:8}},{id:3,pos:{x:8,y:9}}].map(h=>({...h,dir:0,ageMs:0,moveMs:0}));
 assert.equal(advancePrey(run,boss).type,"waiting");
});
test("All five bosses and the hatchling use the approved pixelized concept artwork",()=>{
 assert.deepEqual(Object.keys(APPROVED_ART),["stalker","warden","weaver","guardian","broodmother","hatchling"]);
 const drawn=[],ctx={save(){},restore(){},fillRect(...args){drawn.push(args)},set fillStyle(v){},set imageSmoothingEnabled(v){}};
 for(const id of Object.keys(APPROVED_ART)){
  const art=APPROVED_ART[id];assert.equal(art.rows.length,26);
  assert.ok(art.rows.every(row=>row.length===26));
  assert.equal(drawApprovedCreature(ctx,id,0,0,26),true);
 }
 assert.ok(drawn.length>200);
 drawn.length=0;
 drawBossPixelIcon(ctx,"broodmother",0,0,28);
 assert.ok(drawn.length>25);
 drawn.length=0;
 const run=mother();run.hatchlings=[{id:1,pos:{x:4,y:4},dir:1,ageMs:0,moveMs:0}];
 drawBroodmotherHatchlings(ctx,run,20,600);
 assert.ok(drawn.length>25);
});
