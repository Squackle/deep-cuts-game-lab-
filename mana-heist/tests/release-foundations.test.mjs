import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CARDS,VERSION,COLORS} from "../src/engine.js";
import {BASE_LEVELS,LEVELS,CHAPTERS,GALAXIES} from "../src/levels.js";
import {knownCardKeys,knownCardNames} from "../src/scryfall-cards.js";
import {stageCode} from "../src/campaign.js";

const read=(f)=>readFileSync(new URL("../"+f,import.meta.url),"utf8");

test("P01 baseline matches actual rules/card/campaign sources, not old README descriptions",()=>{
 assert.equal(VERSION,"mh-landfall-0.2.0");
 assert.deepEqual(COLORS,["W","U","B","R","G","C"]);
 assert.equal(Object.keys(CARDS).length,38);
 assert.equal(knownCardKeys().length,38);
 assert.equal(new Set(knownCardNames()).size,38);
 assert.equal(BASE_LEVELS.length,18);
 assert.equal(LEVELS.length,250);
 assert.equal(LEVELS.filter(l=>l.templateId).length,202);
 assert.equal(GALAXIES.length,5);
 assert.equal(CHAPTERS.length,25);
 assert.equal(stageCode(0),"1:1:1");
 assert.equal(stageCode(249),"5:5:10");
 assert.equal(CARDS.bounceUG.name,"Simic Growth Chamber");
 assert.deepEqual(CARDS.bounceUG.colors,["U","G"],"available colors of Simic Growth Chamber");
 assert.match(read("src/engine.js"),/kind==="bounce"\)addMana/);
});

test("P01 documents 1.0 acceptance, risks, current rules and blocked rights path",()=>{
 const foundations=read("release/FOUNDATIONS-P01.md");
 const mechanics=read("release/MECHANICS-MATRIX-P01.md");
 const rights=read("release/ASSET-RIGHTS-P01.md");
 for(let i=1;i<=12;i++)assert.match(foundations,new RegExp("AC-"+String(i).padStart(2,"0")));
 for(let i=1;i<=10;i++)assert.match(foundations,new RegExp("R-"+String(i).padStart(2,"0")));
 for(let i=1;i<=19;i++)assert.match(mechanics,new RegExp("M-"+String(i).padStart(2,"0")));
 assert.match(foundations,/OWNER DECISION REQUIRED|OWNER SELECTION/i);
 assert.match(rights,/OWNER APPROVAL AND QUALIFIED REVIEW/);
 assert.match(rights,/Route A — Written rights\/permission/);
 assert.match(rights,/Route B — Independently reviewed original presentation/);
 assert.match(rights,/in other games/);
 assert.match(mechanics,/Simic Growth Chamber/);
 assert.match(mechanics,/each step and phase/i);
 assert.match(foundations,/250 unique IDs/);
 assert.match(rights,/Scryfall.*403/i);
});

test("P01 remains blocked; independently approved later work can be in progress with evidence",()=>{
 const roadmap=read("ROADMAP-1.0.md");
 const agents=read("AGENTS.md");
 const readme=read("README.md");
 assert.match(roadmap,/\| P01 \| BLOCKED \|/);
 for(let i=2;i<=15;i++){
  const id="P"+String(i).padStart(2,"0");
  const record=roadmap.split("\n").find(row=>row.startsWith("| "+id+" |"));
  assert.ok(record,"missing release status for "+id);
  if(i===12){
   assert.match(record,/\| IN PROGRESS \|/,"P12 parity changes are partial, not the full release package");
   assert.match(record,/remaining|NOT COMPLETE/i);
  }else if(i===2){
   assert.match(record,/\| IN PROGRESS \|/,"owner-approved P02 isolated mana engine is still partial");
   assert.match(record,/NOT COMPLETE/i);
   assert.match(read("release/MANA-ENGINE-PHASE1.md"),/mh-mana-lab-2\.0\.0/);
   assert.match(read("src/mana-engine-v2.js"),/export function payments\(/);
  }else if(i===4){
   assert.match(record,/\| IN PROGRESS \|/,"P04 beginner tutorial started by owner-approved Tabletop Flow");
   assert.match(record,/full.*not yet complete/i,"P04 is still incomplete");
   const main=read("src/main.js"),html=read("index.html"),tutorial=read("tests/tabletop-flow.test.mjs");
   assert.match(main,/function teachingCue\(\)/);
   assert.match(html,/id="lessonPrompt"/);
   assert.match(html,/id="castButton"/);
   assert.match(tutorial,/three distinct actions/);
  }else if([3,5,8,9,10].includes(i)){
   assert.match(record,/\| IN PROGRESS \|/,"partially authorized mana and difficulty improvements are underway");
   assert.match(record,/NOT COMPLETE/i,"partial release cannot be presented as 1.0 acceptance");
  }else{
   assert.match(record,/\| NOT STARTED \|/,"unapproved package "+id+" must remain unstarted");
  }
 }
 assert.match(agents,/P01.*rights/i);
 assert.match(readme,/release\/FOUNDATIONS-P01\.md/);
 assert.match(readme,/release\/ASSET-RIGHTS-P01\.md/);
});

test("baseline lists browser-only guest saving and all external card image paths",()=>{
 const main=read("src/main.js");
 const img=read("src/printing-art.js");
 const refer=read("src/card-references.js");
 const named=read("src/scryfall-cards.js");
 assert.match(main,/dc-mana-heist-landfall-v2/);
 assert.match(main,/localStorage/);
 assert.match(img,/https:\/\/api\.scryfall\.com\/cards\/random/);
 assert.match(refer,/https:\/\/api\.scryfall\.com\/cards\/named/);
 assert.match(named,/https:\/\/api\.scryfall\.com\/cards\/named/);
 const rules=read("src/engine.js");
 assert.doesNotMatch(rules,/\bfetch\s*\(|\bXMLHttpRequest\b/);
});
