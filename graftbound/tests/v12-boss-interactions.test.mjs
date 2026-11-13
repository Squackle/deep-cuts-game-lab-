import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, evoWith } from './helpers.mjs';
import { cast, endTurn, player, enemies } from '../src/engine/combat.js';
import { ENEMIES } from '../src/data/enemies.js';

const enemy=(s,id)=>enemies(s).find(u=>u.defId===id);
const board=(id)=>arena(['.........','.........','....B....','....P....','.........','.........'],{B:id});
test('all six legendary bosses retain exact printed P/T distinct from encounter vitality',()=>{
  const specs={nemata:[4,5,22],arasta:[3,5,20],drakuseth:[7,7,32],krenko:[3,3,26],scarab:[5,5,38],toxrill:[7,7,40]};
  for(const [id,[power,toughness,hp]] of Object.entries(specs)){
    const u=enemy(board(id),id);
    assert.equal(u.power,power,id);
    assert.equal(u.toughness,toughness,id);
    assert.equal(u.maxHp,hp,id);
    assert.equal(u.legendaryVitality,hp-toughness,id);
  }
});
test('Nemata spends visible mana to summon actual Saprolings',()=>{
  const s=board('nemata');const b=enemy(s,'nemata');const ev=endTurn(s);
  assert.ok(enemy(s,'saproling'));assert.ok(ev.some(x=>x.t==='legendaryAbility'&&x.uid===b.uid));
});
test('Krenko creates real 1/1 Goblins and taps to do so',()=>{
  const s=board('krenko');const b=enemy(s,'krenko');const ev=endTurn(s);
  const goblins=enemies(s).filter(u=>u.defId==='goblin');
  assert.equal(goblins.length,1);
  assert.deepEqual([goblins[0].power,goblins[0].toughness],[1,1]);
  assert.equal(b.tapped,true);
});
test('Arasta creates actual 1/2 Reach spiders when opponent casts instant or sorcery',()=>{
  const s=arena(['.........','....A....','....P....','.........'],{A:'arasta'},{spellbook:[{id:'mtg:giant-growth',level:1}]});
  const p=player(s);const ev=cast(s,'mtg:giant-growth',p.x,p.y);
  const spider=enemy(s,'spider');
  assert.ok(spider);assert.equal(spider.power,1);assert.equal(spider.toughness,2);assert.ok(spider.keywords.reach);
  assert.ok(ev.some(x=>x.t==='summon'&&x.defId==='spider'));
});
test('Drakuseth attacks and resolves 4-damage first target trigger',()=>{
  const s=board('drakuseth');const h=player(s).hp;const ev=endTurn(s);
  assert.ok(ev.some(x=>x.t==='legendaryFlame'&&x.amount===4));
  assert.ok(player(s).hp<h);
});
test('The Scarab God does not fabricate Zombies in an empty graveyard',()=>{
  const s=board('scarab');endTurn(s);
  assert.equal(enemies(s).filter(u=>u.defId==='zombie').length,0);
});
test('Toxrill uses an end-step slime trigger rather than an invented spell',()=>{
  const s=arena(['.........','....B....','....P....','.........'],{B:'toxrill'},{evo:evoWith('mtg:grizzly-bears')});
  const p=player(s),before=p.toughness;endTurn(s);
  assert.equal(p.slime,2);
  assert.equal(p.toughness,before-2);
});
