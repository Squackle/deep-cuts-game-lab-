import test from 'node:test';
import assert from 'node:assert/strict';
import { toGameCard } from '../src/cards/compatibility.js';
import { installReferenceSet } from '../src/cards/reference-set.js';
import { arena } from './helpers.mjs';
import { player, endTurn, enemies } from '../src/engine/combat.js';
import { attachEquipment } from '../src/engine/attachments.js';
import { dealDamage } from '../src/engine/abilities.js';
import { ENEMIES } from '../src/data/enemies.js';
import { spawnEnemy } from '../src/engine/ai.js';
installReferenceSet();

test('Scryfall-canonical capitalization recognizes the One with the Wind Aura', () => {
  const sf = {source:'scryfall',name:'One With the Wind',typeLine:'Enchantment — Aura',cmc:2,manaCost:'{1}{U}',colors:['U'],rarity:'common',keywords:[]};
  const adapted = toGameCard(sf);
  assert.equal(adapted.ok,true);
  assert.equal(adapted.card.toughnessBonus,2);
  assert.equal(adapted.card.powerBonus,2);
});

test('Rageblood Shaman stays printed 2/3 and grants Trample to other Minotaurs, not Wolves', () => {
  assert.equal(ENEMIES.ashbrute.power,2);
  assert.equal(ENEMIES.ashbrute.toughness,3);
  const s=arena(['......','..xxh.','......','...P..'],{x:'ashbrute',h:'hound'});
  const [a,b]=enemies(s).filter(u=>u.defId==='ashbrute');
  const wolf=enemies(s).find(u=>u.defId==='hound');
  assert.equal(b.toughness,4);
  assert.equal(a.keywords.trample,1);
  assert.equal(b.keywords.trample,1);
  assert.ok(!wolf.keywords.trample);
  dealDamage(s,[],player(s),a,20,{kind:'spell'});
  assert.equal(b.toughness,3);
  assert.equal(b.keywords.trample,1,'Shaman retains its own printed Trample');
});

test('Hexproof blocks opposing targeted goblin ability, not non-targeting Thermo-Alchemist', () => {
  const s=arena(['.....','..H..','..P..'],{H:'harpooner'});
  attachEquipment(player(s),'mtg:swiftfoot-boots');
  const hp=player(s).hp;
  const e=endTurn(s);
  assert.equal(player(s).hp,hp);
  assert.ok(!e.some(x=>x.t==='realAbility' && x.name==='Spikeshot Goblin'));
  const t=arena(['.....','..A..','..P..'],{A:'emberseer'});
  attachEquipment(player(t),'mtg:swiftfoot-boots');
  const before=player(t).hp;endTurn(t);
  assert.equal(player(t).hp,before-1);
});

test('Faerie Duelist entering applies -2/-0 only once, and Hexproof denies its targeted ability',()=>{
  const s=arena(['.....','..F..','..P..'],{F:'shardling'});
  assert.equal(player(s).statuses.weakened,2);
  assert.ok(s.openingEvents.some(e=>e.kind==='Faerie Duelist ETB'));
  const t=arena(['.....','..F..','..P..'],{F:'shardling'});
  assert.equal(t.units.filter(u=>u.defId==='shardling').length,1);
  // Hexproof on the target is checked at ETB. No curse can sneak in as a free targeting shortcut.
  const h=player(t);h.keywords.hexproof=1;
  h.statuses.weakened=0;
  // A subsequent Duelist ETB cannot target the protected player.
  spawnEnemy(t,'shardling',0,0);
  assert.equal(h.statuses.weakened,0);
});
