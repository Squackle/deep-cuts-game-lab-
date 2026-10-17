import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
test("Mana Heist loads the Lab-only badge and retains the local gameplay module",()=>{
 const html=fs.readFileSync("mana-heist/index.html","utf8");
 assert.match(html,/src="\/lab\/presence\.js"/);
 assert.match(html,/href="\/lab\/presence\.css"/);
 assert.match(html,/src="\.\/src\/main\.js"/);
});
