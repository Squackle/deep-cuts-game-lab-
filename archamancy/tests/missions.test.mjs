import test from "node:test";
import assert from "node:assert/strict";
import {createEngine} from "../engine.mjs";
import {CONFLUENCE_PILOT} from "../missions.mjs";

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
