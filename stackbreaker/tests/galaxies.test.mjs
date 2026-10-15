import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARDS,LANDS} from '../src/cards.js';
import {GALAXIES,makeWorlds,generateStages} from '../src/galaxies.js';
import {createGame,validateScenario,tapLand,activate,legalActions,legalTargets,autoplay} from '../src/engine.js';
const read=name=>JSON.parse(readFileSync(new URL('../data/'+name,import.meta.url),'utf8'));
const original=[...read('scenarios.json'),...read('campaign-expansion.json')];
const fresh=generateStages(original);
const all=[...original,...fresh],worlds=makeWorlds();
test('250 unique stages in five galaxies, 25 worlds, ten levels per world',()=>{
 assert.equal(GALAXIES.length,5);
 assert.equal(worlds.length,25);
 assert.equal(fresh.length,220);
 assert.equal(all.length,250);
 assert.equal(new Set(all.map(x=>x.id)).size,250);
 assert.equal(original[5].title,'The Final Exchange');
 for(let i=0;i<25;i++){
  assert.equal(worlds[i].start,i*10+1);
  assert.equal(worlds[i].end,(i+1)*10);
  assert.equal(worlds[i].galaxy,Math.floor(i/5));
 }
});
test('each galaxy puzzle has a deterministic legal solution and fails if unanswered',()=>{
 const arrangements=new Set(),usedCards=new Set(),objectiveTypes=new Set();
 for(const p of fresh){
  assert.deepEqual(validateScenario(p),{valid:true,errors:[]},p.id);
  assert.ok(p.solution?.length,p.id+' has no authored winning line');
  objectiveTypes.add(p.objective.type);
  for(const x of [...p.units,...p.stack,...p.hand]){assert.ok(CARDS[x.card],p.id+' '+x.card);usedCards.add(x.card);}
  for(const l of p.lands)assert.ok(LANDS[l.card],l.card);
  arrangements.add(JSON.stringify([p.units.map(x=>x.card),p.stack.map(x=>x.card),p.hand.map(x=>x.card),p.objective,p.lands.map(x=>x.card),p.life]));
  let state=createGame(p);assert.equal(autoplay(state).status,'lost',p.id+' wins without responding');
  for(const l of state.lands)state=tapLand(state,l.id);
  for(const [id,target] of p.solution){
   assert.ok(legalActions(state).includes(id),p.id+' unaffordable '+id+' / '+state.log.join(' | '));
   const a=state.hand.find(x=>x.id===id);
   assert.ok(legalTargets(state,a).includes(target),p.id+' invalid target '+target);
   state=activate(state,id,target);
  }
  const winning=autoplay(state);
  assert.equal(winning.status,'won',p.id+' '+winning.log.join(' | '));
  assert.deepEqual(autoplay(state),winning,p.id+' not reproducible');
 }
 assert.ok(usedCards.size>=30,'not enough distinct card identities: '+usedCards.size);
 assert.ok(arrangements.size>=100,'not enough distinct situations: '+arrangements.size);
 assert.ok(objectiveTypes.size>=4,'not enough different objectives: '+objectiveTypes.size);
});
test('new card adaptations for damage, toughness, protection, bounce and damage-life swing exist',()=>{
 for(const n of ['Pyroclasm','Languish','Disfigure',"Tamiyo's Safekeeping",'Lightning Helix','Vapor Snag'])assert.ok(CARDS[n],n);
});
