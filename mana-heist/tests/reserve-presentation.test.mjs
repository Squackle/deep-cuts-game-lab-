import test from "node:test";
import assert from "node:assert/strict";
import {reservePresentation} from "../src/reserve-presentation.js";
const level={library:[{id:"a",card:"island"},{id:"b",card:"island"},{id:"c",card:"mountain"}]};
test("legacy reserve stays labeled as a scenario abstraction",()=>{
 const p=reservePresentation(level,{});
 assert.equal(p.physical,false);assert.equal(p.cards.length,3);assert.match(p.label,/legacy/);
});
test("physical reserve retains distinct copies and reflects undo/reset snapshots",()=>{
 const before={libraryAvailable:["a","b","c"]},after={libraryAvailable:["b","c"]};
 assert.deepEqual(reservePresentation(level,after).cards.map(c=>c.id),["b","c"]);
 assert.equal(reservePresentation(level,{libraryAvailable:[]}).visible,true);
 assert.deepEqual(reservePresentation(level,{libraryAvailable:[]}).cards,[]);
 assert.equal(reservePresentation(level,before).cards.length,3);
 assert.equal(reservePresentation({library:[]},{libraryAvailable:[]}).visible,false);
});
