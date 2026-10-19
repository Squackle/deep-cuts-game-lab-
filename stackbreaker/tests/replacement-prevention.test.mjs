import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {replacementScenarios} from '../data/replacement-scenarios.js';
import {createReplacementGame,chooseReplacement,replayReplacement,
 applicableEffects,replacementChooser,PREVENTION_RULES_VERSION} from '../src/replacement-prevention.js';
import cases from '../data/advanced-scenarios.json' with {type:'json'};
import wards from '../data/ward-scenarios.json' with {type:'json'};
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const scene=(n)=>structuredClone(replacementScenarios[n]);
test('24 new cases plus ten existing advanced cases exceed the 30 scenario gate',()=>{
 assert.equal(replacementScenarios.length,24);
 assert.equal(cases.length,4);
 assert.equal(wards.length,6);
 const all=[...replacementScenarios,...cases,...wards];
 assert.ok(all.length>=30);
 assert.equal(new Set(all.map(x=>x.id)).size,all.length);
 assert.ok(all.every(s=>s.version===PREVENTION_RULES_VERSION));
});
test('Every Step 8 case is immutable, wins by authored line, loses by wrong line',()=>{
 for(const c of replacementScenarios){
  const original=structuredClone(c);
  const win=replayReplacement(c,c.solution);
  const loss=replayReplacement(c,c.wrongLine);
  assert.equal(win.status,'won',c.id+' winning route');
  assert.equal(loss.status,'lost',c.id+' wrong route');
  assert.deepEqual(replayReplacement(c,c.solution),win,'Deterministic '+c.id);
  assert.deepEqual(c,original,'No scenario mutation '+c.id);
  assert.equal(win.events.at(-1).type,'window.closed');
 }
});
test('Order of Furnace of Rath and Healing Salve changes real damage outcome',()=>{
 let a=createReplacementGame(scene(0)),b=createReplacementGame(scene(0));
 assert.equal(replacementChooser(a),'player');
 assert.deepEqual(applicableEffects(a).map(x=>x.id),['double','shield']);
 a=chooseReplacement(a,{effectId:'shield',actor:'player'});
 assert.equal(a.status,'won');
 assert.equal(a.life.player,1);
 assert.equal(a.events.some(x=>x.type==='damage.prevented-all'),true);
 b=chooseReplacement(b,{effectId:'double',actor:'player'});
 assert.equal(b.pending.amount,4);
 assert.deepEqual(b.pending.applied,['double']);
 b=chooseReplacement(b,{effectId:'shield',actor:'player'});
 assert.equal(b.status,'lost');
 assert.equal(b.life.player,0);
 assert.equal(b.effects[0].used,true);
 assert.equal(b.events.filter(x=>x.type==='replacement.applied').length,1);
});
test('Controller of affected creature, not spell source, chooses and illegal choices fail atomically',()=>{
 const base=createReplacementGame(scene(4)),before=structuredClone(base);
 assert.equal(replacementChooser(base),'player');
 assert.throws(()=>chooseReplacement(base,{effectId:'double',actor:'opponent'}),/Only affected/);
 assert.throws(()=>chooseReplacement(base,{effectId:'bogus',actor:'player'}),/not applicable/);
 assert.deepEqual(base,before);
 const other=scene(4);
 other.permanents[0].controller='opponent';
 const altered=createReplacementGame(other);
 assert.equal(replacementChooser(altered),'opponent');
 assert.throws(()=>chooseReplacement(altered,{effectId:'shield',actor:'player'}),/Only affected/);
 assert.equal(chooseReplacement(altered,{effectId:'shield',actor:'opponent'}).status,'won');
});
test('Pariah changes the affected object; prevention shield on player no longer applies',()=>{
 let x=createReplacementGame(scene(16));
 assert.equal(x.pending.target,'player');
 x=chooseReplacement(x,{effectId:'redirect',actor:'player'});
 assert.equal(x.pending.target,'guard');
 assert.equal(x.status,'lost');
 assert.equal(x.permanents[0].zone,'graveyard');
 assert.equal(x.events.some(e=>e.type==='replacement.applied'&&e.kind==='redirect'),true);
});
test('The same replacement effect cannot apply twice to the same event',()=>{
 let x=createReplacementGame(scene(0));
 x=chooseReplacement(x,{effectId:'double',actor:'player'});
 assert.deepEqual(applicableEffects(x).map(x=>x.id),['shield']);
 assert.throws(()=>chooseReplacement(x,{effectId:'double',actor:'player'}),/not applicable/);
});
test('A used prevention shield deducts no more than its remaining capacity',()=>{
 let x=createReplacementGame(scene(12));
 x=chooseReplacement(x,{effectId:'double',actor:'player'});
 x=chooseReplacement(x,{effectId:'shield',actor:'player'});
 assert.equal(x.effects.find(x=>x.id==='shield').remaining,0);
 assert.ok(x.pending.amount>0);
 x=chooseReplacement(x,{effectId:'shield-two',actor:'player'});
 assert.equal(x.status,'lost');
});
test('Replay refuses extra moves, unknown actions and incorrect rules versions',()=>{
 const c=scene(0);c.version='sb-mtg-training-0.3.0';
 assert.throws(()=>createReplacementGame(c),/Wrong rules version/);
 assert.throws(()=>replayReplacement(scene(0),[{action:'unlimited'}]),/Invalid replay action/);
 assert.throws(()=>replayReplacement(scene(0),Array(31).fill({action:'choose',effectId:'shield',actor:'player'})),/Invalid replay length/);
 let s=replayReplacement(scene(0),scene(0).solution);
 assert.throws(()=>chooseReplacement(s,{effectId:'double',actor:'player'}),/closed/);
});
test('Step 8 is Lab-only, keeps the 250 Classic IDs and does not write saves',()=>{
 const core=JSON.parse(read('data/scenarios.json'));
 const expansion=JSON.parse(read('data/campaign-expansion.json'));
 assert.equal(core.length+expansion.length,30);
 assert.ok(!read('src/replacement-prevention.js').includes('localStorage'));
 assert.ok(!read('data/replacement-scenarios.js').includes('fetch('));
 assert.ok(!read('src/engine.js').includes('replacement-prevention'));
 assert.ok(!read('src/daily.js').includes('replacement-prevention'));
});
