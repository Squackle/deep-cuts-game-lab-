import test from "node:test";import assert from "node:assert/strict";import{readFileSync}from"node:fs";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const js=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
test("solo sidebar contains only authentic patch notes",()=>{
 const right=html.split('<aside class="mission mission--patch-notes"')[1].split("</aside>")[0];
 assert.match(right,/PATCH/);
 assert.doesNotMatch(right,/mission-row|leaderboard-panel|solo-panel|mutation-guide|release-note|mode-detail/);
 assert.match(html,/id="fieldGuide"/);
});
test("touch arrows removed, real swipe and keyboard steering retained",()=>{
 assert.doesNotMatch(html,/class="touch-pad"|data-direction=/);
 assert.doesNotMatch(js,/querySelectorAll\("\[data-direction\]"/);
 assert.match(js,/function swipeDirection/);assert.match(js,/KEY_DIRECTIONS/);
});
test("diagnostic internals remain hidden unless explicitly requested",()=>{
 assert.match(html,/id="devDiagnostics" class="dev-diagnostics" hidden/);
 for(const id of ["evoCountdown","evoCount","mutationInventory","killCount","enemyCount","stateLabel"])
 assert.match(html,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(js,/get\("debug"\)==="1"/);assert.match(css,/\.dev-diagnostics\[hidden\]/);
});
test("unwanted page copy removed",()=>{
 assert.doesNotMatch(html,/Original pixel-art creature inspired by classic hive-serpent fantasy|ORIGINAL PIXEL-ART ARCADE · FREE TO PLAY|CHOOSE YOUR PATH \/ CHASE YOUR RECORD/);
});
