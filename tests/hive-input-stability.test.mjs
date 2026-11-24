import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const main=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../hive-run/index.html",import.meta.url),"utf8");
test("swipe lifecycle clears on cancellation and lost pointer capture",()=>{
 assert.ok(main.includes('canvas.addEventListener("pointercancel",clearSwipePointer)'));
 assert.ok(main.includes('canvas.addEventListener("lostpointercapture",clearSwipePointer)'));
 assert.ok(main.includes('bossGate.blocking||state.pointer||event.isPrimary===false||event.button!==0'));
});
test("mutation draft retains keyboard focus and browser shortcuts are ignored",()=>{
 assert.ok(main.includes('event.ctrlKey||event.metaKey||event.altKey||event.isComposing'));
 assert.ok(main.includes('const cards=Array.from($("mutationChoices").querySelectorAll("button"))'));
 assert.ok(main.includes('cards[next].focus({preventScroll:true})'));
});
test("entry release badge and game count match Dominion and the current catalog",()=>{
 assert.match(html,/2\.0 · DOMINION/);
 assert.match(html,/FIVE GAMES · ONE TEST LAB/);
});

test("focus-loss paths discard swipes even during a frozen mutation-resume gate",()=>{
 assert.match(main,/visibilitychange",\(\)=>\{\s*if\(document\.hidden\)\{\s*state\.pointer=null/);
 for(const event of ["pagehide","blur"])
  assert.ok(main.includes('window.addEventListener("'+event+'",()=>{\n state.pointer=null;'));
});
