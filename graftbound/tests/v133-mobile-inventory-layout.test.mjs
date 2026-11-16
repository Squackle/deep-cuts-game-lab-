import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/ui/screens.js',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');

test('character sheet graft entries explicitly place all text in second grid column',()=>{
  assert.match(css,/\.hist li\s*\{[^}]*grid-template-columns:\s*28px\s+minmax\(0,\s*1fr\)/);
  assert.match(css,/\.hist li\s*>\s*b\s*,\s*\.hist li\s*>\s*small[^{}]*\{[^}]*grid-column:\s*2\s*;/);
  assert.match(css,/\.hist li\s*>\s*\.gb-graft-details\s*\{[^}]*grid-column:\s*2\s*;/);
  assert.match(css,/\.hist li\s*>\s*\.n\s*\{[^}]*grid-column:\s*1\s*;/);
});

test('narrow mobile sheets may shrink instead of creating min-content overflow',()=>{
  assert.match(css,/@media\s*\(max-width:\s*760px\)\s*\{[^}]*\.sheet\s*\{[^}]*minmax\(0,\s*1fr\)/);
  assert.match(css,/\.sh-main,\s*\.sh-hist,\s*\.hist,\s*\.hist li\s*\{\s*min-width:\s*0/);
  assert.match(css,/\.hist li\s*>\s*\.gb-graft-details\s*\{[^}]*overflow-wrap:\s*break-word/);
});

test('inventory and character sheet have visible top-right red close and preserve footer Close',()=>{
  assert.equal((ui.match(/class="gb-modal-x" data-close/g)||[]).length,3,
    'character sheet, permanent inventory and battle inventory get red X');
  assert.equal((ui.match(/class="gb-modal-topbar"/g)||[]).length,3);
  assert.match(css,/\.gb-modal-topbar\s*\{[^}]*position:\s*sticky/);
  assert.match(css,/\.gb-modal-x\s*\{[^}]*width:\s*44px/);
  assert.match(css,/\.gb-modal-x\s*\{[^}]*background:\s*#a41f26/);
  assert.match(ui,/data-gear-back>Character Sheet<\/button><button type="button" class="btn primary" data-close>Close<\/button>/);
  assert.match(main,/e\.target\.closest\('\[data-close\]'\)/,
    'existing central modal handler closes with the red X');
});

test('mobile inventory layout remains fixed under the current game and ranked version',()=>{
  const config=readFileSync(new URL('../src/config.js',import.meta.url),'utf8');
  const ranked=readFileSync(new URL('../src/engine/ranked.js',import.meta.url),'utf8');
  assert.match(config,/version:\s*'1\.3\.7-beta'/);
  assert.match(ranked,/graftbound-rules-1\.3\.8-beta/);
});
