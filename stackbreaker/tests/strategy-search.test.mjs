import test from 'node:test';
import assert from 'node:assert/strict';
import {RULES_VERSION} from '../src/cards.js';
import {searchStrategy,replayStrategy} from '../src/strategy-search.js';
import {STRATEGY_TRIALS} from '../src/strategy-trials.js';

const board=()=>({id:'test-graph',version:RULES_VERSION,title:'Two costs',intro:'Survive.',hint:'Choose.',explanation:'Pay.',tier:'Investigator',
 life:{player:1,opponent:20},mana:{U:1,R:1,G:1},lands:[],units:[],activeActor:'opponent',opponentPolicy:'alwaysPass',
 stack:[{id:'incoming',card:'Lightning Bolt',controller:'opponent',targetId:'player'}],
 hand:[{id:'negate',card:'Negate'},{id:'bolt',card:'Lightning Bolt'}],objective:{type:'survive'}});

test('complete graph includes alternate payments, losing successors and legal shortest replay',()=>{
 const scene=board(),a=searchStrategy(scene),b=searchStrategy(scene,{reverseActions:true});
 assert.equal(a.status,'complete');assert.equal(b.status,'complete');
 assert.deepEqual(a.metrics,b.metrics);
 assert.equal(a.states,b.states);assert.equal(a.edges,b.edges);
 assert.equal(a.metrics.shortestActions,a.witness.length);
 assert.ok(a.metrics.winningFirstSuccessors>1);
 assert.ok(a.metrics.losingFirstSuccessors>0);
 assert.equal(replayStrategy(scene,a.witness).status,'won');
 assert.equal(replayStrategy(scene,b.witness).status,'won');
});

test('budget exhaustion is not an unsolvability or difficulty claim',()=>{
 const scene=board(),tiny=searchStrategy(scene,{maxStates:1});
 assert.equal(tiny.status,'inconclusive');assert.equal(tiny.reason,'state-budget');assert.equal(tiny.metrics,null);
 const edge=searchStrategy(scene,{maxEdges:1});
 assert.equal(edge.status,'inconclusive');assert.equal(edge.reason,'edge-budget');assert.equal(edge.metrics,null);
 assert.throws(()=>searchStrategy(scene,{maxStates:0}),RangeError);
 const impossible={...scene,hand:[],mana:{}};
 assert.equal(searchStrategy(impossible).status,'unsolvable');
});

test('published trial samples stay read-only and bounded; any witness replays',()=>{
 for(const scene of STRATEGY_TRIALS){
  const before=JSON.stringify(scene);
  const out=searchStrategy(scene,{maxStates:180,maxEdges:600});
  assert.ok(['complete','inconclusive'].includes(out.status),scene.id);
  if(out.witness)assert.equal(replayStrategy(scene,out.witness).status,'won');
  assert.equal(JSON.stringify(scene),before);
 }
});

test('matched-length trial pair isolates scarce generic payment rather than click count',()=>{
 const easy=STRATEGY_TRIALS.find(p=>p.id==='st-06'),hard=STRATEGY_TRIALS.find(p=>p.id==='st-07');
 const a=searchStrategy(easy),b=searchStrategy(hard),reversed=searchStrategy(hard,{reverseActions:true});
 assert.equal(a.status,'complete');assert.equal(b.status,'complete');
 assert.equal(a.metrics.shortestActions,b.metrics.shortestActions);
 assert.ok(b.metrics.losingFirstSuccessors>a.metrics.losingFirstSuccessors);
 assert.deepEqual(b.metrics,reversed.metrics);
 assert.equal(replayStrategy(hard,b.witness).status,'won');
 assert.ok(b.metrics.shortestDistinctStateRoutes>=1);
 console.log('STACKBREAKER_MATCHED_PAIR '+JSON.stringify({easy:a.metrics,hard:b.metrics,states:[a.states,b.states]}));
});
test('report full trial coverage under fixed declared budgets',()=>{
 const rows=STRATEGY_TRIALS.map(p=>{const x=searchStrategy(p,{maxStates:3000,maxEdges:20000});if(x.witness)assert.equal(replayStrategy(p,x.witness).status,'won');return {id:p.id,status:x.status,reason:x.reason,states:x.states,edges:x.edges,metrics:x.metrics};});
 assert.ok(rows.every(r=>r.status==='complete'||r.status==='inconclusive'));
 console.log('STACKBREAKER_TRIAL_COVERAGE '+JSON.stringify(rows));
});

test('canonical search preserves small exact-state reachability and shortest distances',()=>{
 for(const p of STRATEGY_TRIALS){
  const a=searchStrategy(p,{maxStates:3000,maxEdges:20000});
  const b=searchStrategy(p,{maxStates:3000,maxEdges:20000,canonical:false});
  if(a.status==='complete'&&b.status==='complete')assert.equal(a.metrics.shortestActions,b.metrics.shortestActions,p.id);
  if(a.witness)assert.equal(replayStrategy(p,a.witness).status,'won',p.id);
  if(a.status==='complete'){
   const reversed=searchStrategy(p,{maxStates:3000,maxEdges:20000,reverseActions:true});
   assert.equal(reversed.status,'complete',p.id);assert.deepEqual(a.metrics,reversed.metrics,p.id);
  }
  console.log('STACKBREAKER_PRUNING '+JSON.stringify({id:p.id,canonical:a.status,raw:b.status,canonicalStates:a.states,rawStates:b.states,merged:a.mergedTransitions,metrics:a.metrics}));
 }
});
