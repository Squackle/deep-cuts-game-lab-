import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
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
 assert.match(script,/INTERVAL=30000/);
 assert.doesNotMatch(script,/if\(document\.hidden\)return\s+touch|requiresLogin|currentUser/);
 assert.match(script,/localStorage\.getItem\(KEY\)/);
 assert.match(script,/addEventListener\("focus"/);
 assert.equal(fs.existsSync("lab/command-center.html"),false,"Lab Command Center preview removed");
});

test("streamed body limit applies even when Content-Length is missing or dishonest",async()=>{
 const env={LAB_PRESENCE:mockKV()};
 for(const headers of [{},{"Content-Length":"12"},{"Content-Length":"5000"}]){
  const body=JSON.stringify({session:sid,page:"Game Lab",padding:"x".repeat(4096)});
  const req=new Request(HOST,{method:"POST",headers:{"Content-Type":"application/json",Origin:new URL(HOST).origin,...headers},body});
  assert.equal((await onRequestPost({env,request:req})).status,413);
 }
 assert.equal(env.LAB_PRESENCE.puts.length,0);
});
test("newer game labels are accepted without requiring any game entry edits",async()=>{
 const env={LAB_PRESENCE:mockKV()};
 assert.equal((await post(env,sid,"GRAFTBOUND")).status,200);
 assert.equal((await post(env,other,"ARCHEMANCY")).status,200);
 assert.deepEqual((await (await onRequestGet({env})).json()).pages,{GRAFTBOUND:1,ARCHEMANCY:1});
});
const script=fs.readFileSync("lab/presence.js","utf8");
function harness(path,{storage=new Map(),clock={now:100000},hidden=false,failPost=false,failGet=false}={}){
 const requests=[],listeners={},timers=[],pill={},document={
  visibilityState:hidden?"hidden":"visible",hidden,
  createElement:()=>pill,body:{append(){}},addEventListener:(name,fn)=>{listeners[name]=fn}
 };
 pill.setAttribute=()=>{};
 const window={addEventListener:(name,fn)=>{listeners[name]=fn},setInterval:(fn,ms)=>timers.push({fn,ms}),dispatchEvent(){}};
 const context={location:{pathname:path},document,window,Date:{now:()=>clock.now},Event:class {},
  AbortSignal,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  crypto:{randomUUID:()=>sid},fetch:async(url,opts)=>{
   requests.push({method:opts.method||"GET",body:opts.body?JSON.parse(opts.body):null});
   return {ok:opts.method==="POST"?!failPost:!failGet,json:async()=>({online:2})};
  }};
 vm.runInNewContext(script,context);
 return {requests,listeners,timers,pill,clock,storage};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test("route classifier attributes both catalogs and all five games without mislabeling unknown routes",async()=>{
 for(const [path,page] of [["/","Game Lab"],["/lab","Game Lab"],["/lab/","Game Lab"],["/hive-run/","Hive Run"],["/stackbreaker/final-turn/","Stackbreaker: Final Turn"],["/stackbreaker/","Stackbreaker"],["/mana-heist/","Mana Heist"],["/graftbound/","GRAFTBOUND"],["/archemancy/","ARCHEMANCY"],["/archamancy/","ARCHEMANCY"],["/unknown","Game Lab"]]){
  const h=harness(path);await settle();
  assert.equal(h.requests.find(r=>r.method==="POST").body.page,page,path);
 }
});
test("focus, pageshow, online and timer coalesce; tabs share successful leases and count cache",async()=>{
 const storage=new Map(),clock={now:100000};
 const a=harness("/",{storage,clock});await settle();
 assert.equal(a.requests.length,2);
 a.listeners.focus();a.listeners.pageshow();a.listeners.online();a.timers[0].fn();await settle();
 assert.equal(a.requests.length,2);
 const b=harness("/lab/",{storage,clock});await settle();
 assert.equal(b.requests.length,0);
 assert.match(b.pill.textContent,/2 ONLINE/);
 const c=harness("/mana-heist/",{storage,clock});await settle();
 assert.equal(c.requests.length,1,"foreground page change writes once but reuses count");
 assert.equal(c.requests[0].body.page,"Mana Heist");
 clock.now+=30001;
 a.timers[0].fn();await settle();
 assert.equal(a.requests.length,4);
 assert.equal(a.requests[2].body.page,"Mana Heist","background pulse preserves latest foreground page");
});
test("failed writes and reads are not cached; hidden browsers retain normal heartbeat",async()=>{
 const h=harness("/hive-run/",{hidden:true,failPost:true,failGet:true});await settle();
 assert.equal(h.requests.length,2);
 assert.equal(h.timers[0].ms,30000);
 assert.match(h.pill.textContent,/— ONLINE/);
 h.timers[0].fn();await settle();
 assert.equal(h.requests.length,4);
});
