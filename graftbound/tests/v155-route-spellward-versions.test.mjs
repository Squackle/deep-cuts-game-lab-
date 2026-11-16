// v1.4.0 systems audit: elite lairs are always a choice, spell-focused builds get Spellward, and every version label agrees.
import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateMap } from '../src/engine/campaign.js';
import { deriveStats, newEvolution, FOCUS_WARD, spellFocus } from '../src/engine/evolution.js';
import { RULES_VERSION, RANKED_CHALLENGES } from '../src/engine/ranked.js';
import { GAME } from '../src/config.js';

test('no map node forces an Elite Lair when the next layer has a non-elite node', () => {
  for (let s = 1; s <= 300; s++) for (const act of [0, 1, 2]) {
    const m = generateMap(s * 7919, { act });
    for (const n of m.nodes) {
      const nxt = m.nodes.filter(x => x.depth === n.depth + 1);
      if (!n.next.length || !nxt.some(x => x.type !== 'elite')) continue;
      assert.ok(n.next.some(id => m.nodes[id].type !== 'elite'), `seed ${s} act ${act} node ${n.id} only leads to elites`);
    }
  }
});
test('every node is still reachable and every exit points one layer deeper', () => {
  for (let s = 1; s <= 100; s++) for (const act of [0, 1, 2]) {
    const m = generateMap(s * 31337, { act });
    for (const n of m.nodes) {
      for (const id of n.next) assert.equal(m.nodes[id].depth, n.depth + 1);
      if (n.depth > 0) assert.ok(m.nodes.some(p => p.next.includes(n.id)), `orphan ${n.id}`);
    }
  }
});
test('Spellward: each spell-focus tier grants +3 max health and +1 Arcane; no spells means no change', () => {
  const evo = newEvolution(); const base = deriveStats(evo, { spellCount: 0 });
  assert.equal(FOCUS_WARD, 3);
  for (const n of [0, 2, 3, 5, 6, 9]) {
    const st = deriveStats(evo, { spellCount: n });
    assert.equal(st.maxHealth - base.maxHealth, FOCUS_WARD * spellFocus(n));
    assert.equal(st.arcane - base.arcane, spellFocus(n));
  }
});
test('game, package and ranked rules versions agree (1.6.0-beta, revision 25)', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(GAME.version, '1.6.0-beta'); assert.equal(pkg.version, GAME.version);
  assert.equal(RULES_VERSION, 'graftbound-rules-' + GAME.version);
  assert.equal(RANKED_CHALLENGES['gb-expedition-01'].revision, 25);
});
test('learning the spell that completes a focus tier grants the Spellward health immediately', async () => {
  const { newRun, maxHpOf, chooseReward } = await import('../src/engine/run.js');
  const { installReferenceSet } = await import('../src/cards/reference-set.js'); installReferenceSet();
  const run = newRun({ seed: 99, tutorial: false });
  run.spellbook = [{ id: 'mtg:shock', level: 1 }, { id: 'mtg:disfigure', level: 1 }];
  const before = maxHpOf(run); run.hp = before - 2;
  run.phase = 'reward'; run.pending = { cards: ['mtg:lightning-bolt'], tier: 'battle' };
  chooseReward(run, 'mtg:lightning-bolt');
  assert.equal(maxHpOf(run), before + FOCUS_WARD);
  assert.equal(run.hp, before - 2 + FOCUS_WARD);
});
test('an enemy with Deathtouch damages the hero (+2) instead of destroying a full-health hero', async () => {
  const { dealDamage, strike } = await import('../src/engine/abilities.js');
  const hero = { uid: 1, hero: true, side: 'player', hp: 30, maxHp: 30, power: 5, toughness: 5, keywords: {}, statuses: {}, x: 0, y: 0 };
  const foe = { uid: 2, side: 'enemy', name: 'Wurmcoil Engine', hp: 6, maxHp: 6, power: 6, toughness: 6, keywords: { deathtouch: 1 }, statuses: {}, x: 1, y: 0 };
  const s = { units: [hero, foe], stats: { damageDealt: 0, damageTaken: 0 }, grid: null, phase: 'enemy' };
  const ev = []; dealDamage(s, ev, foe, hero, 6, { combat: true });
  assert.equal(hero.hp, 24, 'plain damage, no instant destruction');
  assert.ok(ev.some(e => e.t === 'deathtouchResisted'));
  assert.ok(!ev.some(e => e.t === 'damage' && e.deathtouch));
  // creatures (non-hero, non-boss) are still destroyed by Deathtouch
  const ally = { uid: 3, side: 'player', hp: 9, maxHp: 9, power: 1, toughness: 9, keywords: {}, statuses: {}, x: 2, y: 0 };
  s.units.push(ally); const ev2 = []; dealDamage(s, ev2, foe, ally, 1, { combat: true });
  assert.equal(ally.hp <= 0 || !s.units.includes(ally) || ally.dead, true);
});
