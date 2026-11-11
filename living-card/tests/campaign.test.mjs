import test from 'node:test'; import assert from 'node:assert/strict';
import { installReferenceSet } from '../src/cards/reference-set.js';
import { reinforcements, threatOf } from '../src/engine/encounters.js';
import { newEvolution } from '../src/engine/evolution.js';
import { slamDamage } from '../src/engine/ai.js';
import { ENEMIES } from '../src/data/enemies.js';
import { attack, endTurn, player, intents } from '../src/engine/combat.js';
import { arena, evoWith } from './helpers.mjs';
import { winRate } from './sim.mjs';
installReferenceSet();

test('reinforcements: none early or for weak builds; scale with build strength; deterministic; capped', () => {
  assert.deepEqual(reinforcements('battle', 1, evoWith('deeproot_wyrm', 'deeproot_wyrm'), 5), []);
  assert.deepEqual(reinforcements('battle', 4, newEvolution(), 5), []);
  const strong = evoWith('deeproot_wyrm', 'deeproot_wyrm', 'mossback_brute', 'twinfang_lynx', 'sable_adder');
  const r = reinforcements('battle', 4, strong, 5); assert.ok(r.length >= 1 && r.length <= 2, String(r));
  assert.deepEqual(r, reinforcements('battle', 4, strong, 5));
  assert.ok(threatOf(strong) > threatOf(newEvolution()));
});
test('Briar Hexer: telegraphed curse deals 1 and Weakens for exactly one player turn', () => {
  const s = arena(['..x...', '......', '......', '......', '......', '..P...'], { x: 'hexer' }, { evo: evoWith('galecrest_roc') });
  const it = intents(s)[0]; assert.equal(it.kind, 'hex'); assert.equal(it.weaken, 2);
  const p = player(s); const hp = p.hp; endTurn(s);
  assert.equal(p.hp, hp - 1); assert.equal(p.statuses.weakened, 2);
  const hexer = s.units.find(u => u.defId === 'hexer'); hexer.x = p.x; hexer.y = p.y - 1; hexer.hp = hexer.maxHp = 9;
  attack(s, hexer.uid); assert.equal(hexer.hp, 9 - Math.max(0, p.power - 2), 'weakened strike');
  s.units.forEach(u => { if (u.defId === 'hexer') u.hp = 0; }); s.phase = 'player'; s.units.push({ uid: 50, side: 'enemy', defId: 'grub', name: 'g', x: 0, y: 0, hp: 1, maxHp: 1, power: 1, keywords: {}, statuses: {}, move: 0 });
  endTurn(s); assert.equal(p.statuses.weakened, 0, 'cleared after one turn');
});
test('Thornmother: Ancient Heartwood caps each strike at 5; Root Slam scales with your max health', () => {
  const s = arena(['.....', '..B..', '..P..'], { B: 'thornmother' }, { evo: evoWith('deeproot_wyrm', 'deeproot_wyrm', 'mossback_brute') });
  const b = s.units.find(u => u.defId === 'thornmother'); attack(s, b.uid); assert.equal(b.hp, 16 - 5);
  assert.equal(slamDamage(ENEMIES.thornmother, { maxHp: 40 }), 10); assert.equal(slamDamage(ENEMIES.thornmother, { maxHp: 7 }), 4);
});
test('campaign balance (naive bot, full runs): challenging, not trivial; picks matter', () => {
  for (const contentMode of ['original', 'reference']) {
    const g = winRate(40, { contentMode, policy: 'greedy' }), r = winRate(40, { contentMode, policy: 'random' });
    console.log(contentMode, 'greedy', g.rate, 'random', r.rate);
    assert.ok(g.rate <= 0.9 && g.rate >= 0.4, `${contentMode} greedy ${g.rate}`);
    assert.ok(r.rate < g.rate + 0.05, `${contentMode}: random picks should not beat considered picks`);
    assert.ok(g.runs.some(x => !x.won && x.depth >= 5), `${contentMode}: late-game losses exist`);
  }
});
