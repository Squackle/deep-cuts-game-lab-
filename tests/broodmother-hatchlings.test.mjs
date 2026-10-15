import test from "node:test";
import assert from "node:assert/strict";
import {createLairRun} from "../src/lair.js";
import {start,step,RULES_VERSION} from "../src/engine.js";
import {PREY,safePreyTile} from "../src/enemies.js";
import {spawnNextPhase,tickMiniboss} from "../src/miniboss.js";
import {tickTerrain} from "../src/environments.js";
import {
 BROODMOTHER_PERIOD,EGG_INCUBATION_MS,MAX_HATCHLINGS,HATCHLING_MOVE_EVERY,HATCHLING_LIFE_STEPS,
 hatchMatureEggs,tickHatchlings,isHatchlingAt,availableHatchlingSlots,drawBroodmotherHatchlings
} from "../src/broodmother-hatchlings.js";
const same=(a,b)=>a.x===b.x&&a.y===b.y;
function activeMother(){
 const run=createLairRun("broodmother");
 start(run);run.encounter.introMs=0;
 return run;
}
test("Broodmother is slower than every other boss in both first and later capture phases",()=>{
 assert.equal(RULES_VERSION,"hive-1.5.1");
 assert.equal(BROODMOTHER_PERIOD,7);
 assert.equal(PREY.broodmother.period,7);
 for(const kind of ["stalker","weaver","warden","guardian"])assert.equal(PREY[kind].period,4);
 const run=activeMother();
 assert.equal(run.enemies[0].period,7);
 assert.equal(spawnNextPhase(run),true);
 assert.equal(run.enemies[0].period,7,"later phases cannot speed back up");
});
test("Telegraphed eggs incubate for 1.4 seconds, then hatch into actual creatures",()=>{
 const run=activeMother(),oldScore=run.score;
 run.encounter.abilityMs=6499;
 assert.equal(tickMiniboss(run,1).type,"boss-power");
 const eggs=run.terrain.filter(t=>t.kind==="egg");
 assert.ok(eggs.length>0&&eggs.length<=MAX_HATCHLINGS);
 assert.ok(eggs.every(t=>t.warningMs===EGG_INCUBATION_MS&&t.lifeMs===null));
 assert.equal(hatchMatureEggs(run),0);
 tickTerrain(run,EGG_INCUBATION_MS-1);
 assert.equal(hatchMatureEggs(run),0,"cannot hatch before warning completes");
 tickTerrain(run,1);
 const born=hatchMatureEggs(run);
 assert.ok(born>0,"all still-safe incubated eggs become hatchlings");
 assert.equal(run.hatchlings.length,born);
 assert.equal(run.terrain.filter(t=>t.kind==="egg").length,0,"eggs convert instead of hardening into stone");
 for(const h of run.hatchlings){
  assert.equal(h.life,HATCHLING_LIFE_STEPS);
  assert.ok(!run.body.some(p=>same(p,h.pos)),"no hatch on Sliver");
  assert.ok(!run.enemies.some(e=>same(e.pos,h.pos)),"no hatch on boss");
  assert.equal(isHatchlingAt(run,h.pos),true);
  assert.equal(safePreyTile(run,h.pos,run.enemies[0].id),false,"boss cannot walk through minion");
 }
 assert.equal(run.score,oldScore,"minions are hazards, not free scored captures");
});
test("Hatchlings crawl one tile every nine active simulation steps without teleporting or entering the player",()=>{
 const run=activeMother();run.hatchlings=[{id:44,pos:{x:3,y:3},dir:1,clock:0,life:HATCHLING_LIFE_STEPS}];
 const initial={...run.hatchlings[0].pos};
 for(let i=1;i<HATCHLING_MOVE_EVERY;i++){
  tickHatchlings(run);assert.deepEqual(run.hatchlings[0].pos,initial,"cannot move early");
 }
 tickHatchlings(run);
 const next=run.hatchlings[0].pos;
 assert.equal(Math.abs(next.x-initial.x)+Math.abs(next.y-initial.y),1,"moves one grid cell only");
 assert.ok(!run.body.some(p=>same(p,next)));
 assert.ok(!run.enemies.some(e=>same(e.pos,next)));
 for(let i=HATCHLING_MOVE_EVERY;i<HATCHLING_LIFE_STEPS;i++)tickHatchlings(run);
 assert.equal(run.hatchlings.length,0,"obstacle eventually expires, avoiding permanent arena clogging");
});
test("Hatchlings are fair obstacles: entering one is dangerous; they cannot suddenly move into the Sliver",()=>{
 const run=activeMother(),head=run.body[0],next={x:head.x+1,y:head.y};
 run.hatchlings=[{id:1,pos:next,dir:0,clock:0,life:40}];
 const score=run.score;
 step(run);
 assert.equal(run.status,"over");
 assert.match(run.endReason,/hatchling/i);
 assert.equal(run.score,score);
 const other=activeMother();other.hatchlings=[{id:1,pos:{x:other.body[0].x+1,y:other.body[0].y},dir:3,clock:8,life:30}];
 const oldPos={...other.hatchlings[0].pos};
 tickHatchlings(other);
 assert.ok(!other.body.some(p=>same(p,other.hatchlings[0].pos)),"minion movement avoids every body segment");
 assert.ok(Math.abs(other.hatchlings[0].pos.x-oldPos.x)+Math.abs(other.hatchlings[0].pos.y-oldPos.y)<=1);
});
test("Eggs refuse unsafe hatch sites, population is capped, and briefing freezes incubation",()=>{
 const run=activeMother();run.terrain=[{pos:{x:5,y:5},kind:"egg",warningMs:0,lifeMs:null}];
 run.body.push({x:5,y:5});
 assert.equal(hatchMatureEggs(run),0,"cannot materialize on an occupied body tile");
 assert.equal(run.hatchlings.length,0);
 assert.equal(availableHatchlingSlots(run),MAX_HATCHLINGS);
 run.terrain=[];
 run.hatchlings=Array.from({length:MAX_HATCHLINGS},(_,i)=>({id:i+1,pos:{x:i+2,y:3},dir:1,clock:0,life:40}));
 assert.equal(availableHatchlingSlots(run),0);
 run.encounter.abilityMs=6499;tickMiniboss(run,1);
 assert.equal(run.terrain.some(t=>t.kind==="egg"),false,"cannot exceed four active hatchlings");
 run.status="draft";
 const before=run.hatchlings.map(h=>({...h,pos:{...h.pos}}));
 step(run);
 assert.deepEqual(run.hatchlings,before,"hatchling timers stop during mutation choice");
});
test("Hatchlings and remaining eggs are cleaned on Broodmother capture phase transition",()=>{
 const run=activeMother();
 run.hatchlings=[{id:99,pos:{x:13,y:17},dir:0,clock:0,life:50}];
 run.terrain=[{pos:{x:3,y:4},kind:"egg",warningMs:1400,lifeMs:null}];
 run.body=[{x:9,y:10},{x:8,y:10},{x:6,y:6},{x:5,y:5},{x:5,y:7},{x:10,y:10}];
 run.direction="down";run.turnQueue=[];
 Object.assign(run.enemies[0],{pos:{x:5,y:6},dir:"right",period:1,clock:0});
 step(run);
 assert.equal(run.encounter?.phase,2);
 assert.deepEqual(run.hatchlings,[]);
 assert.equal(run.terrain.some(t=>t.kind==="egg"),false);
 assert.equal(run.enemies[0].period,BROODMOTHER_PERIOD);
});
test("Drawn hatchlings have original sprite details and do not add another persistent HUD",()=>{
 const run=activeMother();run.hatchlings=[{id:1,pos:{x:4,y:4},dir:1,clock:0,life:30}];
 const rects=[],ctx={save(){},restore(){},fillRect(...a){rects.push(a)},set fillStyle(v){}};
 drawBroodmotherHatchlings(ctx,run,20);
 assert.ok(rects.length>=5);
 assert.ok(rects.every(([x,y,w,h])=>x>=4*20&&y>=4*20&&w<=20&&h<=20));
});
