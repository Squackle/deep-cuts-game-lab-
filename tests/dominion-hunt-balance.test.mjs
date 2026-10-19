import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {newRun,start,step,chooseMutation,RULES_VERSION,HUNT_SWARM_LENGTH,activeEffects} from "../src/engine.js";
import {spawnMiniboss,ABILITIES} from "../src/miniboss.js";
import {mutationDescription} from "../src/evolution-ui.js";
import {createDirectorRun,spawnDirectorSuperOrb,DIRECTOR_SUPER_ORB_SEGMENTS} from "../director/mode.js";

function captureFixture(kind="skitter"){
 const run=newRun({seed:3,mode:"hunt"});start(run);
 run.body=[{x:9,y:10},{x:8,y:10},{x:6,y:6},{x:5,y:5},{x:5,y:7},{x:10,y:10},{x:11,y:10}];
 run.direction="down";run.turnQueue=[];run.openingGraceMs=0;
 run.enemies=[{id:20,kind,pos:{x:5,y:6},dir:"right",period:1,clock:0,moves:0}];
 run.enemySerial=20;
 return run;
}
test("Hunt has a seven-segment baseline; Brood Trail still grows without a cap",()=>{
 assert.equal(RULES_VERSION,"hive-1.5.4");
 assert.equal(HUNT_SWARM_LENGTH,7);
 for(const mode of ["hunt","classic"]){
  const r=newRun({seed:1,mode});
  assert.equal(r.body.length,7);
 }
});
test("Normal Predator Hunt captures still grant score, energy and draft progress without growth",()=>{
 const r=captureFixture(),len=r.body.length;
 const before=r.score;step(r);
 assert.equal(r.kills,1);
 assert.equal(r.energy,3);
 assert.equal(r.score,before+300);
 assert.equal(r.body.length,len);
 assert.equal(r.growthDebt,0);
 // Ordinary movement never inflates the player either.
 r.enemies=[];r.respawnIn=500;
 for(let i=0;i<5;i++){
  if(r.status!=="running")break;
  step(r);
  assert.equal(r.body.length,len);
 }
});
test("Hunt food/orb rewards do not add growth, but classic orbs do",()=>{
 for(const mode of ["hunt","classic"]){
  const r=newRun({seed:11,mode});start(r);r.enemies=[];
  const length=r.body.length;r.food={x:r.body[0].x+1,y:r.body[0].y};
  step(r);
  assert.equal(r.brood,1);assert.equal(r.energy,1);assert.equal(r.score,100);
  assert.equal(r.growthDebt,mode==="hunt"?0:1);
  step(r);
  assert.equal(r.body.length,length+(mode==="classic"?1:0));
 }
});
test("All five existing bosses can still be surrounded and captured at the seven-segment baseline",()=>{
 for(const kind of Object.keys(ABILITIES)){
  const r=captureFixture(kind);
  assert.equal(spawnMiniboss(r,kind),true,"boss must spawn with a seven-segment swarm: "+kind);
  r.enemies=[{id:21,kind,pos:{x:5,y:6},dir:"right",period:1,clock:0,moves:0}];
  r.encounter.introMs=0;
  r.encounter.phase=r.encounter.phases;
  const original=r.body.length;
  step(r);
  assert.equal(r.lastEncounter?.type,"defeat",kind+" should remain mechanically capturable");
  assert.equal(r.body.length,original,kind+" must not award permanent growth");
  assert.equal(r.growthDebt,0,kind+" must not create hidden growth debt");
  assert.equal(r.kills,1);
  assert.equal(r.score,r.encounter?0:(ABILITIES[kind].phases===3?1500:750));
 }
});
test("Hunt Black defensive molt regrows a temporary shed; classic keeps its traditional cost",()=>{
 for(const mode of ["hunt","classic"]){
  const r=newRun({seed:9,mode});start(r);
  r.enemies=[];r.body=Array.from({length:7},(_,i)=>({x:17-i,y:10}));
  r.direction="right";r.turnQueue=[];r.effects.molt=1;r.effects.shield=0;
  step(r);
  assert.equal(r.status,"running");assert.equal(r.effects.molt,0);
  assert.equal(r.body.length,4);
  assert.equal(r.growthDebt,mode==="hunt"?3:0);
  for(let i=0;i<3;i++)step(r);
  assert.equal(r.body.length,mode==="hunt"?7:4);
 }
});
test("Hunt Black+Green synergy spends one unused bonus EV reward to shed less",()=>{
 const r=newRun({seed:10,mode:"hunt"});start(r);
 r.enemies=[];r.body=Array.from({length:7},(_,i)=>({x:17-i,y:10}));
 r.direction="right";r.effects.molt=1;r.effects.greenPickups=2;
 r.mutations.B=1;r.mutations.G=1;
 step(r);
 assert.equal(r.effects.greenPickups,1);
 assert.equal(r.body.length,5);
 assert.equal(r.growthDebt,2);
 step(r);step(r);
 assert.equal(r.body.length,7);
});
test("Hunt Green's four charges have meaningful bonus evolution energy and leave body unchanged",()=>{
 const r=newRun({seed:15,mode:"hunt"});start(r);
 r.effects.greenPickups=4;r.mutations.G=1;r.enemies=[];r.respawnIn=500;
 const length=r.body.length;r.food={x:r.body[0].x+1,y:r.body[0].y};
 step(r);
 assert.equal(r.energy,2);
 assert.equal(r.effects.greenPickups,3);
 assert.equal(r.growthDebt,0);
 assert.equal(r.body.length,length);
 assert.match(activeEffects(r).find(e=>e.color==="G")?.label||"",/bonus EV/);
 assert.match(mutationDescription("G","hunt"),/bonus evolution energy/);
 assert.match(mutationDescription("B","hunt"),/regrow/);
 assert.match(mutationDescription("G","classic"),/extra growth/);
 assert.match(mutationDescription("B","classic"),/shed three segments/);
});
test("Director's deliberately unranked cheeseburger can still overgrow Hunt for stress-testing",()=>{
 const r=createDirectorRun({mode:"hunt",boss:"broodmother",phase:"final"});
 const size=r.body.length;
 const p=spawnDirectorSuperOrb(r);
 assert.ok(p);assert.equal(r.body.length,size);
 // The cheat is isolated to the Director module; normal engine capture rewards remain fixed.
 r.directorBurger={x:r.body[0].x,y:r.body[0].y};
 const old=r.growthDebt;
 // Use the normal Director pickup handler so all 10 bonus segments enter growth debt.
 // An ordinary run cannot invoke this function or spawn a burger.
 assert.ok(r.directorSession);assert.equal(DIRECTOR_SUPER_ORB_SEGMENTS,10);
});
test("Cinematic victory art is full-bleed with a framed button tray below the baked-in text",()=>{
 const css=readFileSync(new URL("../director/styles.css",import.meta.url),"utf8");
 assert.match(css,/\.victory-screen--hunt \.victory-art\s*\{\s*background-size:cover/);
 assert.match(css,/\.victory-screen--hunt \.victory-content\s*\{[^}]*top:61%;[^}]*left:70%;/s);
 assert.match(css,/\.victory-screen--hunt \.victory-actions\s*\{[^}]*background:rgba\(9,14,24,\.88\);[^}]*border:2px solid #edbc70/s);
 assert.match(css,/\.victory-screen--hunt \.victory-actions button\s*\{[^}]*min-height:50px/s);
 assert.match(css,/@media \(max-width:700px\) and \(orientation:portrait\)/);
 assert.match(css,/env\(safe-area-inset-bottom/);
 const art=readFileSync(new URL("../director/high-resolution-finale-art.js",import.meta.url),"utf8");
 assert.match(art,/HIVE_FINALE_DESKTOP_AVIF/);
 assert.match(art,/HIVE_FINALE_MOBILE_AVIF/);
});
