// Prints the balance matrix used in docs/BALANCE-v0.5.md. Run: node tests/sim-report.mjs
import { ARCHETYPES, archetype, fight } from './balance-lib.mjs';
import { winRate } from './sim.mjs';
const N = +process.env.N || 20;
console.log('| Build | Act | Battles win% / dmg taken / turns | Elites win% / dmg | Boss win% / dmg taken |\n|---|---|---|---|---|');
for (const name of Object.keys(ARCHETYPES)) for (const act of [0, 1, 2]) {
  const b = fight({ ...archetype(name, act), act, tier: 'battle', n: N }), e = fight({ ...archetype(name, act), act, tier: 'elite', n: N }), x = fight({ ...archetype(name, act), act, tier: 'boss', n: N });
  console.log(`| ${name} | ${['I', 'II', 'III'][act]} (max HP ${b.maxHp}) | ${Math.round(b.rate * 100)}% / ${b.taken.toFixed(1)} / ${b.turns.toFixed(1)} | ${Math.round(e.rate * 100)}% / ${e.taken.toFixed(1)} | ${Math.round(x.rate * 100)}% / ${x.taken.toFixed(1)} |`);
}
for (const p of ['greedy', 'random', 'melee', 'tank', 'spells', 'flyDeath']) {
  const r = winRate(N, { policy: p });
  console.log(`full adventure · ${p}: win ${Math.round(r.rate * 100)}% · reached Act II ${Math.round(r.actReached[1] * 100)}% · Act III ${Math.round(r.actReached[2] * 100)}% · turns/battle ${r.avgTurns.toFixed(1)} · final P/T ${(r.runs.reduce((a, x) => a + x.power, 0) / N).toFixed(1)}/${(r.runs.reduce((a, x) => a + x.toughness, 0) / N).toFixed(1)}`);
}
