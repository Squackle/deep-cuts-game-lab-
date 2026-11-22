import {test} from "node:test";
import assert from "node:assert/strict";
import {createEngine,FLIGHT} from "../engine.mjs";

const setup=(kind,enemy="raider",count=1)=>{const g=createEngine(1,"sandbox","hollow");g.state.mana=99999;assert.ok(g.command({type:"build",pad:8,kind}));g.command({type:"sandboxEnemy",enemy,count});for(const e of g.state.enemies){e.progress=220;e.attack=0;e.speed=0;}return g;};

test("every damaging tower's hit lands when its projectile arrives, not when it fires",()=>{
 for(const kind of ["arcanum","judgment","mirror","hex","pyre","storm","thorn"]){const g=setup(kind,"armored");const e=g.state.enemies[0],hp=e.hp;g.step();
  const shot=g.state.projectiles.find(p=>p.targetId===e.id);assert.ok(shot,kind+" fired");assert.equal(e.hp,hp,kind+" no damage at fire");
  while(g.state.tick<shot.start+shot.duration)g.step();assert.ok(e.hp<hp,kind+" damage on arrival (tick "+g.state.tick+")");}
});

test("single-target towers hold fire at an enemy already doomed by shots in flight",()=>{
 const g=createEngine(1,"sandbox","hollow");g.state.mana=99999;for(const pad of [8,9])g.command({type:"build",pad,kind:"judgment"});
 g.command({type:"sandboxEnemy",enemy:"raider",count:1});const e=g.state.enemies[0];e.progress=220;e.speed=0;e.attack=0;e.hp=1;
 g.step();assert.equal(g.state.inFlight.length,1,"only one shot at a 1-hp raider");for(let i=0;i<FLIGHT;i++)g.step();assert.equal(e.hp,0);
});

test("shots in flight survive a save and land the same after restore",()=>{
 const g=setup("pyre","raider",3);g.step();assert.ok(g.state.inFlight.length>0);
 const r=createEngine(1,"sandbox","hollow");assert.ok(r.restore(g.snapshot()));for(let i=0;i<FLIGHT+2;i++){g.step();r.step();}
 assert.deepEqual(r.state.enemies.map(e=>e.hp),g.state.enemies.map(e=>e.hp));assert.equal(r.state.stats.damage,g.state.stats.damage);
});

test("splash still bursts where its target was if the target died in the meantime",()=>{
 const g=setup("pyre","raider",3);g.step();const [a,b]=g.state.enemies;const hpB=b.hp;a.hp=0;for(let i=0;i<FLIGHT;i++)g.step();assert.ok(b.hp<hpB,"neighbour still takes splash");
});
