import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("Mana Heist gets the concise Game Lab title and shared first-party beaker",()=>{
 const html=fs.readFileSync("mana-heist/index.html","utf8");
 assert.match(html,/<title>Game Lab \| Mana Heist<\/title>/);
 assert.match(html,/<link rel="icon" type="image\/svg\+xml" href="\/lab\/favicon.svg">/);
 assert.ok(fs.existsSync("lab/favicon.svg"));
 assert.match(html,/src="\.\/src\/main.js"/);
});
