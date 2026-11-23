import {test} from "node:test";
import assert from "node:assert/strict";
import {createEngine} from "../engine.mjs";

// Plays `waves` waves with one building; with `chain`, calls the next wave early before the road is ever clear.
function run(kind,waves,chain,setup=()=>{}){
 const g=createEngine(1,"campaign","hollow");g.state.mana=5000;assert.ok(g.command({type:"build",pad:0,kind}));setup(g);g.state.health=1e6;
 assert.ok(g.command({type:"wave"}));let cleared=0;
 for(let n=0;n<300000&&g.state.wave<waves;n++){if(g.state.phase==="ready"){cleared++;g.command({type:"wave"});}else{if(chain&&g.state.tick%60===0)g.command({type:"early"});g.step();}}
 while(g.state.phase==="active")g.step();
 return {g,cleared};
}

// Regression: the per-wave harvest budget only reset when a wave started on a clear road. Chained early calls
// (and Onslaught) shared at most three waves of budget for the whole chain, so a Grove paid 66 instead of 220 over 10 waves.
test("a Mana Grove pays its per-wave budget for every wave, even when waves are chained back to back",()=>{
 const alone=run("grove",10,false),chained=run("grove",10,true);
 assert.equal(alone.g.state.stats.farmMana,22*10);
 assert.equal(chained.cleared,0,"the road was never clear between waves");
 assert.equal(chained.g.state.stats.farmMana,22*10,"ten waves, ten budgets");
 assert.equal(chained.g.state.stats.farmMana,alone.g.state.stats.farmMana);
});

test("a Soul Foundry's per-wave cap also counts every wave in a chain",()=>{
 // Troops dying next to the foundry feed it; their deaths far outpace the cap.
 const setup=g=>{g.command({type:"build",pad:1,kind:"necropolis"});const at=g.nearestPath(g.map.pads[0].x,g.map.pads[0].y);g.state.towers[1].rally=at;};
 const alone=run("foundry",6,false,setup),chained=run("foundry",6,true,setup);
 assert.ok(alone.g.state.stats.soulMana>0);
 assert.ok(chained.g.state.stats.soulMana<=40*6,"never more than one cap per wave");
 assert.ok(chained.g.state.stats.soulMana>40*3,"more than three waves' worth across six chained waves ("+chained.g.state.stats.soulMana+")");
});

test("an older save without the wave-group count keeps the waves on the road as its budget",()=>{
 const g=createEngine(1,"campaign","hollow");g.state.mana=5000;g.command({type:"build",pad:0,kind:"grove"});g.command({type:"wave"});g.step();g.command({type:"early"});
 const save=JSON.parse(JSON.stringify(g.snapshot()));delete save.state.groupWaves;
 const h=createEngine(1,"campaign","hollow");assert.ok(h.restore(save));assert.equal(h.farmBudget(h.state.towers[0]),44);
 h.command({type:"early"});assert.equal(h.farmBudget(h.state.towers[0]),66,"the next call adds one wave");
});

// Regression: Groves paid their whole per-wave budget in the first ~15 seconds, then sat idle for the rest of the wave,
// which looked like they had stopped producing. They now pace the budget across the wave and still pay all of it.
test("a Mana Grove keeps paying through the whole wave and still pays its full budget",()=>{
 for(const tier of [1,2,3,4]){
  const g=createEngine(1,"campaign","hollow");g.state.mana=1e6;g.state.health=1e9;g.command({type:"build",pad:0,kind:"grove"});
  for(let i=1;i<tier;i++)assert.ok(g.command({type:"upgrade",pad:0,...(i===2?{branch:"A"}:{})}));
  // Hold the road with slows so the wave runs long, like a real defence.
  assert.ok(g.command({type:"wave"}));const start=g.state.tick,pays=[];let before=0;
  while(g.state.phase==="active"){for(const e of g.state.enemies)e.slowUntil=g.state.tick+5;g.step();if(g.state.stats.farmMana!==before){pays.push(g.state.tick-start);before=g.state.stats.farmMana;}}
  const length=g.state.tick-start;
  assert.equal(g.state.stats.farmMana,g.farmLimit(g.state.towers[0]),"tier "+tier+" pays exactly one budget");
  assert.ok(pays.filter(at=>at>length*.6&&at<length).length>=3,"tier "+tier+" still harvesting late in a "+length/10+"s wave: "+pays.join(","));
 }
});

test("a Grove built near the end of a wave cannot claim a full wave's harvest",()=>{
 const g=createEngine(1,"campaign","hollow");g.state.mana=5000;g.state.health=1e6;assert.ok(g.command({type:"wave"}));
 while(g.state.queue.length||g.state.enemies.some(e=>g.map.distance-e.progress>60))g.step();
 assert.ok(g.command({type:"build",pad:0,kind:"grove"}));while(g.state.phase==="active")g.step();
 assert.ok(g.state.stats.farmMana<22,"paid "+g.state.stats.farmMana);
});
