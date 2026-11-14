import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './helpers.mjs';
import { attack, endTurn, movePlayer, gearhulkChoice, player, enemies, cast } from '../src/engine/combat.js';
import { dealDamage } from '../src/engine/abilities.js';
import { createCombatDeck } from '../src/engine/deck.js';
import { getLegalPlayerActions, shouldAutoEnd } from '../src/engine/legal.js';
import { manaValue, opponentLibrary, pendingChoice, gearhulkPreview, scarabTargets, OPP_BOARD_CAP } from '../src/engine/printed-triggers.js';
import { ENEMY_FACTS } from '../src/cards/enemy-facts.js';
import { applyDecision, startRanked, validDecision, RULES_VERSION } from '../src/engine/ranked.js';

const foe = (s, id) => s.units.find(u => u.defId === id && u.hp > 0);
const mv = id => manaValue(ENEMY_FACTS[id].mana_cost);

test('mana value parser matches printed costs', () => {
  assert.equal(manaValue('{4}{R}{R}'), 6); assert.equal(manaValue('{9}'), 9); assert.equal(manaValue('{G}'), 1);
  assert.equal(manaValue('{X}{R}'), 1); assert.equal(manaValue(''), 0);
});

test('Combustible Gearhulk: entering creates a pending opponent choice that blocks every other action and auto-end', () => {
  const s = arena(['.....', '..C..', '.....', '..P..'], { C: 'champion' });
  assert.equal(pendingChoice(s)?.kind, 'gearhulk');
  assert.throws(() => movePlayer(s, 1, 3), /Gearhulk/);
  assert.throws(() => endTurn(s), /Gearhulk/);
  const legal = getLegalPlayerActions(s);
  assert.equal(legal.any, true); assert.equal(legal.move.length, 0); assert.equal(legal.choice.kind, 'gearhulk');
  assert.equal(shouldAutoEnd(s), false, 'never auto-ends past a printed choice');
  assert.throws(() => gearhulkChoice(s, 'burn'), /draw or mill/);
});

test('Gearhulk mill: three cards milled, damage equals their total mana value, deterministic per seed', () => {
  const run = seed => { const s = arena(['.....', '..C..', '.....', '..P..'], { C: 'champion' }, { seed });
    const top = opponentLibrary(s).library.slice(0, 3); const hp = player(s).hp; player(s).maxHp = player(s).hp = 99;
    gearhulkChoice(s, 'mill'); return { s, top, total: top.reduce((a, id) => a + mv(id), 0), hp }; };
  const a = run(7), b = run(7);
  assert.deepEqual(a.top, b.top, 'same seed, same library');
  assert.deepEqual(a.s.opp.graveyard, a.top);
  assert.equal(player(a.s).hp, 99 - a.total);
  assert.equal(pendingChoice(a.s), null);
  assert.ok(a.total <= gearhulkPreview(arena(['.....', '..C..', '.....', '..P..'], { C: 'champion' }, { seed: 7 })).maxDamage);
});

test('Gearhulk draw: no damage; the opponent casts at most one drawn creature per enemy turn, bounded by board cap', () => {
  const s = arena(['.......', '...C...', '.......', '.......', '...P...'], { C: 'champion' }, { seed: 3 });
  const hp = player(s).hp;
  gearhulkChoice(s, 'draw');
  assert.equal(player(s).hp, hp); assert.equal(s.opp.hand.length, 3);
  const before = enemies(s).length; endTurn(s);
  const castable = s.opp.hand.length < 3;
  assert.ok(enemies(s).length <= before + 1, 'at most one creature cast per turn');
  if (castable) assert.equal(enemies(s).length, before + 1);
  assert.ok(enemies(s).length <= OPP_BOARD_CAP);
  assert.equal(enemies(s).filter(u => u.defId === 'champion').length, 1, 'never casts a second Gearhulk');
});

test('Gearhulk choice is a strict replay decision', () => {
  assert.equal(RULES_VERSION, 'graftbound-rules-1.2.5-beta');
  assert.ok(validDecision({ seq: 0, type: 'gearhulk', choice: 'mill' }, 0));
  assert.ok(!validDecision({ seq: 0, type: 'gearhulk', choice: 'both' }, 0));
  assert.ok(!validDecision({ seq: 0, type: 'gearhulk', choice: 'draw', extra: 1 }, 0));
  const run = startRanked();
  assert.throws(() => applyDecision(run, { seq: 0, type: 'gearhulk', choice: 'draw' }), /not allowed/);
});

test('Fallen Shinobi: combat damage to you exiles your top two library cards; a damage spell is played for free at you', () => {
  const s = arena(['.....', '..R..', '..P..'], { R: 'riftstalker' });
  s.deck = createCombatDeck([{ id: 'mtg:lightning-bolt', level: 1 }, { id: 'mtg:giant-growth', level: 1 }, { id: 'mtg:shock', level: 1 }], 1);
  s.deck.library = [{ id: 'mtg:lightning-bolt', level: 3 }, { id: 'mtg:giant-growth', level: 1 }, { id: 'mtg:shock', level: 1 }];
  const hero = player(s); hero.maxHp = hero.hp = 40; hero.statuses.shield = 0;
  const ev = []; const lost = dealDamage(s, ev, foe(s, 'riftstalker'), hero, 5, { combat: true });
  assert.equal(lost, 5);
  assert.deepEqual(s.deck.exile.map(c => c.id), ['mtg:lightning-bolt', 'mtg:giant-growth']);
  assert.deepEqual(s.deck.library.map(c => c.id), ['mtg:shock']);
  assert.equal(hero.hp, 40 - 5 - 3, 'Bolt played at printed strength (3), not your inscribed level');
  assert.ok(ev.some(e => e.t === 'shinobiExile' && e.id === 'mtg:giant-growth'));
});

test('Fallen Shinobi: blocked or non-combat damage does not trigger; empty library is safe', () => {
  const s = arena(['.....', '..R..', '..P..'], { R: 'riftstalker' });
  s.deck = createCombatDeck([{ id: 'mtg:shock', level: 1 }], 1); s.deck.library = [{ id: 'mtg:shock', level: 1 }];
  const hero = player(s); hero.statuses.shield = 10;
  dealDamage(s, [], foe(s, 'riftstalker'), hero, 5, { combat: true });
  assert.equal(s.deck.library.length, 1, 'fully shielded: no combat damage dealt');
  hero.statuses.shield = 0; dealDamage(s, [], foe(s, 'riftstalker'), hero, 2, { kind: 'spell' });
  assert.equal(s.deck.library.length, 1, 'non-combat damage');
  const t = arena(['.....', '..R..', '..P..'], { R: 'riftstalker' });
  assert.doesNotThrow(() => dealDamage(t, [], foe(t, 'riftstalker'), player(t), 2, { combat: true }));
});

test('The Scarab God upkeep is life LOSS (ignores shield) and counts Zombie creatures including Fallen Shinobi', () => {
  const s = arena(['.........', '.G.....R.', '.........', '.........', '.........', '....P....'], { G: 'scarab', R: 'riftstalker' });
  const hero = player(s); hero.maxHp = hero.hp = 40; hero.statuses.shield = 9;
  const ev = endTurn(s);
  const loss = ev.find(e => e.t === 'damage' && e.kind === 'lifeLoss');
  assert.ok(loss, 'upkeep life loss happened'); assert.equal(loss.amount, 1, 'X = 1 Zombie (Fallen Shinobi is a Zombie Ninja)');
  assert.ok(ev.some(e => e.t === 'legendaryAbility' && /scry 1/.test(e.name)));
});

test('The Scarab God reanimates from ANY graveyard as a 4/4 Zombie token copy that keeps printed keywords', () => {
  const s = arena(['.......', '.G.....', '...D...', '...P...'], { G: 'scarab', D: 'shardling' });
  const god = foe(s, 'scarab'); const duelist = foe(s, 'shardling');
  duelist.hp = 0; god.bossMana = 7;
  assert.ok(scarabTargets(s, god).some(t => t.uid === duelist.uid));
  endTurn(s);
  const copy = s.units.find(u => u.zombie && u.hp > 0);
  assert.ok(copy, 'a zombie copy exists');
  assert.equal(copy.defId, 'shardling'); assert.equal(copy.power, 4); assert.equal(copy.toughness, 4);
  assert.equal(copy.keywords.flying, 1, 'copy keeps Flying'); assert.equal(copy.token, true);
  assert.ok(duelist.exiled);
});

test('The Scarab God returns to hand at the next end step and is recast as a printed 5/5 while other foes remain', () => {
  const s = arena(['.........', '.G.....W.', '.........', '....P....'], { G: 'scarab', W: 'hound' });
  const god = foe(s, 'scarab'); god.bossMana = 5;
  god.hp = 1; dealDamage(s, [], player(s), god, 5, { kind: 'spell' });
  assert.equal(god.hp, 0); assert.equal(s.phase, 'player', 'Timberpack Wolf remains, battle continues');
  assert.ok(s.scarabReturn);
  endTurn(s);
  const again = s.units.find(u => u.defId === 'scarab' && u.hp > 0);
  assert.ok(again, 'recast on the enemy turn');
  assert.equal(again.hp, 5); assert.equal(again.legendaryVitality, 0);
  assert.ok(god.inHand && god.exiled, 'original object left the graveyard');
});

test('Killing The Scarab God as the last foe wins immediately (no recast once the board is empty)', () => {
  const s = arena(['.....', '..G..', '..P..'], { G: 'scarab' });
  const god = foe(s, 'scarab'); god.hp = 1;
  dealDamage(s, [], player(s), god, 3, { kind: 'spell' });
  assert.equal(s.phase, 'won');
});

test('empty library reshuffles the graveyard (never exile) deterministically at the draw step', async () => {
  const { refillFromGraveyard } = await import('../src/engine/deck.js');
  const mk = () => ({ library: [], hand: [], graveyard: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], exile: [{ id: 'x' }], capacity: 7 });
  const d1 = mk(), d2 = mk();
  assert.equal(refillFromGraveyard(d1), 3); refillFromGraveyard(d2);
  assert.deepEqual(d1.library, d2.library); assert.equal(d1.graveyard.length, 0); assert.deepEqual(d1.exile, [{ id: 'x' }]);
  assert.equal(refillFromGraveyard({ library: [{ id: 'z' }], graveyard: [{ id: 'q' }] }), 0, 'only when the library is empty');
});

test('a pending Gearhulk choice survives a JSON save/load and still resolves', () => {
  const s = arena(['.....', '..C..', '.....', '..P..'], { C: 'champion' }, { seed: 11 });
  const t = JSON.parse(JSON.stringify(s));
  assert.equal(pendingChoice(t).kind, 'gearhulk');
  player(t).maxHp = player(t).hp = 99; player(s).maxHp = player(s).hp = 99;
  gearhulkChoice(t, 'mill'); gearhulkChoice(s, 'mill');
  assert.equal(player(t).hp, player(s).hp); assert.deepEqual(t.opp, s.opp);
});

test('Fallen Shinobi does NOT trigger when it strikes back as a blocker (counter), only when it attacks', () => {
  const s = arena(['.....', '..R..', '..P..'], { R: 'riftstalker' });
  s.deck = createCombatDeck([{ id: 'mtg:shock', level: 1 }], 1); s.deck.library = [{ id: 'mtg:shock', level: 1 }, { id: 'mtg:giant-growth', level: 1 }];
  player(s).maxHp = player(s).hp = 40;
  dealDamage(s, [], foe(s, 'riftstalker'), player(s), 5, { combat: true, kind: 'counter' });
  assert.equal(s.deck.library.length, 2, 'no exile from a counterblow');
  dealDamage(s, [], foe(s, 'riftstalker'), player(s), 5, { combat: true, kind: 'strike' });
  assert.equal(s.deck.library.length, 0, 'exiles two when it attacks');
});

test('the forced Gearhulk choice is not counted as an accepted action (score neutral)', () => {
  const s = arena(['.....', '..C..', '.....', '..P..'], { C: 'champion' });
  player(s).maxHp = player(s).hp = 99;
  const before = s.stats.actions; gearhulkChoice(s, 'draw');
  assert.equal(s.stats.actions, before);
});
