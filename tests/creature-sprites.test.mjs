import test from "node:test";
import assert from "node:assert/strict";
import {WUBRG,variantForSegment,loadCreatureArtData} from "../src/creature-sprites.js";

test("all 45 unique WUBRG body sections appear before repeating",()=>{
 assert.deepEqual(WUBRG,["W","U","B","R","G"]);
 const variants=Array.from({length:45},(_,i)=>variantForSegment(i));
 assert.equal(new Set(variants).size,45);
 assert.deepEqual(variants.slice(0,5),[0,9,18,27,36]);
 assert.equal(variantForSegment(45),0);
});
test("concept-derived art decodes to 45 body sprites plus head and forked tail",async()=>{
 const art=await loadCreatureArtData();
 assert.ok(art,"compressed concept art must decode in Node 22");
 assert.equal(art.body.length,5);
 for(const row of art.body){
  assert.equal(row.tiles.length,9);
  for(const tile of row.tiles)assert.equal(tile.length,400);
 }
 assert.equal(art.parts.tiles.length,2);
 for(const tile of art.parts.tiles)assert.equal(tile.length,1008);
});
