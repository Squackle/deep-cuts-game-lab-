import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('title screen offers a direct accessible link to Game Lab home', () => {
  const screens = read('../src/ui/screens.js');
  assert.match(screens, /<a class="lab-home-link" href="\/lab\/" aria-label="Back to Game Lab home">/);
  const styles = read('../styles.css');
  assert.match(styles, /\.lab-home-link:hover, \.lab-home-link:focus-visible/);
});

test('pause menu offers Game Lab home without abandoning the saved adventure', () => {
  const main = read('../src/main.js');
  assert.match(main, /<a class="btn lab-menu-link" href="\/lab\/" aria-label="Back to Game Lab home">/);
  assert.match(main, /window\.addEventListener\('pagehide', \(\) => \{ if \(this\.run\) this\.save\(\); \}\)/);
});

test('deployment instructions target Game Lab main, not the DeepCutsEDH main site', () => {
  const guide = read('../GPT-DEPLOY-INSTRUCTIONS.md');
  assert.match(guide, /merge the verified PR into \*\*this repository's `main`\*\*/);
  assert.match(guide, /Separate boundary/);
  assert.match(guide, /required checks/);
});
