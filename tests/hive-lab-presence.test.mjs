import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("Hive Run shows the Lab-only presence badge without altering game engine",()=>{
 const html=fs.readFileSync("index.html","utf8");
 assert.match(html,/src="\/lab\/presence\.js"/);
 assert.match(html,/href="\/lab\/presence\.css"/);
 assert.match(html,/src="\.\/src\/main\.js"/);
 assert.match(html,/id="gameCanvas"/);
});
