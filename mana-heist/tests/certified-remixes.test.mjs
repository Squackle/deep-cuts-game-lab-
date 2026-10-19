import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LEVELS,BASE_LEVELS,CHAPTERS,GALAXIES} from "../src/levels.js";
import {diverseFor} from "../src/mana-variety-puzzles.js";
import {certifyDiverse} from "../src/mana-variety-certificates.js";
import {REMIXES,REMIXED_IDS,REMIX_KEY,certifyRemix,validateRemixBests} from "../src/certified-remixes.js";
import {CARDS,VERSION,validate,initial,actions,reduce,medal} from "../src/engine.js";
import {replay} from "../src/solver.js";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const positions=[250,300,350,400,450];

test("five authored high-galaxy remixes keep exactly 500 stable stage IDs and all original lessons",()=>{
 assert.equal(LEVELS.length,500);assert.equal(GALAXIES.length,10);assert.equal(CHAPTERS.length,50);
 assert.equal(REMIXES.length,5);assert.equal(new Set(REMIXED_IDS).size,5);
 assert.deepEqual(LEVELS.slice(0,18).map(x=>x.id),BASE_LEVELS.map(x=>x.id));
 assert.deepEqual(LEVELS.filter(x=>x.revision===4).map(x=>x.id),REMIXED_IDS);
 assert.deepEqual(REMIXES.map(x=>x.galaxy),[5,6,7,8,9]);
 for(let k=0;k<5;k++){
  const n=positions[k],fresh=LEVELS[n],old=diverseFor(n);
  assert.equal(fresh.id,old.id);
  assert.equal(fresh.revision,4);assert.equal(old.revision,3);
  assert.notDeepEqual(fresh.field,old.field,"A changed puzzle must not pretend to be the original version");
  assert.notDeepEqual(fresh.stages,old.stages);
  assert.equal(fresh.mastery.wards,2+k,"wards must increase by galaxy");
  assert.ok(fresh.field.some(f=>f.card==="fellwar"));
  assert.ok(fresh.field.some(f=>f.card==="talisman"));
  assert.equal(validate(fresh),true);
 }
});
test("each remix's distinct action recipe replays legally and teaches real output/payment strategies",{timeout:30000},()=>{
 const fam=new Set(),proofLengths=[];
 for(const puzzle of REMIXES){
  const certificate=certifyRemix(puzzle);
  assert.equal(certificate.status,"solved",puzzle.id);
  const replayed=replay(puzzle,certificate.actions);
  assert.ok(replayed.ok,puzzle.id+" should replay deterministically");
  assert.equal(certificate.turn,puzzle.turnLimit,puzzle.id);
  assert.equal(replayed.state.stage,puzzle.stages.length);
  assert.ok(certificate.actions.some(a=>a.type==="activate"&&a.mode?.startsWith("fellwar-")),puzzle.id);
  assert.ok(certificate.actions.some(a=>a.type==="activate"&&a.mode?.startsWith("talisman-")),puzzle.id);
  assert.ok(certificate.actions.some(a=>a.type==="cast"),puzzle.id);
  assert.ok(medal(puzzle,{...replayed.state},certificate)>=1);
  fam.add(puzzle.mastery.family);
  proofLengths.push(certificate.steps);
 }
 assert.equal(fam.size,5,"not five renamed versions of one plan");
 for(let n=1;n<proofLengths.length;n++)assert.ok(proofLengths[n]>proofLengths[n-1],"later plans require more legal steps");
});
test("highest revised puzzle has six wards, paid filtering, life risk and one-time Lotus Petal",()=>{
 const x=REMIXES.at(-1),result=certifyRemix(x),trace=result.actions;
 assert.equal(x.id,"mh-451");
 assert.equal(x.stages.length,6);
 assert.deepEqual(x.stages.at(-1).cost,{W:1,U:1,B:1,R:1,G:1,C:1});
 assert.equal(trace.filter(a=>a.type==="activate"&&a.mode==="thran-CCC").length,3);
 assert.equal(trace.filter(a=>a.type==="activate"&&a.mode==="filter").length,3);
 assert.equal(trace.filter(a=>a.type==="activate"&&a.mode?.startsWith("prism-")).length,3);
 assert.equal(trace.filter(a=>a.type==="activate"&&a.mode==="petal-B").length,1);
 assert.equal(trace.filter(a=>a.type==="end").length,2);
 assert.equal(result.spentLife,2);assert.equal(replay(x,trace).state.life,1);
});
test("original revision-three routes remain available for archival medal calculation",{timeout:30000},()=>{
 for(const n of positions){
  const old=diverseFor(n),proof=certifyDiverse(old);
  assert.equal(proof.status,"solved");
  assert.ok(replay(old,proof.actions).ok,old.id);
 }
 const code=read("src/main.js");
 assert.match(code,/dc-mana-heist-variety-v1/);
 assert.match(code,/REMIX_KEY/);
 assert.match(code,/persistRemix/);
 assert.match(code,/LEVELS\.filter\(l=>l\.revision===3\|\|l\.revision===4\)/);
 assert.match(code,/Object\.entries\(varietyBests\)\.filter/);
 assert.match(code,/historicalMedals\.set/);
 assert.match(code,/archived results/);
 assert.match(code,/puzzle\.revision===4\?certifyRemix\(puzzle\)/);
 assert.doesNotMatch(code,/delete varietyBests\[/);
});
test("new save records reject corrupted, mismatched or stale archive entries",()=>{
 assert.equal(REMIX_KEY,"dc-mana-heist-certified-remixes-v1");
 const valid={turn:1,spentLife:1,actions:7},bad={turn:500,spentLife:-1,actions:0};
 assert.deepEqual(validateRemixBests({v:1,bests:{"mh-251":valid,"mh-301":bad,"mh-250":valid}}),{"mh-251":valid});
 assert.deepEqual(validateRemixBests({v:0,bests:{"mh-251":valid}}),{});
 assert.deepEqual(validateRemixBests({v:1,bests:{"mh-251":{...valid,actions:"7"}}}),{});
 const first=LEVELS[positions[0]];assert.equal(first.id,"mh-251");assert.equal(first.version,VERSION);
 assert.ok(CARDS.fellwar&&CARDS.talisman);
});
