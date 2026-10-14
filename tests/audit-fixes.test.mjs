import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {onRequestGet,onRequestPost} from "../functions/api/leaderboard.js";
const main=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
test("solo lab no longer references deleted alias/profile input",()=>{
 assert.doesNotMatch(main,/\$\("playerAlias"\)|hive-last-alias-v1/);
 assert.doesNotMatch(html,/id="playerAlias"|id="playerProfile"/);
});
test("debug stats remain hidden to normal site visitors and query flags",()=>{
 assert.match(html,/id="devDiagnostics" class="dev-diagnostics" hidden/);
 assert.doesNotMatch(main,/searchParams\.get\("debug"\)/);
});
test("public score API cannot read or write to any shared database",async()=>{
 const request={url:"https://deep-cuts-game-lab.pages.dev/api/leaderboard"};
 const env={HIVE_DB:{prepare(){throw Error("DB accessed")}}};
 for(const handler of [onRequestGet,onRequestPost]){
  const response=await handler({request,env});
  assert.equal(response.status,410);
 }
});
