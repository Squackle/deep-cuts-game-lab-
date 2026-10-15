import test from "node:test";
import assert from "node:assert/strict";
import {KEY_DIRECTIONS,keyboardDirection} from "../src/input-controls.js";
test("arrows and all WASD cases route to the same immediate turn",()=>{
 for(const [key,direction] of Object.entries(KEY_DIRECTIONS))
  assert.equal(keyboardDirection(key),direction);
 for(const key of ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d"])
  assert.equal(keyboardDirection(key,true),null,"held key repeats must not buffer unwanted bends");
 assert.equal(keyboardDirection("Escape"),null);
 assert.equal(keyboardDirection("z"),null);
});

test("directional input can never select a mutation, including rapid follow-up turns",async()=>{
 const {MUTATION_SELECTION_KEYS,mutationSelectionIndex}=await import("../src/input-controls.js");
 assert.deepEqual(Object.keys(MUTATION_SELECTION_KEYS).sort(),["1","2","3"]);
 for(const key of Object.keys(KEY_DIRECTIONS)){
  assert.equal(mutationSelectionIndex(key),null,key);
  assert.equal(mutationSelectionIndex(key,true),null,key+" repeated");
 }
 for(const [key,index] of [["1",0],["2",1],["3",2]])assert.equal(mutationSelectionIndex(key),index);
});
