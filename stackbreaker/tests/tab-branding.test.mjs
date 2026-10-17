import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("Stackbreaker classic source and built HTML agree on the Lab tab",()=>{
 const template=fs.readFileSync("stackbreaker/template.html","utf8");
 const standalone=fs.readFileSync("stackbreaker/index.html","utf8");
 for(const source of [template,standalone]){
  assert.match(source,/<title>Game Lab \| Stackbreaker<\/title>/);
  assert.match(source,/<link rel="icon" type="image\/svg\+xml" href="\/lab\/favicon.svg">/);
 }
 assert.ok(fs.existsSync("lab/favicon.svg"));
});
test("Final Turn retains its separate route with matching Lab beaker",()=>{
 const html=fs.readFileSync("stackbreaker/final-turn/index.html","utf8");
 assert.match(html,/<title>Game Lab \| Stackbreaker: Final Turn<\/title>/);
 assert.match(html,/<link rel="icon" type="image\/svg\+xml" href="\/lab\/favicon.svg">/);
 assert.match(html,/src="\.\/app.js"/);
});
