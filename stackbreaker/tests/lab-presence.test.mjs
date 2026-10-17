import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("Stackbreaker and Final Turn pages load Lab presence without changing gameplay",()=>{
 for(const file of ["stackbreaker/index.html","stackbreaker/template.html","stackbreaker/final-turn/index.html"]){
  const html=fs.readFileSync(file,"utf8");
  assert.match(html,/src="\/lab\/presence\.js"/);
  assert.match(html,/href="\/lab\/presence\.css"/);
  assert.equal((html.match(/src="\/lab\/presence\.js"/g)||[]).length,1);
 }
 const final=fs.readFileSync("stackbreaker/final-turn/index.html","utf8");
 assert.match(final,/src="\.\/app\.js"/);
});
