import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './helpers.mjs';
import { bossForSeed, LEGENDARY_BOSSES } from '../src/data/legendary.js';
import { planEnemy } from '../src/engine/ai.js';
import { cast, endTurn, player, enemies } from '../src/engine/combat.js';
import { spellCost, castBlockReason } from '../src/engine/spells.js';
import { createCombatDeck } from '../src/engine/deck.js';
import { cardHTML } from '../src/ui/cards.js';
import { T } from '../src/core/grid.js';
import { validDecision, RULES_VERSION, RANKED_CHALLENGES } from '../src/engine/ranked.js';
import { REAL_CREATURES, REAL_SPELLS } from '../src/cards/real-pool.js';
import { readFileSync } from 'node:fs';

const book = (...ids) => ids.map(id => ({ id: 'mtg:' + id, level: 1 }));

test('six boss identities are deterministically seed-selected, with two alternatives for each act', () => {
  assert.equal(LEGENDARY_BOSSES.flat().length, 6);
  for(let act=0; act<3; act++) {
    assert.equal(bossForSeed(act, 1).id, LEGENDARY_BOSSES[act][0].id);
    assert.equal(bossForSeed(act, 2).id, LEGENDARY_BOSSES[act][1].id);
    assert.equal(bossForSeed(act, 2).id, bossForSeed(act, 2).id);
  }
});

test('Krenko counts every Goblin already on the board, including other printed Goblin subtypes', () => {
  const s=arena(['.........','....B....','..C...H..','.........','....P....','.........'], { B:'krenko',C:'cinderling',H:'harpooner' });
  const k=enemies(s).find(u=>u.defId==='krenko');
  assert.equal(k.creatureTypes, 'Goblin Warrior');
  assert.equal(enemies(s).find(u=>u.defId==='cinderling').creatureTypes, 'Goblin Warrior');
  assert.equal(enemies(s).find(u=>u.defId==='harpooner').creatureTypes, 'Goblin Shaman');
  const summon=planEnemy(s,k).actions.find(a=>a.type==='legendarySummon');
  assert.equal(summon.n,3, 'Krenko + Torchrunner + Spikeshot Goblin');
  endTurn(s);
  assert.equal(enemies(s).filter(u=>u.defId==='goblin').length,3);
});

test('Arc Lightning leaps to two other enemies at arbitrary separation, each enemy once', () => {
  const s=arena(['a.......','........','........','........','......b.','........','........','....c..P'], {a:'tortoise',b:'tortoise',c:'tortoise'}, {spellbook:book('arc-lightning')});
  s.p.mana=20; s.p.maxMana=20;
  const events=cast(s,'mtg:arc-lightning',0,0);
  const arcs=events.filter(e=>e.t==='chain');
  assert.equal(arcs.length,2);
  assert.ok(Math.abs(arcs[0].x-arcs[0].from.x)+Math.abs(arcs[0].y-arcs[0].from.y)>2);
  assert.equal(new Set(arcs.map(e=>e.target)).size,2);
  assert.deepEqual(enemies(s).map(e=>e.hp).sort(),[1,2,2]);
});

test('Drain Life X has exact variable mana charge, invalid choice blocked and deterministic damage/heal', () => {
  const s=arena(['a...','....','P...'],{a:'tortoise'},{spellbook:book('drain-life')});
  s.p.mana=10; s.p.maxMana=10;
  const p=player(s),target=enemies(s)[0]; p.hp=1;target.hp=8;target.maxHp=8;
  assert.equal(spellCost(s,'mtg:drain-life',4),6);
  assert.match(castBlockReason(s,'mtg:drain-life',0),/whole-number/);
  assert.match(castBlockReason(s,'mtg:drain-life',100),/whole-number/);
  assert.equal(validDecision({seq:0,type:'cast',id:'mtg:drain-life',x:0,y:0,xValue:4},0),true);
  assert.equal(validDecision({seq:0,type:'cast',id:'mtg:drain-life',x:0,y:0,xValue:0},0),false);
  const events=cast(s,'mtg:drain-life',0,0,4);
  assert.equal(target.hp,4);
  assert.equal(p.hp,5);
  assert.equal(s.p.mana,4);
  assert.equal(events.find(e=>e.t==='spell').xValue,4);
});

test('Inscribed Page draws exactly one extra card when ending turn on it',()=>{
  const s=arena(['a....','.....','..P..'],{a:'tortoise'},{spellbook:book('shock','drain-life','arc-lightning','healing-hands','pyroclasm','murder')});
  s.deck=createCombatDeck(s.spellbook,17);s.spellbook=s.deck.hand;
  const p=player(s);s.terrain[p.y*s.w+p.x]=T.ARCHIVE;
  assert.equal(s.deck.hand.length,3);
  const events=endTurn(s);
  assert.equal(events.find(e=>e.t==='archiveDraw')?.count,1);
  assert.ok(events.some(e=>e.t==='cardDraw'));
});

test('new card pool grows and each reward exposes persistent textual rarity',()=>{
  assert.ok(REAL_CREATURES.length>=68);
  assert.ok(REAL_SPELLS.length>=21);
  assert.match(cardHTML('mtg:mahamoti-djinn'),/Rare/);
  assert.match(cardHTML('mtg:lightning-strike'),/Common/);
  assert.match(cardHTML('mtg:murder'),/Rarity: Common/);
});

test('source contains visible equipment artwork and new ruleset version, without renaming persistent achievement IDs',()=>{
  const src=readFileSync(new URL('../src/ui/screens.js', import.meta.url),'utf8');
  const achievements=readFileSync(new URL('../src/engine/progression.js', import.meta.url),'utf8');
  assert.match(src,/class="gb-equip-card"/);
  assert.match(src,/cardHTML\(id,\{small:true/);
  assert.match(achievements,/id: 'thornmother'.*name: 'Grove Guardian Fallen'/);
  assert.equal(RULES_VERSION,'graftbound-rules-1.2.5-beta');
  assert.equal(RANKED_CHALLENGES['gb-expedition-01'].revision,12);
});
