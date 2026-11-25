import {test} from "node:test";
import assert from "node:assert/strict";
import {createEngine} from "../engine.mjs";
test("weaker Hex curse cannot shorten a stronger curse and credits marginal amplification",()=>{
 const g=createEngine(1,"sandbox","hollow");g.command({type:"sandboxMana",amount:10000});assert.ok(g.command({type:"build",pad:8,kind:"hex"}));assert.ok(g.command({type:"upgrade",pad:8}));assert.ok(g.command({type:"upgrade",pad:8,branch:"A"}));assert.ok(g.command({type:"sandboxEnemy",enemy:"raider",count:1}));const e=g.state.enemies[0];e.progress=230;e.speed=0;e.attack=0;e.hp=e.maxHp=100000;e.curseUntil=100;e.curseSource=g.state.towers[8].uid;
 for(let i=0;i<15;i++)g.step();assert.ok(g.state.towers[8].shots>0);assert.ok(e.curseUntil>=100);assert.ok(g.state.towers[8].curseAmplified>0);assert.equal(g.playtestReport().stats.curseAmplified,g.playtestReport().towers[0].curseAmplified);
 const h=createEngine(1,"sandbox","hollow");assert.ok(h.restore(JSON.parse(JSON.stringify(g.snapshot()))));for(let i=0;i<20;i++){g.step();h.step();}assert.deepEqual(h.playtestReport(),g.playtestReport());
});
test("Pyroclasm keeps its established damage-over-time balance; upgrading reduces mana only",()=>{
 function burn(level,land){const g=createEngine(1,"campaign","hollow");assert.ok(g.command({type:"kit",deck:["flame"],up:{flame:level},lands:{R:land}}));g.command({type:"wave"});for(let i=0;i<20&&!g.state.enemies.length;i++)g.step();const e=g.state.enemies[0];assert.ok(e);e.speed=0;e.hp=e.maxHp=100000;const q=g.pointAt(e.progress);assert.ok(g.command({type:"cast",index:g.state.hand.indexOf("flame"),...q}));const before=e.hp;for(let i=0;i<50;i++)g.step();return before-e.hp;}
 const base=burn(0,0);assert.ok(base>0);assert.equal(burn(2,0),base);assert.equal(burn(0,5),base);
});
