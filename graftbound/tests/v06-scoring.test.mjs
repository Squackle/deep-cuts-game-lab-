import test from 'node:test'; import assert from 'node:assert/strict';
import './helpers.mjs';
import { encounterScore, encounterBenchmarks, recordEncounter, expeditionTotals, newScoring } from '../src/engine/scoring.js';
import { SCORE, MULTIPLIER } from '../src/data/scoring.js';
import { playRanked, nextDecision } from './ranked-bot.mjs';
import { replayRun, applySegment, applyDecision, startRanked, validDecision, RULES_VERSION, verifiedAchievements, MAX_DECISIONS } from '../src/engine/ranked.js';
import { heal } from '../src/engine/abilities.js';
import { arena } from './helpers.mjs';
import { dealDamage, player } from '../src/engine/abilities.js';

const base = { parActions: 6, damageBudget: 10, multiplier: 1 };
test('formula: victory foundation; efficient beats inefficient; no-damage beats high-damage; loss scores 0', () => {
  const perfect = encounterScore({ victory: true, acceptedActions: 6, rawHpDamageTaken: 0, ...base });
  assert.deepEqual([perfect.victory, perfect.efficiency, perfect.avoidance, perfect.total], [1000, 600, 400, 2000]);
  assert.equal(encounterScore({ victory: true, acceptedActions: 3, rawHpDamageTaken: 0, ...base }).efficiency, 600, 'beating par is capped at the full bonus');
  const slow = encounterScore({ victory: true, acceptedActions: 12, rawHpDamageTaken: 0, ...base }); assert.equal(slow.efficiency, 300); assert.ok(slow.total < perfect.total);
  const hurt = encounterScore({ victory: true, acceptedActions: 6, rawHpDamageTaken: 5, ...base }); assert.equal(hurt.avoidance, 200);
  assert.equal(encounterScore({ victory: true, acceptedActions: 6, rawHpDamageTaken: 99, ...base }).avoidance, 0, 'never negative');
  assert.equal(encounterScore({ victory: false, acceptedActions: 1, rawHpDamageTaken: 0, ...base }).total, 0);
  assert.throws(() => encounterScore({ victory: true, acceptedActions: 1, rawHpDamageTaken: 0, parActions: 0, damageBudget: 10, multiplier: 1 }));
});
test('multipliers: normal 1.0, elite 1.25, boss 1.5; benchmarks come from the definition only', () => {
  assert.deepEqual([MULTIPLIER.battle, MULTIPLIER.elite, MULTIPLIER.boss], [1, 1.25, 1.5]);
  assert.equal(encounterScore({ victory: true, acceptedActions: 6, rawHpDamageTaken: 0, parActions: 6, damageBudget: 10, multiplier: 1.25 }).total, 2500);
  assert.equal(encounterScore({ victory: true, acceptedActions: 6, rawHpDamageTaken: 0, parActions: 6, damageBudget: 10, multiplier: 1.5 }).total, 3000);
  const a = encounterBenchmarks('elite', 1, 3), b = encounterBenchmarks('elite', 1, 3); assert.deepEqual(a, b); assert.ok(a.parActions > 0 && a.damageBudget > 0);
});
test('healing never erases recorded damage; shields are not health damage', () => {
  const s = arena(['g..', '...', 'P..'], { g: 'tortoise' }); const p = player(s);
  dealDamage(s, [], null, p, 3, { kind: 'test' }); heal(s, [], p, 3); assert.equal(p.hp, p.maxHp); assert.equal(s.stats.damageTaken, 3);
  p.statuses.shield = 5; dealDamage(s, [], null, p, 4, { kind: 'test' }); assert.equal(s.stats.damageTaken, 3, 'fully shielded hit = 0 HP damage');
});
test('each encounter contributes once per run (no farming); breakdown totals add up', () => {
  const run = { scoring: newScoring(), phase: 'map', actHistory: [] };
  const b = { phase: 'won', nodeType: 'battle', act: 0, name: 'x', stats: { actions: 4, damageTaken: 0, turns: 2, tilesMoved: 3 }, units: [], bench: { tier: 'battle', parActions: 4, damageBudget: 8, multiplier: 1 } };
  assert.ok(recordEncounter(run, b, '0:3')); assert.equal(recordEncounter(run, b, '0:3'), null); assert.equal(run.scoring.encounters.length, 1);
  const t = expeditionTotals(run); assert.equal(t.total, 2000); assert.equal(t.completionBonus, 0);
  run.phase = 'won'; assert.equal(expeditionTotals(run).total, 2000 + SCORE.expeditionBonus);
});

// ── ranked replay & anti-cheat (the same functions the server verifier imports) ──
const { run: R, log: LOG } = playRanked();
test('valid replay is accepted and reproduces the exact run and score (client == server)', () => {
  assert.ok(LOG.length >= 15, 'ranked fixture performs a meaningful sequence of accepted decisions'); const r = replayRun('gb-expedition-01', LOG, { revision: 12 });
  assert.equal(JSON.stringify(r.run), JSON.stringify(R)); assert.deepEqual(r.totals, expeditionTotals(R));
  assert.ok(Array.isArray(verifiedAchievements(r.run)));
});
test('server checkpoints: segment-by-segment replay equals a full replay (supports legitimate resume)', () => {
  let cp = startRanked(); for (let i = 0; i < LOG.length; i += 25) cp = applySegment(cp, LOG.slice(i, i + 25)).run;
  assert.equal(JSON.stringify(cp), JSON.stringify(R));
});
test('fabricated scores and tampering are impossible or rejected', () => {
  const forged = LOG.map(d => ({ ...d })); forged[0].score = 999999; assert.throws(() => replayRun('gb-expedition-01', forged), /Malformed/);
  const dup = [...LOG.slice(0, 5), LOG[4], ...LOG.slice(5)]; assert.throws(() => replayRun('gb-expedition-01', dup), /out-of-order/);
  const del = LOG.filter((_, i) => i !== 3); assert.throws(() => replayRun('gb-expedition-01', del), /out-of-order/);
  const i = LOG.findIndex(d => d.type === 'move'); const bad = LOG.map(d => ({ ...d })); bad[i] = { ...bad[i], x: 0, y: 0 };
  assert.throws(() => replayRun('gb-expedition-01', bad), /reach|movement|Not your turn|Out of/i);
  const j = LOG.findIndex(d => d.type === 'attack'); if (j >= 0) { const b2 = LOG.map(d => ({ ...d })); b2[j] = { ...b2[j], uid: 999 }; assert.throws(() => replayRun('gb-expedition-01', b2)); }
  assert.throws(() => replayRun('gb-expedition-01', LOG, { rulesVersion: 'graftbound-rules-0.6.0' }), /Rules version/, 'v0.6 rules are a different, incompatible version');
  assert.throws(() => replayRun('gb-expedition-02', LOG), /Unknown/); assert.throws(() => replayRun('gb-expedition-01', LOG, { revision: 1 }), /Unknown/, 'revision 1 (v0.6/v0.7 rules) is retired: old scores are never mixed with new');
  assert.throws(() => replayRun('gb-expedition-01', new Array(MAX_DECISIONS + 1).fill(LOG[0])), /too long/);
  const cp = startRanked(); cp.ranked.seq = 10; assert.throws(() => applySegment(cp, LOG.slice(0, 3)), /out-of-order/, 'rolling back to an older checkpoint cannot accept earlier decisions');
  const tampered = startRanked(); tampered.hp = 999; tampered.ranked.rulesVersion = 'x'; assert.throws(() => applySegment(tampered, LOG.slice(0, 1)), /Rules version/);
  assert.equal(validDecision({ seq: 0, type: 'node', node: 0, damage: 0 }, 0), false, 'unknown keys rejected');
});
test('a run cannot be extended after it ends; the seed is fixed by the challenge', () => {
  const r = replayRun('gb-expedition-01', LOG).run; assert.ok(['won', 'lost'].includes(r.phase));
  assert.throws(() => applyDecision(r, { seq: r.ranked.seq, type: 'end' }), /already finished/);
  assert.equal(startRanked().seed, startRanked().seed); assert.equal(startRanked().ranked.rulesVersion, RULES_VERSION);
});
test('auto-end in a ranked run is an ordinary `end` decision and is not an action', () => {
  const run = startRanked(); let d; let guard = 0;
  while (run.phase !== 'battle' && guard++ < 10) applyDecision(run, { seq: run.ranked.seq, ...nextDecision(run) });
  const before = run.battle.stats.actions; applyDecision(run, { seq: run.ranked.seq, type: 'end' }); if (run.battle) assert.equal(run.battle.stats.actions, before);
});