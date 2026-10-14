import test from "node:test";
import assert from "node:assert/strict";
import {COLORS,MUTATIONS,newRun,start,pause,step,turn,chooseMutation,draftMutationOptions,
 effectiveTickMs,activeEffects,progress} from "../src/engine.js";

const fresh=(random=()=>0)=>newRun({cols:12,rows:12,random});
function draft(run,options){
 start(run);
 run.brood=4;
 const head=run.body[0];
 run.food={x:head.x+1,y:head.y};
 step(run);
 assert.equal(run.status,"draft");
 assert.equal(run.draftOptions.length,3);
 if(options)run.draftOptions=options;
 return run;
}
function mutation(color){
 const run=draft(fresh(),[color,...COLORS.filter(x=>x!==color).slice(0,2)]);
 assert.equal(chooseMutation(run,color),true);
 return run;
}
function stayInMiddle(run){
 run.body=[{x:6,y:6},{x:5,y:6},{x:4,y:6}];
 run.direction="right";run.turnQueue=[];
 run.food={x:0,y:0};return run;
}
test("WUBRG registry contains exactly five distinct playable mutation paths",()=>{
 assert.deepEqual(COLORS,["W","U","B","R","G"]);
 assert.deepEqual(Object.keys(MUTATIONS),COLORS);
 for(const color of COLORS){
  assert.ok(MUTATIONS[color].name);
  assert.ok(MUTATIONS[color].description.length>30);
 }
});
test("three non-repeating mutation choices use an injectable random source",()=>{
 assert.deepEqual(draftMutationOptions(()=>0),["W","U","B"]);
 assert.deepEqual(draftMutationOptions(()=>.99),["G","R","B"]);
 for(let i=0;i<30;i++){
  const choices=draftMutationOptions(()=>i/30);
  assert.equal(choices.length,3);assert.equal(new Set(choices).size,3);
  assert.ok(choices.every(color=>COLORS.includes(color)));
 }
});
test("the fifth brood triggers a real frozen draft and never accepts movement",()=>{
 const run=draft(fresh());
 assert.equal(run.score,100);
 assert.equal(run.stage,2);
 assert.equal(run.draftCount,1);
 assert.equal(progress(run).untilNext,5);
 const head={...run.body[0]},score=run.score;
 assert.equal(turn(run,"up"),false);
 step(run);
 assert.deepEqual(run.body[0],head);
 assert.equal(run.score,score);
 assert.equal(run.status,"draft");
});
test("draft must be chosen from three cards and cannot be selected twice",()=>{
 const run=draft(fresh());
 assert.equal(chooseMutation(run,"not a color"),false);
 assert.equal(chooseMutation(run,"G"),false);
 assert.equal(run.status,"draft");
 assert.equal(chooseMutation(run,"U"),true);
 assert.equal(chooseMutation(run,"W"),false);
 assert.equal(run.status,"running");
 assert.deepEqual(run.draftOptions,[]);
 assert.equal(run.mutations.U,1);
 assert.equal(run.lastMutation.color,"U");
});
test("white shell absorbs one wall hit and safely turns the creature",()=>{
 const run=mutation("W");
 assert.equal(run.effects.shield,1);
 run.body=[{x:11,y:5},{x:10,y:5},{x:9,y:5}];run.direction="right";run.food={x:0,y:0};
 const original={...run.body[0]};
 step(run);
 assert.equal(run.status,"running");
 assert.equal(run.saves,1);
 assert.equal(run.effects.shield,0);
 assert.equal(run.event.type,"rescue");
 assert.equal(run.event.color,"W");
 assert.deepEqual(run.body[0],original);
 assert.notEqual(run.direction,"right");
 step(run);assert.equal(run.status,"running");
});
test("white protection stacks and consumes exactly one charge per impact",()=>{
 const run=mutation("W");
 run.status="draft";run.draftOptions=["W","U","G"];
 chooseMutation(run,"W");
 assert.equal(run.effects.shield,2);
 run.body=[{x:11,y:5},{x:10,y:5},{x:9,y:5}];run.direction="right";run.food={x:0,y:0};
 step(run);
 assert.equal(run.effects.shield,1);
 assert.equal(run.mutations.W,2);
});
test("black emergency molt saves a fatal collision by sacrificing three segments",()=>{
 const run=mutation("B");
 run.body=Array.from({length:8},(_,i)=>({x:11-i,y:6}));run.direction="right";run.food={x:0,y:0};
 step(run);
 assert.equal(run.status,"running");
 assert.equal(run.effects.molt,0);
 assert.equal(run.body.length,5);
 assert.equal(run.saves,1);
 assert.equal(run.event.color,"B");
});
test("black's stored charge is not lost when the serpent is too short to molt",()=>{
 const run=mutation("B");
 run.body=[{x:11,y:6},{x:10,y:6},{x:9,y:6}];run.direction="right";run.food={x:0,y:0};
 step(run);
 assert.equal(run.status,"over");
 assert.equal(run.effects.molt,1);
});
test("blue drift slows movements for exactly 28 ticks and then expires",()=>{
 const run=mutation("U");
 assert.equal(run.effects.blueTicks,28);
 assert.ok(effectiveTickMs(run)>run.tickMs);
 for(let i=0;i<28;i++){stayInMiddle(run);step(run)}
 assert.equal(run.effects.blueTicks,0);
 assert.equal(effectiveTickMs(run),run.tickMs);
});
test("red frenzy increases speed and doubles each brood score while active",()=>{
 const run=mutation("R");
 assert.ok(effectiveTickMs(run)<run.tickMs);
 assert.equal(run.effects.redTicks,24);
 const previous=run.score;
 run.food={x:run.body[0].x+1,y:run.body[0].y};
 step(run);
 assert.equal(run.score,previous+200);
 assert.equal(run.effects.redTicks,23);
});
test("red scoring ends promptly after the effect's last movement",()=>{
 const run=mutation("R");run.effects.redTicks=1;
 stayInMiddle(run);step(run);
 assert.equal(run.effects.redTicks,0);
 const previous=run.score;
 stayInMiddle(run);run.food={x:7,y:6};step(run);
 assert.equal(run.score,previous+100);
});
test("green rapid brood grows two segments per pickup without duplicate tiles",()=>{
 const run=mutation("G");
 assert.equal(run.effects.greenPickups,4);
 const size=run.body.length,head=run.body[0];
 run.food={x:head.x+1,y:head.y};step(run);
 assert.equal(run.effects.greenPickups,3);
 assert.equal(run.growthDebt,1);
 assert.equal(run.body.length,size+1);
 run.food={x:0,y:0};
 step(run);
 assert.equal(run.body.length,size+2);
 assert.equal(new Set(run.body.map(p=>p.x+","+p.y)).size,run.body.length);
});
test("stacked blue and red are deterministic and neither freezes the game",()=>{
 const run=mutation("U");
 run.status="draft";run.draftOptions=["R","W","G"];
 assert.equal(chooseMutation(run,"R"),true);
 assert.equal(run.effects.blueTicks,28);
 assert.equal(run.effects.redTicks,24);
 const tick=effectiveTickMs(run);
 assert.ok(tick>=90&&tick<=145);
 assert.equal(run.status,"running");
});
test("one-tick timers and charges are not consumed while paused or drafting",()=>{
 const run=mutation("U");
 pause(run);
 const t=run.effects.blueTicks;
 step(run);assert.equal(run.effects.blueTicks,t);
 run.status="draft";run.draftOptions=["R","W","B"];step(run);
 assert.equal(run.effects.blueTicks,t);
});
test("all WUBRG powers appear in status HUD list and countdown stays accurate",()=>{
 const run=mutation("W");
 run.status="draft";run.draftOptions=["U","B","G"];chooseMutation(run,"U");
 run.status="draft";run.draftOptions=["B","R","G"];chooseMutation(run,"B");
 run.status="draft";run.draftOptions=["R","G","U"];chooseMutation(run,"R");
 run.status="draft";run.draftOptions=["G","W","U"];chooseMutation(run,"G");
 const effects=activeEffects(run);
 assert.deepEqual(effects.map(e=>e.color),COLORS);
 assert.equal(progress(run).untilNext,5);
 assert.equal(Object.values(run.mutations).reduce((a,b)=>a+b,0),5);
});
test("repeated green/blue/red upgrades have bounded durations",()=>{
 const run=mutation("G");
 for(let i=0;i<20;i++){
  run.status="draft";run.draftOptions=["G","R","U"];chooseMutation(run,"G");
 }
 assert.equal(run.effects.greenPickups,12);
 for(let i=0;i<10;i++){run.status="draft";run.draftOptions=["G","R","U"];chooseMutation(run,"U")}
 assert.equal(run.effects.blueTicks,84);
 for(let i=0;i<10;i++){run.status="draft";run.draftOptions=["G","R","U"];chooseMutation(run,"R")}
 assert.equal(run.effects.redTicks,72);
});
test("a fully occupied arena still wins instead of opening an impossible draft",()=>{
 const run=mutation("G");
 const head={x:10,y:10},free={x:11,y:10};
 const all=[];for(let y=0;y<run.rows;y++)for(let x=0;x<run.cols;x++)
  if(!(x===head.x&&y===head.y)&&!(x===free.x&&y===free.y))all.push({x,y});
 run.body=[head,...all];run.food=free;run.direction="right";run.turnQueue=[];
 run.brood=9;step(run);
 assert.equal(run.status,"won");
 assert.equal(run.food,null);
});
