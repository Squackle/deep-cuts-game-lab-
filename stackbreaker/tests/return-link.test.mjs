import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("all Stackbreaker builds return to shared Game Test Lab",()=>{
 const template=fs.readFileSync("stackbreaker/template.html","utf8");
 const bundle=fs.readFileSync("stackbreaker/index.html","utf8");
 const css=fs.readFileSync("stackbreaker/styles.css","utf8");
 for(const html of [template,bundle]){
  assert.match(html,/class="site-home" href="\/lab\/"/);
  assert.match(html,/class="site-mark" href="\/lab\/"/);
  assert.match(html,/Back to Test Lab, choose another game/);
 }
 assert.match(css,/@media\(max-width:500px\)[\s\S]*?\.mast \.site-home\{display:inline-flex/);
 assert.match(bundle,/\.mast \.site-home\{display:inline-flex/);
 assert.match(css,/min-height:32px/);
});
