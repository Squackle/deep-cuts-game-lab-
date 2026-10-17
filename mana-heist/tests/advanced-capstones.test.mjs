import test from "node:test";
import assert from "node:assert/strict";
import {LEVELS,BASE_LEVELS} from "../src/levels.js";
import {capstoneFor} from "../src/advanced-capstones.js";
import {solve,replay} from "../src/solver.js";
import {validate,VERSION,actions,initial} from "../src/engine.js";

test("fifteen later-world capstones have substantial mana dependency boards",()=>{
 const special=LEVELS.filter(x=>x.revision===1);
 assert.equal(special.length,15);
 assert.equal(LEVELS.length,250);
 assert.equal(LEVELS.filter(l=>l.templateId).length,217);
 assert.equal(LEVELS.filter(l=>l.curated==="capstone-1.0").length,15);
 for(const l of special){
  assert.equal(validate(l),true,l.id);
  assert.equal(l.turnLimit,1);
  assert.ok(l.field.length>=8,l.id);
  assert.ok(l.hand.some(x=>x.card==="ritual"),l.id);
  assert.ok(l.field.some(x=>x.card==="solring"),l.id);
  assert.ok(l.field.some(x=>x.card==="signet"),l.id);
 }
 const last=LEVELS[249];
 assert.equal(last.field.length,12);
 assert.equal(last.title,"The Impossible Mana Equation: GRAND FINALE");
 assert.ok(last.field.some(x=>x.card==="bluffs"));
 assert.ok(last.stages[0].cost.B>=4&&last.stages[0].cost.U>=4);
 assert.equal(last.stages[0].cost.N,2);
 assert.deepEqual(LEVELS.slice(0,18).map(x=>x.id),BASE_LEVELS.map(x=>x.id));
});
test("every revised world capstone is solved and replayed under the current rules", {timeout:110000},()=>{
 const specials=LEVELS.filter(x=>x.revision===1);
 for(const puzzle of specials){
  const result=solve(puzzle,{maxStates:200000});
  assert.equal(result.status,"solved",puzzle.id+": "+JSON.stringify(result));
  assert.ok(replay(puzzle,result.actions).ok,puzzle.id);
  assert.ok(result.actions.some(x=>x.type==="activate"),puzzle.id);
  assert.ok(result.actions.some(x=>x.type==="ritual"),puzzle.id);
  console.log(puzzle.id,"source count",puzzle.field.length,"steps",result.steps,"states",result.explored);
 }
});
