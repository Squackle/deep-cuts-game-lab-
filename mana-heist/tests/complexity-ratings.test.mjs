import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LEVELS,GALAXIES} from "../src/levels.js";
import {evaluateVault} from "../src/difficulty-metrics.js";
import {certifyMastery} from "../src/mastery-certificates.js";
test("C/D metrics are reproducible, bounded and grounded in board/ward structure",()=>{
 const old=evaluateVault(LEVELS[249]),end=evaluateVault(LEVELS[499]);
 assert.equal(old.complexity,50);assert.equal(old.difficulty,50);
 assert.ok(end.complexity>=90,"expected meaningful late mechanical complexity: "+JSON.stringify(end));
 assert.ok(end.difficulty>=90,"expected additional action and multi-turn challenge: "+JSON.stringify(end));
 for(const puzzle of LEVELS){
  const a=evaluateVault(puzzle),b=evaluateVault(puzzle);
  assert.deepEqual(a,b,puzzle.id);
  assert.ok(a.complexity>=1&&a.complexity<=100);
  assert.ok(a.difficulty>=1&&a.difficulty<=100);
 }
});
test("new galaxies scale up in structure, not a hidden stage index bonus",()=>{
 const avgs=GALAXIES.map((g,i)=>{
  const scores=LEVELS.slice(g.range[0],g.range[1]+1).map(evaluateVault);
  return {c:scores.reduce((a,b)=>a+b.complexity,0)/50,
          d:scores.reduce((a,b)=>a+b.difficulty,0)/50};
 });
 for(let g=6;g<10;g++){
  assert.ok(avgs[g].c>=avgs[g-1].c,"Galaxy "+g+" complexity must increase");
  assert.ok(avgs[g].d>=avgs[g-1].d,"Galaxy "+g+" difficulty must increase");
 }
 assert.ok(avgs[5].c>avgs[4].c);
 assert.ok(avgs[5].d>avgs[4].d);
 const first=LEVELS[250],last=LEVELS[499];
 assert.equal(first.stages.length,2);
 assert.equal(last.stages.length,5);
 assert.ok(certifyMastery(last).steps>certifyMastery(first).steps);
});
test("ratings and two-part scale appear in both active vault and all map cards",()=>{
 const ui=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 const map=readFileSync(new URL("../src/overworld.js",import.meta.url),"utf8");
 assert.match(ui,/masteryRating\.textContent=/);
 assert.match(map,/vault-ratings/);
 assert.match(map,/500 vaults/);
 assert.match(ui,/onInspect:id=>playLand\(id\)/);
});
