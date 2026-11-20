// Regression: a full graft body must explain why creature rewards cannot be claimed yet.
// UI-only cues; the engine still requires an explicit release index.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/ui/screens.js', import.meta.url), 'utf8');
const reward = source.slice(source.indexOf('export function rewardScreen'), source.indexOf('export function shrineScreen'));

test('pack shows the full-graft instruction above the cards, not only below the fold', () => {
  const banner = reward.indexOf('id="rw-graft-capacity"');
  const cards = reward.indexOf('class="pack-stage"');
  assert.ok(banner > 0 && cards > banner, 'capacity guidance should appear before the pack/card fan');
  assert.match(reward, /graftsFull\(run\) \? `<p class="rw-sub" id="rw-graft-capacity"/);
  assert.match(reward, /select one of your existing grafts to release in the detail panel below/);
});

test('first creature selection and blocked double click explain full slots in a visible toast', () => {
  assert.match(reward, /getCard\(slot\.dataset\.id\)\.kind === 'creature' && graftsFull\(run\)/);
  assert.match(reward, /app\.toast\('<b>Graft slots full<\/b>/);
  assert.match(reward, /else if \(take\?\.disabled\)/);
  assert.match(reward, /release\?\.scrollIntoView\(/);
  assert.match(reward, /release\?\.querySelector\('input\[name="rel"\]'\)\?\.focus/);
});

test('double-click confirms only enabled choices, and an explicit release still unlocks a full-slot claim', () => {
  assert.match(reward, /if \(take && !take\.disabled\) take\.click\(\)/);
  assert.match(reward, /const previousRelease = det\.dataset\.cardId === id/);
  assert.match(reward, /if \(kept\) \{ kept\.checked = true; take\.disabled = false; \}/);
  assert.match(reward, /if \(ev\.target\.name === 'rel'\) take\.disabled = false/);
  const engine = readFileSync(new URL('../src/engine/run.js', import.meta.url), 'utf8');
  assert.match(engine, /Your grafts are full — choose one to release/);
});
