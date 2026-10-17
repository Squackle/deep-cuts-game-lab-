import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("Hive Run tab labels the Game Lab and loads its shared beaker",()=>{
 const html=fs.readFileSync("index.html","utf8");
 assert.match(html,/<title>Game Lab \| Hive Run<\/title>/);
 assert.match(html,/<link rel="icon" type="image\/svg\+xml" href="\/lab\/favicon.svg">/);
 assert.ok(fs.existsSync("lab/favicon.svg"));
 assert.match(html,/src="\.\/src\/main.js"/);
});
