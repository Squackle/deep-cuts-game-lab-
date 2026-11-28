import {test} from "node:test";
import assert from "node:assert/strict";
import {createEngine,DEATH_BURST_GAP} from "../engine.mjs";

// The death-trigger towers (Necropolis death blasts / Blood Artist, Soul Foundry) fire on every friendly death:
// any troop tower's troops, commander tokens, and the commander itself.
const setup=(commander=null)=>{const g=createEngine(1,"sandbox","hollow");g.state.mana=1e6;if(commander)assert.ok(g.command({type:"commander",id:commander}));return g;};
// Event log is capped, so count blasts by sequence number.
const mark=g=>g.state.sequence;const blastsSince=(g,seq)=>g.state.events.filter(e=>e.type==="deathExplosion"&&e.seq>seq).length;
const kill=(g,u)=>{const f=g.state.stats.fallen;u.expires=g.state.tick;g.step();assert.equal(g.state.stats.fallen,f+1,"troop died");};
// Start a wave and park one unkillable enemy at the entrance so the wave stays active.
const go=g=>{if(g.state.phase!=="active")assert.ok(g.command({type:"wave"}));assert.ok(g.command({type:"sandboxEnemy",enemy:"titan",count:1}));const e=g.state.enemies.at(-1);e.progress=0;e.speed=0;e.hp=e.maxHp=1e9;e.attack=0;};
const wait=g=>{for(let i=0;i<=DEATH_BURST_GAP;i++)g.step();};

test("a Blood Artist Necropolis explodes when another tower's troop dies",()=>{
 const g=setup();assert.ok(g.command({type:"build",pad:0,kind:"necropolis"}));assert.ok(g.command({type:"build",pad:20,kind:"legion"}));
 g.state.towers[0].funeral=true;go(g);for(let i=0;i<5;i++)g.step();
 const u=g.state.troops.find(u=>u.source===20&&u.hp>0);assert.ok(u,"legion soldier present");
 const before=g.state.stats.triggers;kill(g,u);
 assert.ok(g.state.stats.triggers>before,"legion death fired the necropolis");
 assert.ok(g.state.events.some(e=>e.type==="deathExplosion"&&e.source===0));
});

test("Lich Citadel death blasts fire on commander token deaths",()=>{
 const g=setup("krenko");assert.ok(g.command({type:"build",pad:0,kind:"necropolis"}));
 for(let i=0;i<3;i++)assert.ok(g.command({type:"upgrade",pad:0,...(i===1?{branch:"B"}:{})}));
 go(g);for(let i=0;i<400&&!g.state.troops.some(u=>u.source==="cmd");i++)g.step();
 wait(g);const tok=g.state.troops.find(u=>u.source==="cmd"&&u.hp>0&&!u.dead);assert.ok(tok,"Krenko made a goblin token");
 g.state.towers[0].burstReady=0;const n=mark(g);kill(g,tok);assert.equal(blastsSince(g,n),1,"token death fired the death blast");
});

test("the commander's death fires death-trigger towers",()=>{
 const g=setup("omnath");assert.ok(g.command({type:"build",pad:0,kind:"necropolis"}));g.state.towers[0].funeral=true;
 g.state.troops.length=0;wait(g);
 assert.ok(g.command({type:"sandboxEnemy",enemy:"raider",count:1}));const cm=g.state.commander,e=g.state.enemies[0];
 e.progress=cm.progress;e.speed=0;e.hp=e.maxHp=1e7;e.attack=1e6;cm.hp=1;
 const n=mark(g);for(let i=0;i<40&&!cm.dead;i++)g.step();
 assert.ok(cm.dead,"commander fell");assert.ok(blastsSince(g,n)>0,"commander death fired the blast");
});

test("Soul Foundry earns from commander token and commander deaths in range",()=>{
 const g=setup("krenko");assert.ok(g.command({type:"build",pad:5,kind:"foundry"}));
 go(g);for(let i=0;i<400&&!g.state.troops.some(u=>u.source==="cmd");i++)g.step();
 const tok=g.state.troops.find(u=>u.source==="cmd"&&u.hp>0);assert.ok(tok);
 const at=g.nearestPath(g.map.pads[5].x,g.map.pads[5].y);tok.progress=at;
 const before=g.state.stats.soulMana;kill(g,tok);assert.ok(g.state.stats.soulMana>before,"token death fed the foundry");
 const cm=g.state.commander;cm.progress=cm.target=at;
 assert.ok(g.command({type:"sandboxEnemy",enemy:"raider",count:1}));const e=g.state.enemies.at(-1);e.progress=at;e.speed=0;e.hp=e.maxHp=1e7;e.attack=1e6;cm.hp=1;
 const mid=g.state.stats.soulMana;for(let i=0;i<40&&!cm.dead;i++)g.step();
 assert.ok(cm.dead);assert.ok(g.state.stats.soulMana>mid,"commander death fed the foundry");
});

test("Tier II Soul Foundry pays 22 mana on an in-range death while retaining its cap",()=>{
 const g=setup("krenko");assert.ok(g.command({type:"build",pad:5,kind:"foundry"}));
 assert.ok(g.command({type:"upgrade",pad:5}));
 go(g);for(let i=0;i<400&&!g.state.troops.some(u=>u.source==="cmd");i++)g.step();
 const tok=g.state.troops.find(u=>u.source==="cmd"&&u.hp>0);assert.ok(tok);
 tok.progress=g.nearestPath(g.map.pads[5].x,g.map.pads[5].y);
 const before=g.state.stats.soulMana;kill(g,tok);
 assert.equal(g.state.stats.soulMana-before,22);
 assert.equal(g.towerStats(g.state.towers[5]).manaPerWave,80);
});
