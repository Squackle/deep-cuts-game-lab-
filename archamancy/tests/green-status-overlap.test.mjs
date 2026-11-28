import {test} from "node:test";
import assert from "node:assert/strict";
import {createEngine} from "../engine.mjs";
function arena(branch){
 const g=createEngine(1,"sandbox","hollow");
 assert.ok(g.command({type:"sandboxMana",amount:100000}));
 assert.ok(g.command({type:"build",pad:8,kind:"thorn"}));
 assert.ok(g.command({type:"upgrade",pad:8}));
 assert.ok(g.command({type:"upgrade",pad:8,branch}));
 assert.ok(g.command({type:"sandboxEnemy",enemy:"raider",count:1}));
 const e=g.state.enemies[0];e.progress=230;e.speed=0;e.attack=0;e.hp=e.maxHp=100000;
 return {g,e};
}
test("weaker Thornheart hits cannot erase stronger poison stacks or shorten an existing root",()=>{
 for(const branch of ["A","B"]){
  const {g,e}=arena(branch);e.poisonStacks=6;e.poisonUntil=100;e.rootUntil=100;
  for(let i=0;i<9;i++)g.step();
  assert.ok(g.state.towers[8].shots>0);assert.equal(e.poisonStacks,6);
  assert.ok(e.poisonUntil>=100);assert.ok(e.rootUntil>=100);
 }
});
test("ordinary poison remains capped at three; venom can stack to six; expired effects reset",()=>{
 for(const branch of ["A","B"]){
  const {g,e}=arena(branch);
  for(let i=0;i<85;i++)g.step();
  assert.equal(e.poisonStacks,branch==="A"?3:6);
  g.state.towers[8].next=g.state.tick+100;
  for(let i=0;i<60;i++)g.step();
  assert.equal(e.poisonStacks,0);
 }
});
