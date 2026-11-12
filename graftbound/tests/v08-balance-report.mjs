// v0.8 balance report (directional, naive bots). Run: node tests/v08-balance-report.mjs
import { ARCHETYPES, archetype, fight } from './balance-lib.mjs';
import { winRate } from './sim.mjs';
const N = +process.env.N || 12; const pct = x => Math.round(x * 100) + '%';
console.log('| Build | Act | Elite win (guarding / never guards) | Boss win (guarding / never) | Boss dmg taken (guarding / never) |\n|---|---|---|---|---|');
for (const name of Object.keys(ARCHETYPES)) for (const act of [0, 1, 2]) {
  const a = archetype(name, act); const eS = fight({ ...a, act, tier: 'elite', n: N }), eN = fight({ ...a, act, tier: 'elite', n: N, tactics: false });
  const bS = fight({ ...a, act, tier: 'boss', n: N }), bN = fight({ ...a, act, tier: 'boss', n: N, tactics: false });
  console.log(`| ${name} | ${['I', 'II', 'III'][act]} | ${pct(eS.rate)} / ${pct(eN.rate)} | ${pct(bS.rate)} / ${pct(bN.rate)} | ${bS.taken.toFixed(1)} / ${bN.taken.toFixed(1)} |`);
}
for (const p of ['greedy', 'random', 'melee', 'tank', 'spells', 'flyDeath']) { const r = winRate(N * 2, { policy: p }); console.log(`full adventure · ${p}: win ${pct(r.rate)} · reached Act II ${pct(r.actReached[1])} · Act III ${pct(r.actReached[2])} · turns/battle ${r.avgTurns.toFixed(1)}`); }
