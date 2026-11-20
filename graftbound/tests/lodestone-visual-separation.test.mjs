import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REAL_CREATURE_MODELS } from '../src/data/creature-models.js';
import { ENEMIES } from '../src/data/enemies.js';
import { SIZE, SIZE_CLASS, sizeClassOf } from '../src/rendering/creature-scale.js';
import { validateCreatureIndex } from '../src/rendering/raster-benchmarks.js';

test('Lodestone Golem uses its original golem silhouette rather than the painted Titan-like override', () => {
  const index = JSON.parse(readFileSync(new URL('../assets/hd2d/creatures/index.json', import.meta.url), 'utf8'));
  const painted = validateCreatureIndex(index);
  assert.ok(!painted.some(c => c.key === 'nullwarden'), 'no painted override on Lodestone Golem');
  assert.ok(painted.some(c => c.key === 'sentinel'), 'Triplicate Titan keeps its painted model');
  assert.equal(REAL_CREATURE_MODELS.nullwarden.feature, 'golem');
  assert.equal(REAL_CREATURE_MODELS.sentinel.feature, 'titan');
  assert.equal(REAL_CREATURE_MODELS.nullwarden.base, 'nullwarden');
  assert.equal(ENEMIES.nullwarden.sprite, 'mtg_nullwarden');
  assert.equal(ENEMIES.sentinel.sprite, 'mtg_sentinel');
});

test('Lodestone Golem is deliberately smaller and cooler-toned than Triplicate Titan', () => {
  assert.equal(SIZE_CLASS.mtg_nullwarden, 'leader');
  assert.equal(SIZE_CLASS.mtg_sentinel, 'huge');
  assert.ok(SIZE[sizeClassOf('mtg_nullwarden')] < SIZE[sizeClassOf('mtg_sentinel')]);
  assert.deepEqual(
    [REAL_CREATURE_MODELS.nullwarden.dark, REAL_CREATURE_MODELS.nullwarden.mid, REAL_CREATURE_MODELS.nullwarden.light],
    ['#1f2830', '#506773', '#9ed7df']
  );
});
