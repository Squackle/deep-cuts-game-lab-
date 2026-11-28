import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createTrial} from '../commitment-trials/trials.mjs';

function place(run, pad, kind, tier, branch) {
  if (kind) assert.ok(run.command({type: 'build', pad, kind}), 'build ' + kind);
  while (run.game.state.towers[pad].tier < tier) {
    const opts = run.game.state.towers[pad].tier === 2 ? {branch} : {};
    assert.ok(run.command({type: 'upgrade', pad, ...opts}), 'upgrade pad ' + pad);
  }
}

function wave(run) {
  assert.ok(run.command({type: 'wave'}));
  let remaining = 2000;
  while (run.game.state.phase === 'active' && remaining--) run.game.step();
  assert.equal(run.game.state.phase, 'ready');
}

test('Hard Green can clear three waves with Reach and a net-positive early Grove', () => {
  function play(grove) {
    const run = createTrial('green');
    assert.equal(run.game.state.difficulty, 'hard');
    assert.equal(run.command({type: 'build', pad: 5, kind: 'arcanum'}), false);
    place(run, 5, 'beast', 3, 'A');
    if (grove) place(run, 20, 'grove', 1);
    wave(run);
    place(run, 6, 'thorn', 3, 'B');
    wave(run);
    place(run, 4, 'thorn', 2);
    wave(run);
    return run;
  }
  const withGrove = play(true), without = play(false);
  const {state} = withGrove.game;
  assert.deepEqual(state.waveHistory.map(w => w.wave), [4, 5, 6]);
  assert.equal(state.health, 14);
  assert.equal(state.stats.farmMana, 87);
  assert.equal(state.mana - without.game.state.mana, 2);
  assert.match(withGrove.result(), /^Trial cleared/);
  assert.equal(withGrove.command({type: 'wave'}), false);
  assert.deepEqual(withGrove.game.playtestReport(), play(true).game.playtestReport());
});

test('Blue damage-only and detection-only substitutes fail on distinct enemies', () => {
  function play(freeze, mirror) {
    const run = createTrial('blue');
    place(run, 5, 'arcanum', 3, freeze);
    place(run, 6, 'mirror', 3, mirror);
    place(run, 4, 'arcanum', 2);
    wave(run);
    place(run, 4, null, 3, 'B');
    if (run.game.state.mana >= 100) place(run, 8, 'arcanum', 1);
    wave(run);
    return run;
  }
  const prepared = play('A', 'A');
  assert.match(prepared.result(), /^Trial cleared · 20 fortress/);
  assert.deepEqual(prepared.game.state.enemyLeaks, {});
  const noDetection = play('B', 'A');
  assert.match(noDetection.result(), /^Health target missed/);
  assert.equal(noDetection.game.state.enemyLeaks.stalker, 4);
  const noPhysical = play('A', 'B');
  assert.match(noPhysical.result(), /^Health target missed/);
  assert.equal(noPhysical.game.state.enemyLeaks.warden, 4);
});
