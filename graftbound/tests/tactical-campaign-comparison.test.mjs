import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './helpers.mjs';
import { selectTacticalCast } from './tactical-cast-policy.mjs';
import { player, enemies } from '../src/engine/combat.js';
import { simulateRun } from './sim.mjs';

test('tactical policy buffs an ally instead of the enemy, without mutating the source', () => {
  const s = arena(['P..', '..g'], { g: 'grub' }, { spellbook: [{id:'mtg:giant-growth',level:1}] });
  s.p.mana = 10; const original = structuredClone(s);
  const action = selectTacticalCast(s,'mtg:giant-growth');
  assert.deepEqual([action.x,action.y],[player(s).x,player(s).y]);
  assert.deepEqual(s, original);
});
test('tactical policy declines a lethal friendly-fire spell', () => {
  const s = arena(['Pg.','...'], { g:'grub' }, {spellbook:[{id:'mtg:pyroclasm',level:1}]});
  player(s).hp=1; enemies(s)[0].hp=10; s.p.mana=10;
  assert.equal(selectTacticalCast(s,'mtg:pyroclasm'),null);
});
test('matched-seed tactical comparison reports actual encounter and card choices', () => {
  const seeds=Array.from({length:6},(_,i)=>(i+1)*7919);
  for (const policy of ['melee','tank','spells','summoner','flyDeath']) {
    const runs=seeds.map(seed=>simulateRun(seed,{policy,smarterSpells:true}));
    assert.deepEqual(simulateRun(seeds[0],{policy,smarterSpells:true}),runs[0]);
    const encounters={}, cards={};
    for (const run of runs) {
      for (const e of run.per) {
        const key=e.act+':'+e.type+':'+e.name;
        const g=encounters[key]||={attempts:0,wins:0,damageRatio:0};
        g.attempts++;g.wins+=Number(e.won);g.damageRatio+=e.enemyDamage/e.maxHp;
      }
      for (const p of run.picks||[]) for(const id of p.offered){
        const g=cards[id]||={offers:0,picks:0};g.offers++;g.picks+=Number(p.picked===id);
      }
    }
    const bottlenecks=Object.entries(encounters).filter(([,g])=>g.wins<g.attempts).sort((a,b)=>(b[1].attempts-b[1].wins)-(a[1].attempts-a[1].wins)||a[0].localeCompare(b[0]));
    const picks=Object.entries(cards).filter(([,g])=>g.picks>=2||g.offers>=3).sort((a,b)=>b[1].picks-a[1].picks||a[0].localeCompare(b[0])).slice(0,20);
    console.log('Tactical comparison:',JSON.stringify({policy,runs:6,completed:runs.filter(r=>r.won).length,reachedAct2:runs.filter(r=>r.act>=1).length,reachedAct3:runs.filter(r=>r.act>=2).length,bottlenecks,picks}));
  }
});
