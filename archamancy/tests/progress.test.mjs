import {test} from "node:test";
import assert from "node:assert/strict";
import * as progress from "../progress.mjs";
import {createEngine} from "../engine.mjs";
const all=Object.keys(createEngine(1).commanders);
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const run=(wave,more={})=>({wave,mode:"campaign",fallen:0,returns:0,sacrifices:0,won:false,colors:[],...more});

test("every commander is a starter or has exactly one unlock rule",()=>{for(const id of progress.STARTERS)assert.ok(all.includes(id));const ids=progress.UNLOCKS.map(u=>u.id).filter(Boolean);for(const id of ids)assert.ok(all.includes(id),id);assert.deepEqual([...progress.STARTERS,...ids].sort(),all.slice().sort());for(const id of all)assert.ok(progress.requirement(progress.newProfile(),id).length>5);});

test("pick one starter, then unlock by waves in Gauntlet or Endless only",()=>{const p=progress.newProfile();assert.deepEqual(progress.available(p,"campaign",all),[]);assert.equal(progress.chooseStarter(p,"edgar"),false);assert.ok(progress.chooseStarter(p,"talrand"));assert.equal(progress.chooseStarter(p,"krenko"),false);assert.deepEqual(progress.available(p,"campaign",all),["talrand"]);assert.deepEqual(progress.available(p,"sandbox",all),all);
 assert.deepEqual(progress.recordRun(p,run(30,{mode:"sandbox",won:true,colors:["W","U","B","R","G"],fallen:999})),[]);assert.equal(p.bestWave,0);
 assert.deepEqual(progress.recordRun(p,run(9)),[]);assert.match(progress.requirement(p,"edgar"),/wave 10/);
 assert.deepEqual(progress.recordRun(p,run(10)),["edgar"]);assert.deepEqual(progress.recordRun(p,run(10)),[]);
 assert.deepEqual(progress.recordRun(p,run(15,{mode:"endless"})),["lightpaws"]);
 assert.deepEqual(progress.recordRun(p,run(25)).sort(),["krenko","omnath"]);assert.equal(progress.requirement(p,"krenko"),null);});

test("battle-stat, endless and rainbow unlocks",()=>{const p=progress.newProfile();progress.chooseStarter(p,"omnath");
 assert.deepEqual(progress.recordRun(p,run(3,{returns:9,fallen:199,sacrifices:49})),[]);
 assert.deepEqual(progress.recordRun(p,run(3,{returns:10})),["meren"]);assert.deepEqual(progress.recordRun(p,run(3,{fallen:200})),["teysa"]);assert.deepEqual(progress.recordRun(p,run(3,{sacrifices:50})),["korvold"]);
 assert.ok(!progress.recordRun(p,run(30)).includes("atraxa"),"campaign wave 30 is not endless");assert.ok(progress.recordRun(p,run(30,{mode:"endless"})).includes("atraxa"));
 assert.deepEqual(progress.recordRun(p,run(25,{won:true,colors:["W","U","B","R","R"]})),[]);assert.deepEqual(progress.recordRun(p,run(25,{won:true,colors:["W","U","B","R","G","G"]})),["urdragon"]);
 assert.equal(progress.available(p,"campaign",all).length,all.length);});

test("profile saves, loads and rejects tampered or retired data",()=>{const s=memory(),p=progress.newProfile();progress.chooseStarter(p,"krenko");progress.recordRun(p,run(12));assert.ok(progress.save(s,p));assert.deepEqual(progress.load(s,all),p);
 s.setItem("archemancy.progress.v1",JSON.stringify({starter:"marshal",unlocked:["marshal","quill"],bestWave:12}));assert.deepEqual(progress.load(s,all),progress.newProfile(),"beta 9 starters are retired");
 s.setItem("archemancy.progress.v1",JSON.stringify({starter:"talrand",unlocked:["hacker","edgar"],last:"atraxa",bestWave:-4}));const q=progress.load(s,all);assert.deepEqual(q.unlocked,["talrand","edgar"]);assert.equal(q.last,null);assert.equal(q.bestWave,0);
 s.setItem("archemancy.progress.v1","{broken");assert.deepEqual(progress.load(s,all),progress.newProfile());
 assert.deepEqual(progress.load(null,all),progress.newProfile());assert.equal(progress.save({setItem(){throw Error("blocked")}},p),false);});

test("best stars per difficulty are kept and sanitized",()=>{const s=memory(),p=progress.newProfile();progress.chooseStarter(p,"krenko");assert.ok(progress.recordStars(p,"hard",2));assert.ok(!progress.recordStars(p,"hard",1));assert.ok(!progress.recordStars(p,"nightmare",3));assert.ok(!progress.recordStars(p,"easy",4));p.difficulty="hard";progress.save(s,p);const q=progress.load(s,all);assert.deepEqual(q.stars,{hard:2});assert.equal(q.difficulty,"hard");
 const bad=progress.sanitize({starter:"krenko",stars:{easy:9,normal:"3",hard:3},difficulty:"insane"},all);assert.deepEqual(bad.stars,{hard:3});assert.equal(bad.difficulty,"normal");});
