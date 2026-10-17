import test from "node:test";
import assert from "node:assert/strict";
import {LEVELS,BASE_LEVELS} from "../src/levels.js";
import {capstoneFor} from "../src/advanced-capstones.js";
import {replay} from "../src/solver.js";
import {certifyCapstone} from "../src/capstone-certificates.js";
import {validate,VERSION,actions,initial} from "../src/engine.js";

test("thirty late-world engine and ritual challenge boards have substantial mana dependency boards",()=>{
 const special=LEVELS.filter(x=>x.revision===1);
 assert.equal(special.length,30);
 assert.equal(LEVELS.length,250);
 assert.equal(LEVELS.filter(l=>l.templateId).length,202);
 assert.equal(LEVELS.filter(l=>l.curated==="capstone-1.0").length,15);
 assert.equal(LEVELS.filter(l=>l.curated==="coffers-1.0").length,15);
 for(const l of special){
  assert.equal(validate(l),true,l.id);
  assert.equal(l.turnLimit,1);
  assert.ok(l.field.length>=8,l.id);
  assert.ok(l.field.some(x=>x.card==="solring"),l.id);
  if(l.curated==="capstone-1.0"){
   assert.ok(l.hand.some(x=>x.card==="ritual"),l.id);
   assert.ok(l.field.some(x=>x.card==="signet"),l.id);
  }else{
   assert.ok(l.field.some(x=>x.card==="coffers"),l.id);
   assert.ok(l.field.some(x=>x.card==="urborg"),l.id);
   if(l.galaxy>=3)assert.ok(l.field.some(x=>x.card==="nykthos"),l.id);
  }
 }
 const last=LEVELS[249];
 assert.equal(last.field.length,12);
 assert.equal(last.title,"The Impossible Mana Equation: GRAND FINALE");
 assert.ok(last.field.some(x=>x.card==="bluffs"));
 assert.ok(last.stages[0].cost.B>=4&&last.stages[0].cost.U>=4);
 assert.equal(last.stages[0].cost.N,2);
 assert.deepEqual(LEVELS.slice(0,18).map(x=>x.id),BASE_LEVELS.map(x=>x.id));
});
test("every revised world capstone has a verified complete legal route and unique source identity",()=>{
 const specials=LEVELS.filter(x=>x.revision===1);
 for(const puzzle of specials){
  const result=certifyCapstone(puzzle);
  assert.equal(result.status,"solved",puzzle.id);
  assert.ok(replay(puzzle,result.actions).ok,puzzle.id);
  assert.ok(result.actions.some(x=>x.type==="activate"),puzzle.id);
  if(puzzle.curated==="capstone-1.0")assert.ok(result.actions.some(x=>x.type==="ritual"),puzzle.id);
  else assert.ok(result.actions.some(x=>x.type==="activate"&&x.mode==="coffers"),puzzle.id);
  assert.ok(result.steps>=7,puzzle.id+" should demand multiple dependent moves");
  assert.match(result.certification,/optimum not independently proven/);
 }
});
