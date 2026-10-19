import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LEVELS} from "../src/levels.js";
import {
 PLAYTEST_KEY,PLAYTEST_OPT_KEY,blankPlaytest,normalizePlaytest,
 playtestPuzzleKey,beginPlaytest,countPlaytestEvent,finishPlaytest,
 ratePlaytest,exportPlaytest
} from "../src/playtest-metrics.js";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("playtest is opt-in and isolated from the 500-vault score and lesson saves",()=>{
 assert.equal(LEVELS.length,500);
 assert.equal(PLAYTEST_KEY,"dc-mana-heist-playtest-v1");
 assert.equal(PLAYTEST_OPT_KEY,"dc-mana-heist-playtest-optin-v1");
 assert.deepEqual(blankPlaytest(),{v:1,puzzles:{}});
 assert.equal(playtestPuzzleKey(LEVELS[250]),"mh-251@4");
 assert.equal(playtestPuzzleKey(LEVELS[249]),"mh-250@1");
 assert.equal(playtestPuzzleKey({id:"user@email.example",revision:0}),null);
 const ui=read("src/main.js"),html=read("index.html");
 assert.match(ui,/let playtestEnabled=false/);
 assert.match(ui,/localStorage\.getItem\(PLAYTEST_OPT_KEY\)==="yes"/);
 assert.match(ui,/if\(!playtestEnabled\|\|playtestAttempt/);
 assert.match(ui,/closePlaytest\("win"\)/);
 assert.match(ui,/closePlaytest\("exit"\)/);
 assert.match(ui,/closePlaytest\("restart"\)/);
 assert.match(ui,/notePlaytest\("failedCast"\)/);
 assert.match(ui,/notePlaytest\("undo"\)/);
 assert.match(ui,/notePlaytest\("action"\)/);
 assert.match(ui,/dc-mana-heist-landfall-v2/);
 assert.match(ui,/dc-mana-heist-certified-remixes-v1|REMIX_KEY/);
 assert.match(html,/id="playtestPanel"/);
 assert.match(html,/id="playtestOptIn"/);
 assert.match(html,/id="playtestCopy"/);
 assert.match(html,/id="playtestClear"/);
 assert.match(html,/Nothing is transmitted or associated with your profile/);
});

test("finished attempts count wins, exits, restarts, Undo, failed cast and elapsed seconds",()=>{
 let a=beginPlaytest({id:"mh-251",revision:4},1000);
 a=countPlaytestEvent(a,"action");
 a=countPlaytestEvent(a,"undo");
 a=countPlaytestEvent(a,"failedCast");
 let data=finishPlaytest(blankPlaytest(),a,"win",13200);
 assert.deepEqual(data.puzzles["mh-251@4"],{
  attempts:1,wins:1,exits:0,restarts:0,undos:1,failedCasts:1,seconds:12,ratings:[0,0,0,0,0]
 });
 data=ratePlaytest(data,"mh-251@4",4);
 assert.deepEqual(data.puzzles["mh-251@4"].ratings,[0,0,0,1,0]);
 data=ratePlaytest(data,"mh-251@4",2);
 assert.deepEqual(data.puzzles["mh-251@4"].ratings,[0,0,0,1,0],"one rating per recorded win");
 data=finishPlaytest(data,beginPlaytest({id:"mh-251",revision:4},20000),"exit",20150);
 data=finishPlaytest(data,beginPlaytest({id:"mh-251",revision:4},21000),"restart",26000);
 assert.equal(data.puzzles["mh-251@4"].attempts,3);
 assert.equal(data.puzzles["mh-251@4"].exits,1);
 assert.equal(data.puzzles["mh-251@4"].restarts,1);
 assert.equal(data.puzzles["mh-251@4"].seconds,17);
 assert.equal(finishPlaytest(data,null,"win",35000).puzzles["mh-251@4"].attempts,3);
});

test("revision-four metrics never blend with historical revision-three stage metrics",()=>{
 let data=blankPlaytest();
 data=finishPlaytest(data,beginPlaytest({id:"mh-251",revision:3},0),"win",8000);
 data=finishPlaytest(data,beginPlaytest({id:"mh-251",revision:4},0),"exit",7000);
 assert.equal(data.puzzles["mh-251@3"].wins,1);
 assert.equal(data.puzzles["mh-251@4"].wins,0);
 const json=exportPlaytest(data);
 assert.match(json,/mh-251@3/);
 assert.match(json,/mh-251@4/);
 assert.match(json,/"sampleAttempts": 2/);
 assert.doesNotMatch(json,/userAgent|timestamp|email|userId|sessionId|actionTrace/);
});

test("invalid browser storage records, negative totals and identity keys are dropped",()=>{
 assert.deepEqual(normalizePlaytest({v:2,puzzles:{"mh-001@0":{attempts:3}}}),blankPlaytest());
 const data=normalizePlaytest({v:1,puzzles:{
  "mh-001@0":{attempts:2,wins:1,exits:1,restarts:0,undos:3,failedCasts:0,seconds:20,ratings:[0,1,0,0,0]},
  "mh-001@4":{attempts:1,wins:2},
  "personalEmail@example.org@0":{attempts:1,wins:1}
 }});
 assert.equal(Object.keys(data.puzzles).length,1);
 assert.equal(data.puzzles["mh-001@0"].undos,3);
 assert.deepEqual(normalizePlaytest({v:1,puzzles:[]} ),blankPlaytest());
 assert.equal(beginPlaytest({id:"mh-001",revision:0},Number.NaN),null);
});

test("small phone dialogs have large tap targets, focus trap and viewport-safe scrolling",()=>{
 const css=read("playtest-mobile.css"),html=read("index.html"),ui=read("src/main.js");
 assert.match(html,/href="\.\/playtest-mobile\.css"/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/max-height:calc\(100dvh - env\(safe-area-inset-top/);
 assert.match(css,/\.choice-button\{\s*min-height:48px!important/);
 assert.match(css,/\.choice-close\{min-width:44px!important;min-height:44px!important/);
 assert.match(ui,/el\("actionBox"\)\.addEventListener\("keydown"/);
 assert.match(ui,/e\.key!=="Tab"/);
 assert.match(ui,/choiceReturnFocus/);
 assert.match(ui,/el\("dismissChoices"\)\.focus/);
 assert.match(ui,/el\("playtestCopy"\)\.addEventListener/);
 assert.match(ui,/difficultyReview\.addEventListener/);
 const module=read("src/playtest-metrics.js");
 assert.doesNotMatch(module,/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|navigator\.|Date\.now\(/);
});
