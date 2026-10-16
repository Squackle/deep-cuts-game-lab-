import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {referenceFor} from "../src/card-references.js";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const main=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
const inspector=readFileSync(new URL("../src/card-inspector.js",import.meta.url),"utf8");
const drag=readFileSync(new URL("../src/drag-lands.js",import.meta.url),"utf8");
test("real Magic cards are playable images and have a full-size inspector",()=>{
 assert.match(html,/id="realCardInspector"/);
 assert.match(html,/role="dialog" aria-modal="true"/);
 assert.match(html,/id="inspectorImage"/);
 assert.match(html,/id="inspectorLink"/);
 assert.match(html,/id="inspectorGameCard"/);
 assert.match(html,/id="closeInspector"/);
 assert.match(html,/VARIANT ART/);
 assert.doesNotMatch(html,/id="inspectLand"/);
 assert.match(inspector,/referenceFor\(cardKey\)/);
 assert.match(main,/imageFor\(instance.id,key\)/);
 assert.match(main,/class="mtg-card-image"/);
});
test("hand pointer tap selects a card; separate inspection and drag actions remain available",()=>{
 assert.match(drag,/else onInspect\?\.\(id\)/);
 assert.match(main,/onInspect:id=>selectHand\(id\)/);
 assert.match(main,/el\("inspectSelected"\)\.addEventListener/);
 assert.match(main,/inspectById\(selectedHandId\)/);
 assert.match(main,/el\("playSelectedLand"\)\.addEventListener/);
 assert.match(main,/onDrop:id=>playLand\(id\)/);
 assert.match(main,/onDrop:id=>playLand\(id\)/);
 assert.doesNotMatch(main,/inspectLand.*inspect-current-land/);
 assert.match(main,/e\.key\.toLowerCase\(\)!=="i"/);
});
test("references keep a full uncropped Magic card image and source link",()=>{
 for(const id of ["island","mountain","dualUR","shockBR","fetchUR","bounceUG","relic"]){
  const data=referenceFor(id);
  assert.ok(data?.name);
  assert.ok(data?.image.endsWith("format=image&version=normal"));
  assert.ok(data?.page.startsWith("https://scryfall.com/"));
  assert.ok(data.image.startsWith("https://api.scryfall.com/cards/named?"));
 }
 assert.match(inspector,/image\.src=printing\?\.normal\|\|real\.image/);
 assert.match(inspector,/image\.onerror/);
 assert.match(html,/belong to Wizards of the Coast/);
});
