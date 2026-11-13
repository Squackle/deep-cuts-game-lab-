// v1.0 candidate: full Guard commitment + selective, signposted spell-element matchups.
import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, evoWith } from './helpers.mjs';
import { player, cast, guard, movePlayer, stanceMovementCost, stanceBlockReason } from '../src/engine/combat.js';
import { dealDamage } from '../src/engine/abilities.js';
import { ENEMIES } from '../src/data/enemies.js';
import { RULES_VERSION, RANKED_CHALLENGES } from '../src/engine/ranked.js';
import { TACTICS } from '../src/data/tactics.js';

const book = (...cards) => cards.map(id => ({ id: 'mtg:' + id, level: 1 }));
const find = (s, id) => s.units.find(u => u.defId === id);

test('full movement Guard: no moving first, all MP spent, attack spent, failed requests leave state untouched', () => {
  const s = arena(['..g..', '.....', '..P..'], { g: 'grub' });
  const move = s.p.moveLeft;
  assert.equal(TACTICS.guard.moveCost, 'full');
  assert.equal(stanceMovementCost(s, 'guard'), move);
  movePlayer(s, 2, 1);
  const before = structuredClone(s);
  assert.match(stanceBlockReason(s, 'guard'), /all .* movement points unspent/i);
  assert.throws(() => guard(s), /cannot Guard after moving/i);
  assert.deepEqual(s, before);
  const fresh = arena(['..g..', '.....', '..P..'], { g: 'grub' });
  guard(fresh);
  assert.equal(fresh.p.moveLeft, 0);
  assert.equal(fresh.p.attacksLeft, 0);
  assert.equal(fresh.stats.stances, 1);
  assert.throws(() => movePlayer(fresh, 2, 1), /movement left/i);
});

test('Guard full cost tracks movement-enhancing grafts and grounded movement', () => {
  const evo = evoWith('mtg:grizzly-bears');
  const s = arena(['g...', '....', 'P...'], { g: 'grub' }, { evo });
  const hero = player(s);
  hero.move = 9; s.p.moveLeft = 9;
  assert.equal(stanceMovementCost(s, 'guard'), 9);
  hero.statuses.grounded = 1; s.p.moveLeft = 8;
  assert.equal(stanceMovementCost(s, 'guard'), hero.keywords.flying ? 8 : 9);
});

test('real creature identities never inherit fictional elemental resistances or weaknesses',()=>{
 for(const id of ['cinderling','shardling','hound','moth','alpha'])assert.equal(ENEMIES[id].affinity,undefined,id);
 const s=arena(['c...','....','P...'],{c:'cinderling'});const target=find(s,'cinderling');
 const ev=[];const hit=dealDamage(s,ev,player(s),target,1,{kind:'spell',element:'fire'});
 assert.equal(hit,1);assert.ok(!ev.some(e=>e.t==='resisted'||e.t==='weakpoint'));
});

test('real spell damage bypasses invented color-affinities; rules versions isolate the new card engine',()=>{
 const s=arena(['c..z.','.....','P....'],{c:'cinderling',z:'shardling'},{spellbook:book('shock','flame-slash')});
 s.p.mana=s.p.maxMana=10;
 const t=find(s,'cinderling');const ev=cast(s,'mtg:flame-slash',t.x,t.y);
 assert.ok(!ev.some(e=>e.t==='resisted'),'Torchrunner is not inherently fire resistant');
 assert.equal(RULES_VERSION,'graftbound-rules-1.2.2-beta');assert.equal(RANKED_CHALLENGES['gb-expedition-01'].revision,9);
});