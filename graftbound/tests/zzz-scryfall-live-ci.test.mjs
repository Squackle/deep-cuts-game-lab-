// Live catalog verification runs on the network-enabled source-bundle GitHub Actions job.
// Offline unit runners skip; this intentionally avoids pretending Scryfall was checked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
test('LIVE Scryfall: all curated printed Magic card facts must match current Scryfall', { skip: process.env.GITHUB_ACTIONS !== 'true' }, () => {
  const proc = spawnSync(process.execPath, ['tools/verify-real-pool.mjs'], { cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 2_000_000 });
  if (proc.stdout) console.log(proc.stdout.trimEnd());
  if (proc.stderr) console.error(proc.stderr.trimEnd());
  assert.equal(proc.status, 0, `Scryfall verification did not pass: ${proc.error?.message || 'exit ' + proc.status}`);
});
