import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateRun } from './sim.mjs';
import { CASES, CANDIDATE_VERSION, assessSnapshot } from './gameplay-depth-candidates.mjs';

test('actual campaign snapshot paired encounter candidate matrix',()=>{
 const reports={},seen=new Set();
 for(const policy of ['melee','tank','spells','summoner','flyDeath']){
  for(let i=1;i<=12;i++)simulateRun(i*7919,{policy,smarterSpells:true,onBattle:(s,ctx)=>{
   if(!Object.hasOwn(CASES,s.name))return;
   const key=s.name, id=ctx.seed+':'+ctx.policy+':'+ctx.node;
   const before=structuredClone(s),baseline=assessSnapshot(s,'baseline');
   seen.add(key);
   const entry=reports[key]||={attempts:0,baselineWins:0,variants:{},losses:[]};
   entry.attempts++;entry.baselineWins+=Number(baseline.result==='won');
   if(baseline.result!=='won'&&entry.losses.length<12)entry.losses.push({id,turns:baseline.turns,slime:baseline.slime,enemyDamage:baseline.enemyDamage,remaining:baseline.remaining,start:baseline.start});
   for(const variant of CASES[key]){
    const result=assessSnapshot(s,variant),v=entry.variants[variant]||={wins:0,improved:0,worsened:0,turnDelta:0};
    v.wins+=Number(result.result==='won');v.improved+=Number(baseline.result!=='won'&&result.result==='won');v.worsened+=Number(baseline.result==='won'&&result.result!=='won');v.turnDelta+=result.turns-baseline.turns;
   }
   assert.deepEqual(s,before,'research never mutates original snapshot');
  }});
 }
 assert.deepEqual([...seen].sort(),Object.keys(CASES).sort());
 for(const [encounter,report] of Object.entries(reports))console.log('Depth candidate:',JSON.stringify({version:CANDIDATE_VERSION,encounter,...report}));
});
