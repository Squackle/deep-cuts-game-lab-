import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RULES_VERSION} from '../src/cards.js';
import {validateScenario,createGame,legalActions,legalTargets,activate,autoplay,creaturePower,creatureToughness,pass,remainingMana} from '../src/engine.js';
const cases=JSON.parse(readFileSync(new URL('../data/scenarios.json',import.meta.url),'utf8'));
const solutions={
'sb-01':[['ward',null]],
'sb-02':[['counter','bolt']],
'sb-03':[['growth','bear']],
'sb-04':[['negate','wrath']],
'sb-05':[['intervene',null]],
'sb-06':[['intervene',null]],
'sb-07':[['counter','blade']],
'sb-08':[['bounce','giant']],
'sb-09':[['dispel','theircounter']],
'sb-10':[['salve','player'],['dispel','bolt']],
'sb-11':[['counter','swords']],
'sb-12':[['salve','player'],['dispel','theircounter']]
};
for(const p of cases){
 test(`${p.id} ${p.title}: valid, winning path, meaningful losing path and deterministic replay`,()=>{
 assert.deepEqual(validateScenario(p),{valid:true,errors:[]});
 let s=createGame(p);assert.equal(s.version,RULES_VERSION);assert.equal(s.status,'playing');
 const fresh=JSON.stringify(s);
 for(const [a,target] of solutions[p.id]){
  assert.ok(legalActions(s).includes(a),`${p.id} ${a} must be legal`);
  assert.ok(legalTargets(s,s.hand.find(x=>x.id===a)).includes(target),`${p.id}: ${target} target must be legal`);
  let old=JSON.stringify(s);s=activate(s,a,target);assert.equal(JSON.stringify(createGame(p)),fresh,'puzzle must remain immutable');assert.equal(old.includes('"status":"playing"'),true);
 }
 let outcome=autoplay(s);assert.equal(outcome.status,'won',`${p.id} did not win: ${outcome.log.join(' | ')}`);
 let again=createGame(p);for(const [a,target] of solutions[p.id])again=activate(again,a,target);assert.deepEqual(autoplay(again),outcome);
 let loss=autoplay(createGame(p));assert.equal(loss.status,'lost',`${p.id} passes-only unexpectedly won`);
 });
}
test('spell target restriction: Essence Scatter cannot target Wrath of God',()=>{
 const s=createGame(cases[3]);assert.deepEqual(legalTargets(s,s.hand.find(x=>x.id==='scatter')),[]);assert.throws(()=>activate(s,'scatter','wrath'),/Illegal/);
});
test('hexproof makes prior opposing target illegal at resolution',()=>{
 let s=createGame(cases[4]);s=autoplay(activate(s,'intervene'));assert.equal(s.units.find(u=>u.id==='giant').zone,'battlefield');assert.match(s.log.join(' '),/all targets illegal/);
});
test('sacrifice is paid as cost; ability survives its source',()=>{
 let s=activate(createGame(cases[0]),'ward');assert.equal(s.units.find(u=>u.id==='spirit').zone,'graveyard');assert.equal(s.stack.at(-1).spell,false);s=autoplay(s);assert.equal(s.status,'won');assert.ok(s.units.find(u=>u.id==='bear').indestructible);
});
test('damage is marked, toughness pump is not healing, and SBA handle lethal damage',()=>{
 const p=cases[2];let s=autoplay(createGame(p));assert.equal(s.units[0].zone,'graveyard');s=autoplay(activate(createGame(p),'growth','bear'));assert.equal(s.units[0].zone,'battlefield');assert.equal(s.units[0].damage,3);assert.equal(creaturePower(s.units[0]),5);assert.equal(creatureToughness(s.units[0]),5);
});
test('exile ignores indestructible; intervention hexproof defeats target',()=>{
 let s=autoplay(activate(createGame(cases[5]),'ward'));assert.equal(s.units.find(u=>u.id==='bear').zone,'exile');let protectedState=autoplay(activate(createGame(cases[5]),'intervene'));assert.equal(protectedState.status,'won');
});
test('counter wars have correct target legality and resolve top-first',()=>{
 let s=createGame(cases[8]);assert.ok(legalActions(s).includes('dispel'));assert.ok(!legalActions(s).includes('scatter'));s=autoplay(activate(s,'dispel','theircounter'));assert.equal(s.life.opponent,0);assert.equal(s.status,'won');
});
test('countering wrong object in final exchange loses',()=>{
 let s=createGame(cases[11]);s=activate(s,'salve','player');s=activate(s,'dispel','theirbolt');s=autoplay(s);assert.equal(s.status,'lost');
});
test('illegal target, insufficient colored mana and duplicate activations rejected',()=>{
 let s=createGame(cases[2]);assert.throws(()=>activate(s,'growth','player'),/Illegal target/);
 s.mana.G=0;assert.deepEqual(legalActions(s),[]);assert.throws(()=>activate(s,'growth','bear'),/Illegal/);
 const a=createGame(cases[0]);const b=activate(a,'ward');assert.throws(()=>activate(b,'ward'),/Illegal/);
 assert.equal(remainingMana({mana:{G:1,U:1}}, {G:1,U:1,generic:1}),null);
});
test('schema rejects unrecognized card or duplicate ids',()=>{
 const p=structuredClone(cases[0]);p.units[0].card='Imaginary Creature';assert.equal(validateScenario(p).valid,false);
 const q=structuredClone(cases[0]);q.units[1].id='spirit';assert.equal(validateScenario(q).valid,false);
});