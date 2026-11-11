import test from 'node:test'; import assert from 'node:assert/strict';
import { arena, evoWith } from './helpers.mjs';
import { attack, movePlayer, moveOptions, endTurn, attackTargets, player, enemies, cast, castOptions, intents } from '../src/engine/combat.js';
import { newEvolution } from '../src/engine/evolution.js';

const E = id => s => s.units.find(u => u.defId === id && u.hp > 0);
test('basic attack: survivor strikes back (counterblow)', () => {
  const s = arena(['...', '.h.', '.P.'], { h: 'hound' }); attack(s, E('hound')(s).uid);
  assert.equal(E('hound')(s).hp, 1); assert.equal(player(s).hp, 7 - 2);
});
test('killing blow suffers no counterblow; victory', () => {
  const s = arena(['...', '.g.', '.P.'], { g: 'grub' }); attack(s, E('grub')(s).uid); assert.equal(s.phase, 'won'); assert.equal(player(s).hp, 7);
});
test('defeat when the hero dies', () => {
  const s = arena(['...', '.a.', '.P.'], { a: 'alpha' }); player(s).hp = 3; attack(s, E('alpha')(s).uid); assert.equal(s.phase, 'lost');
});
test('deathtouch destroys any non-legendary foe it damages', () => {
  const s = arena(['...', '.t.', '.P.'], { t: 'tortoise' }, { evo: evoWith('sable_adder') }); attack(s, E('tortoise')(s).uid); assert.equal(s.phase, 'won');
});
test('deathtouch vs legendary: +2 damage instead of destroy', () => {
  const s = arena(['.....', '..B..', '..P..'], { B: 'thornmother' }, { evo: evoWith('nightcap_toad') });
  const b = E('thornmother')(s); attack(s, b.uid); assert.equal(b.hp, 16 - 5);
});
test('shield absorbs before deathtouch can apply', () => {
  const s = arena(['...', '.h.', '.P.'], { h: 'hound' }, { evo: evoWith('nightcap_toad') });
  E('hound')(s).statuses.shield = 5; attack(s, E('hound')(s).uid);
  assert.equal(E('hound')(s).hp, 2); assert.equal(E('hound')(s).statuses.shield, 2);
});
test('trample: excess damage on kill hits the foe behind', () => {
  const s = arena(['.g.', '.g.', '.P.'], { g: 'grub' }, { evo: evoWith('ridgehorn_boar', 'mossback_brute') });
  const front = s.units.find(u => u.y === 1), back = s.units.find(u => u.y === 0 && u.side === 'enemy');
  attack(s, front.uid); assert.equal(front.hp, 0); assert.equal(back.hp, 0); assert.equal(s.phase, 'won');
});
test('deathtouch + trample: lethal is 1, rest tramples', () => {
  const s = arena(['.t.', '.h.', '.P.'], { h: 'hound', t: 'tortoise' }, { evo: evoWith('nightcap_toad', 'ridgehorn_boar') });
  attack(s, E('hound')(s).uid); assert.equal(s.phase, 'won');
});
test('first strike: attacked foes cannot strike back', () => {
  const s = arena(['...', '.h.', '.P.'], { h: 'hound' }, { evo: evoWith('glassblade_mantis') });
  E('hound')(s).hp = 5; E('hound')(s).maxHp = 5; attack(s, E('hound')(s).uid); assert.equal(player(s).hp, player(s).maxHp);
});
test('defender first strike hits first and can kill the attacker', () => {
  const s = arena(['...', '.a.', '.P.'], { a: 'alpha' }); player(s).hp = 3; attack(s, E('alpha')(s).uid);
  assert.equal(s.phase, 'lost'); assert.equal(E('alpha')(s).hp, 4);
});
test('flying: ground melee foes cannot strike back; flying foes can', () => {
  const s = arena(['...', '.t.', '.P.'], { t: 'tortoise' }, { evo: evoWith('galecrest_roc') });
  attack(s, E('tortoise')(s).uid); assert.equal(player(s).hp, player(s).maxHp);
  const s2 = arena(['...', '.m.', '.P.'], { m: 'moth' }, { evo: evoWith('ashwing_kestrel') });
  E('moth')(s2).hp = E('moth')(s2).maxHp = 9; attack(s2, E('moth')(s2).uid); assert.equal(player(s2).hp, player(s2).maxHp - 1);
});
test('double strike strikes twice', () => {
  const s = arena(['...', '.t.', '.P.'], { t: 'tortoise' }, { evo: evoWith('twinfang_lynx') }); attack(s, E('tortoise')(s).uid); assert.equal(E('tortoise')(s).hp, 1);
});
test('lifelink heals by damage dealt', () => {
  const s = arena(['...', '.t.', '.P.'], { t: 'tortoise' }, { evo: evoWith('bloodmoss_leech') }); player(s).hp = 5; attack(s, E('tortoise')(s).uid); assert.equal(player(s).hp, 6);
});
test('spines punish melee attackers', () => {
  const s = arena(['...', '.h.', '.P.'], { h: 'hound' }, { evo: evoWith('briarback_hedgehog') }); endTurn(s); assert.equal(E('hound')(s), undefined);
});
test('regenerate and bulwark refresh at the start of the player turn', () => {
  const s = arena(['g...', '....', '....', '...P'], { g: 'grub' }, { evo: evoWith('mossback_brute', 'cairnshell_tortoise') });
  assert.equal(player(s).statuses.shield, 2);
  player(s).hp -= 3; player(s).statuses.shield = 0; endTurn(s);
  assert.equal(player(s).hp, player(s).maxHp - 2); assert.equal(player(s).statuses.shield, 2);
});
test('long reach attacks 2 tiles away with no counterblow', () => {
  const s = arena(['.h.', '...', '.P.'], { h: 'hound' }, { evo: evoWith('longneck_heron') });
  assert.equal(attackTargets(s).length, 1); attack(s, E('hound')(s).uid); assert.equal(s.phase, 'won'); assert.equal(player(s).hp, player(s).maxHp);
});
test('vigilance keeps movement after attacking; normal attack ends it', () => {
  const a = arena(['....', '.h..', '.P..', '....'], { h: 'hound' }, { evo: evoWith('sentinel_stag') }); E('hound')(a).hp = 9; attack(a, E('hound')(a).uid); assert.ok(moveOptions(a).length > 0);
  const b = arena(['....', '.h..', '.P..', '....'], { h: 'hound' }); E('hound')(b).hp = 9; attack(b, E('hound')(b).uid); assert.equal(moveOptions(b).length, 0);
});
test('haste: two attacks on the first turn only', () => {
  const s = arena(['....', '.h..', '.P..', '....'], { h: 'hound' }, { evo: evoWith('ridgehorn_boar') });
  E('hound')(s).hp = 20; attack(s, E('hound')(s).uid); assert.equal(attackTargets(s).length, 1); attack(s, E('hound')(s).uid); assert.equal(attackTargets(s).length, 0);
});
test('flying moves over rocks and brambles without damage; walking through brambles hurts', () => {
  const s = arena(['g....', '.....', '###..', '***..', 'P....'], { g: 'grub' }, { evo: evoWith('ashwing_kestrel') });
  assert.ok(moveOptions(s).some(o => o.x === 0 && o.y === 1)); movePlayer(s, 0, 1); assert.equal(player(s).hp, player(s).maxHp);
  const w = arena(['g..', '...', '*..', 'P..'], { g: 'grub' }); movePlayer(w, 0, 1); assert.equal(player(w).hp, 6);
});
test('illegal actions are rejected with readable reasons', () => {
  const s = arena(['g......', '.......', '......P'], { g: 'grub' });
  assert.throws(() => attack(s, E('grub')(s).uid), /Out of attack range/);
  assert.throws(() => movePlayer(s, 0, 0), /Out of reach/);
  endTurn(s); s.phase = 'enemy'; assert.throws(() => endTurn(s), /Not your turn/);
});
test('archer telegraphs a line, fires next turn; stepping out dodges', () => {
  const s = arena(['a.....', '......', '......', '......', '......', 'P.....'], { a: 'archer' });
  endTurn(s); const ar = E('archer')(s); assert.ok(ar.aim.tiles.some(t => t.x === player(s).x && t.y === player(s).y));
  const dodge = moveOptions(s).find(o => !ar.aim.tiles.some(t => t.x === o.x && t.y === o.y) && o.x !== ar.x && o.y !== ar.y);
  movePlayer(s, dodge.x, dodge.y); const hp = player(s).hp; endTurn(s); assert.equal(player(s).hp, hp);
});
test('archer arrows hit the first unit in line, including allies', () => {
  const s = arena(['a.....', '......', '......', '......', '......', 'P.....'], { a: 'archer' });
  endTurn(s); const t0 = E('archer')(s).aim.tiles[0];
  s.units.push({ uid: 99, side: 'enemy', defId: 'grub', name: 'g', x: t0.x, y: t0.y, hp: 1, maxHp: 1, power: 1, keywords: {}, statuses: {}, move: 0 });
  endTurn(s); assert.equal(s.units.find(u => u.uid === 99).hp, 0);
});
test('intents preview melee damage; pack hounds get +1 when flanking', () => {
  const s = arena(['h...', '....', '....', 'P...'], { h: 'hound' }); const i = intents(s)[0]; assert.equal(i.kind, 'attack'); assert.equal(i.damage, 2);
  const p = arena(['.....', '.....', '.hPh.', '.....'], { h: 'hound' });
  assert.deepEqual(intents(p).map(x => x.damage), [3, 3]);
  const hp = player(p).hp; endTurn(p); assert.equal(player(p).hp, hp - 6);
});
test('flanker hound takes the side opposite its packmate', () => {
  const s = arena(['......', '..h...', '......', '.hP...', '......'], { h: 'hound' });
  const mover = s.units.find(u => u.defId === 'hound' && u.y === 1);
  endTurn(s); assert.deepEqual([mover.x, mover.y], [3, 3]);
});
test('thornmother: telegraphed slam, summon, bark below half', () => {
  const s = arena(['........', '...B....', '........', '........', '........', '........', '........', '...P....'], { B: 'thornmother' });
  endTurn(s); const b = E('thornmother')(s); assert.ok(b.slam && b.slam.tiles.length >= 6);
  const p = player(s); const before = p.hp; endTurn(s); assert.equal(p.hp, before - 4);
  assert.ok(s.units.some(u => u.defId === 'hound'));
  b.hp = 7; b.slam = null; endTurn(s); assert.ok(b.barked); assert.equal(b.statuses.shield, 5);
});
test('stunned enemy loses its next action', () => {
  const s = arena(['....', '.h..', '....', '.P..'], { h: 'hound' }, { spellbook: [{ id: 'rootsnare', level: 1 }] });
  s.p.mana = 3; cast(s, 'rootsnare', 1, 1); const hp = player(s).hp; endTurn(s); assert.equal(player(s).hp, hp);
});
test('summoned Sproutling ally fights on its own and its death does not end the battle', () => {
  const s = arena(['.t..', '....', '....', '.P..'], { t: 'tortoise' }, { spellbook: [{ id: 'call_sproutling', level: 1 }] });
  s.p.mana = 3; cast(s, 'call_sproutling', 1, 2);
  const ally = s.units.find(u => u.defId === 'sproutling'); assert.ok(ally && !ally.hero);
  const t = E('tortoise')(s); const thp = t.hp; endTurn(s);
  assert.ok(t.hp < thp, 'ally struck the warden'); assert.equal(s.phase, 'player');
  ally.hp = 0; assert.equal(s.phase, 'player');
});
test('temporary effects never leak into permanent evolution', () => {
  const evo = newEvolution(); const s = arena(['g..', '...', 'P..'], { g: 'grub' }, { evo, spellbook: [{ id: 'sap_surge', level: 1 }] });
  cast(s, 'sap_surge', player(s).x, player(s).y); assert.equal(player(s).statuses.empowered, 3); assert.equal(evo.power, 1);
  endTurn(s); assert.equal(player(s).statuses.empowered, 0);
});
test('mana: startMana, regen, cap; leyline +1', () => {
  const s = arena(['g...', '....', '....', '...P'], { g: 'grub' }); s.terrain[15] = 3; assert.equal(s.p.mana, 1);
  endTurn(s); assert.equal(s.p.mana, 3); endTurn(s); assert.equal(s.p.mana, 4);
});
