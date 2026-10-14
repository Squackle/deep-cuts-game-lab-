import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {onRequestGet,onRequestPost} from "../functions/api/leaderboard.js";
import {createSoloSession} from "../src/solo-session.js";


test("online score GET and POST are disabled before any shared database access",async()=>{
 const touch=()=>{throw Error("Shared DB must not be read or written by the Game Lab")};
 const env={HIVE_DB:{prepare:touch,batch:touch}};
 const request=new Request("https://deep-cuts-game-lab.pages.dev/api/leaderboard");
 const get=await onRequestGet({request,env});
 assert.equal(get.status,410);assert.equal(get.headers.get("Cache-Control"),"no-store");
 assert.match((await get.json()).error,/solo/i);
 for(const action of ["start","submit"]){
  const post=await onRequestPost({env,request:new Request(request.url,{method:"POST",
   headers:{"Content-Type":"application/json"},body:JSON.stringify({action})})});
  assert.equal(post.status,410);assert.match((await post.json()).error,/disabled/i);
 }
});
test("Only random Arcade seeds are supported by offline practice",()=>{
 const prior=globalThis.fetch;
 globalThis.fetch=()=>{throw Error("Solo seed must never make network requests")};
 try{
  const arcade=createSoloSession("hunt","arcade");
  assert.equal(arcade.day,"");assert.equal(arcade.ranked,false);
  assert.ok(Number.isInteger(arcade.seed)&&arcade.seed>0);
  assert.throws(()=>createSoloSession("classic","daily"),/Unknown expedition/);
 }finally{globalThis.fetch=prior}
});
test("standalone UI has no online rank, score submission or profile forms",()=>{
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const js=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 assert.match(html,/id="patchNotesTitle"/);
 assert.doesNotMatch(html,/id="submissionPanel"|id="leaderboardEntries"|id="playerProfile"|id="playerAlias"/);
 assert.doesNotMatch(js,/LeaderboardClient|refreshLeaderboard|leaderboard\.submit|leaderboard\.load|updateSubmission/);
 assert.match(js,/createSoloSession\(selectedMode,"arcade"\)/);
});
