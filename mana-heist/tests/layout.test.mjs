import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
test("the complete playtable precedes separate below-fold reading content",()=>{
 assert.ok(html.indexOf('id="gameScreen"')>0);
 assert.ok(html.indexOf('id="gameNotes"')>html.indexOf('id="gameScreen"'));
 assert.ok(html.indexOf('id="cardGallery"')>html.indexOf('id="gameNotes"'));
 assert.match(css,/\.in-heist #gameScreen\{height:100dvh\}/);
 assert.match(html,/href="#gameNotes"/);
});
test("the always-visible legend is removed, and optional choices use a dialog",()=>{
 assert.doesNotMatch(html,/class="side-box guide"/);
 assert.doesNotMatch(html,/class="legend"/);
 assert.match(html,/id="actionBox" role="dialog" aria-modal="true"/);
 assert.match(html,/id="dismissChoices"/);
});
test("all essential playable controls stay inside the playtable",()=>{
 const a=html.indexOf('id="gameScreen"'),b=html.indexOf('id="gameNotes"');
 const game=html.slice(a,b);
 for(const id of ["vaultName","wardCost","autoCastStatus","battlefield","hand","endTurn","undo","reset","returnMap"]){
  assert.match(game,new RegExp('id="'+id+'"'),id);
 }
});
