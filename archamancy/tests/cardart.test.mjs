import {test} from "node:test";
import assert from "node:assert/strict";
import {createCardArt} from "../cardart.mjs";
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const card=(name,extra={})=>({ok:true,json:async()=>({name,artist:"Test Artist",scryfall_uri:"https://scryfall.com/card/x",image_uris:{art_crop:"https://cards.scryfall.io/art_crop/front/x.jpg"},...extra})});
const settle=()=>new Promise(r=>setTimeout(r,20));
test("looks up each card once, credits the artist and caches it",async()=>{const calls=[],s=store(),updates=[];const art=createCardArt({storage:s,delay:0,fetchFn:async url=>{calls.push(url);return card("x")},onUpdate:n=>updates.push(n)});
 assert.equal(art.get("Krenko, Mob Boss"),null);assert.equal(art.get("Krenko, Mob Boss"),null);await settle();assert.equal(calls.length,1);assert.match(calls[0],/exact=Krenko%2C%20Mob%20Boss$/);
 const a=art.get("Krenko, Mob Boss");assert.equal(a.artist,"Test Artist");assert.ok(a.art.startsWith("https://cards.scryfall.io/"));assert.deepEqual(updates,["Krenko, Mob Boss"]);
 const again=createCardArt({storage:s,fetchFn:async()=>{throw Error("no network")}});assert.equal(again.get("Krenko, Mob Boss").artist,"Test Artist");});
test("double-faced cards, failures and unexpected hosts leave no art",async()=>{let n=0;const art=createCardArt({delay:0,fetchFn:async url=>(n++,url.includes("Bad")?{ok:false}:url.includes("Evil")?card("e",{image_uris:{art_crop:"https://evil.example/x.jpg"}}):url.includes("Throw")?Promise.reject(Error("x")):card("d",{image_uris:undefined,artist:undefined,card_faces:[{artist:"Face Artist",image_uris:{art_crop:"https://cards.scryfall.io/art_crop/front/d.jpg"}}]}))});
 for(const n of ["Bad","Evil","Throw","Double"])art.get(n);await settle();assert.equal(art.get("Bad"),null);assert.equal(art.get("Evil"),null);assert.equal(art.get("Throw"),null);assert.equal(art.get("Double").artist,"Face Artist");await settle();assert.equal(n,4,"failures are not retried");});
test("works with no fetch and blocked storage",()=>{const art=createCardArt({fetchFn:null,storage:{getItem(){throw Error("blocked")},setItem(){throw Error("blocked")}}});assert.equal(art.get("Sleep"),null);});
// Regression: cached art URLs were only checked for the Scryfall prefix before going into CSS url("..."), so an
// edited cache entry could close the url() early and load an image from another host.
test("cached art that could break out of CSS url() is ignored and looked up again",async()=>{
 const s=store(),good="https://cards.scryfall.io/art_crop/front/6/d/6d.jpg?1562781";
 const bad=['https://cards.scryfall.io/x.jpg"),url("https://evil.example/t.png','https://cards.scryfall.io/x.jpg) ','https://cards.scryfall.io/x\\.jpg',"https://cards.scryfall.io/x'.jpg","https://cards.scryfall.io.evil.example/x.jpg"];
 s.setItem("archemancy.cardart.v1",JSON.stringify({Good:{art:good,artist:"A"},...Object.fromEntries(bad.map((art,i)=>["Bad"+i,{art,artist:"A"}]))}));
 const calls=[];const art=createCardArt({storage:s,delay:0,fetchFn:async url=>{calls.push(url);return {ok:false};}});
 assert.equal(art.get("Good").art,good,"real Scryfall URLs with query strings still work");
 for(let i=0;i<bad.length;i++)assert.equal(art.get("Bad"+i),null,bad[i]);
 await settle();assert.equal(calls.length,bad.length,"each bad entry is fetched fresh instead");
});
test("token art searches Scryfall by token type and exact color",async()=>{const calls=[];const art=createCardArt({delay:0,fetchFn:async url=>{calls.push(url);return {ok:true,json:async()=>({data:[{name:"Soldier",artist:"Token Artist",image_uris:{art_crop:"https://cards.scryfall.io/art_crop/front/s.jpg"}}]})};}});
 assert.equal(art.get("token:Soldier:W"),null);await settle();assert.equal(calls.length,1);assert.match(calls[0],/cards\/search\?q=t%3Atoken%20t%3ASoldier%20c%3DW&order=released&dir=desc$/);assert.equal(art.get("token:Soldier:W").artist,"Token Artist");});
