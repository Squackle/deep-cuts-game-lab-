// v1.5.0 rules overhaul: idempotent victory, simultaneous area damage, post-victory guard, archers in pairs, rocks.
import test from 'node:test'; import assert from 'node:assert/strict';
import { arena, botPlay } from './helpers.mjs';
import { cast, endTurn, interact, interactOptions, player, enemies, movePlayer } from '../src/engine/combat.js';
import { declareVictory, damageBatch, smashRock } from '../src/engine/abilities.js';
import { smashChoice, planEnemy } from '../src/engine/ai.js';
import { pairLineShooters, buildEncounter, isLineShooter } from '../src/engine/encounters.js';
import { ACTS } from '../src/data/encounters.js';
import { T, tileAt } from '../src/core/grid.js';
const book = ids => ids.map(id => ({ id: 'mtg:' + id, level: 1 }));

test('victory is declared exactly once, even when called repeatedly', () => {
  const s = arena(['g..', '...', 'P..'], { g: 'grub' }); enemies(s)[0].hp = 0;
  const ev = []; assert.equal(declareVictory(s, ev), true); assert.equal(declareVictory(s, ev), false); declareVictory(s, ev);
  assert.equal(ev.filter(e => e.t === 'victory').length, 1); assert.equal(s.phase, 'won');
});
test('Pyroclasm: one batch, every foe damaged from one snapshot, one victory event', () => {
  const s = arena(['g.g.....', '........', 'g.......', '.......P'], { g: 'grub' }, { spellbook: book(['pyroclasm']) });
  s.p.mana = 9; s.p.maxMana = 9; player(s).hp = player(s).maxHp = 30;
  const ev = cast(s, 'mtg:pyroclasm', player(s).x, player(s).y);
  const batch = ev.find(e => e.t === 'batch'); assert.ok(batch); assert.ok(ev.findIndex(e => e.t === 'batchEnd') > ev.findIndex(e => e.t === 'batch'));
  const dmgIdx = ev.map((e, i) => e.t === 'damage' ? i : -1).filter(i => i >= 0), deathIdx = ev.map((e, i) => e.t === 'death' ? i : -1).filter(i => i >= 0);
  assert.ok(Math.max(...dmgIdx.slice(0, batch.uids.length)) < Math.min(...deathIdx), 'all batch damage is applied before any death resolves');
  assert.equal(enemies(s).length, 0); assert.equal(ev.filter(e => e.t === 'victory').length, 1);
});
test('an earlier casualty in a batch never prevents later targets from being hit', () => {
  const s = arena(['gg.', '...', 'P..'], { g: 'grub' }); const [a, b] = enemies(s); const ev = [];
  damageBatch(s, ev, player(s), [[a, 9], [b, 9]], { kind: 'spell' });
  assert.equal(ev.filter(e => e.t === 'damage').length, 2); assert.equal(a.hp, 0); assert.equal(b.hp, 0);
  assert.equal(ev.filter(e => e.t === 'victory').length, 1);
});
test('after a finalized victory no new tokens or draws are generated', async () => {
  const { comboToken } = await import('../src/engine/combo-triggers.js'); const { traitDraw } = await import('../src/engine/trait-triggers.js');
  const s = arena(['g..', '...', 'P..'], { g: 'grub' }); enemies(s)[0].hp = 0; declareVictory(s, []);
  const n = s.units.length; const ev = []; assert.equal(comboToken(s, ev, 'Goblin'), null); traitDraw(s, ev, 2);
  assert.equal(s.units.length, n); assert.equal(ev.length, 0);
});
test('line-shooting archers never appear alone; pairing is budget-neutral', () => {
  for (const act of [0, 1, 2]) for (const k of ['early', 'mid', 'late', 'elite', 'bossEncounters']) for (const tpl of ACTS[act][k] || []) {
    const out = pairLineShooters(tpl.enemies); const n = out.filter(isLineShooter).length;
    assert.ok(n === 0 || n >= 2, tpl.name); assert.equal(out.length, tpl.enemies.length, 'same enemy count');
  }
  const enc = buildEncounter(ACTS[0].early[2], 1234); const ar = enc.enemies.filter(e => isLineShooter(e.defId));
  assert.equal(ar.length, 2); assert.ok(ar[0].x !== ar[1].x && ar[0].y !== ar[1].y, 'firing lanes cross, never stack');
});
test('player smash: legal only next to a rock, costs all movement and attacks, leaves walkable rubble', () => {
  const s = arena(['g....', '#####', '.....', '..P..'], { g: 'grub' });
  assert.ok(!interactOptions(s).some(o => o.kind === 'smash'), 'not adjacent yet');
  movePlayer(s, 2, 2); assert.ok(interactOptions(s).some(o => o.kind === 'smash' && o.x === 2 && o.y === 1));
  const ev = interact(s, 2, 1);
  assert.equal(tileAt(s, 2, 1), T.FLOOR); assert.deepEqual(s.rubble, [{ x: 2, y: 1 }]);
  assert.equal(s.p.moveLeft, 0); assert.equal(s.p.attacksLeft, 0); assert.ok(ev.some(e => e.t === 'terrain' && e.kind === 'smash'));
  assert.throws(() => interact(s, 1, 1));
  const copy = JSON.parse(JSON.stringify(s)); assert.equal(tileAt(copy, 2, 1), T.FLOOR, 'saved state keeps the rubble');
});
test('a walled-off foe smashes the rock on its direct route; a foe with an open route never smashes', () => {
  const s = arena(['..g..', '#####', '.....', '..P..'], { g: 'grub' }); const g = enemies(s)[0];
  const r = smashChoice(s, g, player(s)); assert.deepEqual(r, { x: 2, y: 1 });
  assert.equal(planEnemy(s, g).actions[0].type, 'smash');
  const o = arena(['..g..', '##.##', '.....', '..P..'], { g: 'grub' }); assert.equal(smashChoice(o, enemies(o)[0], player(o)), null);
  const ev = endTurn(s); assert.ok(ev.some(e => e.t === 'smash' && e.uid === g.uid)); assert.equal(tileAt(s, 2, 1), T.FLOOR);
});
test('threat report: before/after/delta/reasons; quick flawless +2; near-death -2; bounded 0..12', async () => {
  const { settleWorldThreat, reduceWorldThreat } = await import('../src/engine/world-threat.js');
  let r = {}; let t = settleWorldThreat({ level: 4 }, { victory: true, enemyDamage: 0, maxHealth: 20, turns: 2 }, r);
  assert.equal(t.level, 6); assert.deepEqual([r.before, r.after, r.delta], [4, 6, 2]); assert.ok(r.reasons.length);
  r = {}; t = settleWorldThreat({ level: 4 }, { victory: true, enemyDamage: 11, maxHealth: 20, turns: 6 }, r); assert.equal(r.delta, -2);
  r = {}; settleWorldThreat({ level: 4 }, { victory: true, enemyDamage: 3, maxHealth: 20, turns: 6 }, r); assert.equal(r.delta, 0); assert.ok(/holds/i.test(r.reasons.join(' ')));
  assert.equal(reduceWorldThreat({ level: 0 }, 2).state.level, 0); assert.equal(reduceWorldThreat({ level: 1 }, 2).removed, 1);
});
test('leaving a pack can lower threat (separate from the +1 Maximum Health skip) and records the change', async () => {
  const { newRun, skipReward, maxHpOf } = await import('../src/engine/run.js');
  const mk = () => { const r = newRun({ seed: 5, tutorial: false }); r.phase = 'reward'; r.pending = { cards: ['mtg:shock'], tier: 'battle' }; return r; };
  const a = mk(); a.worldThreat = { level: 3, flawlessStreak: 0, strongStreak: 2 }; const m = maxHpOf(a);
  assert.deepEqual(skipReward(a, 'threat'), { kind: 'threat', amount: -1 }); assert.equal(a.worldThreat.level, 2); assert.equal(maxHpOf(a), m); assert.equal(a.lastThreat.delta, -1);
  const b = mk(); b.worldThreat = { level: 0 }; assert.throws(() => skipReward(b, 'threat'), /minimum/);
  const c = mk(); skipReward(c); assert.equal(c.sparkBonus, 1, 'classic skip unchanged');
});
test('Wayshrine Penance: exact stated cost, -2 threat, never lethal, unavailable at threat 0 or low health', async () => {
  const { newRun, shrineChoice, maxHpOf } = await import('../src/engine/run.js'); const { SHRINES, penanceCost } = await import('../src/engine/shrines.js');
  const r = newRun({ seed: 9, tutorial: false }); r.worldThreat = { level: 5 }; r.phase = 'shrine'; r.shrine = { options: ['penance'] }; r.current = r.map.nodes[0].id;
  const view = { ...r, maxHp: maxHpOf(r) }; const cost = penanceCost(view); const hp0 = r.hp;
  assert.ok(SHRINES.penance.text(view).includes(String(cost)));
  shrineChoice(r, 'penance'); assert.equal(r.hp, hp0 - cost); assert.equal(r.worldThreat.level, 3);
  const low = { ...r, hp: cost, maxHp: maxHpOf(r), worldThreat: { level: 5 } }; assert.equal(SHRINES.penance.when(low), false);
  assert.equal(SHRINES.penance.when({ ...r, maxHp: 30, hp: 30, worldThreat: { level: 0 } }), false);
});
test('Exile zone reflects real state: Shinobi-exiled library cards and creatures exiled by effects', async () => {
  const { exileZone } = await import('../src/engine/zones.js');
  const s = { deck: { library: [], hand: [], graveyard: [{ id: 'mtg:shock' }], exile: [{ id: 'mtg:lightning-bolt' }, { id: 'mtg:disfigure' }] },
    units: [{ uid: 9, side: 'enemy', name: 'Fallen Shinobi', hp: 0, exiled: true, exiledBy: 'The Scarab God' }, { uid: 10, side: 'enemy', name: 'The Scarab God', exiled: true, inHand: true }] };
  const z = exileZone(s);
  assert.deepEqual(z.yours.map(c => c.id), ['mtg:lightning-bolt', 'mtg:disfigure']);
  assert.deepEqual(z.foes.map(f => f.name), ['Fallen Shinobi'], 'a creature returned to hand is not in exile; graveyard cards are not in exile');
  assert.deepEqual(exileZone(JSON.parse(JSON.stringify(s))), z, 'round-trips through saves');
});
