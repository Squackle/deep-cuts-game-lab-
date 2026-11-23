import {test} from "node:test";
import assert from "node:assert/strict";
import {createEngine,MAPS} from "../engine.mjs";
import * as daily from "../daily.mjs";
import {cardData,shareText} from "../runcard.mjs";

test("daily challenge is the same for everyone on a date and valid for the engine",()=>{
 const a=daily.dailyFor("2026-11-23",MAPS),b=daily.dailyFor("2026-11-23",MAPS);
 assert.deepEqual(a,b);
 const seen=new Set();
 for(let i=0;i<120;i++){const d=new Date(2026,0,1+i),dc=daily.dailyFor(daily.dateKey(d),MAPS);seen.add(dc.map+dc.twist);
  assert.ok(MAPS[dc.map]);assert.ok((MAPS[dc.map].seasons||["summer","autumn","winter"]).includes(dc.season));
  const g=createEngine(dc.seed,"campaign",dc.map);
  assert.ok(g.command({type:"season",season:dc.season}));
  assert.ok(g.command({type:"difficulty",level:dc.difficulty}));
  if(dc.onslaught)assert.ok(g.command({type:"onslaught",on:true}));
  const locks=daily.dailyLocks(dc,g.roster);assert.ok(g.command({type:"locks",towers:locks}));
  assert.ok(Object.keys(g.roster).some(k=>!locks.includes(k)),"at least one tower stays buildable");
  assert.ok(g.command({type:"commander",id:dc.commander}),dc.commander);
 }
 assert.ok(seen.size>8,"challenges vary from day to day");
});

test("daily results keep the best try and count a streak",()=>{
 const book={days:{}};
 daily.record(book,"2026-11-21",{won:false,wave:12,health:0});
 daily.record(book,"2026-11-22",{won:true,stars:2,health:12,wave:25});
 let r=daily.record(book,"2026-11-23",{won:true,stars:1,health:4,wave:25});assert.ok(r.improved);
 r=daily.record(book,"2026-11-23",{won:false,wave:20,health:0});assert.equal(r.improved,false);assert.equal(r.best.stars,1);assert.equal(r.tries,2);
 assert.equal(daily.streak(book,"2026-11-23"),3);
 assert.equal(daily.streak(book,"2026-11-24"),3,"today not played yet keeps yesterday's streak");
 assert.equal(daily.streak(book,"2026-11-26"),0);
 const store={v:null,getItem(){return this.v;},setItem(k,v){this.v=v;}};
 daily.save(store,book);assert.deepEqual(daily.load(store),book);
 store.v="{broken";assert.deepEqual(daily.load(store),{days:{}});
});

test("run card summarizes a finished run",()=>{
 const g=createEngine(7,"campaign","hollow");g.command({type:"commander",id:"krenko"});
 g.state.phase="won";g.state.wave=25;g.state.health=17;
 const dc=daily.dailyFor("2026-11-23",MAPS);
 const d=cardData(g,{daily:{...dc,pretty:"Nov 23"},stars:3,url:"https://example.test/archemancy/"});
 assert.equal(d.title,"VICTORY");assert.equal(d.stars,3);assert.match(d.kicker,/Daily · Nov 23/);
 assert.equal(d.commander.name,"Krenko, Mob Boss");assert.equal(d.stats.length,4);
 assert.match(shareText(d),/Victory ★★★, 17 fortress left on The Hollow Road\. Can you beat it\? https:\/\/example\.test\/archemancy\//);
 g.state.phase="lost";g.state.wave=14;
 const l=cardData(g,{levelName:{normal:"Normal"}});assert.equal(l.title,"DEFEAT");assert.equal(l.stars,0);assert.equal(l.sub,"Fell on wave 14 of 25");
});
