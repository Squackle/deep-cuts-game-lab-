import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LEVELS} from "../src/levels.js";
import {VERSION} from "../src/engine.js";
import {orbitPosition} from "../src/orbital-mana.js";
const read=f=>readFileSync(new URL("../"+f,import.meta.url),"utf8");
test("the campaign still has 250 unchanged-stage IDs and saves",()=>{
 assert.equal(LEVELS.length,250);
 assert.equal(VERSION,"mh-landfall-0.2.0");
 assert.equal(new Set(LEVELS.map(l=>l.id)).size,250);
 const js=read("src/main.js");
 assert.match(js,/dc-mana-heist-landfall-v2/);
 assert.match(js,/function proofFor\(id\)/);
});
test("gameplay alone locks viewport and leaves normal overworld scrollable",()=>{
 const css=read("tabletop-immersion.css"),html=read("index.html");
 assert.match(html,/href="\.\/tabletop-immersion\.css"/);
 assert.match(css,/html:has\(body\.in-heist\)/);
 assert.match(css,/height:100dvh!important/);
 assert.match(css,/overflow:hidden!important/);
 assert.match(css,/position:fixed!important/);
 assert.doesNotMatch(css,/\.campaign-screen\s*\{[^}]*overflow:hidden/);
});
test("hand and battlefield labels and standing instructions disappear visually",()=>{
 const css=read("tabletop-immersion.css");
 for(const part of [".section-label",".lesson-prompt",".hand-guide",".auto-cast-status",".feedback"]){
  assert.ok(css.includes(part),part);
 }
 assert.match(css,/bottom:-43px!important/);
 assert.match(css,/--hand-overlap/);
 assert.match(read("src/main.js"),/handNodes\.forEach/);
 assert.match(css,/\.hand-selected/);
 assert.match(css,/#wardTarget\.lock-ring/);
});
test("orbital trajectory launches near source, circles pot, tightens to the center",()=>{
 const start={x:40,y:40},pot={x:180,y:210,radius:112};
 const a=orbitPosition(0,start,pot);
 assert.ok(Math.abs(a.x-start.x)<.0001&&Math.abs(a.y-start.y)<.0001);
 const rim=orbitPosition(.18,start,pot);
 const mid=orbitPosition(.52,start,pot);
 const end=orbitPosition(1,start,pot);
 const dist=p=>Math.hypot(p.x-pot.x,p.y-pot.y);
 assert.ok(dist(mid)<dist(rim),"spiral should move inward");
 assert.ok(dist(end)<dist(mid),"absorption should pull bubble near pot center");
 assert.ok(end.opacity<=.01);
 assert.equal(rim.phase,"approach");
 assert.equal(mid.phase,"orbit");
 assert.equal(end.phase,"absorb");
 for(let i=0;i<11;i++)for(let t=0;t<=1;t+=.02){
  const p=orbitPosition(t,start,pot,i);
  assert.ok([p.x,p.y,p.scale,p.opacity].every(Number.isFinite));
 }
});
test("tapping Simic Growth Chamber and paid filter effects launch one bubble per produced mana unit",()=>{
 const js=read("src/main.js"),orbit=read("src/orbital-mana.js");
 assert.match(js,/getCard\(level,action\.id\)\.kind==="bounce"\?\["G","U"\]/);
 assert.match(js,/action\.type==="activate"\?action\.output/);
 assert.match(js,/incoming\.forEach\(\(orb,i\)=>launchOrbitMana/);
 assert.match(js,/pendingFlights\.add\(orb\.id\)/);
 assert.match(js,/pendingFlights\.delete\(orb\.id\)/);
 assert.match(js,/cancelOrbitMana\(el\("manaTravelLayer"\)\)/);
 assert.match(orbit,/prefers-reduced-motion: reduce/);
 assert.match(orbit,/requestAnimationFrame/);
 assert.doesNotMatch(orbit,/localStorage|fetch\(/);
});
