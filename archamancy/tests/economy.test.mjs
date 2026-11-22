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
