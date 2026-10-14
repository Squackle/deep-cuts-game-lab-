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
