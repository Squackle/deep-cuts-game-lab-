import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = path => fs.readFileSync(path, 'utf8');
test('Root and legacy Game Lab both include the same Animation Lab tab', () => {
  const root=read('index.html'), legacy=read('lab/index.html');
  for (const html of [root, legacy]) {
    assert.match(html,/aria-label="Game Lab destinations"/);
    assert.match(html,/href="\/animation-lab\/"/);
    assert.match(html,/ANIMATION LAB/);
  }
  const normalized=root.replace('href="/lab/lab.css"','href="./lab.css"').replaceAll('src="/lab/covers/','src="./covers/');
  assert.equal(normalized,legacy);
  assert.match(read('lab/lab.css'),/\.lab-actions/);
});
test('Animation Lab selector opens an isolated GRAFTBOUND cinematic scenario', () => {
  const page=read('animation-lab/index.html'), demo=read('graftbound/dev/animation-studio/index.html');
  assert.match(page,/href="\/graftbound\/dev\/animation-studio\/"/);
  assert.match(page,/Pyroclasm \/ Red Fire Board Wipes/);
  assert.match(page,/eligible|approved red, fire-based creature board wipes/);
  assert.match(page,/aria-label="Open GRAFTBOUND Pyroclasm fire board-wipe animation test"/);
  assert.doesNotMatch(page,/Cinderstorm/i);
  assert.match(demo,/<h1>PYRO<span>CLASM<\/span><\/h1>/);
  assert.match(demo,/CAST PYROCLASM/);
  assert.doesNotMatch(demo,/Cinderstorm/i);
  assert.match(page,/No sign-in needed|no saved progress|do not alter adventures/);
  assert.match(demo,/id="scene"/);
  assert.match(demo,/id="effects"/);
  assert.match(demo,/id="replay"/);
  assert.match(demo,/id="reset"/);
  assert.match(demo,/id="motion"/);
  assert.match(demo,/src="studio.js"/);
  assert.ok(fs.existsSync('graftbound/dev/animation-studio/studio.css'));
  assert.match(page,/noindex, nofollow/);
  assert.doesNotMatch(demo,/\/api\/|src="https?:|<iframe|localStorage/);
});
