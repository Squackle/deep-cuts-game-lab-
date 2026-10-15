import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateStages} from '../src/galaxies.js';
import {commanderScenario,HAND_SIZE} from '../src/commander.js';
import {CARDS,LANDS,isCreature} from '../src/cards.js';
import {createGame,validateScenario,tapLand,activate,legalActions,legalTargets,autoplay} from '../src/engine.js';
const load=n=>JSON.parse(readFileSync(new URL('../data/'+n,import.meta.url),'utf8'));
const original=[...load('scenarios.json'),...load('campaign-expansion.json')];
const newCases=generateStages(original);
const cases=[...original,...newCases].map((p,i)=>commanderScenario(p,i));
function solve(p){
 let s=createGame(p);for(const l of s.lands)s=tapLand(s,l.id);
 for(const [id,target] of p.solution){
  assert.ok(legalActions(s).includes(id),p.id+' missing '+id);
  assert.ok(legalTargets(s,s.hand.find(x=>x.id===id)).includes(target),p.id+' target '+target);
  s=activate(s,id,target);
 }
 return autoplay(s);
}
test('all 250 levels start with exactly seven physical Commander cards',()=>{
 assert.equal(cases.length,250);
 for(const p of cases){
  assert.deepEqual(validateScenario(p),{valid:true,errors:[]},p.id);
  const physical=p.hand.filter(x=>!x.sourceId);
  assert.equal(physical.length,HAND_SIZE,p.id+' physical hand');
  assert.ok(physical.some(x=>!!LANDS[x.card]),p.id+' no land');
  assert.ok(physical.some(x=>CARDS[x.card]?.type.includes('Creature')),p.id+' no creature');
  assert.ok(physical.some(x=>CARDS[x.card]?.type.startsWith('Enchantment')),p.id+' no enchantment');
  const owned=[...p.units.filter(x=>x.controller==='player'),...p.stack.filter(x=>x.controller==='player'),...physical.filter(x=>!LANDS[x.card])].map(x=>x.card);
  assert.equal(owned.length,new Set(owned).size,p.id+' breaks singleton');
 }
});
test('letting a creature die while staying alive is a real winning line',()=>{
 const pool=cases.filter(p=>p.lessonKind==='letDie');
 assert.ok(pool.length>=5,'not enough let-die situations');
 for(const p of pool){
  assert.equal(autoplay(createGame(p)).status,'lost',p.id+' no response must lose');
  const won=solve(p);
  assert.equal(won.status,'won',p.id);
  assert.equal(won.units.find(u=>u.id===p.expectedCasualty)?.zone,'graveyard',p.id+' should actually allow the casualty');
  assert.ok(won.life.player>0,p.id);
 }
});
test('Brindle Boar and Bottle Gnomes really leave battlefield as sacrifice costs and gain life',()=>{
 assert.equal(isCreature('Bottle Gnomes'),true,'artifact creature must count as creature');
 const pool=cases.filter(p=>['sacrifice','sacrificeAndLetDie'].includes(p.lessonKind));
 assert.ok(pool.length>=15,'too few sacrifice-based choices');
 assert.ok(pool.some(p=>p.units.some(u=>u.card==='Brindle Boar')));
 assert.ok(pool.some(p=>p.units.some(u=>u.card==='Bottle Gnomes')));
 for(const p of pool){
  const response=p.solution.find(([id])=>p.hand.some(a=>a.id===id&&a.sourceId));
  assert.ok(response,p.id+' missing real battlefield activated ability');
  let s=createGame(p);
  const ability=s.hand.find(x=>x.id===response[0]);
  assert.ok(legalActions(s).includes(ability.id),p.id+' activation illegal');
  s=activate(s,ability.id,null);
  assert.equal(s.units.find(x=>x.id===ability.sourceId)?.zone,'graveyard',p.id+' sacrifice must happen as activation cost');
  assert.ok(s.stack.some(x=>x.id===ability.id&&x.spell===false),p.id+' ability remains on stack');
  assert.equal(solve(p).status,'won',p.id+' sacrifice line does not win');
 }
});
test('sacrifice/let-die lessons are distributed among other skills, not clustered into one galaxy',()=>{
 for(let gi=1;gi<5;gi++){
  const region=cases.slice(gi*50,(gi+1)*50);
  const pivots=region.filter(p=>p.lessonKind);
  assert.ok(pivots.length>=8,'not enough strategic alternatives galaxy '+(gi+1)+': '+pivots.length);
  assert.ok(pivots.length<=20,'strategic lessons crowd out other MTG interactions');
  assert.ok(region.some(p=>!p.lessonKind),'other tactics must remain present');
 }
});
