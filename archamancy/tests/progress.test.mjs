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
test("stars are kept per battlefield, and the Hollow Road keeps its old keys",()=>{const p=progress.newProfile();progress.chooseStarter(p,"krenko");
 assert.ok(progress.recordStars(p,"normal",2));assert.ok(progress.recordStars(p,"normal",3,"confluence"));assert.equal(progress.bestStars(p,"normal"),2);assert.equal(progress.bestStars(p,"normal","confluence"),3);assert.equal(p.stars.normal,2);
 assert.ok(!progress.recordStars(p,"normal",3,"Bad Map"));
 const back=progress.sanitize(JSON.parse(JSON.stringify({...p,map:"confluence",stars:{...p.stars,"x:y":3,"__proto__:easy":3}})),all);assert.deepEqual(back.stars,{normal:2,"confluence:normal":3});assert.equal(back.map,"confluence");
 assert.equal(progress.sanitize({starter:"krenko",map:"<b>"},all).map,"hollow");});
test("star upgrades spend the star pool, refund, and sanitize",()=>{const p=progress.newProfile();progress.chooseStarter(p,"krenko");
 assert.ok(!progress.buyPerk(p,"R"),"no stars yet");progress.recordStars(p,"normal",3);progress.recordStars(p,"easy",2,"confluence");assert.equal(progress.totalStars(p),5);
 assert.ok(progress.buyPerk(p,"R"));assert.ok(progress.buyPerk(p,"R"));assert.equal(progress.freeStars(p),2);assert.ok(!progress.buyPerk(p,"R"),"rank 3 costs 3");assert.ok(progress.buyPerk(p,"treasury"));assert.ok(!progress.buyPerk(p,"nope"));
 assert.deepEqual(p.perks,{R:2,treasury:1});const back=progress.sanitize(JSON.parse(JSON.stringify(p)),all);assert.deepEqual(back.perks,{R:2,treasury:1});
 assert.deepEqual(progress.sanitize({...JSON.parse(JSON.stringify(p)),perks:{R:3,G:3}},all).perks,{},"more spent than earned resets");
 assert.ok(progress.resetPerks(p));assert.equal(progress.freeStars(p),5);});
test("trial badges: one-color wins and Onslaught wins, saved and sanitized",()=>{const p=progress.newProfile();progress.chooseStarter(p,"krenko");
 assert.deepEqual(progress.trialBadges({won:true,mode:"campaign",colors:["R","R"],onslaught:true,map:"confluence"}),["mono:R","onslaught:confluence"]);
 assert.deepEqual(progress.trialBadges({won:true,mode:"campaign",colors:["R","G"]}),[]);assert.deepEqual(progress.trialBadges({won:false,mode:"campaign",colors:["R"]}),[]);assert.deepEqual(progress.trialBadges({won:true,mode:"endless",colors:["R"]}),[]);
 assert.ok(progress.awardBadge(p,"mono:R"));assert.ok(!progress.awardBadge(p,"mono:R"));assert.ok(!progress.awardBadge(p,"mono:X"));
 const back=progress.sanitize({...JSON.parse(JSON.stringify(p)),badges:{"mono:R":true,"evil":true,"onslaught:hollow":"yes"},onslaught:true},all);assert.deepEqual(back.badges,{"mono:R":true});assert.equal(back.onslaught,true);});
test("player level: XP per wave, unlocks in order, older players keep everything",()=>{const p=progress.newProfile();progress.chooseStarter(p,"krenko");
 assert.equal(progress.level(p),1);assert.ok(progress.isOpen(p,"towers","legion"));assert.ok(!progress.isOpen(p,"towers","storm"));assert.ok(!progress.isOpen(p,"maps","confluence"));
 assert.deepEqual(progress.gainXp(p,[1,2,3,4,5],"sandbox"),[]);const up=progress.gainXp(p,[1,2,3,4,5],"campaign");assert.equal(up.length,1);assert.deepEqual(up[0].towers,["judgment","storm"]);assert.equal(progress.level(p),2);
 assert.ok(progress.lockedTowers(p).includes("mirror")&&!progress.lockedTowers(p).includes("storm"));
 const vet=progress.sanitize({starter:"krenko",bestWave:25},all);assert.equal(progress.level(vet),progress.MAX_LEVEL);assert.deepEqual(progress.lockedTowers(vet),[]);
 const mid=progress.sanitize({starter:"krenko",bestWave:12},all);assert.equal(progress.level(mid),4);
 assert.equal(progress.sanitize({starter:"krenko",bestWave:25,xp:70},all).xp,70,"saved XP wins");
 assert.ok(progress.see(p,"e",["raider","runner"]));assert.ok(!progress.see(p,"e",["raider"]));const back=progress.sanitize(JSON.parse(JSON.stringify({...p,seen:{e:["raider","<x>"],t:"no"}})),all);assert.deepEqual(back.seen,{e:["raider"],t:[],c:[]});});

test("campaign regions: winning a region opens the next one before its level",async()=>{
 const p=progress.newProfile();assert.equal(progress.REGIONS.length,5);assert.deepEqual(progress.REGIONS.slice(0,4).map(r=>r.map),["hollow","confluence","frostfen","pass"]);
 assert.ok(progress.mapOpen(p,"hollow"));assert.ok(!progress.mapOpen(p,"confluence"));
 progress.recordStars(p,"easy",1,"hollow");assert.equal(progress.mapStars(p,"hollow"),1);assert.ok(progress.mapOpen(p,"confluence"));assert.ok(!progress.mapOpen(p,"frostfen"));
 progress.recordStars(p,"hard",3,"confluence");assert.equal(progress.mapStars(p,"confluence"),3);assert.ok(progress.mapOpen(p,"frostfen"));
 p.xp=progress.xpToReach(6);assert.ok(progress.mapOpen(p,"pass"),"level still opens maps");
});
