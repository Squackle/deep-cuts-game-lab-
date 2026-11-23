import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../engine.mjs';

function chapelRun({ troops = true, commander = true } = {}) {
  const g = createEngine(23, 'sandbox', 'hollow');
  assert.equal(g.command({ type: 'sandboxMana', amount: 10000 }), true);
  if (commander) assert.equal(g.command({ type: 'commander', id: 'krenko' }), true);
  assert.equal(g.command({ type: 'build', pad: 0, kind: 'chapel' }), true);
  if (troops) assert.equal(g.command({ type: 'build', pad: 1, kind: 'legion' }), true);
  const p = g.map.pads[0];
  const near = g.nearestPath(p.x, p.y);
  const cm = g.state.commander;
  if (cm) {
    cm.progress = cm.target = near;
    cm.hp = cm.maxHp - 50;
  }
  const soldier = g.state.troops.find(u => u.source === 1);
  if (soldier) {
    soldier.progress = near;
    soldier.leave = 0;
    soldier.hp = soldier.maxHp - 40;
    soldier.ward = 0;
  }
  assert.equal(g.command({ type: 'sandboxEnemy', enemy: 'raider', count: 1 }), true);
  const e = g.state.enemies[0];
  e.hp = e.maxHp = 1e6;
  e.attack = 0;
  e.speed = 0;
  return { g, cm, soldier, chapel: g.state.towers[0], near };
}

test('Dawn Chapel is an affordable 190-range support with 16 base healing per pulse', () => {
  const { g } = chapelRun();
  const d = g.roster.chapel;
  assert.equal(d.cost, 105);
  assert.equal(d.kind, 'heal');
  assert.equal(d.range, 190);
  assert.equal(d.interval, 12);
  assert.equal(d.damage, 16);
  assert.match(d.role, /commanders at half strength/i);
});

test('Tier I Chapel restores wounded troops and a nearby commander, grants 6 ward, and credits actual healing', () => {
  const { g, cm, soldier, chapel } = chapelRun();
  assert.ok(soldier, 'Legion Hall must spawn a troop to protect');
  const troopBefore = soldier.hp, commanderBefore = cm.hp;
  g.state.health = 15;
  g.step();
  assert.equal(soldier.hp - troopBefore, 16, 'base healing reaches troops');
  assert.equal(cm.hp - commanderBefore, 8, 'commander gets 50% of the same pulse');
  assert.equal(soldier.ward, 6, 'Tier I defensive ward grows from 4 to 6');
  assert.equal(chapel.healing, 24, 'Chapel records troop and commander healing');
  assert.equal(g.state.stats.healing, 24);
  assert.equal(g.state.health, 15, 'Dawn Chapel must not restore fortress health');
});

test('Chapel heals commanders only while alive and within range; never heals more than missing HP', () => {
  const { g, cm, chapel } = chapelRun({ troops: false });
  cm.hp = cm.maxHp - 3;
  g.step();
  assert.equal(cm.hp, cm.maxHp);
  assert.equal(chapel.healing, 3);
  assert.equal(g.state.stats.healing, 3);
  const out = chapelRun({ troops: false });
  const pos = out.g.map.pads[0], far = [0, out.g.map.distance - 1].sort((a,b) => {
    const p = t => out.g.pointAt(t);
    const dist = t => Math.hypot(p(t).x - pos.x, p(t).y - pos.y);
    return dist(b) - dist(a);
  })[0];
  out.cm.progress = out.cm.target = far;
  const before = out.cm.hp;
  out.g.step();
  assert.equal(out.cm.hp, before, 'commander outside 190px is not healed');
  assert.equal(out.chapel.healing, 0);

  const dead = chapelRun({ troops: false });
  dead.cm.dead = true;
  dead.cm.respawnAt = 999999;
  dead.cm.hp = 0;
  dead.g.step();
  assert.equal(dead.cm.hp, 0, 'Dawn Chapel cannot revive fallen commanders');
  assert.equal(dead.chapel.healing, 0);
});

test('Chapel healing totals and commander HP survive a normal save/resume deterministically', () => {
  const { g } = chapelRun();
  for (let i = 0; i < 14; i++) g.step();
  const saved = JSON.parse(JSON.stringify(g.snapshot()));
  const resumed = createEngine(23, 'sandbox', 'hollow');
  assert.equal(resumed.restore(saved), true);
  for (let i = 0; i < 15; i++) { g.step(); resumed.step(); }
  assert.equal(resumed.state.commander.hp, g.state.commander.hp);
  assert.equal(resumed.state.stats.healing, g.state.stats.healing);
  assert.equal(resumed.state.towers[0].healing, g.state.towers[0].healing);
});
