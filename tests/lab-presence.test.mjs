import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {onRequestGet,onRequestPost} from "../functions/api/lab-presence.js";
const HOST="https://deep-cuts-game-lab.pages.dev/api/lab-presence";
const sid="11111111-1111-4111-8111-111111111111";
const other="22222222-2222-4222-8222-222222222222";
function mockKV(){
 const map=new Map(),puts=[];
 return {map,puts,async put(key,value,opts){map.set(key,{value,opts});puts.push({key,value,opts})},
  async list(){return {keys:[...map].map(([name,record])=>({name,metadata:record.opts.metadata})),list_complete:true}}
 };
}
async function post(env,session,page,origin="https://deep-cuts-game-lab.pages.dev"){
 return onRequestPost({env,request:new Request(HOST,{method:"POST",headers:{"Content-Type":"application/json","Origin":origin},body:JSON.stringify({session,page})})});
}
test("Lab counters count one random browser identifier once across multiple game tabs",async()=>{
 const env={LAB_PRESENCE:mockKV()};
 assert.equal((await post(env,sid,"Game Lab")).status,200);
 assert.equal((await post(env,sid,"Hive Run")).status,200);
 assert.equal((await post(env,other,"Mana Heist")).status,200);
 const response=await onRequestGet({env});
 const data=await response.json();
 assert.equal(data.labOnly,true);
 assert.equal(data.online,2,"Multiple tabs in the same browser count as one");
 assert.deepEqual(data.pages,{"Hive Run":1,"Mana Heist":1});
 assert.equal(data.registeredMembers,null,"Lab does not fabricate account totals");
 assert.equal(data.approximate,true);
 assert.equal(data.truncated,false);
 assert.equal(env.LAB_PRESENCE.puts[0].opts.expirationTtl,180);
});
test("Lab rejects invalid IDs, arbitrary pages and cross-origin writes",async()=>{
 const env={LAB_PRESENCE:mockKV()};
 for(const [session,page,origin,status] of [
  ["fake","Game Lab","https://deep-cuts-game-lab.pages.dev",400],
  [sid,"Main Deep Cuts EDH","https://deep-cuts-game-lab.pages.dev",400],
  [sid,"Game Lab","https://bad.example",403]
 ]){
  const response=await post(env,session,page,origin);
  assert.equal(response.status,status);
 }
 assert.equal(env.LAB_PRESENCE.puts.length,0);
});
test("Missing Lab KV binding fails transparently without fake live counts",async()=>{
 const response=await onRequestGet({env:{}});
 assert.equal(response.status,503);
 assert.match((await response.json()).error,/not configured/);
});
test("Game counters heartbeat even when backgrounded; no activity or sign-in gating",()=>{
 const script=fs.readFileSync("lab/presence.js","utf8");
 assert.match(script,/window\.setInterval\(pulse,INTERVAL\)/);
 assert.match(script,/const INTERVAL=30000/);
 assert.doesNotMatch(script,/if\(document\.hidden\)return\s+touch|requiresLogin|currentUser/);
 assert.match(script,/localStorage\.getItem\(KEY\)/);
 assert.match(script,/addEventListener\("focus"/);
 const preview=fs.readFileSync("lab/command-center.html","utf8");
 assert.match(preview,/most recently focused Lab page/);
});
