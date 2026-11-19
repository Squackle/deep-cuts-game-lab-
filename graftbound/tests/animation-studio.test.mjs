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
  for (const file of ['../dev/animation-studio/studio.js','../dev/animation-studio/scenario.js','../dev/animation-studio/smoke-fluid.js']) {
    const result = spawnSync(process.execPath, ['--check', new URL(file, import.meta.url).pathname], { encoding: 'utf8' });
    assert.equal(result.status, 0, file + ': ' + result.stderr);
  }
});

test('the revised Cinderstorm draws a transported gas field, not fullscreen smoke blobs', () => {
  const source=read('../dev/animation-studio/studio.js');
  const fluid=read('../dev/animation-studio/smoke-fluid.js');
  const html=read('../dev/animation-studio/index.html');
  assert.match(source,/smoke\.advanceTo\(/);
  assert.match(source,/smoke\.render\(/);
  assert.match(fluid,/semi-Lagrangian/i);
  assert.match(fluid,/this\._project\(\)/);
  assert.match(fluid,/this\._inject\(/);
  assert.match(html,/id="smoke"/);
  assert.doesNotMatch(source,/const veil|const clouds|Math\.sqrt\(\(i\+\.5\)\//);
});

test('Animation Lab health bars use the main GRAFTBOUND HP-only labels (not creature nameplates)', () => {
  const studio=read('../dev/animation-studio/studio.js');
  const css=read('../dev/animation-studio/studio.css');
  const gameCss=read('../styles.css');
  const gameUi=read('../src/ui/battle-ui.js');
  assert.match(gameUi,/className = 'ulabel '/);
  assert.match(gameUi,/class="hpbar"><i style="width:/);
  assert.match(studio,/el\.className = 'ulabel '/);
  assert.match(studio,/hp\.className = 'hpbar'/);
  assert.match(studio,/hp\.append\(fill, value\)/);
  assert.match(studio,/m\.value\.textContent = String\(u\.hp\)/);
  assert.doesNotMatch(studio,/name\.textContent = u\.name|className = 'unit-label'/);
  for(const value of ['#80d3ff','#2375d4','#ff9a7b','#b32b22']) {
    assert.ok(gameCss.includes(value), 'Game CSS color '+value);
    assert.ok(css.includes(value), 'Preview mirrors game color '+value);
  }
  assert.match(css,/\.hpbar\{[^}]*width:46px;height:9px/);
  assert.match(css,/\.hpbar span\{[^}]*left:-16px;top:-4px/);
  assert.doesNotMatch(css,/\.unit-label|\.foe \.hp i/);
});
