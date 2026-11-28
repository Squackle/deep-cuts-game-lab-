import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCuratedPool, auditCardPool } from '../tools/content-audit.mjs';
import { REAL_CREATURES } from '../src/cards/real-pool.js';
import { LEGENDARY_BOSSES } from '../src/data/legendary.js';

test('offline curated pool gate checks version, unique identity, anatomy and reviewed effects', () => {
  const report = auditCuratedPool();
  assert.deepEqual(report.problems, []);
  assert.equal(report.count, report.uniqueIds);
  console.log('Content audit:', report.count, 'curated cards validated offline');
});
test('content gate rejects duplicate identities, version count mismatch and boss identity', () => {
  const base = REAL_CREATURES[0];
  const boss = LEGENDARY_BOSSES.flat()[0];
  const report = auditCardPool([base, { ...base }, { ...base, name: boss.name }], 'real-pool-2-v1');
  assert.ok(report.problems.some(p => p.includes('Version count')));
  assert.ok(report.problems.some(p => p.includes('Duplicate name')));
  assert.ok(report.problems.some(p => p.includes('Duplicate ID')));
  assert.ok(report.problems.some(p => p.includes('encounter-only')));
});
test('content gate rejects malformed creature stats and unsupported spell effects', () => {
  const base = REAL_CREATURES[0];
  const report = auditCardPool([{ ...base, power: '*' }, { name: 'Unreviewed test entry', spell: true, mana_cost: '{U}', cmc: 1, type_line: 'Instant', keywords: [], color_identity: ['U'], rarity: 'common' }], 'real-pool-2-v1');
  assert.ok(report.problems.some(p => p.includes('Missing numeric stats')));
  assert.ok(report.problems.some(p => p.includes('no reviewed adaptation')));
});
