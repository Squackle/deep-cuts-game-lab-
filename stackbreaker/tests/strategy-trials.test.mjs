import test from 'node:test';
import assert from 'node:assert/strict';
import {STRATEGY_TRIALS,STRATEGY_TRIALS_VERSION,referenceSubsetEvidence}
 from '../src/strategy-trials.js';
import {validateScenario,createGame,tapLand,activate,autoplay,legalActions,legalTargets} from '../src/engine.js';
import core from '../data/scenarios.json' with {type:'json'};
import expansion from '../data/campaign-expansion.json' with {type:'json'};

test('seven curated unranked decision trials preserve every published original case',()=>{
 const source=[...core,...expansion];
 assert.equal(STRATEGY_TRIALS.length,7);
 assert.equal(new Set(STRATEGY_TRIALS.map(x=>x.id)).size,7);
 for(const p of STRATEGY_TRIALS){
  assert.ok(p.unranked);assert.equal(p.trialVersion,STRATEGY_TRIALS_VERSION);
  assert.deepEqual(validateScenario(p),{valid:true,errors:[]},p.id);
  assert.ok(p.strategyFocus&&p.strategyLesson&&p.intro);
  if(p.sourceId!==null)assert.ok(source.some(x=>x.id===p.sourceId));
  else assert.ok(['st-06','st-07'].includes(p.id));
  assert.ok(!source.some(x=>x.id===p.id));
  assert.ok(Array.isArray(p.solution)&&p.solution.length>=2);
 }
 assert.equal(source.length,30);
 assert.equal(source[6].id,'sb-07');
});

for(const scene of STRATEGY_TRIALS)test(scene.id+' published reference wins and no-response loses',()=>{
 let state=createGame(scene);
 assert.equal(autoplay(state).status,'lost','Doing nothing should not accidentally clear this trial');
 for(const land of state.lands)if(!land.tapped)state=tapLand(state,land.id);
 for(const [id,target] of scene.solution){
  assert.ok(legalActions(state).includes(id),'Reference response is unavailable: '+id);
  assert.ok(legalTargets(state,state.hand.find(x=>x.id===id)).includes(target),
   'Reference target illegal '+String(target));
  state=activate(state,id,target);
 }
 assert.equal(autoplay(state).status,'won','Original reference replay must legally solve this trial');
 const measure=referenceSubsetEvidence(scene);
 assert.equal(measure.status,'verified-subset',JSON.stringify(measure));
 assert.ok(measure.shortestReferenceSubset>=0);
 assert.ok(measure.shortestReferenceSubset<=scene.solution.length);
 assert.ok(measure.winningSubsetCount>=1);
 assert.ok(measure.witness.length===measure.shortestReferenceSubset);
 assert.ok(!('difficulty' in measure),'Never present reference length as empirical difficulty');
});

test('shorter legal Stackbreaker line is recognized without blocking an alternative win',()=>{
 const p=STRATEGY_TRIALS[0]; // sb-07: historical audit identified extra response.
 const result=referenceSubsetEvidence(p);
 assert.equal(result.status,'verified-subset');
 assert.equal(result.avoidablyLong,true,'Trial should exhibit a genuinely unnecessary cast');
 assert.ok(result.shortestReferenceSubset<p.solution.length);
 assert.equal(result.witness.length,result.shortestReferenceSubset);
});

test('budgeted reference analysis never claims minimum or unsolvability',()=>{
 const p=STRATEGY_TRIALS[0];
 const exceeded=referenceSubsetEvidence(p,{maxResponses:1});
 assert.equal(exceeded.status,'inconclusive');
 assert.equal(exceeded.shortestReferenceSubset,null);
 assert.ok(!('minimum' in exceeded));
 const missing=referenceSubsetEvidence({...p,solution:[]});
 assert.equal(missing.status,'inconclusive');
 assert.equal(missing.shortestReferenceSubset,null);
});
