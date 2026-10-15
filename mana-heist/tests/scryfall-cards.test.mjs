import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CARDS} from "../src/engine.js";
import {LEVELS} from "../src/levels.js";
import {referenceFor} from "../src/card-references.js";
import {cardImageUrl,cardNormalUrl,knownCardKeys,knownCardNames} from "../src/scryfall-cards.js";
const js=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
test("all playable lands are real Magic card names and have Scryfall image URLs",()=>{
 assert.equal(knownCardKeys().length,Object.keys(CARDS).length);
 assert.ok(knownCardNames().length>=20);
 for(const key of knownCardKeys()){
  const ref=referenceFor(key);
  assert.equal(CARDS[key].name,ref.name,key);
  assert.match(cardImageUrl(key),/^https:\/\/api\.scryfall\.com\/cards\/named\?exact=/);
  assert.ok(cardImageUrl(key).endsWith("&format=image&version=small"));
  assert.ok(cardNormalUrl(key).endsWith("&format=image&version=normal"));
  assert.ok(!cardImageUrl(key).includes("art_crop"));
 }
 assert.equal(cardImageUrl("not-a-card"),"");
});
test("all campaign stages only use real supported land cards",()=>{
 for(const level of LEVELS){
  for(const c of [...level.field,...level.hand,...level.library]){
   assert.ok(referenceFor(c.card),level.id+" "+c.card);
  }
 }
});
test("playable land renders a complete Magic card scan, not original fantasy art",()=>{
 assert.match(js,/class="mtg-card-image"/);
 assert.match(js,/imageFor\(instance.id,key\)/);
 assert.match(js,/data-card-key/);
 assert.match(css,/object-fit:contain!important/);
 assert.match(css,/filter:none!important/);
 assert.match(css,/\.land-card\.mtg-real-land\.is-tapped/);
 assert.match(js,/installLandDragging\(/);
 assert.match(js,/onDrop:id=>playLand\(id\)/);
});
