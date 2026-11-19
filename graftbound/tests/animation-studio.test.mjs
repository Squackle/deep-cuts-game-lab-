import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { DAMAGE, SCENARIO, PHASES, IMPACT_TIME, DURATION, resolveBoardFire } from '../dev/animation-studio/scenario.js';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
test('Cinderstorm deals two to every allied and opposing creature, including the caster', () => {
  const after = resolveBoardFire(SCENARIO);
  assert.equal(DAMAGE, 2);
  assert.equal(after.length, SCENARIO.length);
  assert.deepEqual(after.map(u => u.uid), SCENARIO.map(u => u.uid));
  assert.deepEqual(after.map(u => u.hp), [3, 0, 2, 0, 0, 2, 1]);
  assert.deepEqual(after.filter(u => u.dead).map(u => u.uid), [2, 4, 5]);
  assert.equal(SCENARIO[0].hp, 5, 'Preview fixture is immutable by resolution');
});
test('Animation timing has a rising charge, hidden impact, and readable aftermath', () => {
  assert.deepEqual(PHASES.map(x => x.label), ['THE INVOCATION','THE ASCENT','THE VORTEX','THE DEVASTATION','ASHFALL']);
  for (let i=1; i<PHASES.length; i++) assert.ok(PHASES[i].time > PHASES[i-1].time);
  assert.ok(IMPACT_TIME > PHASES[3].time && IMPACT_TIME < PHASES[4].time);
  assert.ok(DURATION > PHASES[4].time);
});
test('Studio reuses real GRAFTBOUND scene, not save data or score APIs', () => {
  const html = read('../dev/animation-studio/index.html');
  const js = read('../dev/animation-studio/studio.js');
  assert.match(html, /Back to Animation Lab/);
  assert.match(html, /Back to Game Lab/);
  assert.match(html, /aria-label="GRAFTBOUND animation preview battlefield"/);
  assert.match(js, /new Scene\(/);
  assert.match(js, /loadAssets\(/);
  assert.match(js, /resolveBoardFire\(/);
  assert.doesNotMatch(js, /localStorage|sessionStorage|leaderboard|\/api\//);
  assert.ok(existsSync(new URL('../../animation-lab/index.html', import.meta.url)));
});

test('Studio browser module and pure fixture are syntactically valid JavaScript', () => {
  for (const file of ['../dev/animation-studio/studio.js','../dev/animation-studio/scenario.js']) {
    const result = spawnSync(process.execPath, ['--check', new URL(file, import.meta.url).pathname], { encoding: 'utf8' });
    assert.equal(result.status, 0, file + ': ' + result.stderr);
  }
});
