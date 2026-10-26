import test from "node:test";
import assert from "node:assert/strict";
import {LEVELS} from "../src/levels.js";
import {solve} from "../src/solver.js";
import {boardFingerprint} from "../src/readiness-audit.js";
test("board similarity distinguishes a ward with an untap effect",()=>{
 const plain=structuredClone(LEVELS[0]);plain.stages.push({name:"Second blue",cost:{U:1}});
 const untap=structuredClone(plain);untap.stages[0].effect="untap";
 assert.notEqual(boardFingerprint(plain),boardFingerprint(untap));
 assert.equal(solve(plain).status,"unsolvable");assert.equal(solve(untap).status,"solved");
});
test("board similarity distinguishes creature-only payment eligibility",()=>{
 const plain={...structuredClone(LEVELS[0]),field:[{id:"a",card:"ziggurat"}]};
 const creature=structuredClone(plain);creature.stages[0].spellType="creature";
 assert.notEqual(boardFingerprint(plain),boardFingerprint(creature));
 assert.equal(solve(plain).status,"unsolvable");assert.equal(solve(creature).status,"solved");
});
test("board similarity includes the source-specific charge count",()=>{
 const one={...structuredClone(LEVELS[0]),field:[{id:"a",card:"chalice"}],charges:{a:1},stages:[{name:"Two colorless",cost:{C:2}}]};
 const two={...one,charges:{a:2}};
 assert.notEqual(boardFingerprint(one),boardFingerprint(two));
 assert.equal(solve(one).status,"unsolvable");assert.equal(solve(two).status,"solved");
});
test("equivalent source renaming preserves charges and similarity",()=>{
 const one={...structuredClone(LEVELS[0]),field:[{id:"a",card:"chalice"}],charges:{a:2}};
 const renamed={...one,field:[{id:"renamed",card:"chalice"}],charges:{renamed:2},title:"New title"};
 assert.equal(boardFingerprint(one),boardFingerprint(renamed));
});
