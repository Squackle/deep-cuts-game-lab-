import test from "node:test";
import assert from "node:assert/strict";
import {LEVELS,CHAPTERS,GALAXIES} from "../src/levels.js";
import {validate} from "../src/engine.js";
import {certifyMastery} from "../src/mastery-certificates.js";
import {certifyDiverse} from "../src/mana-variety-certificates.js";
import {replay} from "../src/solver.js";
test("all ten galaxies contain exactly 500 unique vaults",()=>{
 assert.equal(GALAXIES.length,10);assert.equal(CHAPTERS.length,50);assert.equal(LEVELS.length,500);
 assert.equal(new Set(LEVELS.map(x=>x.id)).size,500);
 assert.equal(LEVELS[249].title,"The Impossible Mana Equation: GRAND FINALE");
 assert.match(LEVELS[499].title,/FINAL MANA HEIST/);
});
test("250 new expert puzzles have verified solutions and increasingly linked turns", {timeout:95000},()=>{
 for(let i=250;i<500;i++){
  const p=LEVELS[i];assert.equal(validate(p),true,p.id);
  const proof=p.revision===3?certifyDiverse(p):certifyMastery(p);assert.equal(proof.status,"solved",p.id);
  assert.equal(replay(p,proof.actions).ok,true,p.id);
  assert.ok(proof.actions.some(a=>a.type==="ritual"),p.id);
  assert.ok(proof.actions.some(a=>a.type==="activate"||a.type==="tap"),p.id);
  assert.equal(proof.turn,p.turnLimit,p.id);
 }
 assert.equal(LEVELS[499].stages.length,6);
 assert.equal(LEVELS[499].turnLimit,3);
});
