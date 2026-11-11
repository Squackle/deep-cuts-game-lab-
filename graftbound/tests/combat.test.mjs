import test from 'node:test'; import assert from 'node:assert/strict';
import { arena, evoWith } from './helpers.mjs';
import { attack, movePlayer, moveOptions, endTurn, attackTargets, player, enemies, cast, intents, hazardPreview } from '../src/engine/combat.js';
import { newEvolution } from '../src/engine/evolution.js';
import { spellCost } from '../src/engine/spells.js';
import { T } from '../src/core/grid.js';

const E = id => s => s.units.find(u => u.defId === id && u.hp > 0);
test('basic attack: survivor strikes back; killing blow suffers none; victory', () => {
  const s = arena(['...', '.h.', '.P.'], { h: 'hound' }); attack(s, E('hound')(s).uid);
  assert.equal(E('hound')(s).hp, 1); assert.equal(player(s).hp, 7 - 2);
  const k = arena(['...', '.g.', '.P.'], { g: 'grub' }, { evo: evoWith('mtg:grizzly-bears') }); attack(k, E('grub')(k).uid); assert.equal(k.phase, 'won');
});
test('defeat when the hero dies', () => { const s = arena(['...', '.a.', '.P.'], { a: 'alpha' }); player(s).hp = 3; attack(s, E('alpha')(s).uid); assert.equal(s.phase, 'lost'); });
test('deathtouch destroys any non-legendary foe; +2 vs legendary; shield and armor absorb first', () => {
  const s = arena(['...', '.t.', '.P.'], { t: 'tortoise' }, { evo: evoWith('mtg:typhoid-rats') }); attack(s, E('tortoise')(s).uid); assert.equal(s.phase, 'won');
  const b = arena(['.....', '..B..', '..P..'], { B: 'thornmother' }, { evo: evoWith('mtg:typhoid-rats') }); attack(b, E('thornmother')(b).uid); assert.equal(E('thornmother')(b).hp, 18 - 4);
  const a = arena(['...', '.x.', '.P.'], { x: 'ashbrute' }, { evo: evoWith('mtg:typhoid-rats') }); const br = E('ashbrute')(a); br.hp = 6;
  const weak = arena(['...', '.x.', '.P.'], { x: 'ashbrute' }, { evo: evoWith('mtg:pharika-s-chosen') }); weak.units.find(u => u.hero).power = 1;
  attack(weak, E('ashbrute')(weak).uid); assert.equal(E('ashbrute')(weak).hp, 6, 'a 1-power deathtouch strike is fully absorbed by Armor 1');
  attack(a, br.uid); assert.equal(br.hp, 0, '2-power deathtouch gets 1 through armor and kills');
});
test('armor reduces each combat strike but not spells', () => {
  const s = arena(['....', '.x..', '.P..', '....'], { x: 'ashbrute' }, { evo: evoWith('mtg:grizzly-bears'), spellbook: [{ id: 'mtg:shock', level: 1 }] });
  const b = E('ashbrute')(s); attack(s, b.uid); assert.equal(b.hp, 6 - 2);
  s.p.mana = 5; cast(s, 'mtg:shock', b.x, b.y); assert.equal(b.hp, 2);
});
test('trample: excess over armor+health hits the foe behind', () => {
  const s = arena(['.g.', '.g.', '.P.'], { g: 'grub' }, { evo: evoWith('mtg:war-mammoth') });
  const front = s.units.find(u => u.y === 1), back = s.units.find(u => u.y === 0 && u.side === 'enemy');
  attack(s, front.uid); assert.equal(front.hp, 0); assert.equal(back.hp, 0);
});
test('first strike, double strike, lifelink, flying, vigilance, haste', () => {
  const fs = arena(['...', '.h.', '.P.'], { h: 'hound' }, { evo: evoWith('mtg:youthful-knight') }); E('hound')(fs).hp = 9; attack(fs, E('hound')(fs).uid); assert.equal(player(fs).hp, player(fs).maxHp);
  const ds = arena(['...', '.t.', '.P.'], { t: 'tortoise' }, { evo: evoWith('mtg:fencing-ace') }); attack(ds, E('tortoise')(ds).uid); assert.equal(E('tortoise')(ds).hp, 1);
  const ll = arena(['...', '.t.', '.P.'], { t: 'tortoise' }, { evo: evoWith('mtg:child-of-night') }); player(ll).hp = 3; attack(ll, E('tortoise')(ll).uid); assert.equal(player(ll).hp, 3 + 3 - 1, 'lifelink heals 3 (1+2 power), counterblow 1');
  const fl = arena(['...', '.t.', '.P.'], { t: 'tortoise' }, { evo: evoWith('mtg:wind-drake') }); attack(fl, E('tortoise')(fl).uid); assert.equal(player(fl).hp, player(fl).maxHp);
  const vg = arena(['....', '.h..', '.P..', '....'], { h: 'hound' }, { evo: evoWith('mtg:serra-angel') }); E('hound')(vg).hp = 99; attack(vg, E('hound')(vg).uid); assert.ok(moveOptions(vg).length > 0);
  const hs = arena(['....', '.h..', '.P..', '....'], { h: 'hound' }, { evo: evoWith('mtg:raging-goblin') }); E('hound')(hs).hp = 99; attack(hs, E('hound')(hs).uid); assert.equal(attackTargets(hs).length, 1);
});
test('defender first strike hits first and can kill the attacker', () => {
  const s = arena(['...', '.a.', '.P.'], { a: 'alpha' }); player(s).hp = 3; attack(s, E('alpha')(s).uid); assert.equal(s.phase, 'lost'); assert.equal(E('alpha')(s).hp, 7);
});
test('hazards: brambles 1, lava 2 on entry and 2 for ending a turn on it; flyers immune', () => {
  const w = arena(['g..', '...', '*..', 'P..'], { g: 'grub' }); movePlayer(w, 0, 1); assert.equal(player(w).hp, 6);
  const l = arena(['....g', '.....', '.....', '~....', 'P....'], { g: 'grub' }); movePlayer(l, 0, 3); assert.equal(player(l).hp, 5); endTurn(l); assert.equal(player(l).hp, 3);
  const f = arena(['....g', '.....', '.....', '~....', 'P....'], { g: 'grub' }, { evo: evoWith('mtg:storm-crow') }); movePlayer(f, 0, 3); endTurn(f); assert.equal(player(f).hp, player(f).maxHp);
});
test('rifts are telegraphed on even rounds and pulse for 3 at the end of that round', () => {
  const s = arena(['g.......', '........', '........', '...%P...'], { g: 'grub' });
  assert.deepEqual(hazardPreview(s), [], 'round 1: no pulse'); endTurn(s);
  assert.equal(hazardPreview(s).length, 1, 'round 2 telegraphs'); movePlayer(s, 3, 3); const hp = player(s).hp; endTurn(s);
  assert.ok(player(s).hp <= hp - 3, 'standing on a pulsing rift hurts');
});
test('archer telegraphs a line, fires next turn; stepping out dodges', () => {
  const s = arena(['a.....', '......', '......', '......', '......', 'P.....'], { a: 'archer' });
  endTurn(s); const ar = E('archer')(s); assert.ok(ar.aim.tiles.some(t => t.x === player(s).x && t.y === player(s).y));
  const dodge = moveOptions(s).find(o => !ar.aim.tiles.some(t => t.x === o.x && t.y === o.y) && o.x !== ar.x && o.y !== ar.y);
  movePlayer(s, dodge.x, dodge.y); const hp = player(s).hp; endTurn(s); assert.equal(player(s).hp, hp);
});
test('pack hounds flank (+1 power) and take the side opposite their packmate', () => {
  const p = arena(['.....', '.....', '.hPh.', '.....'], { h: 'hound' }); assert.deepEqual(intents(p).map(x => x.damage), [3, 3]);
  const s = arena(['......', '..h...', '......', '.hP...', '......'], { h: 'hound' }); const mover = s.units.find(u => u.defId === 'hound' && u.y === 1);
  endTurn(s); assert.deepEqual([mover.x, mover.y], [3, 3]);
});
test('Cinderling bursts on death for 2 to everything adjacent (punishes melee)', () => {
  const s = arena(['...', '.c.', '.P.'], { c: 'cinderling' }, { evo: evoWith('mtg:grizzly-bears') }); const hp = player(s).hp;
  attack(s, E('cinderling')(s).uid); assert.equal(player(s).hp, hp - 2);
});
test('Skyhook Harpooner: double damage to fliers and Grounds them (−1 move, no flying) for one turn', () => {
  const s = arena(['..x...', '......', '......', '......', '..P...'], { x: 'harpooner' }, { evo: evoWith('mtg:storm-crow') });
  const it = intents(s)[0]; assert.equal(it.kind, 'harpoon'); assert.equal(it.damage, 4); assert.ok(it.ground);
  endTurn(s); const p = player(s); assert.equal(p.statuses.grounded, 1); assert.equal(s.p.moveLeft, p.move - 1);
  s.terrain[3 * 6 + 2] = T.ROCK; assert.ok(!moveOptions(s).some(o => o.x === 2 && o.y === 2), 'grounded flier cannot pass rocks');
  endTurn(s); assert.ok(!player(s).statuses.grounded || player(s).statuses.grounded === 1);
});
test('Emberseer marks a 3×3 around you; stepping out avoids it', () => {
  const s = arena(['x.......', '........', '........', '........', '........', '...P....'], { x: 'emberseer' });
  endTurn(s); const seer = E('emberseer')(s); assert.ok(seer.slam && seer.slam.tiles.length >= 6);
  const out = moveOptions(s).find(o => !seer.slam.tiles.some(t => t.x === o.x && t.y === o.y)); movePlayer(s, out.x, out.y);
  const hp = player(s).hp; endTurn(s); assert.ok(player(s).hp >= hp - 1, 'dodged the blast (hexers/others aside)');
});
test('Rift Stalker steps to your side every turn and strikes — distance does not protect you', () => {
  const s = arena(['r.......', '........', '........', '........', '........', '.......P'], { r: 'riftstalker' }); const hp = player(s).hp;
  endTurn(s); const r = E('riftstalker')(s); assert.equal(Math.abs(r.x - player(s).x) + Math.abs(r.y - player(s).y), 1); assert.equal(player(s).hp, hp - 3);
});
test('Null Warden taxes spells by 1 while alive', () => {
  const s = arena(['n...', '....', 'P...'], { n: 'nullwarden' }, { spellbook: [{ id: 'mtg:shock', level: 1 }] }); assert.equal(spellCost(s, 'mtg:shock'), 2);
  E('nullwarden')(s).hp = 0; assert.equal(spellCost(s, 'mtg:shock'), 1);
});
test('bosses: Thornmother slams (22% max health), Pyre Matron breathes a cross and melts tiles to lava, the Unwritten copies an ability', () => {
  const t = arena(['........', '...B....', '........', '........', '........', '........', '........', '...P....'], { B: 'thornmother' });
  endTurn(t); const b = E('thornmother')(t); assert.ok(b.slam && b.slam.tiles.length >= 6); const hp = player(t).hp; endTurn(t); assert.equal(player(t).hp, hp - 4);
  const m = arena(['........', '...M....', '........', '........', '........', '........', '........', '...P....'], { M: 'matron' });
  endTurn(m); const mat = E('matron')(m); assert.ok(mat.slam && mat.slam.tiles.some(q => q.x === 3 && q.y === 7)); endTurn(m);
  assert.ok(m.terrain.some(x => x === T.LAVA), 'lava created'); assert.ok(m.units.some(u => u.defId === 'cinderling'), 'cinderlings born');
  const u = arena(['........', '...U....', '........', '........', '........', '........', '........', '...P....'], { U: 'unwritten' }, { evo: evoWith('mtg:storm-crow', 'mtg:typhoid-rats') });
  endTurn(u); const un = E('unwritten')(u); assert.equal(un.keywords.flying, 1, 'copied Flying'); assert.equal(un.keywords.deathtouch, undefined, 'never copies Deathtouch');
});
test('boss strike cap: no single strike deals more than the cap', () => {
  const s = arena(['.....', '..B..', '..P..'], { B: 'thornmother' }, { evo: evoWith('mtg:craw-wurm', 'mtg:rumbling-baloth') });
  const b = E('thornmother')(s); attack(s, b.uid); assert.equal(b.hp, 18 - 5);
});
test('stun, allies and temporary effects', () => {
  const st = arena(['....', '.h..', '....', '.P..'], { h: 'hound' }, { spellbook: [{ id: 'mtg:frost-breath', level: 1 }] });
  st.p.mana = 3; cast(st, 'mtg:frost-breath', 1, 1); const hp = player(st).hp; endTurn(st); assert.equal(player(st).hp, hp);
  const al = arena(['.t..', '....', '....', '.P..'], { t: 'tortoise' }, { spellbook: [{ id: 'mtg:raise-the-alarm', level: 1 }] });
  al.p.mana = 3; cast(al, 'mtg:raise-the-alarm', 1, 2); const ally = al.units.find(u => u.defId === 'sproutling'); assert.ok(ally && !ally.hero && ally.name === 'Soldier');
  const evo = newEvolution(); const g = arena(['g..', '...', 'P..'], { g: 'grub' }, { evo, spellbook: [{ id: 'mtg:giant-growth', level: 1 }] });
  cast(g, 'mtg:giant-growth', player(g).x, player(g).y); assert.equal(player(g).statuses.empowered, 3); assert.equal(evo.power, 1); endTurn(g); assert.equal(player(g).statuses.empowered, 0);
});
test('illegal actions are rejected with readable reasons', () => {
  const s = arena(['g......', '.......', '......P'], { g: 'grub' });
  assert.throws(() => attack(s, E('grub')(s).uid), /Out of attack range/); assert.throws(() => movePlayer(s, 0, 0), /Out of reach/);
  endTurn(s); s.phase = 'enemy'; assert.throws(() => endTurn(s), /Not your turn/);
});
