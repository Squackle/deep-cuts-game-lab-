import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, evoWith } from './helpers.mjs';
import { ENEMIES } from '../src/data/enemies.js';
import { ENEMY_FACTS } from '../src/cards/enemy-facts.js';
import { BOSS_BY_ID, bossForSeed } from '../src/data/legendary.js';
import { attack, endTurn, cast, player, enemies } from '../src/engine/combat.js';
import { dealDamage } from '../src/engine/abilities.js';

const foe=(s,id)=>s.units.find(u=>u.defId===id&&u.hp>0);
test('all sixteen ordinary enemy identities retain printed P/T and are real MTG creatures',()=>{
  assert.equal(Object.keys(ENEMY_FACTS).length,16);
  for(const [id,fact] of Object.entries(ENEMY_FACTS)){
    const def=ENEMIES[id];
    assert.equal(def.name,fact.name,id);
    assert.equal(def.power,fact.power,id+' power');
    assert.equal(def.toughness,fact.toughness,id+' toughness');
    assert.ok(def.oracle&&def.mana_cost,id+' printed rules');
    assert.ok(def.sprite, id+' original authored sprite');
    assert.ok(def.affinity===undefined,id+' no fictional elemental affinity');
  }
});
test('every act has exactly two seed-selected real legendary bosses, with independent visible vitality',()=>{
  for(const act of [0,1,2]){
    const names=new Set([bossForSeed(act,0).name,bossForSeed(act,2).name]);
    assert.equal(names.size,2,'act '+act);
  }
  assert.equal(Object.keys(BOSS_BY_ID).length,6);
  for(const b of Object.values(BOSS_BY_ID)){
    assert.ok(b.vitality>b.toughness,b.name);
    assert.ok(b.ability&&b.sprite,b.name);
  }
});
test('deathtouch cannot erase Triplicate Titan golem death trigger',()=>{
  const s=arena(['.....','..S..','..P..'],{S:'sentinel'},{evo:evoWith('mtg:typhoid-rats')});
  const titan=foe(s,'sentinel');
  titan.hp=1;
  const ev=attack(s,titan.uid);
  assert.equal(titan.hp,0);
  assert.equal(s.phase,'player','death spawns three other foes rather than granting immediate victory');
  assert.equal(enemies(s).filter(u=>u.defId.startsWith('golem')).length,3);
  assert.equal(ev.filter(e=>e.t==='summon'&&e.defId.startsWith('golem')).length,3);
});
test('Nightpack Ambusher at end step creates the real 2/2 Wolf and buffs other Wolves',()=>{
 const s=arena(['.....','..A..','..P..'],{A:'alpha'});
 endTurn(s);
 const wolf=foe(s,'wolf');
 assert.ok(wolf,'wolf token created');
 assert.equal(wolf.power,3,'Ambusher increases other Wolves by +1/+1');
 assert.equal(wolf.toughness,3);
 assert.equal(foe(s,'alpha').power,4,'other Wolves only');
});
test('Mudbutton Torchrunner death trigger chooses a single legal target for three damage',()=>{
 const s=arena(['.....','..C..','..P..'],{C:'cinderling'});
 const hp=player(s).hp;
 const ev=dealDamage(s,[],player(s),foe(s,'cinderling'),2,{kind:'spell'});
 assert.equal(foe(s,'cinderling'),undefined);
 assert.equal(player(s).hp,hp-3);
});
test('Thermo-Alchemist pings opponent using a tapped activation, rather than fictional area fire',()=>{
 const s=arena(['.....','..E..','.....','..P..'],{E:'emberseer'});
 const hp=player(s).hp;
 const ev=endTurn(s);
 assert.ok(ev.some(e=>e.t==='realAbility'&&e.name==='Thermo-Alchemist'));
 assert.equal(player(s).hp,hp-1);
 assert.equal(foe(s,'emberseer').tapped,true);
});
test('Spikeshot Goblin pings for current power and taps, without anti-air invented bonuses',()=>{
 const s=arena(['.....','..H..','.....','..P..'],{H:'harpooner'});
 const hp=player(s).hp;
 const ev=endTurn(s);
 assert.ok(ev.some(e=>e.t==='realAbility'&&e.name==='Spikeshot Goblin'));
 assert.equal(player(s).hp,hp-1);
 assert.equal(foe(s,'harpooner').tapped,true);
});
test('Toxrill adds a persistent slime counter on both player and enemy end steps',()=>{
 const s=arena(['.....','..T..','..P..'],{T:'toxrill'},{evo:evoWith('mtg:grizzly-bears')});
 const p=player(s), t=foe(s,'toxrill');
 const startingToughness=p.toughness;
 const ev=endTurn(s);
 assert.equal(p.slime,2,'two end steps in a complete round');
 assert.equal(p.toughness,startingToughness-2,'real -1/-1 per slime counter');
 assert.ok(ev.filter(e=>e.t==='slimeCounter'&&e.uid===p.uid).length===2);
 assert.equal(t.toughness,7,'Toxrill retains printed toughness');
});
test('Plague Stinger combat damage adds poison counters instead of losing ordinary life',()=>{
 const s=arena(['.....','..I..','..P..'],{I:'moth'});
 const p=player(s), sting=foe(s,'moth');
 const hp=p.hp, ev=[];
 const lost=dealDamage(s,ev,sting,p,1,{combat:true,kind:'strike'});
 assert.equal(lost,0);
 assert.equal(p.hp,hp);
 assert.equal(s.poisonCounters,1);
 assert.ok(ev.some(x=>x.t==='poisonCounter'&&x.total===1));
});
test('Caustic Caterpillar sacrifices itself to destroy equipment even on Hexproof creature',()=>{
  const s=arena(['.....','..C..','..P..'],{C:'grub'});
  const u=player(s);u.equipment=['mtg:accorder-s-shield'];u.keywords.hexproof=1;
  u.toughness+=3;u.maxHp+=3;u.hp+=3;
  const ev=endTurn(s);
  assert.ok(ev.some(x=>x.t==='realAbility'&&x.name.includes('Caustic Caterpillar')));
  assert.ok(!u.equipment.length);
  assert.ok(s.destroyedEquipment.includes('mtg:accorder-s-shield'));
  assert.equal(u.toughness,1,'exact printed +0/+3 removed');
});
test('Dauntless Escort can sacrifice itself to protect another endangered ally from destruction',()=>{
  const s=arena(['.....','..X..','.H...','..P..'],{X:'tortoise',H:'hound'});
  const u=foe(s,'hound'),escort=foe(s,'tortoise');
  const ev=[];u.hp=1;
  dealDamage(s,ev,player(s),u,8,{kind:'spell'});
  assert.equal(escort.hp,0,'Escort sacrifices itself');
  assert.equal(u.hp,1,'indestructible prevents creature destruction');
  assert.ok(ev.some(e=>e.name?.includes('Dauntless Escort')));
});
