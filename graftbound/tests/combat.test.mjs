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
test('Deathtouch destroys a printed legendary creature too, while shields and Armor prevent lethal damage', () => {
  const s = arena(['...', '.t.', '.P.'], { t: 'tortoise' }, { evo: evoWith('mtg:typhoid-rats') });
  attack(s, E('tortoise')(s).uid); assert.equal(s.phase, 'won');
  const boss = arena(['.....', '..B..', '..P..'], { B: 'nemata' }, { evo: evoWith('mtg:typhoid-rats') });
  attack(boss, E('nemata')(boss).uid);
  assert.equal(E('nemata')(boss)?.hp || 0,0,'legendary does not grant special Deathtouch immunity');
  const a = arena(['...', '.x.', '.P.'], { x: 'ashbrute' }, { evo: evoWith('mtg:typhoid-rats') });
  E('ashbrute')(a).keywords.armor=2; E('ashbrute')(a).hp=8;
  attack(a,E('ashbrute')(a).uid);assert.ok(E('ashbrute')(a),'a two-point Armor absorbs the one-point Deathtouch strike');
});

test('Armor is an explicit encounter modifier: reduces combat strikes but not spells', () => {
  const s = arena(['....', '.x..', '.P..','....'],{x:'ashbrute'},{evo:evoWith('mtg:grizzly-bears'),spellbook:[{id:'mtg:shock',level:1}]});
  const b=E('ashbrute')(s);b.hp=b.maxHp=12;b.keywords.armor=1;
  attack(s,b.uid);assert.equal(b.hp,10,'three-power player strike reduced to two');
  s.p.mana=5;cast(s,'mtg:shock',b.x,b.y);assert.equal(b.hp,8,'spell bypasses Armor');
});

test('trample: excess over armor+health hits the foe behind', () => {
  const s = arena(['.g.', '.g.', '.P.'], { g: 'grub' }, { evo: evoWith('mtg:war-mammoth') });
  const front = s.units.find(u => u.y === 1), back = s.units.find(u => u.y === 0 && u.side === 'enemy');
  attack(s, front.uid); assert.equal(front.hp, 0); assert.equal(back.hp, 0);
});
test('First Strike, Double Strike, Lifelink, Flying, Vigilance and Haste preserve their tactical identity', () => {
  const fs=arena(['...', '.h.', '.P.'],{h:'hound'},{evo:evoWith('mtg:youthful-knight')}); E('hound')(fs).hp=E('hound')(fs).maxHp=9;
  attack(fs,E('hound')(fs).uid); assert.equal(player(fs).hp,player(fs).maxHp);
  const ds=arena(['...', '.t.', '.P.'],{t:'tortoise'},{evo:evoWith('mtg:fencing-ace')}); E('tortoise')(ds).hp=E('tortoise')(ds).maxHp=12;
  attack(ds,E('tortoise')(ds).uid);assert.equal(E('tortoise')(ds).hp,8,'two two-power strikes');
  const ll=arena(['...', '.t.', '.P.'],{t:'tortoise'},{evo:evoWith('mtg:child-of-night')});E('tortoise')(ll).hp=E('tortoise')(ll).maxHp=12;player(ll).hp=3;
  attack(ll,E('tortoise')(ll).uid);assert.equal(player(ll).hp,3,'Lifelink heals three, then Dauntless Escort counters for three');
  const fl=arena(['...', '.t.', '.P.'],{t:'tortoise'},{evo:evoWith('mtg:wind-drake')});E('tortoise')(fl).hp=E('tortoise')(fl).maxHp=12;
  attack(fl,E('tortoise')(fl).uid);assert.equal(player(fl).hp,player(fl).maxHp);
  const vg=arena(['....','.h..','.P..','....'],{h:'hound'},{evo:evoWith('mtg:serra-angel')});E('hound')(vg).hp=99;
  attack(vg,E('hound')(vg).uid);assert.equal(player(vg).tapped,false);assert.ok(moveOptions(vg).length>0);
  const hs=arena(['....','.h..','.P..','....'],{h:'hound'},{evo:evoWith('mtg:raging-goblin')});E('hound')(hs).hp=99;
  attack(hs,E('hound')(hs).uid);assert.equal(attackTargets(hs).length,0);assert.equal(player(hs).tapped,true);
});

test('Real Elvish Archers First Strike can kill an attacking hero before it lands damage', () => {
  const s=arena(['...', '.a.', '.P.'],{a:'archer'});player(s).hp=2;
  E('archer')(s).hp=E('archer')(s).maxHp=9;
  attack(s,E('archer')(s).uid);assert.equal(s.phase,'lost');assert.equal(E('archer')(s).hp,9);
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
test('Mudbutton Torchrunner death trigger deals exactly three to the hero, not a fictional explosion', () => {
  const s=arena(['...', '.c.', '.P.'],{c:'cinderling'},{evo:evoWith('mtg:grizzly-bears')});const hp=player(s).hp;
  attack(s,E('cinderling')(s).uid);assert.equal(player(s).hp,hp-3);
});

test('Spikeshot Goblin taps to ping equal to its current Power (no invented anti-air bonus)', () => {
  const s=arena(['..x...','......','......','......','..P...'],{x:'harpooner'},{evo:evoWith('mtg:storm-crow')});
  const e=E('harpooner')(s),hp=player(s).hp;const ev=endTurn(s);
  assert.ok(ev.some(x=>x.t==='realAbility'&&x.name==='Spikeshot Goblin'));assert.equal(e.tapped,true);assert.equal(player(s).hp,hp-1);
});

test('Thermo-Alchemist has Defender and deals one to its opponent by tapping', () => {
 const s=arena(['x.......','........','........','........','........','...P....'],{x:'emberseer'});
 assert.equal(E('emberseer')(s).power,0);const hp=player(s).hp;const ev=endTurn(s);
 assert.ok(ev.some(x=>x.name==='Thermo-Alchemist'));assert.equal(player(s).hp,hp-1);
});

test('Fallen Shinobi has its printed 5/4 instead of fictional Rift Stalker stats', () => {
  const s=arena(['r.......','........','........','........','........','.......P'],{r:'riftstalker'});
  const e=E('riftstalker')(s);assert.equal(e.power,5);assert.equal(e.toughness,4);
  endTurn(s);assert.equal(e.hp>0,true);
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
