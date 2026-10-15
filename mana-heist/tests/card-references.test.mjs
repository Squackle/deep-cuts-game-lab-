import test from "node:test";
import assert from "node:assert/strict";
import {LEVELS} from "../src/levels.js";
import {referenceFor,referenceCards} from "../src/card-references.js";
test("real card reference names are correct by land category",()=>{
 assert.equal(referenceFor("island").name,"Island");
 assert.equal(referenceFor("shockUR").name,"Steam Vents");
 assert.equal(referenceFor("dualUR").name,"Volcanic Island");
 assert.equal(referenceFor("painUB").name,"Underground River");
 assert.equal(referenceFor("fetchBG").name,"Verdant Catacombs");
 assert.equal(referenceFor("bounceUG").name,"Simic Growth Chamber");
 assert.equal(referenceFor("relic").name,"Wastes");
});
test("reference images are full-card Scryfall images, never art crops or game elements",()=>{
 for (const level of LEVELS){
  const refs=referenceCards(level);
  assert.ok(refs.length>0,level.id);
  for(const c of refs){
   assert.match(c.image,/^https:\/\/api\.scryfall\.com\/cards\/named\?/);
   assert.match(c.image,/&format=image&version=normal$/);
   assert.match(c.page,/^https:\/\/scryfall\.com\/search\?/);
   assert.ok(!c.image.includes("art_crop"));
  }
 }
});
test("unknown cards do not create remote requests and repeated lands appear once",()=>{
 assert.equal(referenceFor("random-rubbish"),null);
 const l={field:[{id:"a",card:"island"}],hand:[{id:"b",card:"island"}],library:[{id:"c",card:"mountain"}]};
 assert.deepEqual(referenceCards(l).map(c=>c.name),["Island","Mountain"]);
});
