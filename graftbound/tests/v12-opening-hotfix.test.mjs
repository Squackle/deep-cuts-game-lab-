import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './helpers.mjs';
import { cast, castOptions } from '../src/engine/combat.js';
import { spellNumbers, formatSpellText } from '../src/engine/spells.js';
import { resolveCard } from '../src/cards/catalog.js';
import { T } from '../src/core/grid.js';
import { newRun, enterNode, concludeBattle, chooseReward, skipReward, TUTORIAL_CARD } from '../src/engine/run.js';
import { createStore, memoryStorage } from '../src/engine/save.js';
const makeBattle=(rows=['t.....','......','......','..P...'])=>{const s=arena(rows,{t:'tortoise'},{spellbook:[{id:'mtg:raise-the-alarm',level:3}]});s.p.mana=10;s.p.maxMana=10;s.p.arcane=4;return s};
test('Raise the Alarm spawns two distinct 1/1 Soldiers regardless of level or Arcane',()=>{
 const s=makeBattle();assert.deepEqual(spellNumbers('mtg:raise-the-alarm',3,9),[1,1]);assert.match(formatSpellText('mtg:raise-the-alarm',3,9),/two 1\/1 white Soldier/);
 const ev=cast(s,'mtg:raise-the-alarm',2,2),a=s.units.filter(u=>u.side==='player'&&!u.hero);
 assert.equal(a.length,2);assert.equal(new Set(a.map(u=>u.uid)).size,2);assert.equal(new Set(a.map(u=>u.x+','+u.y)).size,2);
 for(const u of a)assert.deepEqual([u.name,u.power,u.toughness,u.hp,u.maxHp,u.token],['Soldier',1,1,1,1,true]);
 assert.equal(ev.filter(e=>e.t==='summon'&&e.defId==='sproutling').length,2);
});
test('two legal empty tiles are required before mana is spent',()=>{
 const s=makeBattle(['t..','...','.P.']);const available=castOptions(s,'mtg:raise-the-alarm');assert.ok(available.length>=2);
 for(const p of available)if(p.x!==0||p.y!==2)s.terrain[p.y*s.w+p.x]=T.ROCK;
 const before=s.p.mana;assert.deepEqual(castOptions(s,'mtg:raise-the-alarm'),[]);
 assert.throws(()=>cast(s,'mtg:raise-the-alarm',0,2),/No valid target/);assert.equal(s.p.mana,before);
});
const first=seed=>{const r=newRun({seed,tutorial:true});enterNode(r,0);for(const u of r.battle.units)if(u.side==='enemy')u.hp=0;r.battle.phase='won';concludeBattle(r);return r};
test('first victory offers three distinct packs then returns to map',()=>{
 const r=first(1337);assert.equal(r.pending.firstVictoryPacks.index,1);assert.equal(r.pending.cards.length,3);assert.ok(r.pending.cards.includes(TUTORIAL_CARD));
 chooseReward(r,TUTORIAL_CARD);assert.equal(r.pending.tier,'primer');assert.equal(r.pending.firstVictoryPacks.index,2);assert.ok(r.pending.cards.every(id=>resolveCard(id).kind==='spell'));
 chooseReward(r,r.pending.cards[0]);assert.equal(r.pending.firstVictoryPacks.index,3);assert.equal(r.pending.cards.length,3);
 skipReward(r);assert.equal(r.phase,'map');assert.equal(r.pending,null);assert.equal(r.primerDone,true);
});
test('three packs are deterministic and survive mid-sequence save/reload',()=>{
 const a=first(1986),b=first(1986);assert.deepEqual(a.pending,b.pending);skipReward(a);skipReward(b);assert.deepEqual(a.pending,b.pending);
 const store=createStore(memoryStorage());store.saveRun(a);const copy=store.loadRun().run;assert.deepEqual(copy.pending,a.pending);
 skipReward(a);skipReward(copy);assert.deepEqual(copy.pending,a.pending);assert.equal(a.pending.firstVictoryPacks.index,3);
 skipReward(a);skipReward(copy);assert.equal(a.phase,'map');assert.equal(copy.phase,'map');
});
