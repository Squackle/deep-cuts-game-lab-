import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEngine, BOSS_HOLD_TICKS, BOSS_PUSH_TICKS, VERSION } from '../engine.mjs';

function fortifiedBossRun() {
  const g = createEngine(1, 'sandbox');
  assert.equal(g.command({ type: 'sandboxMana', amount: 10000 }), true);
  assert.equal(g.command({ type: 'build', pad: 4, kind: 'legion' }), true);
  assert.equal(g.command({ type: 'sandboxEnemy', enemy: 'hierophant', count: 1 }), true);
  const tower = g.state.towers[4];
  const enemy = g.state.enemies[0];
  enemy.progress = tower.rally;
  enemy.hp = enemy.maxHp = 100000000;
  enemy.attack = 0;
  enemy.speed = 5;
  for (const u of g.state.troops) {
    if (u.source !== 4) continue;
    u.progress = tower.rally;
    u.leave = 0;
    u.damage = 0;
    u.hp = u.maxHp = 100000000;
  }
  return { g, tower, enemy };
}

test('defender delay credits each blocked enemy-tick once and survives a save', () => {
  const { g, tower, enemy } = fortifiedBossRun();
  const initial = enemy.progress;
  for (let i = 0; i < 60; i++) g.step();
  assert.equal(enemy.progress, initial, 'held boss must remain at the defensive line');
  assert.ok(tower.blockTicks >= 55, 'tower should get credited for blocking');
  assert.equal(g.state.stats.blockedEnemyTicks, tower.blockTicks);
  assert.equal(g.state.stats.bossBlockedTicks, tower.bossBlockTicks);
  assert.equal(g.state.stats.commanderBlockedTicks, 0);
  assert.equal(g.state.stats.commanderArmyBlockedTicks, 0);
  const report = g.playtestReport();
  assert.equal(report.stats.blockedEnemyTicks, tower.blockTicks);
  assert.equal(report.towers[0].blockedSeconds, tower.blockTicks / 10);
  assert.equal(report.towers[0].bossBlockedSeconds, tower.bossBlockTicks / 10);
  const save = JSON.parse(JSON.stringify(g.snapshot()));
  const restored = createEngine(1, 'sandbox');
  assert.equal(restored.restore(save), true);
  for (let i = 0; i < 30; i++) { g.step(); restored.step(); }
  assert.deepEqual(restored.playtestReport(), g.playtestReport(), 'blocking totals and boss state must resume deterministically');
});

test('boss warns before 12-second blockade breakthrough, then moves for 3 seconds', () => {
  const { g, tower, enemy } = fortifiedBossRun();
  const initial = enemy.progress;
  assert.ok(BOSS_HOLD_TICKS > 60);
  for (let i = 0; i < BOSS_HOLD_TICKS - 1; i++) g.step();
  assert.equal(enemy.progress, initial);
  assert.ok(g.state.events.some(x => x.type === 'bossAbility' && x.ability === 'breakthroughWarning'));
  g.step();
  assert.ok(enemy.pushUntil >= g.state.tick + BOSS_PUSH_TICKS - 1, 'breakthrough window');
  assert.ok(g.state.events.some(x => x.type === 'bossAbility' && x.ability === 'breakthrough'));
  for (let i = 0; i < 10; i++) g.step();
  assert.ok(enemy.progress > initial, 'boss must physically advance rather than teleport');
  assert.ok(tower.blockTicks >= BOSS_HOLD_TICKS - 1);
});

test('Crown of Arrows gets its third projectile at tier IV, not tier III', () => {
  const countShots = ultimate => {
    const g = createEngine(1, 'sandbox');
    assert.equal(g.command({ type: 'sandboxMana', amount: 100000 }), true);
    assert.equal(g.command({ type: 'build', pad: 8, kind: 'judgment' }), true);
    assert.equal(g.command({ type: 'upgrade', pad: 8 }), true);
    assert.equal(g.command({ type: 'upgrade', pad: 8, branch: 'B' }), true);
    if (ultimate) assert.equal(g.command({ type: 'upgrade', pad: 8 }), true);
    assert.equal(g.command({ type: 'sandboxEnemy', enemy: 'raider', count: 4 }), true);
    for (const [i, e] of g.state.enemies.entries()) {
      e.progress = 1595 + i * 5;
      e.hp = e.maxHp = 1000000;
      e.attack = 0;
      e.speed = 0;
    }
    g.step();
    return g.state.projectiles.filter(x => x.kind === 'strike').length;
  };
  assert.equal(countShots(false), 2);
  assert.equal(countShots(true), 3);
});

test('game exports a new rules version and the UI exposes blocking / immunity telemetry', () => {
  assert.equal(VERSION, '0.1.0-beta.13.38');
  const ui = readFileSync(new URL('../main.mjs', import.meta.url), 'utf8');
  for (const fragment of ['Enemy delay', 'immune hits', 'bossBlockedTicks', 'BREAKTHROUGH_HINT', 'Breaking soon']) {
    assert.ok(ui.includes(fragment), fragment + ' should be visible in the game UI');
  }
});
