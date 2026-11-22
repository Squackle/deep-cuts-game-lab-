import {test} from "node:test";
import assert from "node:assert/strict";
import * as progress from "../progress.mjs";
import {createEngine} from "../engine.mjs";
const all=Object.keys(createEngine(1).commanders);
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};

test("starters and unlock rules point at real commanders",()=>{for(const id of progress.STARTERS)assert.ok(all.includes(id));for(const u of progress.UNLOCKS)if(u.id)assert.ok(all.includes(u.id));const covered=new Set([...progress.STARTERS,...progress.UNLOCKS.map(u=>u.id).filter(Boolean)]);assert.deepEqual([...covered].sort(),all.slice().sort());});

test("pick one starter, then unlock by wave in Gauntlet or Endless only",()=>{const p=progress.newProfile();assert.deepEqual(progress.available(p,"campaign",all),[]);assert.equal(progress.chooseStarter(p,"kragg"),false);assert.ok(progress.chooseStarter(p,"quill"));assert.equal(progress.chooseStarter(p,"marshal"),false);assert.deepEqual(progress.available(p,"campaign",all),["quill"]);assert.deepEqual(progress.available(p,"sandbox",all),all);
 assert.deepEqual(progress.recordWave(p,30,"sandbox"),[]);assert.equal(p.bestWave,0);
 assert.deepEqual(progress.recordWave(p,9,"campaign"),[]);assert.match(progress.requirement(p,"vesk"),/wave 10/);
 assert.deepEqual(progress.recordWave(p,10,"campaign"),["vesk"]);assert.deepEqual(progress.recordWave(p,10,"campaign"),[]);
 assert.deepEqual(progress.recordWave(p,15,"endless"),["kragg"]);assert.match(progress.requirement(p,"marshal"),/wave 25/);
 assert.deepEqual(progress.recordWave(p,25,"campaign").sort(),["bramble","marshal"]);assert.equal(progress.requirement(p,"marshal"),null);assert.equal(progress.available(p,"campaign",all).length,all.length);});

test("profile saves, loads and rejects tampered data",()=>{const s=memory(),p=progress.newProfile();progress.chooseStarter(p,"bramble");progress.recordWave(p,12,"campaign");assert.ok(progress.save(s,p));assert.deepEqual(progress.load(s,all),p);
 s.setItem("archemancy.progress.v1",JSON.stringify({starter:"kragg",unlocked:["vesk","hacker"],bestWave:-4}));assert.deepEqual(progress.load(s,all),progress.newProfile());
 s.setItem("archemancy.progress.v1",JSON.stringify({starter:"quill",unlocked:["hacker","vesk"],last:"kragg",bestWave:11}));const q=progress.load(s,all);assert.deepEqual(q.unlocked,["quill","vesk"]);assert.equal(q.last,null);
 s.setItem("archemancy.progress.v1","{broken");assert.deepEqual(progress.load(s,all),progress.newProfile());
 assert.deepEqual(progress.load(null,all),progress.newProfile());assert.equal(progress.save({setItem(){throw Error("blocked")}},p),false);});
