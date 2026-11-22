import {test} from "node:test";
import assert from "node:assert/strict";
import {createEngine,MAPS} from "../engine.mjs";
const near=(a,b)=>Math.abs(a.x-b.x)<=1&&Math.abs(a.y-b.y)<=1;

test("every map has its own pads clear of the road, and both entrances lead to the keep",()=>{
 for(const id of Object.keys(MAPS)){const g=createEngine(1,"campaign",id),m=g.map;assert.equal(m.id,id);assert.ok(m.pads.length>=18);
  for(const p of m.pads){const q=g.pointAt(g.nearestPath(p.x,p.y));assert.ok(Math.hypot(q.x-p.x,q.y-p.y)>=44,id+" pad "+p.id+" too close to road");}
  for(const [a,b] of m.spans)assert.ok(b>a);assert.ok(near(g.pointAt(m.distance),m.keep));}
 assert.equal(createEngine(1,"campaign","nowhere").map.id,"hollow");
});

test("Confluence: enemies alternate entrances, merge onto one road and leak at the keep",()=>{
 const g=createEngine(1,"sandbox","confluence"),m=g.map;g.command({type:"sandboxEnemy",enemy:"raider",count:2});
 const [a,b]=g.state.enemies,pa=g.pointAt(a.progress),pb=g.pointAt(b.progress);
 assert.ok(near(pa,{x:m.entrances[1][0],y:m.entrances[1][1]})||near(pa,{x:m.entrances[0][0],y:m.entrances[0][1]}));
 assert.notEqual(pa.y,pb.y,"two enemies use two entrances");
 for(const e of g.state.enemies){e.hp=e.maxHp=1e6;e.attack=0;}
 const health=g.state.health;let merged=false;
 for(let i=0;i<3000&&g.state.enemies.length;i++){g.step();for(const e of g.state.enemies){const p=g.pointAt(e.progress);if(p.y===300&&p.x>300)merged=true;}}
 assert.ok(merged,"enemies walk onto the shared road");assert.equal(g.state.enemies.length,0);assert.equal(health-g.state.health,2);
});

test("Confluence: towers target the enemy with the least road left, whichever lane it is on",()=>{
 const g=createEngine(1,"sandbox","confluence");g.command({type:"sandboxEnemy",enemy:"raider",count:2});const [a,b]=g.state.enemies,sb=g.map.spans;
 // a is near the end of the north lane; b is further back on the south lane but has the larger progress number.
 a.progress=sb[0][1]-20;b.progress=sb[1][1]-200;a.speed=b.speed=0;assert.ok(b.progress>a.progress);
 g.command({type:"sandboxMana",amount:5000});const pad=g.map.pads.findIndex(p=>p.x===320&&p.y===250);assert.ok(g.command({type:"build",pad,kind:"judgment"}));
 let first=null;for(let i=0;i<40&&!first;i++){g.step();if(a.hp<a.maxHp)first="a";else if(b.hp<b.maxHp)first="b";}assert.equal(first,"a","lead enemy is shot first");
});

test("Confluence: troops and the commander walk through the junction to reach the other lane",()=>{
 const g=createEngine(1,"campaign","confluence");g.command({type:"commander",id:"krenko"});const c=g.state.commander,sb=g.map.spans;
 assert.ok(c.progress>=sb[2][0]&&c.progress<=sb[2][1],"commander starts on the shared road");
 g.command({type:"wave"});const lane=g.map.segments[0][1];ok(g.command({type:"commanderMove",x:lane[0]-100,y:lane[1]}));
 const seen=new Set();for(let i=0;i<400&&c.progress!==c.target;i++){g.state.enemies=[];g.state.queue=[];g.state.phase="active";g.step();const p=g.pointAt(c.progress);seen.add(Math.round(p.x)+","+Math.round(p.y));}
 assert.equal(c.progress,c.target);for(const k of seen){const [x,y]=k.split(",").map(Number);assert.ok(y===300||y===80||x===740||x===210||y===200,"stays on the road: "+k);}
 function ok(v){assert.ok(v);}
});

test("saves keep their map and refuse to load on another map",()=>{
 const g=createEngine(3,"campaign","confluence");g.command({type:"wave"});for(let i=0;i<50;i++)g.step();const save=JSON.parse(JSON.stringify(g.snapshot()));
 assert.equal(save.state.mapId,"confluence");assert.equal(createEngine(1,"campaign","hollow").restore(save),false);
 const r=createEngine(1,"campaign","confluence");assert.ok(r.restore(save));for(let i=0;i<100;i++){g.step();r.step();}assert.deepEqual(r.state.enemies,g.state.enemies);
 const old=JSON.parse(JSON.stringify(createEngine(1).snapshot()));delete old.state.mapId;assert.ok(createEngine(1).restore(old),"older saves load on the Hollow Road");
 assert.equal(g.playtestReport().map,"confluence");
});

test("star upgrades apply once at the start of a run and never in the Proving Grounds",async()=>{
 const {PERKS}=await import("../engine.mjs");assert.ok(Object.keys(PERKS).length>=8);
 const base=createEngine(1),g=createEngine(1);const m=g.state.mana;assert.ok(g.command({type:"perks",perks:{treasury:2,spellcraft:3,command:1,R:3,bogus:3,G:9}}));
 assert.deepEqual(g.state.perks,{treasury:2,spellcraft:3,command:1,R:3});assert.equal(g.state.mana,m+60);assert.ok(!g.command({type:"perks",perks:{treasury:3}}),"only once");
 assert.equal(g.castCost("meteor"),Math.round(base.castCost("meteor")*.85));
 g.command({type:"commander",id:"krenko"});base.command({type:"commander",id:"krenko"});assert.equal(g.state.commander.maxHp,Math.round(base.state.commander.maxHp*1.1));
 const hit=e=>{e.command({type:"sandboxMana",amount:0});e.state.mana=5000;e.command({type:"build",pad:5,kind:"pyre"});e.command({type:"wave"});for(let i=0;i<200&&!e.state.stats.towerDamage;i++)e.step();return e.state.towers[5].damage;};
 assert.ok(hit(g)>hit(base),"red towers hit harder");
 const s=createEngine(1,"sandbox");assert.ok(!s.command({type:"perks",perks:{treasury:3}}));
 const save=JSON.parse(JSON.stringify(g.snapshot()));const r=createEngine(1);assert.ok(r.restore(save));assert.deepEqual(r.state.perks,g.state.perks);
});
