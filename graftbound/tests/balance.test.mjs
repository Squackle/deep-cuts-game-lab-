import test from 'node:test'; import assert from 'node:assert/strict';
import { ARCHETYPES, archetype, fight } from './balance-lib.mjs';
import { winRate } from './sim.mjs';
const NAMES = Object.keys(ARCHETYPES);
const table = {};
for (const name of NAMES) for (const act of [0, 1, 2]) for (const tier of ['battle', 'elite', 'boss']) table[`${name}.${act}.${tier}`] = fight({ ...archetype(name, act), act, tier, n: 12 });

test('no unwinnable content: every archetype can win normal battles in every act', () => {
  for (const name of NAMES) for (const act of [0, 1, 2]) assert.ok(table[`${name}.${act}.battle`].rate >= 0.25, `${name} act ${act}: ${table[`${name}.${act}.battle`].rate}`);
});
test('no unbeatable combination: for every archetype some boss either defeats it or costs ≥ 40% of its health', () => {
  for (const name of NAMES) {
    const hard = [0, 1, 2].some(a => { const b = table[`${name}.${a}.boss`]; return b.rate < 1 || b.taken >= 0.4 * b.maxHp; });
    assert.ok(hard, name + ' ' + [0, 1, 2].map(a => JSON.stringify(table[`${name}.${a}.boss`])).join(' '));
  }
});
test('bosses are the most dangerous fights: they cost more health than normal battles for most builds', () => {
  let more = 0; for (const name of NAMES) for (const act of [0, 1, 2]) if (table[`${name}.${act}.boss`].taken >= table[`${name}.${act}.battle`].taken) more++;
  assert.ok(more >= NAMES.length * 3 * 0.65, `${more}/${NAMES.length * 3}`);
});
test('builds play differently: defensive builds take less damage per normal battle than glass melee', () => {
  const avg = (n, k) => [0, 1, 2].reduce((a, act) => a + table[`${n}.${act}.battle`][k], 0) / 3;
  assert.ok(avg('tank', 'taken') < avg('melee', 'taken') || avg('lifelink', 'taken') < avg('melee', 'taken'));
});
test('full adventures (naive bot): challenging but winnable; considered picks beat random picks', () => {
  // v0.8: adaptive counter-reinforcements narrow the gap between strong and weak builds by design, so "considered
  // picks beat random" is measured as overall progress (acts reached + wins) over 32 seeds, not win rate on 16.
  const g = winRate(32, { policy: 'greedy' }), r = winRate(32, { policy: 'random' });
  const progress = x => x.actReached[1] + x.actReached[2] + x.rate;
  console.log('greedy', g.rate, g.actReached, 'random', r.rate, r.actReached);
  assert.ok(g.rate >= 0.1 && g.rate <= 0.75, 'greedy ' + g.rate); assert.ok(progress(r) < progress(g), 'random ' + progress(r) + ' vs ' + progress(g));
  assert.ok(g.runs.some(x => !x.won && x.act >= 1), 'later acts claim runs');
});
test('stat growth stays bounded by graft capacity (v0.4 sims reached 30/29 by mid-campaign)', () => {
  const g = winRate(10, { policy: 'greedy' }); const avgP = g.runs.reduce((a, r) => a + r.power, 0) / g.runs.length;
  for (const r of g.runs) assert.ok(r.power <= 42 && r.toughness <= 42, `${r.power}/${r.toughness}`);
  assert.ok(avgP <= 30, 'average final power ' + avgP);
});
export { table };
