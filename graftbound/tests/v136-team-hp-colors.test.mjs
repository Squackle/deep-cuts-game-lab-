import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const battle = readFileSync(new URL('../src/ui/battle-ui.js', import.meta.url), 'utf8');
const screens = readFileSync(new URL('../src/ui/screens.js', import.meta.url), 'utf8');

test('friendly and hostile palettes have distinct readable blue/red gradients', () => {
  assert.match(css, /--hp-friendly-top:\s*#80d3ff;/);
  assert.match(css, /--hp-friendly-bottom:\s*#2375d4;/);
  assert.match(css, /--hp-enemy-top:\s*#ff9a7b;/);
  assert.match(css, /--hp-enemy-bottom:\s*#b32b22;/);
});

test('battlefield team colors use actual allegiance classes, not card identity or species', () => {
  assert.match(battle, /el\.className\s*=\s*'ulabel '\s*\+\s*\(u\.side === 'player' \? 'player' : 'enemy'\)/);
  assert.match(css, /\.ulabel\.player \.hpbar i\s*\{\s*background:\s*linear-gradient\(var\(--hp-friendly-top\),\s*var\(--hp-friendly-bottom\)\)/);
  assert.match(css, /\.ulabel\.enemy \.hpbar i\s*\{\s*background:\s*linear-gradient\(var\(--hp-enemy-top\),\s*var\(--hp-enemy-bottom\)\)/);
  assert.doesNotMatch(css, /\.player \.hpbar i\s*\{\s*background:\s*linear-gradient\(#f2d27a,\s*#b98a2a\)/);
});

test('player battlefield HUD and out-of-battle map use same friendly health palette', () => {
  assert.match(css, /\.pl-hp \.bar i, \.mp-hp \.bar i\s*\{[^}]*background:\s*linear-gradient\(var\(--hp-friendly-top\),\s*var\(--hp-friendly-bottom\)\)/);
  assert.match(battle, /class="pl-hp"/);
  assert.match(screens, /class="mp-hp"/);
});

test('HP values and shield remain present and no battle/gameplay logic is affected', () => {
  assert.match(battle, /<div class="hpbar"><i style="width:\$\{pct\}%"><\/i><span>\$\{d\.hp\}<\/span><\/div>/);
  assert.match(battle, /class="pl-hp"[^\n]*<div class="bar"><i style="width:/);
  assert.match(css, /\.pl-hp \.bar u \{[^}]*repeating-linear-gradient/);
  assert.match(css, /\.hpbar span \{[^}]*text-shadow:/);
});
