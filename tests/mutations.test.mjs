import test from "node:test";
import assert from "node:assert/strict";
import {COLORS,MUTATIONS,newRun,start,step,chooseMutation,draftMutationOptions,progress,activeEffects,effectiveTickMs} from "../src/engine.js";
function run(){return newRun({seed:42})}
function draft(color){
 const r=run();start(r);r.status="draft";r.draftOptions=[color,...COLORS.filter(x=>x!==color).slice(0,2)];
 assert.equal(chooseMutation(r,color),true);return r;
}
test("all five mutations are present and a draft contains three distinct colors",()=>{
 assert.deepEqual(COLORS,["W","U","B","R","G"]);
 assert.equal(Object.keys(MUTATIONS).length,5);
 assert.deepEqual(draftMutationOptions(()=>0),["W","U","B"]);
 assert.equal(new Set(draftMutationOptions(()=>.87)).size,3);
});
test("mutation selection advances the encounter tier only upon chosen ability",()=>{
 const r=run();start(r);r.status="draft";r.draftCount=1;r.draftOptions=["W","U","R"];
 assert.equal(r.evolutionsChosen,0);
 assert.equal(chooseMutation(r,"G"),false);
 assert.equal(chooseMutation(r,"U"),true);
 assert.equal(r.evolutionsChosen,1);assert.equal(r.stage,2);assert.equal(r.effects.blueTicks,28);
});
test("white + black defensive charges apply; black requires enough segments",()=>{
 const w=draft("W");assert.equal(w.effects.shield,1);
 const b=draft("B");assert.equal(b.effects.molt,1);
 b.body=[{x:17,y:11},{x:16,y:11},{x:15,y:11}];b.direction="right";
 step(b);assert.equal(b.status,"over");assert.equal(b.effects.molt,1);
});
test("red grants temporary scoring multiplier and changes travel speed",()=>{
 const r=draft("R");assert.equal(r.effects.redTicks,24);
 assert.ok(effectiveTickMs(r)<r.tickMs);
 r.enemies=[];r.respawnIn=100;
 r.food={x:r.body[0].x+1,y:r.body[0].y};const before=r.score;
 step(r);assert.equal(r.score,before+200);
});
test("Green in Hunt grants bonus evolution energy for four pickups without tail growth",()=>{
 const g=draft("G");g.enemies=[];g.respawnIn=100;
 const size=g.body.length;g.food={x:g.body[0].x+1,y:g.body[0].y};
 step(g);assert.equal(g.energy,2);assert.equal(g.effects.greenPickups,3);
 assert.equal(g.growthDebt,0);assert.equal(g.body.length,size);
 step(g);assert.equal(g.body.length,size);
});
test("Green in Brood Trail still grows the swarm instead of giving bonus evolution energy",()=>{
 const g=newRun({seed:42,mode:"classic"});start(g);
 g.status="draft";g.draftOptions=["G","W","B"];
 assert.equal(chooseMutation(g,"G"),true);
 const size=g.body.length;g.food={x:g.body[0].x+1,y:g.body[0].y};
 step(g);assert.equal(g.energy,1);assert.equal(g.effects.greenPickups,3);
 assert.ok(g.growthDebt>=2);assert.equal(g.body.length,size);
 step(g);assert.equal(g.body.length,size+1);
});
test("effects stack with bounded durations and expose HUD information",()=>{
 const r=draft("U");
 for(let i=0;i<12;i++){r.status="draft";r.draftOptions=["U","R","G"];chooseMutation(r,"U")}
 assert.equal(r.effects.blueTicks,84);
 r.status="draft";r.draftOptions=["R","G","W"];chooseMutation(r,"R");
 const effects=activeEffects(r);
 assert.ok(effects.some(e=>e.color==="U"&&e.count===84));
 assert.ok(effects.some(e=>e.color==="R"&&e.count===24));
 assert.equal(progress(r).energy,0);
});
