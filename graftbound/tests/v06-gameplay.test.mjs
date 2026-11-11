import test from 'node:test'; import assert from 'node:assert/strict';
import { arena, evoWith } from './helpers.mjs';
import { movePlayer, attack, cast, endTurn, player, enemies, moveOptions, interact, interactOptions, castOptions, createBattle } from '../src/engine/combat.js';
import { getLegalPlayerActions, shouldAutoEnd } from '../src/engine/legal.js';
import { describeTile, pathWarning } from '../src/engine/describe.js';
import { TERRAIN_RULES } from '../src/data/terrain.js';
import { T } from '../src/core/grid.js';
import { planEnemy, bossPhaseOf } from '../src/engine/ai.js';
import { deriveStats } from '../src/engine/evolution.js';
const E = id => s => s.units.find(u => u.defId === id && u.hp > 0);
const book = ids => ids.map(id => ({ id: 'mtg:' + id, level: 1 }));

test('legal actions: movement keeps the turn; nothing left => auto-end; never while busy/targeting/after victory', () => {
  const s = arena(['g......', '.......', '......P'], { g: 'grub' });
  let L = getLegalPlayerActions(s); assert.ok(L.move.length && L.any); assert.equal(shouldAutoEnd(s), false);
  const far = moveOptions(s).sort((a, b) => b.cost - a.cost)[0]; movePlayer(s, far.x, far.y);
  L = getLegalPlayerActions(s); assert.equal(L.move.length, 0); assert.equal(L.attack.length, 0); assert.equal(L.any, false);
  assert.equal(shouldAutoEnd(s), true); assert.equal(shouldAutoEnd(s, { busy: true }), false); assert.equal(shouldAutoEnd(s, { targeting: true }), false); assert.equal(shouldAutoEnd(s, { enabled: false }), false);
  s.phase = 'won'; assert.equal(shouldAutoEnd(s), false); s.phase = 'enemy'; assert.equal(shouldAutoEnd(s), false);
});
test('legal actions: affordable spell with a target keeps the turn; unaffordable or targetless spell does not', () => {
  const s = arena(['g...', '....', 'P...'], { g: 'grub' }, { spellbook: book(['shock']) });
  s.p.moveLeft = 0; s.p.attacksLeft = 0; s.p.mana = 1; assert.deepEqual(getLegalPlayerActions(s).spells, ['mtg:shock']); assert.equal(shouldAutoEnd(s), false);
  s.p.mana = 0; assert.deepEqual(getLegalPlayerActions(s).spells, []); assert.equal(shouldAutoEnd(s), true);
  const f = arena(['g...', '....', 'P...'], { g: 'grub' }, { spellbook: book(['raise-the-alarm']) }); f.p.mana = 5; f.p.moveLeft = 0; f.p.attacksLeft = 0;
  for (const t of castOptions(f, 'mtg:raise-the-alarm')) f.terrain[t.y * f.w + t.x] = T.ROCK;   // no legal placement left
  assert.deepEqual(getLegalPlayerActions(f).spells, []);
});
test('stunned hero with no actions auto-ends; one endTurn = one enemy phase (no double enemy turns)', () => {
  const s = arena(['....g', '.....', 'P....'], { g: 'grub' }); const p = player(s);
  p.statuses.stunned = 1; s.p.moveLeft = 0; s.p.attacksLeft = 0; assert.equal(shouldAutoEnd(s), true);
  const t0 = s.turn; const ev = endTurn(s); assert.equal(s.turn, t0 + 1); assert.equal(ev.filter(e => e.t === 'turn' && e.phase === 'enemy').length, 1);
  assert.throws(() => { s.phase = 'enemy'; endTurn(s); }, /Not your turn/);
});
test('action counting: only accepted actions count; rejected input, inspection and end turn never do', () => {
  const s = arena(['g......', '.......', '......P'], { g: 'tortoise' }, { spellbook: book(['shock']) }); s.p.mana = 5;
  assert.throws(() => movePlayer(s, 0, 0)); assert.throws(() => attack(s, E('tortoise')(s).uid)); assert.throws(() => cast(s, 'mtg:shock', 3, 1));
  describeTile(s, 0, 0); pathWarning(s, 5, 2); getLegalPlayerActions(s);
  assert.equal(s.stats.actions, 0);
  movePlayer(s, 5, 2); assert.deepEqual([s.stats.actions, s.stats.moves, s.stats.tilesMoved], [1, 1, 1]);
  cast(s, 'mtg:shock', 0, 0); assert.equal(s.stats.actions, 2);
  endTurn(s); assert.equal(s.stats.actions, 2, 'ending the turn (manual or automatic) is not an action');
});
test('tooltips read live rule values; path warnings predict hazard damage and ending on lava', () => {
  const s = arena(['g....', '.....', '..*..', '..~..', '..P..'], { g: 'grub' });
  const b = describeTile(s, 2, 2)[0]; assert.equal(b.name, 'Brambles'); assert.match(b.text, new RegExp(`Deals ${TERRAIN_RULES.bramble.enterDamage} damage`));
  const old = TERRAIN_RULES.bramble.enterDamage; TERRAIN_RULES.bramble.enterDamage = 4;
  assert.match(describeTile(s, 2, 2)[0].text, /Deals 4 damage/, 'a balance change updates the tooltip automatically'); TERRAIN_RULES.bramble.enterDamage = old;
  assert.match(describeTile(s, 2, 3)[0].text, /Molten rock/);
  const w = pathWarning(s, 2, 2); assert.equal(w.enter, TERRAIN_RULES.bramble.enterDamage + TERRAIN_RULES.lava.enterDamage); assert.equal(w.endTurn, 0);
  const w2 = pathWarning(s, 2, 3); assert.equal(w2.enter, TERRAIN_RULES.lava.enterDamage); assert.equal(w2.endTurn, TERRAIN_RULES.lava.endTurnDamage);
  assert.equal(pathWarning(s, 1, 4), null, 'safe tiles get no warning');
  const f = arena(['g....', '.....', '..*..', '..~..', '..P..'], { g: 'grub' }, { evo: evoWith('mtg:storm-crow') }); assert.equal(pathWarning(f, 2, 2), null, 'fliers are immune');
  for (const [k, ch] of [['Rift', '%'], ['Leyline', '+'], ['Rock', '#']]) { const a = arena(['g..', `.${ch}.`, '.P.'], { g: 'grub' }); assert.equal(describeTile(a, 1, 1)[0].name, k); }
});
test('crystals: attune once for mana (an interaction action); lightning makes a crystal discharge once', () => {
  const s = arena(['g.......', '........', '........', '...P....'], { g: 'grub' }); s.crystals = [{ x: 3, y: 2, charged: true }]; s.p.mana = 0;
  assert.deepEqual(interactOptions(s), [{ x: 3, y: 2, kind: 'crystal' }]);
  interact(s, 3, 2); assert.equal(s.p.mana, TERRAIN_RULES.crystal.manaGain); assert.equal(s.stats.interactions, 1); assert.equal(s.stats.actions, 1);
  assert.throws(() => interact(s, 3, 2), /Nothing to use/); assert.deepEqual(getLegalPlayerActions(s).interact, []);
  const l = arena(['........', '..hh....', '........', '......P.'], { h: 'tortoise' }, { spellbook: book(['lightning-bolt']) }); l.p.mana = 9; l.crystals = [{ x: 2, y: 2, charged: true }];
  const [a, b] = enemies(l); cast(l, 'mtg:lightning-bolt', a.x, a.y);
  assert.equal(l.crystals[0].charged, false); assert.equal(b.hp, b.maxHp - TERRAIN_RULES.crystal.dischargeDamage); assert.equal(a.hp, a.maxHp - 3 - TERRAIN_RULES.crystal.dischargeDamage);
});
test('elemental interactions: fire burns brambles; frost hardens lava temporarily, then it melts back', () => {
  const s = arena(['.......', '..h....', '.......', '......P'], { h: 'tortoise' }, { spellbook: book(['flame-slash', 'frost-breath']) }); s.p.mana = 9;
  s.terrain[1 * 7 + 2] = T.BRAMBLE; cast(s, 'mtg:flame-slash', 2, 1); assert.equal(s.terrain[1 * 7 + 2], T.FLOOR);
  const f = arena(['.......', '..h....', '.......', '......P'], { h: 'tortoise' }, { spellbook: book(['frost-breath']) }); f.p.mana = 9; f.terrain[1 * 7 + 2] = T.LAVA;
  cast(f, 'mtg:frost-breath', 2, 1); assert.equal(f.terrain[1 * 7 + 2], T.FLOOR); assert.match(describeTile(f, 2, 1).map(r => r.name).join(), /Hardened lava/);
  for (let i = 0; i < TERRAIN_RULES.frost.coolRounds; i++) endTurn(f);
  assert.equal(f.terrain[1 * 7 + 2], T.LAVA, 'reverts after its rounds');
});
test('enemies understand terrain: they never pick a path whose hazards would kill them', () => {
  const s = arena(['.g.....', '~~~~~~~', '.......', '...P...'], { g: 'grub' }); const g = E('grub')(s); g.hp = 2;
  const plan = planEnemy(s, g); assert.ok(!plan.path.some(t => s.terrain[t.y * s.w + t.x] === T.LAVA), 'a 2-health grub will not wade into 2-damage lava');
});
test('bosses: three phases by health, announced once each; build-aware summons; Redaction is temporary', () => {
  const t = arena(['........', '...B....', '........', '........', '........', '........', '........', '...P....'], { B: 'thornmother' }, { evo: evoWith('mtg:storm-crow') });
  const b = E('thornmother')(t); assert.equal(bossPhaseOf(b), 1); b.hp = 11; assert.equal(bossPhaseOf(b), 2); b.hp = 5; assert.equal(bossPhaseOf(b), 3);
  b.hp = 11; const ev = endTurn(t); assert.equal(ev.filter(e => e.t === 'bossPhase' && e.phase === 2).length, 1); endTurn(t);
  assert.ok(t.units.some(u => u.defId === 'archer' && u.summoned), 'a flying build draws archers (arrows hit fliers)');
  assert.equal([...endTurn(t), ...endTurn(t)].filter(e => e.t === 'bossPhase' && e.phase === 2).length, 0, 'never re-announced');
  const u = arena(['........', '...U....', '........', '........', '........', '........', '........', '...P....'], { U: 'unwritten' }, { evo: evoWith('mtg:typhoid-rats') });
  const un = E('unwritten')(u); un.hp = 20; un.cycle = 1; const hero = player(u);
  endTurn(u); assert.equal(hero.keywords.deathtouch, undefined, 'redacted during your next turn'); assert.ok(hero.suppressed.deathtouch);
  endTurn(u); assert.equal(hero.keywords.deathtouch, 1, 'restored when that turn ends — never permanent');
});
