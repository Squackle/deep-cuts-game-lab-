import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARDS,LANDS} from '../src/cards.js';
import {createGame,validateScenario,autoplay,tapLand,activate,legalActions,legalTargets,objectiveMet} from '../src/engine.js';
const root = new URL('../data/',import.meta.url);
const all=JSON.parse(readFileSync(new URL('scenarios.json',root),'utf8'));
const chapters=JSON.parse(readFileSync(new URL('chapters.json',root),'utf8'));
test('five complete chapters, six unique puzzle nodes each, boss at stage six',()=>{
 assert.equal(chapters.length,5);assert.equal(all.length,30);
 assert.equal(new Set(all.map(p=>p.id)).size,30);
 assert.equal(new Set(all.map(p=>p.title)).size,30);
 assert.equal(all[5].title,'The Final Exchange');
 for(const [i,w] of chapters.entries()){
  assert.equal(w.start,i*6+1);assert.equal(w.end,i*6+6);
  assert.equal(all[w.end-1].title,w.boss);
  assert.equal(all.slice(w.start-1,w.end).length,6);
  assert.ok(w.terrain&&w.color&&w.subtitle);
 }
});
test('new real cards add distinct timing decisions without bogus card references',()=>{
 for(const card of ['Blossoming Defense','Dive Down','Titanic Growth','Lightning Strike','Cancel']){
  assert.ok(CARDS[card],card);assert.ok(CARDS[card].oracle);assert.ok(CARDS[card].cost);
 }
 for(const p of all){assert.deepEqual(validateScenario(p),{valid:true,errors:[]});for(const l of p.lands)assert.ok(LANDS[l.card]);}
});
test('hexproof-and-pump choices protect only friendly creatures and obey timing',()=>{
 const p=all[12],defense=p.hand[0],s=createGame(p);assert.deepEqual(legalTargets(s,defense),['bear']);
 let land=tapLand(s,p.lands[0].id);assert.ok(legalActions(land).includes('defend'));
 let result=autoplay(activate(land,'defend','bear'));
 assert.equal(result.status,'won');assert.equal(result.units[0].powerBoost,2);assert.equal(result.units[0].toughnessBoost,2);assert.equal(result.units[0].hexproof,true);
 assert.throws(()=>activate(land,'defend','opponent'),/Illegal target/);
});
test('final chapter win also requires keeping a specified creature',()=>{
 const s=createGame(all[27]);const answer={...s,life:{player:1,opponent:0},units:s.units.map(u=>({...u,zone:'graveyard'}))};
 assert.ok(answer.objective.type==='winKeepUnit');
 assert.equal(objectiveMet(answer),false);
});