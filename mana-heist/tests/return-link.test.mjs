import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("Mana Heist links to shared Lab from header and footer",()=>{
 const html=fs.readFileSync("mana-heist/index.html","utf8");
 const css=fs.readFileSync("mana-heist/styles.css","utf8");
 assert.match(html,/class="brand" href="\/lab\/"/);
 assert.match(html,/class="back lab-home-link"/);
 assert.match(html,/Back to Test Lab, choose another game/);
 assert.match(html,/href="\/lab\/" aria-label="Back to all three games/);
 assert.doesNotMatch(html,/← HIVE RUN LAB/);
 assert.match(css,/\.bar \.lab-home-link\{display:inline-flex/);
 assert.match(css,/min-height:40px/);
});
