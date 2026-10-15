import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const read=x=>fs.readFileSync(x,"utf8");
const hub=read("lab/index.html");
const root=read("index.html");

test("One Game Lab directory links exactly three real playable routes",()=>{
 for(const [name,route,file] of [
  ["Hive Run","/","index.html"],
  ["Stackbreaker","/stackbreaker/","stackbreaker/index.html"],
  ["Mana Heist","/mana-heist/","mana-heist/index.html"]
 ]){
  assert.ok(fs.existsSync(file),name+" static game entry missing");
  assert.ok(hub.includes('href="'+route+'"'),name+" route missing");
  assert.ok(hub.includes(name.split(" ")[0]),name+" title not shown");
 }
 assert.equal((hub.match(/class="game-card game-/g)||[]).length,3,"No extra fictitious games");
 assert.match(hub,/THREE GAMES/);
 assert.match(hub,/ONE TEST LAB/);
 assert.match(hub,/No sign-in needed/);
 assert.match(hub,/TEST BUILDS, NOT PUBLIC RELEASES/);
});

test("Hive Run remains root game and links to all three games, without moving its scripts",()=>{
 assert.match(root,/id="gameCanvas"/);
 assert.match(root,/src="\.\/src\/main\.js"/);
 assert.match(root,/href="\/lab\/"/);
 assert.match(root,/ALL THREE GAMES/);
 assert.ok(fs.existsSync("src/main.js"));
});

test("Original game folders and their independent engines remain intact",()=>{
 for(const file of [
  "stackbreaker/data/scenarios.json","stackbreaker/src/engine.js",
  "stackbreaker/src/ui.js","stackbreaker/tests/engine.test.mjs",
  "mana-heist/src/engine.js","mana-heist/src/levels.js",
  "mana-heist/src/solver.js","mana-heist/tests/engine.test.mjs",
  "src/engine.js","tests/engine.test.mjs"
 ])assert.ok(fs.existsSync(file),file);
 assert.equal(JSON.parse(read("stackbreaker/data/scenarios.json")).length,12);
 const mana=read("mana-heist/README.md");
 assert.match(mana,/18 authored levels/);
});

test("Shared Lab hub cannot silently create identities, scores, APIs or remote scripts",()=>{
 assert.doesNotMatch(hub,/\<iframe|\<script|\<form|onload=|onclick=|contenteditable/i);
 assert.doesNotMatch(hub,/\/api\/|localStorage|sessionStorage|fetch\(/);
 assert.match(hub,/noindex, nofollow/);
 assert.match(hub,/Public Arcade|PUBLIC ARCADE/);
 assert.match(hub,/rel="noopener noreferrer"/);
 const stylesheet=read("lab/lab.css");
 assert.match(stylesheet,/@media\(max-width:620px\)/);
 assert.match(stylesheet,/prefers-reduced-motion:reduce/);
 assert.match(stylesheet,/focus-visible/);
 assert.ok(!stylesheet.includes("url(http"));
});

test("Unified catalog paths are local, existing and free from traversal",()=>{
 const urls=[...hub.matchAll(/\bhref="([^"]+)"/g)].map(x=>x[1]);
 for(const href of urls){
  if(href.startsWith("https://")||href.startsWith("data:")||href.startsWith("#"))continue;
  if(href==="/"){assert.ok(fs.existsSync("index.html"));continue}
  const clean=href.replace(/^\//,"").replace(/\/$/,"");
  const dest=path.normalize(href.startsWith("/")?clean:path.join("lab",clean));
  assert.ok(!dest.startsWith(".."),"Invalid path "+href);
  const file=href.endsWith("/")?dest+"/index.html":dest;
  assert.ok(fs.existsSync(file),"Missing local link "+href);
 }
});
