import assert from 'node:assert/strict';
import {test} from 'node:test';
import {VAULTS, vaultActionLabel} from '../src/commitment-vaults.js';
import {assertPhysicalLibraryState} from '../src/engine.js';
import {createWorkbench} from '../src/physical-library-workbench.js';

function play(game, level, ...route) {
  for (const pattern of route) {
    const action = game.choices.find(a => Object.entries(pattern).every(([key, value]) => a[key] === value));
    assert.ok(action, JSON.stringify(pattern));
    assert.equal(game.move(action).ok, true);
    assert.equal(assertPhysicalLibraryState(level, game.state), true);
  }
}

test('Quick Turn trades life for speed on two distinct legal solutions', () => {
  const level = VAULTS[0];
  const fast = createWorkbench(level);
  play(fast, level,
    {type: 'fetch', targetId: 'vents', shock: true}, {type: 'tap', id: 'vents', color: 'R'},
    {type: 'tap', id: 'wastes'}, {type: 'cast', untapId: 'vents'}, {type: 'tap', id: 'vents', color: 'U'}, {type: 'cast'});
  assert.ok(fast.done);
  assert.deepEqual([fast.state.turn, fast.state.life], [1, 1]);
  const economical = createWorkbench(level);
  play(economical, level,
    {type: 'fetch', targetId: 'mountain'}, {type: 'tap', id: 'mountain'},
    {type: 'tap', id: 'wastes'}, {type: 'cast', untapId: 'wastes'},
    {type: 'play', id: 'chamber', returnId: 'wastes'}, {type: 'end'},
    {type: 'tap', id: 'chamber'}, {type: 'cast'});
  assert.ok(economical.done);
  assert.deepEqual([economical.state.turn, economical.state.life], [2, 3]);
});

test('Return Address punishes the wrong land drop and Undo restores the physical state', () => {
  const level = VAULTS[1];
  const game = createWorkbench(level);
  play(game, level, {type: 'fetch', targetId: 'island'}, {type: 'tap', id: 'island'}, {type: 'tap', id: 'reef', color: 'C'}, {type: 'cast'});
  const window = game.state;
  play(game, level, {type: 'play', id: 'wastes'}, {type: 'end'}, {type: 'play', id: 'chamber', returnId: 'island'},
    {type: 'tap', id: 'reef', color: 'R'}, {type: 'tap', id: 'wastes'});
  assert.equal(game.done, false);
  assert.equal(game.choices.some(move => move.type === 'cast' || move.type === 'end'), false);
  for (let i = 0; i < 5; i++) game.undo();
  assert.equal(game.state, window);
  play(game, level, {type: 'play', id: 'chamber', returnId: 'island'}, {type: 'end'}, {type: 'play', id: 'wastes'},
    {type: 'tap', id: 'chamber'}, {type: 'tap', id: 'reef', color: 'R'}, {type: 'tap', id: 'wastes'}, {type: 'cast'});
  assert.ok(game.done);
  assert.equal(game.state.life, 2);
  assert.ok(game.state.graveyard.includes('tarn'));
  assert.ok(game.state.hand.includes('island'));
  assert.ok(!game.state.libraryAvailable.includes('island'));
});

test('visible action labels disclose actual costs and cast targets', () => {
  const level = VAULTS[0];
  const game = createWorkbench(level);
  assert.equal(vaultActionLabel(level, game.state, game.choices.find(a => a.targetId === 'vents' && a.shock)),
    'Fetch Steam Vents · untapped · pay 3 life');
  play(game, level, {type: 'fetch', targetId: 'vents', shock: true}, {type: 'tap', id: 'vents', color: 'R'}, {type: 'tap', id: 'wastes'});
  assert.ok(game.choices.some(a => /Rewind ward.*untap Steam Vents/.test(vaultActionLabel(level, game.state, a))));
});
