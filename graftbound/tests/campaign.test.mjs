import test from 'node:test'; import assert from 'node:assert/strict';
import { evoWith, botPlay } from './helpers.mjs';
import { generateMap, availableNodes, ACT_COUNT } from '../src/engine/campaign.js';
import { buildEncounter, templateFor, reinforcements, threatOf, REINFORCE_CAP } from '../src/engine/encounters.js';
import { ACTS } from '../src/data/encounters.js';
import { ENEMIES } from '../src/data/enemies.js';
import { newEvolution } from '../src/engine/evolution.js';
import { newRun, enterNode, concludeBattle, chooseReward, shrineChoice } from '../src/engine/run.js';
import { T } from '../src/core/grid.js';

test('three acts, each map 8 layers: start, branches, boss; every node reachable; no dead ends; deterministic', () => {
  assert.equal(ACT_COUNT, 3);
  for (let seed = 1; seed < 60; seed++) for (let act = 0; act < 3; act++) {
    const m = generateMap(seed, { act }); assert.deepEqual(m, generateMap(seed, { act }));
    assert.equal(m.nodes.at(-1).type, 'boss'); assert.equal(Math.max(...m.nodes.map(n => n.depth)), 7);
    const reach = new Set(m.nodes.filter(n => n.depth === 0).map(n => n.id)); for (const n of m.nodes) if (reach.has(n.id)) n.next.forEach(i => reach.add(i));
    assert.equal(reach.size, m.nodes.length);
    for (const n of m.nodes) if (n.type !== 'boss') assert.ok(n.next.length >= 1, 'no dead end');
    assert.ok(m.nodes.some(n => n.type === 'elite') && m.nodes.filter(n => n.type === 'shrine').length >= 2);
  }
});
test('24 meaningful nodes per adventure: every act path visits 8 (no decorative nodes)', () => {
  const m = generateMap(5, { act: 1 }); let cur = null, n = 0;
  while (true) { const opts = availableNodes(m, cur); if (!opts.length) break; cur = opts[0].id; n++; if (m.nodes.find(x => x.id === cur).type === 'boss') break; }
  assert.equal(n, 8); assert.equal(n * 3, 24);
});
test('every encounter template of every act builds a connected arena; hazards appear per act', () => {
  for (let act = 0; act < 3; act++) for (const tier of ['early', 'mid', 'late', 'elite', 'boss']) for (const tpl of ACTS[act][tier]) for (let seed = 1; seed < 15; seed++) {
    const e = buildEncounter(tpl, seed * 97, tier); assert.equal(e.enemies.length, tpl.enemies.length);
    for (const en of e.enemies) assert.ok(ENEMIES[en.defId], en.defId);
    if (tpl.lava) assert.ok(e.terrain.includes(T.LAVA)); if (tpl.rifts) assert.ok(e.terrain.includes(T.RIFT));
  }
});
test('acts introduce new enemies rather than re-statting old ones', () => {
  const by = a => new Set(Object.entries(ENEMIES).filter(([, d]) => d.act === a).map(([k]) => k));
  assert.ok(by(1).size >= 5 && by(2).size >= 5); for (const a of [0, 1, 2]) assert.equal([...by(a)].filter(k => ENEMIES[k].boss).length, 1);
  const ais = new Set(Object.values(ENEMIES).map(d => d.ai)); assert.ok(ais.size >= 11, [...ais].join());
});
test('reinforcements scale with build strength, are capped per act, never inflate health', () => {
  assert.deepEqual(reinforcements(0, 'battle', 1, evoWith('mtg:colossal-dreadmaw'), 5), []);
  const strong = evoWith('mtg:colossal-dreadmaw', 'mtg:craw-wurm', 'mtg:vampire-nighthawk', 'mtg:serra-angel');
  for (let act = 0; act < 3; act++) { const r = reinforcements(act, 'battle', 4, strong, 5); assert.ok(r.length >= 1 && r.length <= REINFORCE_CAP[act]); }
  assert.ok(threatOf(strong) > threatOf(newEvolution()));
});
test('an adventure can be completed end-to-end: three bosses, act transitions, final victory', () => {
  let won = 0;
  for (let seed = 1; seed <= 40 && !won; seed++) {
    const run = newRun({ seed: seed * 131 }); const actsSeen = new Set();
    for (let steps = 0; steps < 60 && !['won', 'lost'].includes(run.phase); steps++) {
      actsSeen.add(run.act);
      if (run.phase === 'map') { const o = availableNodes(run.map, run.current); enterNode(run, (o.find(n => n.type === 'shrine') || o[0]).id); }
      if (run.phase === 'shrine') { const o = run.shrine.options; const k = ['spark', 'restoration', 'arcane', 'offering'].find(x => o.includes(x)) || o[0]; shrineChoice(run, k, k === 'inscribe' ? run.spellbook.find(s => s.level < 3).id : 0); }
      if (run.phase === 'battle') { const b = run.battle; for (const u of b.units) if (u.hero) { u.power += 20; u.hp = u.maxHp = 200; } botPlay(b, 80); if (b.phase === 'player') b.phase = 'lost'; concludeBattle(run); }
      if (run.phase === 'reward') { const id = run.pending.cards.find(c => c.startsWith('mtg:')); const full = run.evo.absorbed.length >= [4, 6, 8][run.act]; chooseReward(run, id, full ? 0 : undefined); }
    }
    if (run.phase === 'won') { won++; assert.deepEqual([...actsSeen].sort(), [0, 1, 2]); assert.equal(run.stats.bossesDefeated, 3); assert.equal(run.actHistory.length, 3); }
  }
  assert.equal(won, 1);
});
