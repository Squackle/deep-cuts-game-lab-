import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARDS,LANDS} from '../src/cards.js';
import {commanderScenario} from '../src/commander.js';
import {generateStages} from '../src/galaxies.js';
import {createGame,validateScenario,legalActions,legalTargets,tapLand,activate,playLand,autoplay} from '../src/engine.js';
const read=name=>JSON.parse(readFileSync(new URL('../data/'+name,import.meta.url),'utf8'));
const original=[...read('scenarios.json'),...read('campaign-expansion.json')];
const scenes=[...original,...generateStages(original)].map((s,i)=>commanderScenario(s,i));
test('all 250 puzzles show actual lands, creatures, enchantments and nontrivial interaction choices',()=>{
 assert.equal(scenes.length,250);
 assert.equal(scenes[5].title,'The Final Exchange');
 let artifacts=0,sorceries=0,flash=0;
 for(const p of scenes){
  const hand=p.hand.filter(a=>!a.sourceId),names=hand.map(a=>a.card),kinds=hand.map(a=>LANDS[a.card]?'Land':CARDS[a.card]?.type||'?');
  assert.equal(hand.length,7,p.id+' must have exactly seven physical cards');
  assert.ok(kinds.some(x=>x==='Land'),p.id+' no land');
  assert.ok(kinds.some(x=>x.startsWith('Creature')),p.id+' no creature');
  assert.ok(kinds.some(x=>x.startsWith('Enchantment')),p.id+' no enchantment');
  assert.ok(kinds.some(x=>x==='Instant'),p.id+' no responses');
  assert.equal(new Set(names.filter(n=>!LANDS[n])).size,names.filter(n=>!LANDS[n]).length,p.id+' duplicate nonbasic in hand');
  assert.deepEqual(validateScenario(p),{valid:true,errors:[]},p.id);
  artifacts+=kinds.filter(x=>x.startsWith('Artifact')).length;
  sorceries+=kinds.filter(x=>x.startsWith('Sorcery')).length;
  flash+=hand.filter(x=>CARDS[x.card]?.flash).length;
 }
 assert.ok(artifacts>=10,'Commander artifacts should appear in campaign');
 assert.ok(sorceries>=10,'Sorcery-speed ramp should appear in campaign');
 assert.ok(flash>=10,'Flash creatures should appear in campaign');
});
test('realistic hands preserve intended solutions and no-response losses for every stage',()=>{
 for(const p of scenes){
  let s=createGame(p);assert.equal(autoplay(s).status,'lost',p.id+' no-response outcome');
  for(const land of s.lands)s=tapLand(s,land.id);
  for(const [id,target] of p.solution){
   assert.ok(legalActions(s).includes(id),p.id+' solution action '+id);
   assert.ok(legalTargets(s,s.hand.find(a=>a.id===id)).includes(target),p.id+' illegal solution target');
   s=activate(s,id,target);
  }
  assert.equal(autoplay(s).status,'won',p.id+' failed intended solution');
 }
});
test('reacting cannot play a basic land, normal creature, enchantment or sorcery; flash creature is legal',()=>{
 const p=structuredClone(scenes[2]);
 p.hand=[{id:'hand-land',card:'Forest'},{id:'normal-creature',card:'Llanowar Elves'},{id:'ench',card:'Sylvan Library'},{id:'sorcery',card:'Cultivate'},{id:'flash',card:'Ambush Viper'}];
 p.lands=Array.from({length:5},(_,i)=>({id:'additional-'+i,card:'Forest',controller:'player'}));
 assert.deepEqual(validateScenario(p),{valid:true,errors:[]});
 let s=createGame(p);
 for(const land of s.lands)s=tapLand(s,land.id);
 const a=legalActions(s);
 assert.ok(a.includes('flash'));
 for(const id of ['hand-land','normal-creature','ench','sorcery'])assert.ok(!a.includes(id),'should not be playable in response: '+id);
 assert.throws(()=>playLand(s,'hand-land'),/main phase/);
 s=activate(s,'flash',null);
 assert.equal(s.stack.at(-1).card,'Ambush Viper');
 const won=autoplay(s);
 assert.ok(won.units.some(u=>u.card==='Ambush Viper'&&u.zone==='battlefield'),'flash creature resolves onto battlefield');
});
test('a legal main phase permits exactly one land play as a special action, and enchantments use stack',()=>{
 const p=structuredClone(scenes[2]);
 p.hand=[{id:'hand-land',card:'Forest'},{id:'hand-land2',card:'Forest'},{id:'ench',card:'Sylvan Library'}];
 p.lands=Array.from({length:4},(_,i)=>({id:'field-'+i,card:'Forest',controller:'player'}));
 let s=createGame(p);s.stack=[];s.activeActor='player';s.currentActor='player';s.phase='main';
 s=playLand(s,'hand-land');
 assert.equal(s.stack.length,0);
 assert.ok(s.lands.some(l=>l.id==='played-hand-land'));
 assert.ok(s.used.includes('hand-land'));
 assert.throws(()=>playLand(s,'hand-land2'),/one land/);
 for(const land of s.lands)s=tapLand(s,land.id);
 assert.ok(legalActions(s).includes('ench'),'enchantment should be castable on an empty main-phase stack');
 s=activate(s,'ench',null);
 assert.equal(s.stack.at(-1).card,'Sylvan Library');
 s=autoplay(s);
 assert.ok(s.enchantments.some(x=>x.card==='Sylvan Library'),'enchantment should enter battlefield');
});
