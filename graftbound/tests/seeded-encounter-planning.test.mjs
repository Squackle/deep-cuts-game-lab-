import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTS } from '../src/data/encounters.js';
import { buildEncounter, templateFor } from '../src/engine/encounters.js';
import { createBattle, enemies } from '../src/engine/combat.js';
import { planEnemy } from '../src/engine/ai.js';
import { newEvolution, deriveStats } from '../src/engine/evolution.js';
import { inBounds, manhattan, tileAt, T } from '../src/core/grid.js';
import { installReferenceSet } from '../src/cards/reference-set.js';

installReferenceSet();
test('seeded encounter and tactical planning matrix is reproducible and legal', () => {
  let encounters = 0, plans = 0;
  for (let act = 0; act < ACTS.length; act++) {
    for (const tier of ['battle', 'elite', 'boss']) {
      for (let i = 1; i <= 12; i++) {
        const seed = i * 977 + act;
        const template = templateFor(act, tier, 5, seed);
        const arena = buildEncounter(template, seed, tier);
        assert.deepEqual(buildEncounter(template, seed, tier), arena);
        const evo = newEvolution(), stats = deriveStats(evo);
        const s = createBattle({ evo, stats, spellbook: [], encounter: arena, seed, act });
        const initial = structuredClone(s);
        for (const foe of enemies(s)) {
          const p = planEnemy(s, foe);
          assert.deepEqual(planEnemy(s, foe), p);
          if (p.to) {
            assert.ok(inBounds(s, p.to.x, p.to.y));
            assert.notEqual(tileAt(s, p.to.x, p.to.y), T.ROCK);
            assert.deepEqual(p.path[0], { x: foe.x, y: foe.y });
            assert.deepEqual(p.path.at(-1), p.to);
            for (let j = 1; j < p.path.length; j++) assert.equal(manhattan(p.path[j - 1], p.path[j]), 1);
          }
          plans++;
        }
        assert.deepEqual(s, initial, 'enemy intent planning must not consume RNG or mutate battle state');
        encounters++;
      }
    }
  }
  assert.equal(encounters, 108);
  assert.ok(plans > encounters);
});
