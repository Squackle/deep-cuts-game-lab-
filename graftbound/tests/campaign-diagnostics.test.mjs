import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateRun } from './sim.mjs';

// Fixed matched seeds, current actual campaign/deck rules. This is a diagnostic
// of one automated reward/play policy, not an assertion that human balance is fair.
test('matched-seed campaign diagnostics expose build progression and bottleneck encounters', () => {
  const seeds = Array.from({ length: 6 }, (_, i) => (i + 1) * 7919);
  for (const policy of ['melee', 'tank', 'spells', 'summoner', 'flyDeath']) {
    const runs = seeds.map(seed => simulateRun(seed, { policy }));
    assert.deepEqual(simulateRun(seeds[0], { policy }), runs[0], policy + ' must be deterministic');
    const all = runs.flatMap(r => r.per);
    assert.ok(all.length > 0);
    assert.ok(all.every(e => Number.isFinite(e.enemyDamage) && e.enemyDamage >= 0 && e.maxHp > 0));
    const groups = {};
    for (const e of all) {
      const key = e.act + ':' + e.type;
      const g = groups[key] ||= { fights: 0, wins: 0, damageRatio: 0, turns: 0 };
      g.fights++; g.wins += Number(e.won); g.damageRatio += e.enemyDamage / e.maxHp; g.turns += e.turns;
    }
    const summary = Object.fromEntries(Object.entries(groups).map(([k,g]) => [k, {
      fights: g.fights, wins: g.wins,
      meanDamageRatio: +(g.damageRatio / g.fights).toFixed(3),
      meanTurns: +(g.turns / g.fights).toFixed(2),
    }]));
    console.log('Campaign diagnostic:', JSON.stringify({
      policy, runs: runs.length, completed: runs.filter(r => r.won).length,
      reachedAct2: runs.filter(r => r.act >= 1).length,
      reachedAct3: runs.filter(r => r.act >= 2).length, encounters: summary,
    }));
  }
});
