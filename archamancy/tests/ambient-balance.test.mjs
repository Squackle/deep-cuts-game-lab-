import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createEngine,SAVE_FORMAT} from "../engine.mjs";
const read=name=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
test("title ambience is decorative, locally sourced, cover-aligned and respects reduced motion",()=>{
 const mod=read("title-ambience.mjs"),css=read("styles.css"),menu=read("title-menu.mjs");
 for(const name of ["ambience-flag","ambience-fire","ambience-fog","ambience-river","ambience-waterfall"]){
  assert.ok(mod.includes(name),name);
  assert.ok(css.includes(name),name);
 }
 assert.match(mod,/new URL\("\.\/assets\/river-keep\.webp",import\.meta\.url\)/);
 assert.doesNotMatch(mod,/requestAnimationFrame|setInterval|setTimeout|<script|foreignObject/i);
 assert.match(mod,/layer\.setAttribute\("aria-hidden","true"\)/);
 assert.match(css,/\.title-ambience\{[^}]*position:fixed[^}]*pointer-events:none/);
 assert.match(css,/\.title-ambience svg\{[^}]*left:65%;top:50%/);
 assert.match(css,/prefers-reduced-motion:reduce\)\{\.title-ambience\{display:none/);
 assert.match(menu,/mountTitleAmbience\(title\)/);
});
function tower(kind,branch){
 const g=createEngine(1,"sandbox","hollow");assert.ok(g.command({type:"sandboxMana",amount:100000}));
 assert.ok(g.command({type:"build",pad:8,kind}));assert.ok(g.command({type:"upgrade",pad:8}));
 if(branch)assert.ok(g.command({type:"upgrade",pad:8,branch}));
 return {g,t:g.state.towers[8]};
}
test("balance pilot improves Deep Freeze control and limits Grasping Forest root duration without changing damage branches",()=>{
 const blue=tower("arcanum","A"),archmage=tower("arcanum","B"),green=tower("thorn","A"),venom=tower("thorn","B");
 assert.equal(blue.g.towerStats(blue.t).slowSeconds,2.4);
 assert.equal(blue.g.towerStats(blue.t).rootSeconds,.4);
 assert.equal(archmage.g.towerStats(archmage.t).slowSeconds,1.2);
 assert.equal(archmage.g.towerStats(archmage.t).rootSeconds,0);
 assert.equal(green.g.towerStats(green.t).rootSeconds,1.5);
 assert.equal(green.g.towerStats(green.t).rootRadius,65);
 assert.equal(venom.g.towerStats(venom.t).rootSeconds,1.3);
 assert.equal(venom.g.towerStats(venom.t).poisonStacks,6);
 for(const [pair,ticks] of [[blue,4],[green,15]]){
  const {g,t}=pair;assert.ok(g.command({type:"sandboxEnemy",enemy:"raider",count:1}));
  const foe=g.state.enemies.at(-1);foe.progress=230;foe.speed=0;foe.attack=0;foe.hp=foe.maxHp=100000;
  for(let i=0;i<20&&!foe.rootUntil;i++)g.step();
  assert.ok(foe.rootUntil>g.state.tick,"root was applied");
  assert.equal(foe.rootUntil-g.state.tick,ticks,"actual root matches stats");
  assert.ok(t.shots>0);
 }
});
test("Soul Foundry displays improved income without increasing its existing per-wave cap",()=>{
 const {g,t}=tower("foundry");assert.equal(g.towerStats(t).manaPerDeath,22);
 assert.equal(g.towerStats(t).manaPerWave,80);
 assert.ok(g.command({type:"upgrade",pad:8,branch:"A"}));
 assert.equal(g.towerStats(t).manaPerDeath,Math.floor(27*1.35));
 assert.equal(g.towerStats(t).manaPerWave,Math.floor(140*1.35));
 assert.equal(SAVE_FORMAT,1);
});
