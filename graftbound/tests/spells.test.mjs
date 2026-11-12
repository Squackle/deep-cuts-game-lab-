import test from 'node:test'; import assert from 'node:assert/strict';
import { arena, evoWith } from './helpers.mjs';
import { cast, castOptions, player, enemies } from '../src/engine/combat.js';
import { formatSpellText, spellNumbers, castBlockReason, spellRange, rangeLabel } from '../src/engine/spells.js';
import { rewardCards } from '../src/cards/catalog.js';

const book = ids => ids.map(id => ({ id: 'mtg:' + id, level: 1 }));
const S = (rows, map, ids, opts = {}) => { const s = arena(rows, map, { spellbook: book(ids), ...opts }); s.p.mana = 12; s.p.maxMana = 12; return s; };
test('LONG RANGE: Lightning Bolt hits a foe across the whole board, through rocks, without moving', () => {
  const s = S(['t.......', '########', '........', '........', '........', '........', '........', '.......P'], { t: 'tortoise' }, ['lightning-bolt']);
  assert.deepEqual(castOptions(s, 'mtg:lightning-bolt'), [{ x: 0, y: 0 }]);
  cast(s, 'mtg:lightning-bolt', 0, 0); assert.equal(enemies(s)[0].hp, 5 - 3); assert.deepEqual([player(s).x, player(s).y], [7, 7]);
  assert.equal(spellRange('mtg:lightning-bolt'), Infinity); assert.equal(rangeLabel('mtg:lightning-bolt'), 'anywhere');
});
test('area spells target any non-rock tile anywhere', () => {
  const s = S(['tt......', '........', '........', '.......P'], { t: 'tortoise' }, ['infest', 'fireball']);
  cast(s, 'mtg:infest', 0, 0); assert.ok(enemies(s).every(e => e.statuses.poison === 2));
  cast(s, 'mtg:fireball', 0, 0); assert.deepEqual(enemies(s).map(e => e.hp).sort(), [1, 3]);
});
test('invalid targets are rejected: empty tiles for enemy spells, rocks for area spells', () => {
  const s = S(['t..#', '....', 'P...'], { t: 'tortoise' }, ['shock', 'infest']);
  assert.throws(() => cast(s, 'mtg:shock', 1, 1), /Not a valid target/); assert.throws(() => cast(s, 'mtg:infest', 3, 0), /Not a valid target/);
});
test('summon keeps a placement limit (range 2, empty, not lava)', () => {
  const s = S(['t.....', '......', '......', '......', '~.....', '.P....'], { t: 'tortoise' }, ['raise-the-alarm']);
  const opts = castOptions(s, 'mtg:raise-the-alarm'); assert.ok(opts.length > 0);
  assert.ok(opts.every(o => Math.abs(o.x - 1) + Math.abs(o.y - 5) <= 2)); assert.ok(!opts.some(o => o.x === 0 && o.y === 4), 'not onto lava');
});
test('legacy teleport keeps its movement range', () => {
  const s = arena(['t.......', '........', '........', '.......P'], { t: 'tortoise' }, { spellbook: [{ id: 'blink_step', level: 1 }] }); s.p.mana = 5;
  assert.ok(castOptions(s, 'blink_step').every(o => Math.abs(o.x - 7) + Math.abs(o.y - 3) <= 3));
});
test('cast restrictions: once per turn, mana, readable reasons', () => {
  const s = S(['t...', '....', 'P...'], { t: 'tortoise' }, ['shock', 'arc-lightning']);
  cast(s, 'mtg:shock', 0, 0); assert.equal(castBlockReason(s, 'mtg:shock'), 'Already cast this turn');
  s.p.mana = 1; assert.match(castBlockReason(s, 'mtg:arc-lightning'), /Needs 3 mana/);
  assert.equal(castBlockReason(s, 'mtg:fireball'), 'Not in your spellbook');
});
test('adapted numbers: Shock 2, Bolt 3, Flame Slash 4, Arc Lightning 2+1+1, levels and Arcane add', () => {
  assert.deepEqual(spellNumbers('mtg:shock'), [2]); assert.deepEqual(spellNumbers('mtg:lightning-bolt'), [3]); assert.deepEqual(spellNumbers('mtg:flame-slash'), [4]);
  assert.deepEqual(spellNumbers('mtg:arc-lightning'), [2, 1]); assert.deepEqual(spellNumbers('mtg:lightning-bolt', 2, 1), [5]);
  const s = S(['ttt.', '....', 'P...'], { t: 'tortoise' }, ['arc-lightning']); cast(s, 'mtg:arc-lightning', 0, 0);
  assert.deepEqual(enemies(s).map(e => e.hp).sort(), [3, 4, 4]);
});
test('drain, heal+cleanse, shield, stun', () => {
  const s = S(['t...', '....', 'P...'], { t: 'tortoise' }, ['drain-life', 'healing-hands', 'feat-of-resistance', 'frost-breath']);
  const p = player(s); p.hp = 1; p.statuses.poison = 3; p.statuses.weakened = 2;
  cast(s, 'mtg:drain-life', 0, 0); assert.equal(p.hp, 3); cast(s, 'mtg:healing-hands', p.x, p.y); assert.equal(p.hp, 7); assert.equal(p.statuses.poison, 0); assert.equal(p.statuses.weakened, 0);
  cast(s, 'mtg:feat-of-resistance', p.x, p.y); assert.equal(p.statuses.shield, 3); cast(s, 'mtg:frost-breath', 0, 0); assert.equal(enemies(s)[0].statuses.stunned, 1);
});
test('spell damage never triggers deathtouch or lifelink', () => {
  const s = S(['t...', '....', 'P...'], { t: 'tortoise' }, ['shock'], { evo: evoWith('mtg:typhoid-rats', 'mtg:child-of-night') });
  player(s).hp = 3; cast(s, 'mtg:shock', 0, 0); assert.equal(enemies(s)[0].hp, 3); assert.equal(player(s).hp, 3);
});
test('every real spell has VFX identity, adaptation note and fully formatted text', () => {
  for (const c of rewardCards().filter(c => c.kind === 'spell')) { assert.ok(c.vfx, c.name); assert.match(c.adaptationNote, /Adapted/); assert.ok(!/\{/.test(formatSpellText(c.id)), c.name); }
  assert.equal(rewardCards().find(c => c.name === 'Lightning Bolt').vfx, 'lightningBolt'); assert.notEqual(rewardCards().find(c => c.name === 'Shock').vfx, 'fire');
});

test('friendly target spells empower and shield Raise the Alarm Soldiers without affecting the caster', () => {
  const s = S(['t.....', '......', '......', '..P...'], { t: 'tortoise' },
    ['raise-the-alarm', 'giant-growth', 'titanic-growth', 'feat-of-resistance', 'snakeskin-veil']);
  cast(s, 'mtg:raise-the-alarm', 2, 2);
  const soldier = s.units.find(u => u.side === 'player' && !u.hero);
  assert.equal(soldier.name, 'Soldier'); assert.equal(soldier.power, 2);
  const p = player(s);
  assert.ok(castOptions(s, 'mtg:giant-growth').some(t => t.x === soldier.x && t.y === soldier.y));
  assert.ok(castOptions(s, 'mtg:feat-of-resistance').some(t => t.x === soldier.x && t.y === soldier.y));
  cast(s, 'mtg:giant-growth', soldier.x, soldier.y);
  assert.equal(soldier.statuses.empowered, 3); assert.ok(!p.statuses.empowered);
  cast(s, 'mtg:feat-of-resistance', soldier.x, soldier.y);
  assert.equal(soldier.statuses.shield, 3); assert.equal(p.statuses.shield || 0, 0);
  cast(s, 'mtg:snakeskin-veil', p.x, p.y);
  assert.equal(p.statuses.shield, 2);
  assert.throws(() => cast(s, 'mtg:titanic-growth', 1, 1), /Not a valid target/);
});

test('leveled-up Pyroclasm actually deals more damage and its text reflects the upgrade', () => {
  const s = S(['tt....', '......', 'P.....'], { t: 'tortoise' }, ['pyroclasm']);
  s.spellbook[0].level = 2;
  assert.match(formatSpellText('mtg:pyroclasm', 2), /3/);
  cast(s, 'mtg:pyroclasm', player(s).x, player(s).y);
  assert.deepEqual(enemies(s).map(e => e.hp), [2, 2]);
});
