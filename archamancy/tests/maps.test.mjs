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

test("targeting modes pick First, Last, Strongest or Closest, and only on aiming towers",()=>{
 const pick=mode=>{const g=createEngine(1,"sandbox");g.command({type:"sandboxMana",amount:5000});g.command({type:"sandboxEnemy",enemy:"raider",count:3});const [a,b,c]=g.state.enemies;
  // a: furthest along, weak; b: middle, strongest; c: furthest back but right beside the tower.
  const pad=g.map.pads[5];a.progress=g.nearestPath(pad.x+150,pad.y)+0;b.progress=a.progress-60;c.progress=g.nearestPath(pad.x,pad.y);for(const e of [a,b,c])e.speed=0;
  b.hp=b.maxHp=500;a.hp=a.maxHp=c.hp=c.maxHp=200;
  if(g.map.pads.length)assert.ok(g.command({type:"build",pad:5,kind:"judgment"}));if(mode)assert.ok(g.command({type:"target",pad:5,mode}));
  for(let i=0;i<40;i++){g.step();const hit=[a,b,c].find(e=>e.hp<e.maxHp);if(hit)return [a,b,c].indexOf(hit);}return -1;};
 const g=createEngine(1);g.command({type:"build",pad:0,kind:"legion"});assert.ok(!g.command({type:"target",pad:0,mode:"last"}),"troop towers keep rally only");
 g.command({type:"build",pad:1,kind:"arcanum"});assert.ok(!g.command({type:"target",pad:1,mode:"constructor"}));
 const r={first:pick(null),last:pick("last"),strong:pick("strong"),close:pick("close")};
 assert.deepEqual(r,{first:0,last:2,strong:1,close:2});
});

test("every commander has a tap ability that works during waves and then cools down",async()=>{
 const {ABILITIES}=await import("../engine.mjs");const ids=Object.keys(createEngine(1).commanders);assert.deepEqual(Object.keys(ABILITIES).sort(),ids.slice().sort());
 for(const id of ids){const g=createEngine(1,"sandbox");g.command({type:"sandboxMana",amount:5000});g.command({type:"commander",id});assert.ok(!g.command({type:"ability"}),id+" not between waves");
  g.command({type:"build",pad:5,kind:"legion"});g.command({type:"build",pad:6,kind:"necropolis"});g.command({type:"sandboxEnemy",enemy:"raider",count:4});
  const cm=g.state.commander;for(const e of g.state.enemies){e.progress=cm.progress+20;e.speed=0;e.attack=0;e.hp=e.maxHp=1e5;}
  // Meren needs a fallen troop.
  if(id==="meren")g.state.fallen.push({source:5,sourceUid:g.state.towers[5].uid,hp:50,damage:5,model:"legion",revived:false});
  g.state.health=15;const before=JSON.stringify([g.state.troops.length,g.state.mana,g.state.health,cm.growth,cm.voltron,g.state.stats.commanderDamage,g.state.hand.length,g.state.fallen.length]);
  assert.ok(g.command({type:"ability"}),id+" fires");assert.notEqual(JSON.stringify([g.state.troops.length,g.state.mana,g.state.health,cm.growth,cm.voltron,g.state.stats.commanderDamage,g.state.hand.length,g.state.fallen.length]),before,id+" changes something");
  assert.ok(!g.command({type:"ability"}),id+" cools down");for(let i=0;i<ABILITIES[id].cooldown*10;i++)g.step();assert.ok(g.abilityReady(),id+" ready again");}
});

test("rubble blocks prime pads until cleared with mana, and never in the Proving Grounds",()=>{
 for(const id of Object.keys(MAPS)){const g=createEngine(1,"campaign",id),[pad,cost]=Object.entries(g.state.rubble)[0].map(Number);assert.ok(Object.keys(g.state.rubble).length>=3,id);
  assert.ok(!g.command({type:"build",pad,kind:"arcanum"}),"blocked");const m=g.state.mana;assert.ok(g.command({type:"clear",pad}));assert.equal(g.state.mana,m-cost);assert.ok(!g.command({type:"clear",pad}),"once");assert.ok(g.command({type:"build",pad,kind:"arcanum"}));
  g.state.mana=0;const [p2]=Object.keys(g.state.rubble).map(Number);assert.ok(!g.command({type:"clear",pad:p2}),"needs mana");}
 assert.deepEqual(createEngine(1,"sandbox").state.rubble,{});
 const old=JSON.parse(JSON.stringify(createEngine(1).snapshot()));delete old.state.rubble;const r=createEngine(1);assert.ok(r.restore(old));assert.deepEqual(r.state.rubble,{},"older saves had no rubble");
});

test("Onslaught sends the next wave on a timer, cleared road or not",async()=>{
 const {ONSLAUGHT_GAP}=await import("../engine.mjs");const g=createEngine(1);assert.ok(g.command({type:"onslaught",on:true}));assert.equal(g.onslaughtLeft(),null,"wave 1 is yours to start");
 g.command({type:"wave"});assert.equal(g.onslaughtLeft(),ONSLAUGHT_GAP);
 for(let i=0;i<=ONSLAUGHT_GAP;i++)g.step();assert.equal(g.state.wave,2,"wave 2 arrives on time while wave 1 may still be on the road");assert.equal(g.state.stats.earlyCalls,0);
 // Clear the road: the clock keeps running between waves.
 g.state.enemies=[];g.state.queue=[];g.step();assert.equal(g.state.phase,"ready");for(let i=0;i<ONSLAUGHT_GAP+5&&g.state.wave===2;i++)g.step();assert.equal(g.state.wave,3);
 {const {ONSLAUGHT_MAX}=await import("../engine.mjs");const h=createEngine(1);h.command({type:"onslaught",on:true});h.command({type:"wave"});h.state.enemies.forEach(e=>e.speed=0);h.state.queue.forEach(e=>e.speed=0);
for(let i=0;i<ONSLAUGHT_GAP*(ONSLAUGHT_MAX+2)&&h.state.phase==="active";i++){h.step();h.state.enemies.forEach(e=>{e.speed=0;e.attack=0;});}assert.equal(h.state.pendingWaves.length,ONSLAUGHT_MAX,"Onslaught holds while 3 waves are on the road");}
{const run=m=>{const g=createEngine(1,"campaign",m);g.state.wave=3;g.command({type:"wave"});for(let i=0;i<600&&!(g.state.enemies.some(e=>e.flying)&&g.state.enemies.some(e=>!e.flying));i++)g.step();const f=k=>g.state.enemies.find(e=>k(e))?.maxHp;return [f(e=>e.flying),f(e=>!e.flying)];};
 const [hf,hg]=run("hollow"),[cf,cg]=run("confluence");assert.equal(hg,cg,"ground hp matches across maps");assert.equal(cf,Math.ceil(hf*.85),"fliers are lighter on the shorter Confluence roads");}
const n=createEngine(1);n.command({type:"wave"});for(let i=0;i<ONSLAUGHT_GAP+10;i++)n.step();assert.equal(n.state.wave,1,"normal Gauntlet waits");
 const s=createEngine(1);s.command({type:"wave"});assert.ok(!s.command({type:"onslaught",on:true}),"only before wave 1");
});

test("locked towers cannot be built until unlocked, outside the Proving Grounds",()=>{
 const g=createEngine(1);assert.ok(g.command({type:"locks",towers:["storm","nope"]}));assert.deepEqual(g.state.locked,["storm"]);assert.ok(!g.command({type:"build",pad:0,kind:"storm"}));assert.ok(g.command({type:"build",pad:0,kind:"pyre"}));
 assert.ok(!g.command({type:"locks",towers:[]}),"only before building");const s=createEngine(1,"sandbox");assert.ok(!s.command({type:"locks",towers:["storm"]}));
});

test("Greyhorn Pass: ground enemies in the tunnel can't be targeted, hit or blocked; fliers can",()=>{
 const g=createEngine(1,"sandbox","pass"),t=g.map.tunnel[0];assert.ok(t);g.command({type:"sandboxMana",amount:9000});
 const mid=g.nearestPath(t.x+t.w/2,t.y+t.h/2);
 g.command({type:"sandboxEnemy",enemy:"raider",count:1});g.command({type:"sandboxEnemy",enemy:"wing",count:1});
 const [ground,flier]=g.state.enemies;assert.ok(!ground.flying&&flier.flying);for(const e of [ground,flier]){e.progress=mid;e.speed=0;e.attack=0;}
 assert.ok(g.inTunnel(ground)&&!g.inTunnel(flier));
 const pad=g.map.pads.findIndex(p=>p.x===420&&p.y===375);assert.ok(g.command({type:"build",pad,kind:"judgment"}));
 for(let i=0;i<60;i++)g.step();assert.equal(ground.hp,ground.maxHp,"hidden in the tunnel");assert.ok(flier.hp<flier.maxHp,"fliers are fair game");
 ground.progress=g.nearestPath(t.x-40,t.y+t.h/2);for(let i=0;i<60&&ground.hp===ground.maxHp;i++)g.step();assert.ok(ground.hp<ground.maxHp,"hit once it comes out");
 const tp=g.map.pads.findIndex(p=>p.x===250&&p.y===365);assert.ok(g.command({type:"build",pad:tp,kind:"legion"}));assert.ok(!g.command({type:"rally",pad:tp,x:t.x+20,y:t.y+t.h/2}),"no rallying inside the mountain");
 const c=createEngine(1,"campaign","pass");c.command({type:"commander",id:"krenko"});assert.ok(!c.command({type:"commanderMove",x:t.x+t.w/2,y:t.y+t.h/2}));assert.ok(c.command({type:"commanderMove",x:t.x-60,y:t.y+t.h/2}));
 for(const p of g.map.pads)assert.ok(!(g.pointAt(g.nearestPath(p.x,p.y)).x>t.x&&g.pointAt(g.nearestPath(p.x,p.y)).x<t.x+t.w&&g.pointAt(g.nearestPath(p.x,p.y)).y>t.y&&g.pointAt(g.nearestPath(p.x,p.y)).y<t.y+t.h),"pad "+p.id+" rallies outside");
 assert.equal(createEngine(1,"campaign","hollow").map.tunnel.length,0);
});
