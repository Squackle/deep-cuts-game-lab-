import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { integrationManifest, verifierSourceFiles, verifierDigest } from '../tools/integration-manifest.mjs';
import { startRanked, replayRun, validDecision, RULES_VERSION, RANKED_CHALLENGES, REPLAY_VERSION } from '../src/engine/ranked.js';
import { GAME } from '../src/config.js';
import { ENEMIES } from '../src/data/enemies.js';
import { REAL_CREATURE_MODELS as RULE_MODELS } from '../src/data/creature-models.js';
import { REAL_CREATURE_MODELS as RENDER_MODELS } from '../src/rendering/real-creature-models.js';

test('website verifier inventory follows ALL current rule imports, never an obsolete handpicked v0.6 list', () => {
  const m = integrationManifest();
  assert.equal(m.schema, 'graftbound-verifier-source-manifest-v1');
  assert.equal(m.gameVersion, GAME.version);
  assert.equal(m.gameLabRoute, '/graftbound/');
  assert.equal(m.rulesVersion, RULES_VERSION);
  assert.equal(m.challenge.revision, RANKED_CHALLENGES[m.challenge.id].revision);
  assert.equal(m.replayVersion, REPLAY_VERSION);
  assert.equal(m.sourceCommit, null, 'no fabricated source SHA in a locally generated manifest');
  assert.ok(m.fileCount > 30, 'full modern engine graph, not the old 32-file v0.6 handoff');
  const names = m.files.map(f => f.path);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
  for (const path of [
    'src/engine/ranked.js', 'src/engine/run.js', 'src/engine/combat.js',
    'src/engine/combo-triggers.js', 'src/engine/trait-triggers.js',
    'src/cards/reference-set.js', 'src/cards/graft-levels.js', 'src/data/terrain.js'
  ]) assert.ok(names.includes(path), path + ' must travel with the rules');
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.every(path => path.startsWith('src/') && !/(?:ui|rendering|storage)\//.test(path)));
});

test('source hashes and aggregate digest are byte-for-byte reproducible', () => {
  const files = verifierSourceFiles();
  for (const f of files) {
    const bytes = readFileSync(new URL('../' + f.path, import.meta.url));
    assert.equal(f.bytes, bytes.length, f.path);
    assert.equal(f.sha256, createHash('sha256').update(bytes).digest('hex'), f.path);
  }
  const a = integrationManifest(), b = integrationManifest();
  assert.deepEqual(a, b, 'no runtime clock, random value, or remote service changes the release inventory');
  assert.equal(a.rulesDigestSha256, verifierDigest(files));
  assert.match(a.rulesDigestSha256, /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(a).includes('profileId'), false, 'no user identity is part of source inventory');
});

test('release metadata requires a real source SHA and cannot silently change ranked rules', () => {
  assert.throws(() => integrationManifest({ sourceCommit: 'not-pinned' }), /full 40-character/);
  const pinned = integrationManifest({ sourceCommit: 'a'.repeat(40) });
  assert.equal(pinned.sourceCommit, 'a'.repeat(40));
  assert.equal(pinned.rulesDigestSha256, integrationManifest().rulesDigestSha256);
  const first = startRanked(), second = startRanked();
  assert.equal(first.startedAt, 0);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(first.ranked.rulesVersion, RULES_VERSION);
  assert.equal(first.ranked.revision, pinned.challenge.revision);
  assert.equal(validDecision({ seq: 0, type: 'node', node: 0, score: 999999 }, 0), false);
  assert.throws(() => replayRun(pinned.challenge.id, [], { revision: pinned.challenge.revision - 1 }), /Unknown/);
  assert.throws(() => replayRun(pinned.challenge.id, [], { rulesVersion: 'graftbound-rules-0.6.0' }), /Rules version/);
});

test('renderer and DOM-free rules consume one identical creature model registry', () => {
  assert.strictEqual(RULE_MODELS, RENDER_MODELS, 'render must reuse the exact registry object');
  assert.equal(Object.keys(RULE_MODELS).length, 45);
  for (const id of Object.keys(RULE_MODELS)) {
    if (ENEMIES[id]) assert.equal(ENEMIES[id].sprite, 'mtg_' + id, id + ' sprite mapping must remain unchanged');
  }
});
