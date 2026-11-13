import test from 'node:test';import assert from 'node:assert/strict';
import { installReferenceSet } from '../src/cards/reference-set.js';
import { resolveCard } from '../src/cards/catalog.js';
import { createCombatDeck,drawCards,playFromHand,returnToHand,endHandLimit } from '../src/engine/deck.js';
import { attachAura,detachAura,attachEquipment,equipItem,giveEquipment } from '../src/engine/attachments.js';
installReferenceSet();
const id=n=>'mtg:'+n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
test('all ten genuine card attachments are bundled with accurate P/T and mana facts',()=>{
 assert.equal(resolveCard(id("Accorder's Shield")).toughnessBonus,3);
 assert.equal(resolveCard(id('Rancor')).powerBonus,2);
 assert.equal(resolveCard(id('One with the Wind')).toughnessBonus,2);
 assert.equal(resolveCard(id('Moonsilver Spear')).equipCost,4);
});
test('attaching +0/+3 vigilance, +2/+0 trample and removal preserve overlap',()=>{
 const u={power:1,toughness:1,maxHp:8,hp:8,move:3,keywords:{},hero:true};
 attachEquipment(u,id("Accorder's Shield"));assert.equal(u.toughness,4);assert.ok(u.keywords.vigilance);
 attachAura(u,id('Rancor'));assert.equal(u.power,3);assert.ok(u.keywords.trample);
 assert.ok(detachAura(u,id('Rancor')));assert.equal(u.power,1);assert.ok(u.keywords.vigilance);
});
test('equipment inventory has exactly two deterministic slots',()=>{
 const r={phase:'map',equipmentInventory:[],equippedEquipment:[null,null]};
 giveEquipment(r,id("Accorder's Shield"));giveEquipment(r,id('Basilisk Collar'));assert.equal(r.equippedEquipment.length,2);
 assert.throws(()=>equipItem(r,id('Moonsilver Spear'),0));
 assert.throws(()=>equipItem(r,id('Basilisk Collar'),3));
});
test('seeded shuffle draws same three; card goes to graveyard without deletion',()=>{
 const entries=['a','b','c','d','e','f','g','h'].map(id=>({id,level:1}));
 const a=createCombatDeck(entries,63),b=createCombatDeck(entries,63);
 assert.deepEqual(a,b);assert.equal(a.hand.length,3);assert.equal(a.library.length,5);
 const played=a.hand[0].id;playFromHand(a,played);assert.equal(a.graveyard[0].id,played);
 assert.ok(returnToHand(a,played));assert.equal(a.graveyard.length,0);
 drawCards(a,3);assert.equal(endHandLimit(a),0);
});
