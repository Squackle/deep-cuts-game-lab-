import test from "node:test";
import assert from "node:assert/strict";
import {createEngine,MAPS} from "../engine.mjs";
import {CONFLUENCE_PILOT,CHAPTERS,CHALLENGES,COMMANDER_TRIALS,MISSIONS} from "../missions.mjs";

import * as progress from "../progress.mjs";
test("Troll Ford teaches regeneration and finishes as its own six-wave mission",()=>{
 const game=createEngine(1,"campaign","confluence",CONFLUENCE_PILOT.id);
 const gauntlet=createEngine(1,"campaign","confluence");
 assert.equal(gauntlet.waveLimit,25);
 assert.ok(gauntlet.waveSpec(25).includes("lorthos:1"));
 assert.deepEqual(game.waveSpec(2),["raider:10","regen:1"]);
 assert.ok(game.waveSpec(4).includes("wing:6"));
 assert.deepEqual(game.waveSpec(7),[]);
 for(const [pad,kind] of [[3,"arcanum"],[12,"pyre"],[4,"legion"]]){
  assert.ok(game.command({type:"build",pad,kind}));
 }
 const preparation={
  2:{type:"build",pad:14,kind:"arcanum"},
  3:{type:"upgrade",pad:12},
  4:{type:"upgrade",pad:3},
  5:{type:"build",pad:0,kind:"pyre"},
  6:{type:"build",pad:2,kind:"pyre"}
 };
 for(let wave=1;wave<=game.waveLimit;wave++){
  if(preparation[wave])assert.ok(game.command(preparation[wave]));
  assert.ok(game.command({type:"wave"}));
  if(wave===game.waveLimit)assert.equal(game.canCallEarly(),false);
  for(let tick=0;tick<2000&&game.state.phase==="active";tick++)game.step();
  assert.equal(game.state.phase,wave===game.waveLimit?"won":"ready");
 }
 assert.equal(game.state.health,20);
 assert.ok(game.state.tick>1200&&game.state.tick<2400);
 assert.equal(game.playtestReport().mission,CONFLUENCE_PILOT.id);
 assert.equal(game.command({type:"continue"}),false);
});

test("catalog has 24 campaign missions, 18 challenges and 12 commander trials with valid lineups",()=>{
 const all=[...Object.values(CHAPTERS).flat(),...CHALLENGES,...COMMANDER_TRIALS];
 assert.equal(all.length,54);
 assert.equal(new Set(all.map(m=>m.id)).size,54);
 assert.equal(Object.values(CHAPTERS).flat().length,24);
 assert.equal(CHALLENGES.length,18);
 assert.equal(COMMANDER_TRIALS.length,12);
 const patterns=new Set();
 for(const mission of all){
  const game=createEngine(1,"campaign",mission.mapId,mission.finale?null:mission.id);
  if(mission.finale){
   assert.equal(game.waveLimit,25);
   assert.ok(game.waveSpec(25).includes((MAPS[mission.mapId].finalBoss||"tyrant")+":1"));
   continue;
  }
  assert.equal(game.mission.id,mission.id);
  assert.ok(!patterns.has(mission.waves.join("|")),mission.id+" has its own wave plan");
  patterns.add(mission.waves.join("|"));
  for(const wave of game.waves)for(const group of wave){
   const [kind,count]=group.split(":");
   assert.ok(Object.hasOwn(game.types,kind)&&Number(count)>0,mission.id+" has valid "+group);
  }
  if(mission.deck)assert.deepEqual(game.state.deck,mission.deck);
  if(mission.commander)assert.equal(game.state.commander.id,mission.commander);
  assert.equal(game.state.onslaught,!!mission.onslaught);
 }
});

test("mission unlocks honor legacy Gauntlet stars and reward each mission's own clear",()=>{
 const profile=progress.sanitize({xp:500,stars:{normal:2}},[]);
 const [ford,split]=CHAPTERS.confluence;
 assert.ok(progress.missionOpen(profile,ford));
 assert.equal(progress.missionOpen(profile,split),false);
 assert.ok(progress.missionOpen(profile,MISSIONS["rain-of-fire"]));
 assert.equal(progress.missionOpen(profile,MISSIONS["forked-lightning"]),false);
 profile.missionStars[ford.id]=2;
 assert.ok(progress.missionOpen(profile,split));
 assert.equal(progress.missionStars(profile,ford),2);
 assert.equal(progress.missionStars(profile,CHAPTERS.hollow.at(-1)),2);
});

test("mission saves restore the correct wave plan and keep constraints",()=>{
 const m=MISSIONS["few-stones"],g=createEngine(1,"campaign",m.mapId,m.id);
 g.state.mana=5000;
 const pads=g.map.pads.filter(p=>!g.state.rubble[p.id]);
 for(const pad of pads.slice(0,6))assert.ok(g.command({type:"build",pad:pad.id,kind:"arcanum"}));
 assert.equal(g.command({type:"build",pad:pads[6].id,kind:"arcanum"}),false);
 const save=g.snapshot();
 assert.equal(createEngine(1,"campaign","hollow").restore(save),false);
 assert.equal(createEngine(1,"campaign","hollow","rain-of-fire").restore(save),false);
 const resumed=createEngine(1,"campaign",m.mapId,m.id);
 assert.ok(resumed.restore(save));
 assert.ok(resumed.atTowerLimit());
 assert.ok(resumed.command({type:"sell",pad:pads[0].id}));
 assert.ok(resumed.command({type:"build",pad:pads[6].id,kind:"arcanum"}));
 const trial=createEngine(1,"campaign","hollow","trial-talrand");
 assert.equal(trial.command({type:"commander",id:"krenko"}),false);
 assert.ok(createEngine(1,"campaign","hollow","trial-talrand").restore(trial.snapshot()));
});

test("Split Current routes armor north and trolls south",()=>{
 const game=createEngine(1,"campaign","confluence","split-current");
 game.state.wave=4;
 assert.ok(game.command({type:"wave"}));
 for(let n=0;n<95;n++)game.step();
 for(const [kind,lane] of [["armored",0],["regen",1]]){
  const enemies=game.state.enemies.filter(e=>e.kind===kind);
  assert.ok(enemies.length);
  const [start,end]=game.map.spans[lane];
  assert.ok(enemies.every(e=>e.progress>=start&&e.progress<=end));
 }
});
