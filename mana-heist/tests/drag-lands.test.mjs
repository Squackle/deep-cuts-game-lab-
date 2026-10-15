import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {withinDropZone,distance,installLandDragging} from "../src/drag-lands.js";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const js=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
test("drop geometry accepts all edges but never outside the battlefield rectangle",()=>{
 const box={left:20,top:50,right:220,bottom:160};
 assert.equal(withinDropZone(20,50,box),true);
 assert.equal(withinDropZone(220,160,box),true);
 assert.equal(withinDropZone(110,98,box),true);
 for(const [x,y] of [[19,60],[221,60],[100,49],[100,161],[-1,-1]])assert.equal(withinDropZone(x,y,box),false);
 assert.equal(withinDropZone(90,60,null),false);
 assert.equal(withinDropZone(NaN,100,box),false);
});
test("movement threshold ignores tiny taps but recognizes intentional drag",()=>{
 assert.equal(distance(10,20,10,20),0);
 assert.equal(distance(13,24,10,20),5);
 assert.ok(distance(30,20,10,20)>7);
});
test("game controls come after mana ledger within sidebar, not below hand",()=>{
 const pool=html.indexOf('id="pool"'),controls=html.indexOf('class="controlbar"'),actionBox=html.indexOf('id="actionBox"');
 assert.ok(pool>=0&&controls>pool&&actionBox>controls);
 const sidebar=html.indexOf('<aside class="side">');
 assert.ok(controls>sidebar);
 assert.equal((html.match(/class="controlbar"/g)||[]).length,1);
 for(const id of ["endTurn","undo","reset","skip"])assert.match(html,new RegExp('id="'+id+'"'));
});
test("pointer events provide mouse and touch drop; hand-click no longer plays land",()=>{
 assert.match(js,/installLandDragging\(/);
 assert.match(js,/onDrop:id=>playLand\(id\)/);
 assert.doesNotMatch(js,/else playLand\(b\.dataset\.cardid\)/);
 assert.match(html,/id="battlefield"[^>]*tabindex="0"/);
 assert.match(css,/touch-action:none/);
 assert.match(css,/drop-target/);
 assert.match(css,/grid-row:5/);
});
test("drag module rejects missing mandatory elements",()=>{
 assert.throws(()=>installLandDragging({hand:null,battlefield:null,onDrop:()=>{}}));
});
