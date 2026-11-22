import {test} from "node:test";
import assert from "node:assert/strict";
import {createEngine} from "../engine.mjs";

test("troops only hold a physical-immune boss for a few seconds",()=>{
 const run=kind=>{const g=createEngine(1,"sandbox","hollow");g.state.mana=99999;assert.ok(g.command({type:"build",pad:4,kind:"legion"}));
  for(let i=0;i<60;i++)g.step();assert.ok(g.command({type:"sandboxEnemy",enemy:kind,count:1}));
  const e=g.state.enemies.find(x=>x.kind===kind);e.hp=e.maxHp=1e9;e.attack=0;
  for(let i=0;i<900;i++)g.step();return e.progress;};
 const colossus=run("colossus"),titan=run("titan");
 assert.ok(colossus>titan+150,"colossus pushes past troops it can't hurt ("+colossus+" vs titan "+titan+")");
});

test("commander health grows with later waves",()=>{
 const g=createEngine(1,"campaign","hollow");assert.ok(g.command({type:"commander",id:"omnath"}));
 const hp0=g.state.commander.maxHp;g.state.wave=19;g.command({type:"wave"});
 assert.ok(g.state.commander.maxHp>hp0*2,"wave 20 commander has more than double health ("+hp0+" -> "+g.state.commander.maxHp+")");
});
