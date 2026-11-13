import test from 'node:test';
import assert from 'node:assert/strict';
import { arena } from './helpers.mjs';
import { equipBattle, equipmentOptions, player } from '../src/engine/combat.js';
import { attachEquipment } from '../src/engine/attachments.js';
import { validDecision } from '../src/engine/ranked.js';

const shield='mtg:accorder-s-shield', boots='mtg:swiftfoot-boots';
function board(){
  const s=arena(['.......','...P...','.......','...M...'],{M:'grub'});
  s.equipmentInventory=[shield,boots];s.heroEquipmentSlots=[null,null];s.p.mana=5;
  return s;
}
test('paid Equip applies printed +0/+3, Vigilance and correct mana',()=>{
 const s=board(),p=player(s),prior=p.toughness;
 const ev=equipBattle(s,shield,p.uid,0);
 assert.equal(s.p.mana,2);assert.equal(p.toughness,prior+3);
 assert.equal(p.keywords.vigilance,1);assert.deepEqual(s.heroEquipmentSlots,[shield,null]);
 assert.ok(ev.some(e=>e.t==='equipmentAttach'&&e.amount===3));
});
test('invalid Equip cannot mutate state or transfer enemy-owned cards',()=>{
 const s=board(),p=player(s);s.p.mana=0;
 const before=structuredClone(s);
 assert.throws(()=>equipBattle(s,shield,p.uid,0));assert.deepEqual(s,before);
 assert.throws(()=>equipBattle(s,'mtg:moonsilver-spear',p.uid,0));
 s.p.mana=5;assert.throws(()=>equipBattle(s,shield,s.units.find(u=>u.side==='enemy').uid,0));
});
test('Equipment transfers from hero to a friendly ally with costs and stats applied',()=>{
 const s=board(),p=player(s);attachEquipment(p,shield);s.heroEquipmentSlots=[shield,null];
 const ally={uid:s.nextUid++,side:'player',hero:false,name:'Angel',x:0,y:0,hp:4,maxHp:4,power:4,toughness:4,move:3,keywords:{flying:1},statuses:{}};
 s.units.push(ally);equipBattle(s,shield,ally.uid,0);
 assert.deepEqual(s.heroEquipmentSlots,[null,null]);assert.equal(p.toughness,1);
 assert.equal(ally.toughness,7);assert.equal(s.p.mana,2);
 assert.equal(equipmentOptions(s).some(x=>x.id===shield&&x.uid===p.uid),false);
});
test('two hero slots track distinct Equipment through paid actions',()=>{
 const s=board(),p=player(s);equipBattle(s,shield,p.uid,0);equipBattle(s,boots,p.uid,1);
 assert.deepEqual(s.heroEquipmentSlots,[shield,boots]);assert.equal(p.move,4);assert.equal(s.p.mana,1);
});
test('ranked replay envelope validates paid Equip deterministically',()=>{
 assert.equal(validDecision({seq:0,type:'equip',id:shield,uid:1,slot:0},0),true);
 assert.equal(validDecision({seq:0,type:'equip',id:shield,uid:1,slot:0,mana:0},0),false);
 assert.equal(validDecision({seq:0,type:'equip',id:shield,uid:-2,slot:0},0),false);
});
