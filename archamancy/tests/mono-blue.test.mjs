import {test} from "node:test";
import assert from "node:assert/strict";
import {createEngine,VERSION,SAVE_FORMAT} from "../engine.mjs";
import {counterplayWarning} from "../wave-guidance.mjs";
import {trialBadges} from "../progress.mjs";
import {playMonoBlue,OPTIMIZED_DECK} from "../tools/mono-blue-balance.mjs";
function arena(kind,branch){
 const g=createEngine(1,"sandbox","hollow");assert.ok(g.command({type:"sandboxMana",amount:100000}));
 assert.ok(g.command({type:"build",pad:8,kind}));
 assert.ok(g.command({type:"upgrade",pad:8}));
 if(branch)assert.ok(g.command({type:"upgrade",pad:8,branch}));
 return g;
}
function foe(g,kind,progress=230){
 assert.ok(g.command({type:"sandboxEnemy",enemy:kind,count:1}));
 const e=g.state.enemies.at(-1);e.progress=progress;e.speed=0;e.attack=0;e.hp=e.maxHp=100000;return e;
}
function tick(g,n=60){for(let i=0;i<n;i++)g.step();}
test("Endless Reflections damages magic-immune Wardens without removing their immunity or physical armor",()=>{
 for(const branch of [null,"A","B"]){
  const g=arena("mirror",branch),e=foe(g,"warden");tick(g);
  assert.equal(e.resist,100);assert.equal(e.armor,25);
  if(branch==="A"){assert.ok(e.hp<e.maxHp);assert.ok(g.state.towers[8].towerDamage>0);}
  else assert.equal(e.hp,e.maxHp);
 }
});
test("Endless Reflections retains magic damage against physical-immune Juggernauts",()=>{
 const g=arena("mirror","A"),e=foe(g,"golem");tick(g);
 assert.ok(e.hp<e.maxHp);assert.equal(e.armor,100);
});
test("physical echoes prioritize visible Wardens, respecting flight mode, and reject doubly immune targets",()=>{
 const g=arena("mirror","A"),ordinary=foe(g,"raider",240),warden=foe(g,"warden",230);
 g.step();assert.equal(g.state.inFlight[0].target,warden.id);
 const air=foe(g,"wing",220);assert.ok(g.command({type:"flightTarget",pad:8,mode:"flying"}));
 g.state.towers[8].next=g.state.tick;g.step();assert.equal(g.state.inFlight.at(-1).target,air.id);
 const h=arena("mirror","A"),both=foe(h,"warden");both.armor=100;both.baseArmor=100;tick(h);
 assert.equal(both.hp,both.maxHp);assert.equal(h.state.towers[8].shots||0,0);
});
test("Deep Freeze reveals hidden foes in range while Archmage and lower tiers do not",()=>{
 for(const branch of [null,"A","B"]){
  const g=arena("arcanum",branch),e=foe(g,"stalker");tick(g);
  assert.equal(e.revealed,branch==="A");
  assert.equal(e.hp<e.maxHp,branch==="A");
 }
});
test("mono-blue guidance recognizes both unlocked specializations and never suggests invalidating the badge",()=>{
 const g=createEngine(1,"campaign","caldera");g.state.mana=10000;
 for(const [pad,kind] of [[0,"arcanum"],[1,"mirror"]]){
  assert.ok(g.command({type:"build",pad,kind}));
  assert.ok(g.command({type:"upgrade",pad}));
  assert.match(counterplayWarning(g,g.state,16),/Mono-Blue/);
  assert.ok(g.command({type:"upgrade",pad,branch:"A"}));
 }
 assert.equal(counterplayWarning(g,g.state,16),"");
 assert.ok(g.command({type:"flightTarget",pad:1,mode:"flying"}));
 assert.match(counterplayWarning(g,g.state,16),/Endless Reflections/);
});
test("new blue attacks and shroud visibility remain deterministic across JSON save and restore",()=>{
 const g=arena("mirror","A");assert.ok(g.command({type:"build",pad:9,kind:"arcanum"}));
 assert.ok(g.command({type:"upgrade",pad:9}));assert.ok(g.command({type:"upgrade",pad:9,branch:"A"}));
 foe(g,"warden");foe(g,"stalker",240);tick(g,12);
 const h=createEngine(1,"sandbox","hollow");assert.ok(h.restore(JSON.parse(JSON.stringify(g.snapshot()))));
 tick(g,80);tick(h,80);assert.deepEqual(h.playtestReport(),g.playtestReport());
 assert.equal(SAVE_FORMAT,1);assert.equal(VERSION,"0.1.0-beta.13.63");
});
test("faster Library pulse and bounded single-Construct scaling are defined",()=>{
 const g=createEngine(1,"sandbox","hollow");
 assert.equal(g.roster.library.interval,75);assert.equal(g.roster.mirror.interval,16);
 assert.ok(g.command({type:"sandboxMana",amount:10000}));
 assert.ok(g.command({type:"commander",id:"urza"}));
 assert.ok(g.command({type:"build",pad:8,kind:"mirror"}));
 assert.ok(g.command({type:"build",pad:9,kind:"arcanum"}));
 assert.ok(g.command({type:"wave"}));
 const tokens=g.state.troops.filter(u=>u.source==="cmd"&&u.model==="construct");
 assert.equal(tokens.length,1);assert.equal(tokens[0].maxHp,150);assert.equal(tokens[0].damage,20);
});
test("command-only Caldera Easy Onslaught completes all 25 waves and qualifies for Mono-Blue",()=>{
 const r=playMonoBlue({seed:1,map:"caldera",difficulty:"easy",onslaught:true});
 assert.equal(r.phase,"won");assert.equal(r.completed,25);assert.equal(r.monoBlue,true);assert.ok(r.health>0);
 assert.ok(trialBadges({won:r.won,mode:"campaign",onslaught:true,map:r.map,colors:r.towers.map(()=>"U")}).includes("mono:U"));
});

test("Hard Caldera Onslaught is beatable with blue-only towers and a trial-legal commander",()=>{
 for(const seed of [1,2,3]){
  const r=playMonoBlue({seed,map:"caldera",difficulty:"hard",onslaught:true,commander:"atraxa",deck:OPTIMIZED_DECK});
  assert.equal(r.completed,25);assert.equal(r.won,true);assert.ok(r.health>=10);assert.equal(r.monoBlue,true);
  const badges=trialBadges({won:r.won,mode:"campaign",onslaught:true,map:r.map,colors:r.towers.map(()=>"U")});
  assert.ok(badges.includes("mono:U"));assert.ok(badges.includes("onslaught:caldera"));
 }
});
