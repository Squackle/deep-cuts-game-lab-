import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateStages} from '../src/galaxies.js';
import {commanderScenario} from '../src/commander.js';
import {validateScenario,createGame,tapLand,legalActions,legalTargets,activate,autoplay} from '../src/engine.js';
import {CARDS} from '../src/cards.js';
const read=x=>JSON.parse(readFileSync(new URL('../data/'+x,import.meta.url),'utf8'));
const old=[...read('scenarios.json'),...read('campaign-expansion.json')];
const created=generateStages(old);
const campaign=[...old,...created].map((p,i)=>commanderScenario(p,i));
const quotas=[2,3,4,5,6];
test('the full campaign retains 250 IDs and makes every generated response grade concrete',()=>{
 assert.equal(campaign.length,250);
 assert.equal(campaign[5].title,'The Final Exchange');
 assert.equal(created.length,220);
 const bands=[[],[],[],[],[]];
 for(let n=31;n<=250;n++){
  const p=created[n-31],g=Math.floor((n-1)/50),stage=(n-1)%10;
  const expected=quotas[g]+(g===4&&stage===9?1:0);
  assert.equal(p.solution.length,expected,p.id+' difficulty failed');
  assert.equal(p.difficulty.requiredResponses,expected,p.id);
  assert.equal(p.difficulty.galaxy,g+1,p.id);
  assert.equal(p.par,expected,p.id);
  assert.ok(p.stack.length>=1+p.difficulty.addedThreats,p.id);
  bands[g].push(expected);
 }
 const means=bands.map(v=>v.reduce((a,b)=>a+b,0)/v.length);
 for(let g=2;g<5;g++)assert.ok(means[g]>means[g-1],JSON.stringify(means));
 assert.ok(means[4]>=6,'final galaxy must demand at least six distinct replies');
});
test('advanced levels need distinct real stack targets and singleton response cards',()=>{
 let multi=0;
 for(let n=101;n<=250;n++){
  const p=campaign[n-1];
  assert.deepEqual(validateScenario(p),{valid:true,errors:[]},p.id);
  assert.ok(p.solution.length>=4,p.id);
  const seen=new Set();
  for(const [id,target] of p.solution){
   const a=p.hand.find(x=>x.id===id);
   assert.ok(a,p.id+' response missing '+id);
   if(!a.sourceId){assert.ok(!seen.has(a.card),p.id+' duplicated response '+a.card);seen.add(a.card);}
   assert.ok(target===null||target==='player'||target==='opponent'||p.units.some(x=>x.id===target)||p.stack.some(x=>x.id===target),p.id+' target gone '+target);
  }
  if(p.difficulty.addedThreats>=2)multi++;
 }
 assert.ok(multi>85,'far too few layered threat cases: '+multi);
 const uncounterable=campaign.filter(p=>p.difficulty?.galaxy>=4&&p.solution.some(([id])=>p.hand.find(x=>x.id===id)?.card==='Hallow'));
 assert.ok(uncounterable.length>=25,'too few real prevention-vs-counter traps: '+uncounterable.length);
});
test('all 220 escalating challenges have verified payable wins, and no-response failure',()=>{
 for(let n=31;n<=250;n++){
  const p=campaign[n-1];
  let s=createGame(p);
  assert.equal(autoplay(s).status,'lost',p.id+' should punish passive play');
  for(const land of s.lands)s=tapLand(s,land.id);
  for(const [id,target] of p.solution){
   assert.ok(legalActions(s).includes(id),p.id+' cannot cast '+id+' with '+JSON.stringify(s.mana));
   assert.ok(legalTargets(s,s.hand.find(x=>x.id===id)).includes(target),p.id+' illegal '+target);
   s=activate(s,id,target);
  }
  assert.equal(autoplay(s).status,'won',p.id+' intended chain fails');
 }
});
test('all added response cards represent actual counters and all added threats are real burn instants',()=>{
 for(const p of created){
  for(const [id,target] of p.solution.filter(([id])=>id.startsWith('answer-'))){
   const a=p.hand.find(x=>x.id===id),threat=p.stack.find(x=>x.id===target);
   if(a.card==='Hallow'){
    assert.equal(CARDS[a.card].effect,'preventSpellDamage');
    assert.equal(CARDS[threat.card].uncounterable,true,p.id+' Hallow should answer an uncounterable threat');
   }else assert.equal(CARDS[a.card].effect,'counter',p.id+': '+a.card);
   assert.equal(CARDS[threat.card].type,'Instant',p.id+': '+threat.card);
   assert.equal(CARDS[threat.card].effect,'damage',p.id);
   assert.equal(threat.targetId,'player',p.id);
  }
 }
});
