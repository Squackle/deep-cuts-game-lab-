import test from "node:test";
import assert from "node:assert/strict";
import {checkRoute,run,routes,summarize} from "../scripts/lab-live-health.mjs";
const html=(title,links="")=>new Response("<title>"+title+"</title>"+links,{headers:{"content-type":"text/html; charset=utf-8"}});
test("200 fallback with incorrect page title fails",async()=>{
 for(const title of ["Game Lab | Deep Cuts EDH","Unavailable — Game Lab | Hive Run"]){
  const r=await checkRoute("/hive-run/","Game Lab | Hive Run",async()=>html(title));
  assert.equal(r.ok,false);
  assert.equal(r.reason,"unexpected page title");
  assert.equal(r.retryable,undefined);
 }
});
test("redirect, outage, and incorrect content type fail",async()=>{
 for(const f of [async()=>new Response(null,{status:302,headers:{location:"https://other.example"}}),async()=>new Response(null,{status:503}),async()=>new Response("Game Lab | Hive Run"),async()=>{throw Error("offline");}]){
  assert.equal((await checkRoute("/hive-run/","Game Lab | Hive Run",f)).ok,false);
 }
});
test("catalog missing a game link fails",async()=>{
 assert.equal((await checkRoute("/","Game Lab | Deep Cuts EDH",async()=>html("Game Lab | Deep Cuts EDH"))).ok,false);
});
test("all canonical routes pass and request only the Lab static pages",async()=>{
 const links=routes.slice(2).map(([p])=>'<a href="'+p+'">Play</a>').join("");
 const called=[];
 const results=await run(async(url,options)=>{
  const parsed=new URL(url);called.push(parsed.pathname);
  assert.equal(parsed.origin,"https://deep-cuts-game-lab.pages.dev");
  assert.equal(options.redirect,"manual");
  return html(routes.find(([p])=>p===parsed.pathname)[1],links);
 });
 assert.deepEqual(called,routes.map(([p])=>p));
 assert.ok(results.every(x=>x.ok));
});

test("transient failures retry once, recovered routes are visible, persistent failures stay red",async()=>{
 const links=routes.slice(2).map(([p])=>'<a href="'+p+'">Play</a>').join("");
 const attempts=new Map();let waits=0;
 const results=await run(async url=>{
  const path=new URL(url).pathname,n=(attempts.get(path)||0)+1;attempts.set(path,n);
  if(path==="/hive-run/"&&n===1)throw Error("network");
  if(path==="/mana-heist/")return new Response(null,{status:503});
  if(path==="/stackbreaker/")return html("Wrong title");
  return html(routes.find(([p])=>p===path)[1],links);
 },async()=>{waits++});
 assert.equal(waits,2);
 assert.equal(attempts.get("/hive-run/"),2);
 assert.equal(attempts.get("/mana-heist/"),2);
 assert.equal(attempts.get("/stackbreaker/"),1);
 assert.equal(results.find(x=>x.path==="/hive-run/").recovered,true);
 assert.equal(results.find(x=>x.path==="/mana-heist/").ok,false);
 assert.equal(results.find(x=>x.path==="/stackbreaker/").ok,false);
 assert.match(summarize(results),/4 first-attempt healthy; 1 transient recovered; 2 failed/);
 assert.match(summarize(results),/RECOVERED \/hive-run\//);
 assert.match(summarize(results),/FAIL \/mana-heist\//);
});
