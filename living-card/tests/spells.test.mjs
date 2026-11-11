import test from 'node:test'; import assert from 'node:assert/strict';
import { arena, evoWith } from './helpers.mjs';
import { cast, castOptions, player, enemies } from '../src/engine/combat.js';
import { formatSpellText, spellNumbers, castBlockReason } from '../src/engine/spells.js';
import { SPELLS } from '../src/data/cards.js';

const book = ids => ids.map(id => ({ id, level: 1 }));
const S = (rows, map, ids, opts = {}) => { const s = arena(rows, map, { spellbook: book(ids), ...opts }); s.p.mana = 9; s.p.maxMana = 9; return s; };

test('ember dart deals 2, +arcane, +level', () => {
  const s = S(['t...', '....', 'P...'], { t: 'tortoise' }, ['ember_dart']); cast(s, 'ember_dart', 0, 0); assert.equal(enemies(s)[0].hp, 3);
  assert.deepEqual(spellNumbers('ember_dart', 2, 2), [5]);
});
test('cast restrictions: once per turn, mana cost, readable reasons', () => {
  const s = S(['t...', '....', 'P...'], { t: 'tortoise' }, ['ember_dart', 'chain_lightning']);
  cast(s, 'ember_dart', 0, 0); assert.equal(s.p.mana, 8); assert.equal(castOptions(s, 'ember_dart').length, 0);
  assert.equal(castBlockReason(s, 'ember_dart'), 'Already cast this turn');
  s.p.mana = 1; assert.match(castBlockReason(s, 'chain_lightning'), /Needs 3 mana/);
  assert.equal(castBlockReason(s, 'starfall'), 'Not in your spellbook');
  assert.throws(() => cast(s, 'chain_lightning', 0, 0), /Needs 3 mana/);
});
test('line of sight blocks targeted spells', () => {
  const s = S(['t...', '#...', 'P...'], { t: 'tortoise' }, ['ember_dart']); assert.equal(castOptions(s, 'ember_dart').length, 0);
  assert.equal(castBlockReason(s, 'ember_dart'), 'No foe in range and sight');
});
test('barkskin shields, mending rain heals & cleanses, soul siphon drains', () => {
  const s = S(['t...', '....', 'P...'], { t: 'tortoise' }, ['barkskin', 'mending_rain', 'soul_siphon']);
  const p = player(s); cast(s, 'barkskin', p.x, p.y); assert.equal(p.statuses.shield, 3);
  p.hp = 1; p.statuses.poison = 3; cast(s, 'mending_rain', p.x, p.y); assert.equal(p.hp, 6); assert.equal(p.statuses.poison, 0);
  p.hp = 2; cast(s, 'soul_siphon', 0, 0); assert.equal(enemies(s)[0].hp, 2); assert.equal(p.hp, 5);
});
test('blink step teleports to an empty tile', () => {
  const s = S(['t...', '....', 'P...'], { t: 'tortoise' }, ['blink_step']); cast(s, 'blink_step', 2, 1); assert.deepEqual([player(s).x, player(s).y], [2, 1]);
});
test('venom mist poisons foes in 3x3', () => {
  const s = S(['tt..', '....', 'P...'], { t: 'tortoise' }, ['venom_mist']); cast(s, 'venom_mist', 0, 0); assert.ok(enemies(s).every(e => e.statuses.poison === 3));
});
test('gale push shoves 2 tiles; collision damages both', () => {
  const s = S(['....', 'g...', '....', 'P...'], { g: 'grub' }, ['gale_push']); const g = enemies(s)[0]; g.hp = g.maxHp = 9;
  cast(s, 'gale_push', 0, 1); assert.equal(g.y, 0); assert.equal(g.hp, 7);
  const s2 = S(['.....', '..t..', '..g..', '..P..'], { g: 'grub', t: 'tortoise' }, ['gale_push']);
  const g2 = enemies(s2).find(e => e.defId === 'grub'); g2.hp = g2.maxHp = 9;
  cast(s2, 'gale_push', 2, 2); assert.equal(g2.hp, 7); assert.equal(enemies(s2).find(e => e.defId === 'tortoise').hp, 3);
});
test('chain lightning leaps to up to two nearby foes', () => {
  const s = S(['ttt.', '....', 'P...'], { t: 'tortoise' }, ['chain_lightning']); cast(s, 'chain_lightning', 0, 0);
  assert.deepEqual(enemies(s).map(e => e.hp).sort(), [2, 3, 3]);
});
test('starfall hits center for 5 and adjacent for 3', () => {
  const s = S(['.....', '.ttt.', '.....', '.....', '..P..'], { t: 'tortoise' }, ['starfall']); cast(s, 'starfall', 2, 1);
  assert.deepEqual(enemies(s).map(e => e.hp).sort(), [2, 2]);
});
test('spell damage never triggers deathtouch or lifelink', () => {
  const s = S(['t...', '....', 'P...'], { t: 'tortoise' }, ['ember_dart'], { evo: evoWith('nightcap_toad', 'bloodmoss_leech') });
  player(s).hp = 3; cast(s, 'ember_dart', 0, 0); assert.equal(enemies(s)[0].hp, 3); assert.equal(player(s).hp, 3);
});
test('every spell has formatted text with no unfilled placeholders', () => {
  for (const sp of SPELLS) assert.ok(!/\{/.test(formatSpellText(sp.id, 1, 0)), sp.id);
});
