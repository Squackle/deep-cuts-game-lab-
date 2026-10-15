import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {newRun,start,step,RULES_VERSION} from "../src/engine.js";
import {ABILITIES,MAX_WEBS,spawnMiniboss,tickMiniboss,abilityState} from "../src/miniboss.js";
import {safePreyTile,decidePrey,advancePrey,HEADINGS,VECTORS,ownAbilityHazard,reachableArea} from "../src/enemies.js";
import {createLairRun} from "../src/lair.js";
const shift=(p,dir)=>({x:p.x+VECTORS[dir][0],y:p.y+VECTORS[dir][1]});
test("Spindle recharges Weaver every five seconds, Guardian every four",()=>{
 assert.equal(RULES_VERSION,"hive-1.5.1");
 assert.equal(ABILITIES.weaver.cooldownMs,5000);
 assert.equal(ABILITIES.guardian.cooldownMs,4000);
 assert.equal(MAX_WEBS,3);
 for(const [kind,ms,type] of [["weaver",5000,"web"],["guardian",4000,"boss-power"]]){
  const r=createLairRun(kind);
  start(r);r.encounter.introMs=0;
  assert.equal(abilityState(r).remainingMs,ms);
  assert.equal(tickMiniboss(r,ms-1),null);
  assert.equal(abilityState(r).remainingMs,1);
  const cast=tickMiniboss(r,1);
  assert.equal(cast?.type,type);
  assert.equal(abilityState(r).remainingMs,ms);
 }
});
test("all three hazard-owning bosses avoid both warned and active ability squares",()=>{
 for(const [kind,tileKind] of [["warden","seal"],["guardian","rift"],["weaver","web"]]){
  for(const warning of [true,false]){
   const r=createLairRun(kind);start(r);r.encounter.introMs=0;
   const boss=r.enemies[0],dir=HEADINGS.find(d=>safePreyTile(r,shift(boss.pos,d),boss.id));
   assert.ok(dir,"need at least one escape tile for "+kind);
   const pos=shift(boss.pos,dir);
   if(kind==="weaver")r.encounter.webs.push({pos,lifeMs:15000});
   else r.terrain.push({pos,kind:tileKind,warningMs:warning?1200:0,lifeMs:2500});
   assert.equal(ownAbilityHazard(r,pos),true);
   assert.equal(safePreyTile(r,pos,boss.id),false);
   const next=decidePrey(r,boss);
   assert.notDeepEqual(next?.dest,pos,"Boss must not step into its power: "+kind);
  }
 }
});
test("boss route planning sees its own warned abilities as obstacles",()=>{
 for(const kind of ["warden","guardian","weaver"]){
  const r=createLairRun(kind),boss=r.enemies[0];
  const area=reachableArea(r,boss.pos,boss.id);
  for(const dir of HEADINGS){
   const pos=shift(boss.pos,dir);
   if(kind==="weaver")r.encounter.webs.push({pos,lifeMs:15000});
   else r.terrain.push({pos,kind:kind==="warden"?"seal":"rift",warningMs:1400,lifeMs:2000});
  }
  assert.equal(reachableArea(r,boss.pos,boss.id),1,"Hazards cut off outward routes during warning");
  assert.ok(area>1);
 }
});
test("an enemy surrounded by its own powers waits; it does not vanish",()=>{
 for(const kind of ["warden","guardian","weaver"]){
  const r=createLairRun(kind),boss=r.enemies[0];
  boss.pos={x:4,y:4};boss.dir="up";boss.clock=boss.period-1;
  r.body=[{x:15,y:17},{x:14,y:17},{x:13,y:17}];
  for(const dir of HEADINGS){
   const pos=shift(boss.pos,dir);
   if(kind==="weaver")r.encounter.webs.push({pos,lifeMs:15000});
   else r.terrain.push({pos,kind:kind==="warden"?"seal":"rift",warningMs:1000,lifeMs:2200});
  }
  assert.equal(advancePrey(r,boss).type,"waiting",kind+" should not escape because it laid hazards");
 }
});
test("encounter HUD is outside the full 18x22 arena, including Game Only",()=>{
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
 const main=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 const hud=html.indexOf('id="encounterHud"'),arena=html.indexOf('class="arena" id="arena"'),canvas=html.indexOf('id="gameCanvas"');
 assert.ok(hud>0&&hud<arena&&arena<canvas);
 assert.match(html,/id="encounterHud"[^>]*hidden/);
 assert.match(css,/\.encounter-hud\[hidden\]/);
 assert.match(css,/body\.game-only \.arcade-frame\{grid-template-rows:auto auto auto minmax\(0,1fr\) auto\}/);
 assert.match(main,/\$\("encounterHud"\)\.hidden=!ability&&banner\.hidden/);
 assert.match(html,/1\.5 · MATRIARCH/);
});

test("Weaver can spin three distinct snares within 15 seconds; a fourth is capped",()=>{
 const run=createLairRun("weaver");
 start(run);run.encounter.introMs=0;
 run.enemies[0].pos={x:9,y:5};
 for(let i=0;i<3;i++){
  const power=tickMiniboss(run,5000);
  assert.equal(power?.type,"web","the Weaver casts every five seconds");
  assert.equal(run.encounter.webs.length,i+1);
 }
 const unique=new Set(run.encounter.webs.map(w=>w.pos.x+","+w.pos.y));
 assert.equal(unique.size,3);
 const blocked=tickMiniboss(run,100);
 assert.equal(blocked,null);
 assert.equal(run.encounter.webs.length,3);
});
