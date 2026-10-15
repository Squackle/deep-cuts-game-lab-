import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {commanderScenario,HAND_SIZE} from '../src/commander.js';
import {generateStages} from '../src/galaxies.js';
import {CARDS,LANDS} from '../src/cards.js';
import {createGame,validateScenario,legalActions,legalTargets,tapLand,activate,autoplay} from '../src/engine.js';
const read=n=>JSON.parse(readFileSync(new URL('../data/'+n,import.meta.url),'utf8'));
const original=[...read('scenarios.json'),...read('campaign-expansion.json')];
const raw=[...original,...generateStages(original)];
const scenes=raw.map((p,i)=>commanderScenario(p,i));
test('250 preserved scenario identities and meaningful seven-card Commander hands',()=>{
 assert.equal(scenes.length,250);
 assert.equal(scenes[5].id,'sb-06');
 assert.equal(scenes[5].title,'The Final Exchange');
 for(const p of scenes){
  assert.deepEqual(validateScenario(p),{valid:true,errors:[]},p.id);
  assert.equal(p.hand.filter(a=>!a.sourceId).length,HAND_SIZE,p.id+' hand');
  assert.equal(p.commanderPractice,true);
  for(const owner of ['player','opponent']){
   const names=[...p.units.filter(x=>x.controller===owner),...p.stack.filter(x=>x.controller===owner),...(owner==='player'?p.hand.filter(a=>!a.sourceId):[])].map(x=>x.card);
   assert.equal(names.length,new Set(names).size,p.id+' duplicate '+owner+' nonbasic');
  }
  for(const l of p.lands)assert.ok(LANDS[l.card]&&l.controller==='player');
  for(const a of p.hand)assert.ok(CARDS[a.card],a.card);
  // Abilities in the activation list refer to the one real battlefield copy.
  for(const a of p.hand.filter(a=>a.sourceId))assert.ok(p.units.some(u=>u.id===a.sourceId&&u.card===a.card));
 }
});
test('all 250 commander hands preserve deterministic winning lines, with multiple affordable decisions',()=>{
 let alternateCount=0,anyPlayable=0;
 for(const p of scenes){
  let s=createGame(p);
  assert.equal(autoplay(s).status,'lost',p.id+' unexpectedly wins without playing');
  for(const land of s.lands)s=tapLand(s,land.id);
  const plays=legalActions(s).filter(id=>!s.hand.find(x=>x.id===id)?.sourceId);
  if(plays.length>=2)alternateCount++;
  if(plays.length>0)anyPlayable++;
  for(const [id,target] of p.solution){
   assert.ok(legalActions(s).includes(id),p.id+' cannot cast '+id+'; '+JSON.stringify(s.mana));
   assert.ok(legalTargets(s,s.hand.find(x=>x.id===id)).includes(target),p.id+' illegal target '+target);
   s=activate(s,id,target);
  }
  const result=autoplay(s);
  assert.equal(result.status,'won',p.id+' loss: '+result.log.join(' | '));
 }
 assert.equal(anyPlayable,scenes.length-1,'all cases except ability-only puzzles should have payable hand cards');
 assert.ok(alternateCount>=200,'too many forced-choice hands: '+alternateCount);
});
test('singleton substitutes distinct cards for legacy duplicate Dispel/Salve and repeated enemy bolts',()=>{
 for(const id of ['sb-09','sb-10','sb-12','sb-24','sb-30']){
  const p=scenes.find(x=>x.id===id);
  assert.ok(p.singletonSubstitutions?.length,p.id);
 }
 const case12=scenes.find(x=>x.id==='sb-12');
 assert.equal(case12.hand.filter(a=>a.card==='Healing Salve').length,1);
 assert.equal(case12.hand.filter(a=>a.card==='Dispel').length,1);
 assert.ok(case12.hand.some(a=>a.card==='Soothing Balm'));
 assert.ok(case12.hand.some(a=>a.card==='Arcane Denial'));
 assert.ok(case12.stack.some(a=>a.card==='Incinerate'||a.card==='Searing Spear'));
});
