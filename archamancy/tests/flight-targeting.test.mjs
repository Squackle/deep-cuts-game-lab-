import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createEngine, TARGET_MODES, FLIGHT_TARGET_MODES, FLIGHT_CAPABLE, SAVE_FORMAT, VERSION } from "../engine.mjs";

function arena(kind="arcanum"){
 const g=createEngine(1,"sandbox","hollow");
 g.state.mana=100000;
 assert.equal(g.command({type:"build",pad:8,kind}),true);
 return g;
}
function enemy(g,kind,progress){
 assert.equal(g.command({type:"sandboxEnemy",enemy:kind,count:1}),true);
 const e=g.state.enemies.at(-1);
 e.progress=progress;e.speed=0;e.attack=0;e.hp=e.maxHp=1000000;
 return e;
}
function fire(g){const before=g.state.events.filter(e=>e.type==="towerAttack").length;g.step();return g.state.events.filter(e=>e.type==="towerAttack")[before];}

test("air-capable tower types independently support Both, Flying only and Ground only",()=>{
 assert.deepEqual(FLIGHT_TARGET_MODES,["both","flying","ground"]);
 assert.deepEqual(TARGET_MODES,["first","last","strong","close"]);
 for(const kind of ["arcanum","judgment","storm","hex","mirror"]){
  const g=arena(kind),t=g.state.towers[8];
  assert.ok(FLIGHT_CAPABLE.includes(g.roster[kind].kind),kind);
  assert.equal(t.flightTarget,"both",kind+" starts with both");
  const ground=enemy(g,"raider",1595),wing=enemy(g,"wing",220);
  assert.equal(fire(g)?.target,ground.id,kind+" default selects foremost target regardless of altitude");
  assert.equal(g.command({type:"flightTarget",pad:8,mode:"flying"}),true);
  t.next=g.state.tick;
  assert.equal(fire(g)?.target,wing.id,kind+" selects flyer only");
  assert.equal(g.command({type:"flightTarget",pad:8,mode:"ground"}),true);
  t.next=g.state.tick;
  assert.equal(fire(g)?.target,ground.id,kind+" selects ground only");
  assert.equal(g.command({type:"flightTarget",pad:8,mode:"both"}),true);
  assert.equal(t.flightTarget,"both");
 }
});

test("existing First/Last targeting survives switching air filter; empty air band holds fire",()=>{
 const g=arena();
 const ground=enemy(g,"raider",230),wing=enemy(g,"wing",1595);
 assert.equal(g.command({type:"target",pad:8,mode:"last"}),true);
 assert.equal(g.command({type:"flightTarget",pad:8,mode:"ground"}),true);
 assert.equal(g.state.towers[8].target,"last");
 assert.equal(fire(g)?.target,ground.id);
 assert.equal(g.command({type:"flightTarget",pad:8,mode:"flying"}),true);
 g.state.towers[8].next=g.state.tick;
 assert.equal(fire(g)?.target,wing.id);
 ground.hp=0;wing.hp=0;
 g.state.towers[8].next=g.state.tick;
 assert.equal(fire(g),undefined,"no eligible targets means no shot");
});

test("ground-only and support towers reject impossible flight targeting requests",()=>{
 for(const kind of ["pyre","thorn","legion","chapel","grove","library"]){
  const g=arena(kind);
  assert.equal(g.command({type:"flightTarget",pad:8,mode:"flying"}),false,kind);
  assert.equal(g.state.towers[8].flightTarget,"both");
 }
 const g=arena("arcanum");
 for(const mode of [null,"random","air",1,undefined])
  assert.equal(g.command({type:"flightTarget",pad:8,mode}),false,String(mode));
 assert.equal(g.command({type:"flightTarget",pad:99,mode:"flying"}),false);
 assert.equal(g.command({type:"target",pad:8,mode:"last"}),true);
 assert.equal(g.command({type:"flightTarget",pad:8,mode:"flying"}),true);
 assert.equal(g.state.towers[8].target,"last");
});

test("secondary chain bolts obey tower flight targeting preference too",()=>{
 for(const mode of ["flying","ground"]){
  const g=arena("storm"),primary=enemy(g,mode==="flying"?"wing":"raider",240);
  const ally=enemy(g,mode==="flying"?"wing":"raider",235),other=enemy(g,mode==="flying"?"raider":"wing",230);
  assert.equal(g.command({type:"flightTarget",pad:8,mode}),true);
  assert.equal(fire(g)?.target,primary.id);
  const chain=g.state.inFlight.find(r=>r.tower===8)?.chain;
  assert.ok(chain?.includes(primary.id));
  assert.ok(chain?.includes(ally.id));
  assert.ok(!chain?.includes(other.id),"chain secondary cannot cross the selected altitude preference");
 }
});

test("extra shots respect altitude filter on a multishot Judgment Spire",()=>{
 const g=arena("judgment");
 assert.equal(g.command({type:"upgrade",pad:8}),true);
 assert.equal(g.command({type:"upgrade",pad:8,branch:"B"}),true);
 const wing=enemy(g,"wing",240),otherWing=enemy(g,"wing",232),ground=enemy(g,"raider",225);
 assert.equal(g.command({type:"flightTarget",pad:8,mode:"flying"}),true);
 assert.equal(fire(g)?.target,wing.id);
 const rec=g.state.inFlight.find(r=>r.tower===8);
 assert.ok(rec?.extra?.includes(otherWing.id),"secondary shot should target another eligible flyer");
 assert.ok(!rec.extra.includes(ground.id),"secondary shot must exclude ground units");
});

test("saved runs retain air preference and deterministic targeting; legacy saves default to Both",()=>{
 const g=arena("arcanum");
 const ground=enemy(g,"raider",1595),wing=enemy(g,"wing",220);
 assert.equal(g.command({type:"flightTarget",pad:8,mode:"flying"}),true);
 assert.equal(g.command({type:"target",pad:8,mode:"strong"}),true);
 const save=JSON.parse(JSON.stringify(g.snapshot()));
 assert.equal(save.format,SAVE_FORMAT);
 const h=createEngine(1,"sandbox","hollow");
 assert.equal(h.restore(save),true);
 assert.equal(h.state.towers[8].flightTarget,"flying");
 assert.equal(h.state.towers[8].target,"strong");
 assert.equal(fire(g)?.target,wing.id);
 assert.equal(fire(h)?.target,wing.id);
 for(let i=0;i<8;i++){g.step();h.step();}
 assert.deepEqual(h.state.enemies,g.state.enemies);
 assert.deepEqual(h.state.inFlight,g.state.inFlight);
 const old=JSON.parse(JSON.stringify(save));
 delete old.state.towers[8].flightTarget;
 const legacy=createEngine(1,"sandbox","hollow");
 assert.equal(legacy.restore(old),true);
 assert.equal(fire(legacy)?.target,ground.id);
 assert.equal(legacy.playtestReport().towers[0].flightTarget,"both");
 assert.equal(g.playtestReport().towers[0].flightTarget,"flying");
});

test("new air/ground targeting button appears on air-capable towers, not ground-only towers",()=>{
 const html=readFileSync(new URL("../../archemancy/index.html",import.meta.url),"utf8");
 const js=readFileSync(new URL("../main.mjs",import.meta.url),"utf8");
 assert.match(html,/<button id="flightMode"[^>]*hidden>Air \/ Ground<\/button>/);
 assert.match(js,/FLIGHT_CAPABLE\.includes\(game\.roster\[t\.kind\]\.kind\)/);
 assert.match(js,/\$\("flightMode"\)\.hidden=!flightCapable/);
 assert.match(js,/type:"flightTarget",pad:selected,mode:m/);
 assert.match(js,/const hasFlight=items\.some\(b=>b\.id==="flightMode"\)/);
 assert.equal(VERSION,"0.1.0-beta.13.45");
});

test("different towers can independently choose air and ground without changing one another",()=>{
 const g=arena("arcanum");
 assert.equal(g.command({type:"build",pad:9,kind:"judgment"}),true);
 assert.equal(g.command({type:"flightTarget",pad:8,mode:"flying"}),true);
 assert.equal(g.command({type:"flightTarget",pad:9,mode:"ground"}),true);
 assert.equal(g.state.towers[8].flightTarget,"flying");
 assert.equal(g.state.towers[9].flightTarget,"ground");
 assert.equal(g.command({type:"flightTarget",pad:8,mode:"both"}),true);
 assert.equal(g.state.towers[9].flightTarget,"ground","changing one tower cannot affect another");
});
