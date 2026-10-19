import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LEVELS,BASE_LEVELS,GALAXIES,CHAPTERS} from "../src/levels.js";
import {unlocked,chapterAccessible,galaxyAccessible,highestUnlocked,normalizedBests} from "../src/campaign.js";
import {LEARN_GROUPS,LEARN_COUNT,isLearnLevel,normalizedLearnProgress,nextLearnIndex} from "../src/learn-track.js";
import {VERSION} from "../src/engine.js";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("the full 500-vault map and every galaxy open with no completed puzzles",()=>{
 assert.equal(LEVELS.length,500);
 assert.equal(CHAPTERS.length,50);
 assert.equal(GALAXIES.length,10);
 const empty={};
 for(let i=0;i<500;i++)assert.equal(unlocked(i,empty),true,"vault "+i);
 for(let i=0;i<25;i++)assert.equal(chapterAccessible(i,empty),true,"world "+i);
 for(let i=0;i<5;i++)assert.equal(galaxyAccessible(i,empty),true,"galaxy "+i);
 for(const i of [-1,500,600,1.5,NaN])assert.equal(unlocked(i,empty),false);
 assert.equal(galaxyAccessible(10,empty),false);
 assert.equal(chapterAccessible(50,empty),false);
});
test("26 Learn Mana exercises include the original 18 authored boards plus new independent studies",()=>{
 const indices=LEARN_GROUPS.flatMap(group=>group.indices);
 assert.equal(LEARN_COUNT,26);
 assert.deepEqual([...indices].sort((a,b)=>a-b),Array.from({length:26},(_,i)=>i));
 assert.deepEqual(BASE_LEVELS.map(l=>l.id),LEVELS.slice(0,18).map(l=>l.id));
 for(let i=0;i<26;i++)assert.ok(isLearnLevel(i));
 for(const i of [-1,26,249])assert.equal(isLearnLevel(i),false);
 assert.equal(nextLearnIndex(0),1);assert.equal(nextLearnIndex(25),null);
});
test("learning progress validates separately, does not grant puzzle medals or unlock gating",()=>{
 const data=normalizedLearnProgress({completed:[0,2,2,6,999,-1,"4"],last:2});
 assert.deepEqual(data,{completed:[0,2,6],last:2});
 assert.deepEqual(normalizedLearnProgress({completed:"broken",last:33}),{completed:[],last:0});
 const bests=normalizedBests({[LEVELS[0].id]:{turn:1,spentLife:0}});
 assert.equal(highestUnlocked(bests),1);assert.equal(unlocked(249,bests),true);
 assert.equal(VERSION,"mh-landfall-0.2.0");
});
test("two visible mode controls, separate maps and jump options",()=>{
 const html=read("index.html");
 assert.match(html,/data-mode="learn"/);assert.match(html,/data-mode="heist"/);
 assert.match(html,/id="learnPanel"/);assert.match(html,/id="heistPanel"/);
 assert.match(html,/id="learnPicker"/);
 assert.match(html,/href="\.\/mode-paths\.css"/);
 for(let g=0;g<5;g++)assert.match(html,new RegExp('data-jump-galaxy="'+g+'"'));
 const css=read("mode-paths.css");
 assert.match(css,/\.mode-options\{/);assert.match(css,/\.learn-exercise/);
 assert.match(css,/\.campaign-screen \[hidden\]/);
});
test("mode-specific save key does not replace the existing 250-stage v2 bests",()=>{
 const js=read("src/main.js");
 assert.match(js,/const storageKey="dc-mana-heist-landfall-v2"/);
 assert.match(js,/modeKey="dc-mana-heist-mode-v1",learnKey="dc-mana-heist-learn-v1"/);
 assert.match(js,/if\(mode==="learn"\)\{/);
 assert.match(js,/el\("winTitle"\)\.textContent="✧ LESSON COMPLETE"/);
 assert.match(js,/if\(index\+1<LEVELS.length\)load\(index\+1,true\)/);
 assert.doesNotMatch(js,/Math\.min\(progress\.index,highestUnlocked/);
 assert.doesNotMatch(js,/Crack the previous stage to unlock/);
});


test("first-load campaign and lessons agree with current playable inventory",()=>{
 const html=read("index.html");
 assert.match(html,/Explore 500 mana puzzles across ten galaxies and 50 worlds, plus 26 Learn Mana lessons/);
 assert.match(html,/All 500 vaults are unsealed across ten galaxies/);
 assert.match(html,/0 \/ 500 CRACKED/);
 assert.match(html,/0 \/ 26 COMPLETED/);
 assert.match(html,/original 18 foundations and eight advanced lessons/);
 assert.doesNotMatch(html,/Solve 250 land-and-mana vault puzzles/);
 assert.doesNotMatch(html,/All 250 vaults are unsealed/);
 assert.doesNotMatch(html,/0 \/ 250 CRACKED|0 \/ 18 COMPLETED/);
 const overworld=read("src/overworld.js");
 assert.match(overworld,/LEVELS\.filter\(l=>bests\[l\.id\]\)\.length\+" \/ "\+LEVELS\.length/);
 assert.match(overworld,/for\(let i=0;i<GALAXIES\.length;i\+\+\)/);
});
