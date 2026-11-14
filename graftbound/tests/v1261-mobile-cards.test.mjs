// Regression coverage for mobile Safari pack faces and an unobstructed card-zone dock.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { backHTML, MTG_CARD_BACK_URL } from '../src/ui/cards.js';
import { BattleUI } from '../src/ui/battle-ui.js';

const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const battle=readFileSync(new URL('../src/ui/battle-ui.js',import.meta.url),'utf8');
const screens=readFileSync(new URL('../src/ui/screens.js',import.meta.url),'utf8');

test('face-down cards use the documented standard Magic back with an original offline fallback',()=>{
  assert.equal(MTG_CARD_BACK_URL,'https://cards.scryfall.io/back.png');
  const html=backHTML();
  assert.match(html,/src="https:\/\/cards\.scryfall\.io\/back\.png"/);
  assert.match(html,/onerror="this\.hidden=true"/);
  assert.match(html,/back-word">GRAFTBOUND/);
  assert.match(css,/\.gb-mtg-card-back\[hidden\]\{display:none\}/);
  assert.match(battle,/\$\{backHTML\(\)\}/);
});

test('mobile reward faces cannot show mirrored or upside-down Safari backface',()=>{
  assert.match(screens,/card\.classList\.remove\('flipped'\)/);
  assert.match(css,/\.rewardscr \.fan \.lc-card\{transform:none!important;transform-style:flat!important/);
  assert.match(css,/\.rewardscr \.fan \.lc-card\.flipped \.front\{visibility:hidden\}/);
  assert.match(css,/\.rewardscr \.fan \.lc-card\.flipped \.back\{visibility:visible\}/);
  assert.match(css,/\.rewardscr \.fan \.lc-card \.back\{visibility:hidden\}/);
});

test('mobile card zones dynamically clear the full measured spell hand',()=>{
  assert.equal(typeof BattleUI.prototype.positionCardZones,'function');
  assert.match(battle,/this\.renderHand\(s\);\s*this\.renderZones\(s\)/);
  assert.match(battle,/hudBottom-trayTop\+gap/);
  assert.match(battle,/window\.addEventListener\('resize'/);
  assert.match(css,/#hud \.gb-card-zones\{left:8px;bottom:var\(--gb-zone-bottom/);
});
