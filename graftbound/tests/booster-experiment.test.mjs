// Test-only experiment: preserve r32's exact three-card pack, then fill extra
// slots through the same eligibility / rarity functions with a domain-separated seed.
// No production caller, save format, ranked revision or runtime file is changed.
import test from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { evoWith } from './helpers.mjs';
import { makeRng } from '../src/core/rng.js';
import { cardPool, generatePack, rarityFirstPick, rarityWeights } from '../src/engine/rewards.js';
import { resolveCard } from '../src/cards/catalog.js';
import { newRun, chooseReward } from '../src/engine/run.js';

function experimentalPack(seed,opts){
 const base=generatePack(seed,opts);
 const target=opts.tier==='elite'||opts.tier==='boss'?5:opts.tier==='battle'?4:3;
 if(target===3||opts.forced?.length||opts.creaturesOnly||opts.only)return base;
 const result=base.slice(),pool=cardPool(opts),rng=makeRng(seed^0x50345233);
 while(result.length<target){
  const candidate=rarityFirstPick(rng,pool.filter(c=>!result.includes(c.id)),rarityWeights(opts.step,opts.tier));
  if(!candidate)break;
  result.push(candidate.id);
 }
 return result;
}
const builds=[
 {evo:evoWith(),spellbook:[],equipmentInventory:[]},
 {evo:evoWith('mtg:essence-warden','mtg:bloodthirsty-aerialist'),spellbook:[{id:'mtg:opt',level:1}],equipmentInventory:['mtg:shadowspear']},
 {evo:evoWith('mtg:kessig-flamebreather','mtg:welcoming-vampire'),spellbook:[{id:'mtg:shock',level:3},{id:'mtg:harmonize',level:1}],equipmentInventory:['mtg:skullclamp']}
];
const high=ids=>ids.filter(id=>['rare','mythic'].includes(resolveCard(id).rarity)).length;
test('separate four/five-card experiment: 200 matched seeds per depth, tier, build and rarity restriction',()=>{
 const metrics={};
 for(const tier of ['battle','elite','boss'])for(const step of [3,15,20])for(const [build,config] of builds.entries())for(const noRares of [false,true]){
  const opts={...config,tier,step,noRares},eligible=new Set(cardPool(opts).map(c=>c.id));
  const size=tier==='battle'?4:5;
  const m=metrics[tier]||={cases:0,baseOffers:0,extraOffers:0,baseHigh:0,extraHigh:0,basePacksHigh:0,expandedPacksHigh:0,baseVerdant:0,expandedVerdant:0,short:0};
  for(let seed=1;seed<=200;seed++){
   const base=generatePack(seed,opts),expanded=experimentalPack(seed,opts);
   assert.deepEqual(expanded,experimentalPack(seed,opts));
   assert.deepEqual(expanded.slice(0,base.length),base);
   assert.equal(expanded.length,Math.min(size,eligible.size));
   assert.equal(new Set(expanded).size,expanded.length);
   assert.ok(expanded.every(id=>eligible.has(id)));
   if(noRares)assert.equal(high(expanded),0);
   const cards=expanded.map(resolveCard);
   if(cardPool(opts).some(c=>c.kind==='creature'))assert.ok(cards.some(c=>c.kind==='creature'));
   if(cardPool(opts).some(c=>c.kind==='spell'))assert.ok(cards.some(c=>c.kind==='spell'));
   m.cases++;m.baseOffers+=base.length;m.extraOffers+=expanded.length-base.length;m.baseHigh+=high(base);m.extraHigh+=high(expanded)-high(base);m.basePacksHigh+=Number(high(base)>0);m.expandedPacksHigh+=Number(high(expanded)>0);m.baseVerdant+=Number(base.includes('mtg:verdant-force'));m.expandedVerdant+=Number(expanded.includes('mtg:verdant-force'));m.short+=Number(expanded.length<size);
  }
 }
 console.log('BOOSTER_MATCHED_METRICS '+JSON.stringify(metrics));
});
test('experiment does not alter shrine, restricted or forced offers; choosing one consumes the whole pack',()=>{
 const shrine={tier:'shrine',step:15},graft={tier:'elite',step:15,creaturesOnly:true};
 for(const opts of [shrine,graft,{tier:'battle',step:15,forced:['mtg:opt']}])assert.deepEqual(experimentalPack(99,opts),generatePack(99,opts));
 for(const tier of ['battle','elite','boss']){
  const run=newRun({seed:41});
  const offers=experimentalPack(41,{tier,step:15});
  run.phase='reward';run.primerDone=true;run.pending={cards:offers,tier,boss:false};
  chooseReward(run,offers[0]);
  assert.equal(run.pending,null);assert.equal(run.phase,'map');
  assert.throws(()=>chooseReward(run,offers[1]));
 }
});
