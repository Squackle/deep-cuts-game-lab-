import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LEVELS,BASE_LEVELS,CHAPTERS,GALAXIES} from "../src/levels.js";
import {validate} from "../src/engine.js";
import {solve,replay} from "../src/solver.js";
import {galaxyAccessible,chapterAccessible,highestUnlocked,stageCode} from "../src/campaign.js";

test("5 galaxies × 5 worlds × 10 stages = 250 valid, uniquely identified puzzles",()=>{
 assert.equal(GALAXIES.length,5);
 assert.equal(CHAPTERS.length,25);
 assert.equal(LEVELS.length,250);
 assert.equal(new Set(LEVELS.map(l=>l.id)).size,250);
 for(let g=0;g<5;g++){
  assert.deepEqual(GALAXIES[g].range,[g*50,g*50+49]);
  assert.equal(CHAPTERS.slice(g*5,g*5+5).length,5);
  for(let w=0;w<5;w++){
   const ch=CHAPTERS[g*5+w];
   assert.deepEqual(ch.range,[g*50+w*10,g*50+w*10+9]);
   assert.equal(LEVELS.slice(...[ch.range[0],ch.range[1]+1]).length,10);
  }
 }
 assert.equal(stageCode(0),"1:1:1");
 assert.equal(stageCode(49),"1:5:10");
 assert.equal(stageCode(50),"2:1:1");
 assert.equal(stageCode(249),"5:5:10");
});
test("all 232 new puzzles replay a proven legal solution from their source archetype", {timeout:110000},()=>{
 const proofs=new Map(BASE_LEVELS.map(root=>{
  const proof=solve(root,{maxStates:200000});
  assert.equal(proof.status,"solved",root.id);
  return [root.id,proof];
 }));
 for(const level of LEVELS){
  assert.equal(validate(level),true,level.id);
  if(!level.templateId)continue;
  const certified=proofs.get(level.templateId);
  assert.ok(certified,level.id);
  const attempt=replay(level,certified.actions);
  assert.equal(attempt.ok,true,level.id+" preserved-route replay");
  assert.ok(attempt.state.turn<=level.turnLimit,level.id);
  assert.ok(attempt.state.life>0,level.id);
 }
});
test("generated puzzle boards include meaningful card variants and distractors",()=>{
 const generated=LEVELS.slice(BASE_LEVELS.length);
 const mechanics=new Set(generated.map(l=>JSON.stringify({
  field:l.field.map(c=>c.card),hand:l.hand.map(c=>c.card),library:l.library.map(c=>c.card),cost:l.stages.map(s=>s.cost)
 })));
 assert.ok(mechanics.size>=75,"not enough distinct puzzle configurations: "+mechanics.size);
 assert.ok(generated.some(l=>l.hand.some(c=>c.id==="bonus1")));
 assert.ok(generated.some(l=>l.hand.some(c=>c.id==="bonus2")));
});
test("historic initial 18 save keys and chapter progress remain compatible",()=>{
 assert.deepEqual(LEVELS.slice(0,18).map(x=>x.id),BASE_LEVELS.map(x=>x.id));
 const wins=Object.fromEntries(BASE_LEVELS.map(x=>[x.id,{turn:2,spentLife:0}]));
 assert.equal(highestUnlocked(wins),18);
 assert.equal(chapterAccessible(2,wins),false);
 assert.equal(galaxyAccessible(1,wins),false);
});
test("game only solves the active puzzle lazily instead of all 250 on startup",()=>{
 const js=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 assert.match(js,/function proofFor\(id\)/);
 assert.doesNotMatch(js,/for\(const puzzle of LEVELS\)\{\s*const proof=solve/);
 assert.match(js,/const proofs=\{get:proofFor\}/);
});
