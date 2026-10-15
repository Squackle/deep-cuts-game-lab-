import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {newRun,start,step,chooseMutation,effectiveTickMs,RULES_VERSION} from "../src/engine.js";
import {WARD_STEPS,canPlaceWard,placeHatchlingWard,ageHatchlingWards,wardDeters,wardOccupies} from "../src/hatchling-ward.js";
import {compostMoltCost,driftRushMultiplier} from "../src/mutation-synergies.js";
import {ABILITIES,encounterKind,tickMiniboss} from "../src/miniboss.js";
import {LAIR_BOSSES,createLairRun} from "../src/lair.js";
import {BRIEFINGS} from "../src/boss-briefing.js";
import {decidePrey} from "../src/enemies.js";
import {ICON_PIXELS,validateIcons} from "../src/boss-art.js";
import {replayScore} from "../src/replay-verification.js";

function wardReady(){
 const run=newRun({seed:9,mode:"hunt"});start(run);
 run.mutations.W=1;run.mutations.G=1;run.effects.shield=1;run.effects.greenPickups=2;
 return run;
}

test("Matriarch 1.5 is a new isolated engine ruleset and has exactly five WUBRG mutations",()=>{
 assert.equal(RULES_VERSION,"hive-1.5.2");
 assert.equal(Object.keys(newRun({seed:1}).mutations).length,5);
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 assert.match(html,/1\.5 · MATRIARCH/);
 assert.match(html,/id="wardButton"/);
 assert.match(html,/data-lair-boss="broodmother"/);
 assert.doesNotMatch(html,/trainingButton/);
});

test("White + Green places one stationary hatchling for 24 movement beats without passive rewards",()=>{
 const run=wardReady(),where={...run.body[0]},old={score:run.score,energy:run.energy,kills:run.kills};
 assert.equal(canPlaceWard(run),true);
 assert.equal(placeHatchlingWard(run),true);
 assert.deepEqual(run.wards,[{pos:where,steps:WARD_STEPS}]);
 assert.equal(run.effects.shield,0);
 assert.equal(run.effects.greenPickups,1);
 assert.deepEqual({score:run.score,energy:run.energy,kills:run.kills},old);
 assert.equal(placeHatchlingWard(run),false,"cannot stack an additional ward");
 for(let i=0;i<WARD_STEPS-1;i++)ageHatchlingWards(run);
 assert.equal(run.wards.length,1);
 ageHatchlingWards(run);
 assert.equal(run.wards.length,0);
 assert.equal(canPlaceWard(run),false,"spent shield prevents free replacement");
});
test("Hatchling deterrence covers exactly 3x3 and respects pauses and bosses",()=>{
 const run=wardReady();
 assert.equal(placeHatchlingWard(run),true);
 const p=run.wards[0].pos;
 for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)
  assert.equal(wardDeters(run,{x:p.x+dx,y:p.y+dy}),true);
 assert.equal(wardDeters(run,{x:p.x+2,y:p.y}),false);
 assert.equal(wardOccupies(run,p),true);
 assert.equal(wardOccupies(run,{x:p.x+1,y:p.y}),false);
 run.status="draft";assert.equal(canPlaceWard(run),false);
 run.status="running";run.encounter={kind:"broodmother"};assert.equal(canPlaceWard(run),false);
 const classic=wardReady();classic.mode="classic";assert.equal(canPlaceWard(classic),false);
});
test("ordinary prey route around a hatchling if an alternate next step exists",()=>{
 const run=wardReady();run.body=[{x:14,y:14},{x:13,y:14},{x:12,y:14}];
 run.wards=[{pos:{x:6,y:5},steps:12}];
 run.enemies=[{id:1,kind:"skitter",pos:{x:4,y:5},dir:"right",period:4,clock:0}];
 const next=decidePrey(run,run.enemies[0]);
 assert.ok(next);
 assert.equal(wardDeters(run,next.dest),false,"prefer safe route over dangerous neighboring ward zone");
 const center={x:6,y:5};
 assert.equal(wardOccupies(run,center),true);
});
test("Blue + Red speed correction and Black + Green molt discounts require specific WUBRG effects",()=>{
 const run=wardReady();
 run.mutations.U=1;run.mutations.R=1;
 run.effects.blueTicks=28;run.effects.redTicks=24;
 assert.equal(driftRushMultiplier(run),1.5);
 assert.ok(effectiveTickMs(run)>=150,"combination increases reaction time compared with isolated frenzy");
 run.effects.redTicks=0;assert.equal(driftRushMultiplier(run),1.35);
 run.mutations.B=1;
 assert.equal(compostMoltCost(run),2);
 run.effects.greenPickups=0;assert.equal(compostMoltCost(run),3);
});
test("Broodmother is the fifth Lair boss, arrives at evolution 12, and has three phases",()=>{
 assert.equal(encounterKind(12),"broodmother");
 assert.equal(encounterKind(8),"guardian");
 assert.equal(encounterKind(10),"stalker");
 assert.equal(LAIR_BOSSES.length,5);
 assert.deepEqual(LAIR_BOSSES.map(x=>x.id),["stalker","warden","weaver","guardian","broodmother"]);
 assert.equal(ABILITIES.broodmother.phases,3);
 assert.equal(ABILITIES.broodmother.cooldownMs,6500);
 assert.equal(BRIEFINGS.broodmother.captures,3);
 const run=createLairRun("broodmother");
 assert.equal(run.encounter.kind,"broodmother");
 assert.equal(run.encounter.phases,3);
 assert.equal(run.mode,"hunt");
 assert.equal(run.lairBoss,"broodmother");
 assert.equal(run.evolutionsChosen,12);
 assert.equal(ICON_PIXELS.broodmother.length,20);
 assert.equal(validateIcons(),true);
});
test("Egg Bloom is telegraphed and incubates eggs safely before they hatch",()=>{
 const run=createLairRun("broodmother");start(run);
 run.encounter.introMs=0;
 const old=run.terrain.length;
 run.encounter.abilityMs=6499;
 const event=tickMiniboss(run,1);
 assert.equal(event.type,"boss-power");
 const eggs=run.terrain.filter(t=>t.kind==="egg");
 assert.ok(eggs.length>0,"Matriarch should create at least one safe egg on seeded Lair fixture");
 assert.ok(eggs.length<=4);
 for(const egg of eggs){
  assert.equal(egg.warningMs,1400);
  assert.equal(egg.lifeMs,null);
  assert.ok(!run.body.some(p=>p.x===egg.pos.x&&p.y===egg.pos.y));
 }
 assert.equal(run.encounter.abilityMs,0);
 assert.ok(run.terrain.length>=old);
});
test("replay verification refuses arbitrary unearned ward placement and rejects forged scores",()=>{
 const r=newRun({seed:103,mode:"hunt"});start(r);
 const unearned=replayScore(103,[[0,"ward",null]],{score:0,kills:0,evolutionsChosen:0,ticks:0});
 assert.equal(unearned.ok,false);
 const malformed=replayScore(103,[[0,"ward","FREE"]],{score:0,kills:0,evolutionsChosen:0,ticks:0});
 assert.equal(malformed.ok,false);
 for(let i=0;i<1000&&r.status==="running";i++)step(r);
 assert.equal(r.status,"over");
 const actual={score:r.score,kills:r.kills,evolutionsChosen:r.evolutionsChosen,ticks:r.runTicks};
 assert.equal(replayScore(103,[],actual).ok,true);
 assert.equal(replayScore(103,[],{...actual,score:actual.score+500}).ok,false);
});
