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

test("bosses crack below 40% health and cheap leaks cost less",async()=>{
 const {bossLeakCost}=await import("../engine.mjs");
 const g=createEngine(1,"sandbox","hollow");g.state.mana=99999;assert.ok(g.command({type:"build",pad:8,kind:"pyre"}));
 assert.ok(g.command({type:"sandboxEnemy",enemy:"colossus",count:1}));const e=g.state.enemies.find(x=>x.kind==="colossus");e.attack=0;e.progress=1595;
 const hp0=e.hp;for(let i=0;i<40;i++)g.step();assert.equal(e.hp,hp0,"physical cannot touch a healthy colossus");
 e.hp=Math.floor(e.maxHp*.39);const before=e.hp;for(let i=0;i<40&&e.hp===before;i++)g.step();assert.ok(e.hp<before&&e.cracked,"a cracked colossus takes physical damage");
 assert.equal(bossLeakCost({hp:90,maxHp:100}),3);assert.equal(bossLeakCost({hp:50,maxHp:100}),2);assert.equal(bossLeakCost({hp:10,maxHp:100}),1);
});
