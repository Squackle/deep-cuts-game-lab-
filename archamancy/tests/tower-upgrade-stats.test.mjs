import {test} from "node:test";
import assert from "node:assert/strict";
import {createEngine} from "../engine.mjs";
test("all 15 towers expose finite role-specific stats and pure upgrade previews for both branches",()=>{
 for(const kind of Object.keys(createEngine(1).roster)){for(const branch of ["A","B"]){const g=createEngine(1,"sandbox","hollow");g.command({type:"sandboxMana",amount:100000});assert.ok(g.command({type:"build",pad:8,kind}));const t=g.state.towers[8];
 for(let tier=1;tier<4;tier++){const before=JSON.stringify(g.state),next=g.upgradePreview(t,tier===2?branch:t.branch);assert.ok(next);assert.equal(JSON.stringify(g.state),before);assert.ok(g.command({type:"upgrade",pad:8,...(tier===2?{branch}:{})}));assert.deepEqual(g.towerStats(t),next);assert.ok(Object.values(next).every(v=>typeof v==="boolean"||Number.isFinite(v)));}assert.equal(g.upgradePreview(t),null);assert.equal(t.upgradeDetails.length,3);}}
});
test("range upgrades use combat radius, terrain, branches, and keep troop rally range fixed",()=>{
 const g=createEngine(1,"sandbox","hollow");g.command({type:"sandboxMana",amount:100000});g.command({type:"build",pad:8,kind:"judgment"});const t=g.state.towers[8],base=g.towerRange(t);g.command({type:"upgrade",pad:8});assert.equal(g.towerRange(t),base+10);g.command({type:"upgrade",pad:8,branch:"B"});assert.equal(g.towerRange(t),base+20);g.command({type:"upgrade",pad:8});assert.equal(g.towerRange(t),base+40);assert.equal(g.towerStats(t).targets,3);g.command({type:"build",pad:9,kind:"legion"});const u=g.state.towers[9];g.command({type:"upgrade",pad:9});assert.equal(g.towerStats(u).rallyRange,g.roster.legion.range);
});
test("damage telemetry reconciles per-enemy data and survives checkpoints",()=>{
 const g=createEngine(1,"sandbox","hollow");g.command({type:"sandboxMana",amount:100000});g.command({type:"build",pad:8,kind:"judgment"});g.command({type:"sandboxEnemy",enemy:"wing",count:1});const e=g.state.enemies[0];e.progress=230;e.speed=0;e.hp=e.maxHp=10000;for(let i=0;i<40;i++)g.step();const r=g.playtestReport().towers[0];assert.ok(r.hits>0);assert.equal(r.flyingDamage,r.damage);assert.equal(r.damageByEnemy.wing,r.damage);assert.equal(g.state.stats.flyingDamage,r.damage);const h=createEngine(1,"sandbox","hollow");assert.ok(h.restore(JSON.parse(JSON.stringify(g.snapshot()))));assert.deepEqual(h.playtestReport(),g.playtestReport());
});
