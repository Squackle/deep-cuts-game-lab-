import test from "node:test";
import assert from "node:assert/strict";
import {checkRoute,run,routes} from "../scripts/lab-live-health.mjs";
const html=(title,links="")=>new Response("<title>"+title+"</title>"+links,{headers:{"content-type":"text/html; charset=utf-8"}});
test("200 fallback with incorrect page title fails",async()=>{
 const r=await checkRoute("/hive-run/","Game Lab | Hive Run",async()=>html("Game Lab | Deep Cuts EDH"));
 assert.equal(r.ok,false);
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
