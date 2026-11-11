// Deterministic scoring (v0.6). Identical code runs in the browser (provisional) and on the server verifier.
import { SCORE, MULTIPLIER, PAR_PER_FOE, DAMAGE_BUDGET, SCORING_VERSION } from '../data/scoring.js';
export { SCORING_VERSION };

const tierOf = nodeType => (MULTIPLIER[nodeType] != null ? nodeType : 'battle');
/** Benchmarks fixed when the encounter is built (tier, act, starting foes). */
export function encounterBenchmarks(nodeType, act, foes) {
  const tier = tierOf(nodeType);
  return { tier, parActions: Math.max(2, Math.ceil(PAR_PER_FOE[tier] * Math.max(1, foes))), damageBudget: DAMAGE_BUDGET[tier][Math.max(0, Math.min(2, act))], multiplier: MULTIPLIER[tier] };
}
/** The formula from the design brief, verbatim. A loss scores 0. */
export function encounterScore({ victory, acceptedActions, rawHpDamageTaken, parActions, damageBudget, multiplier }) {
  if (!victory) return { victory: 0, efficiency: 0, avoidance: 0, subtotal: 0, multiplier, total: 0 };
  if (!(parActions > 0) || !(damageBudget > 0)) throw new Error('Benchmarks must be positive');
  const efficiency = Math.round(SCORE.efficiencyMax * Math.min(1, parActions / Math.max(1, acceptedActions)));
  const avoidance = Math.round(SCORE.avoidanceMax * Math.max(0, 1 - rawHpDamageTaken / damageBudget));
  const subtotal = SCORE.victory + efficiency + avoidance;
  return { victory: SCORE.victory, efficiency, avoidance, subtotal, multiplier, total: Math.round(subtotal * multiplier) };
}
/** Record one finished battle into run.scoring. Each encounter key counts once per run. */
export function recordEncounter(run, b, key) {
  run.scoring = run.scoring || newScoring();
  if (b.unscored || run.scoring.encounters.some(e => e.key === key)) return null;   // no farming: one entry per encounter
  const bm = b.bench || encounterBenchmarks(b.nodeType, b.act || 0, b.units.filter(u => u.side === 'enemy' && !u.summoned).length);
  const victory = b.phase === 'won';
  const sc = encounterScore({ victory, acceptedActions: b.stats.actions, rawHpDamageTaken: b.stats.damageTaken, ...bm });
  const entry = { key, act: b.act || 0, nodeType: b.nodeType, name: b.name, actions: b.stats.actions, turns: b.stats.turns, tiles: b.stats.tilesMoved,
    damage: b.stats.damageTaken, parActions: bm.parActions, damageBudget: bm.damageBudget, ...sc };
  run.scoring.encounters.push(entry);
  return entry;
}
export function newScoring() { return { version: SCORING_VERSION, encounters: [], completionBonus: 0 }; }
export function expeditionTotals(run) {
  const s = run.scoring || newScoring(); const e = s.encounters;
  const sum = k => e.reduce((a, x) => a + (x[k] || 0), 0);
  const completed = run.phase === 'won';
  const bonus = completed ? SCORE.expeditionBonus : 0;
  return { version: s.version, encounters: e.length, cleared: e.filter(x => x.total > 0).length, encounterPoints: sum('total'), completionBonus: bonus,
    total: sum('total') + bonus, actions: sum('actions'), damage: sum('damage'), turns: sum('turns'), tiles: sum('tiles'),
    actsCompleted: (run.actHistory || []).length, completed };
}
