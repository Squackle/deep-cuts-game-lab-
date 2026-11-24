import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, evoWith } from './helpers.mjs';
import { cast, player, enemies } from '../src/engine/combat.js';
import { heal, strike } from '../src/engine/abilities.js';
import { resolveComboEvents } from '../src/engine/combo-triggers.js';
import { RULES_VERSION, challengeFor, ACTIVE_CHALLENGE, startRanked, applySegment } from '../src/engine/ranked.js';

test('r31 canonical ordinary Healing Salve reaches Pridemate once, including at full HP',()=>{
 const s=arena(['P..','..g'],{g:'grub'},{evo:evoWith('mtg:ajani-s-pridemate'),spellbook:[{id:'mtg:healing-salve',level:1}]});
 const h=player(s),power=h.power;h.hp=h.maxHp-1;s.p.mana=10;
 const events=cast(s,'mtg:healing-salve',h.x,h.y,1,'heal');
 const gains=events.filter(e=>e.t==='comboLifeGain');
 assert.equal(gains.length,1);assert.equal(gains[0].restored,1);assert.ok(gains[0].amount>1);
 assert.equal(h.power,power+1);resolveComboEvents(s,events);assert.equal(h.power,power+1);
 const ev=[];heal(s,ev,h,2,'test');assert.equal(ev.find(e=>e.t==='comboLifeGain').restored,0);
 resolveComboEvents(s,ev);assert.equal(h.power,power+2);
});
test('r31 Vito uses nominal positive gain and does not react to ally healing',()=>{
 const s=arena(['P....','....g'],{g:'grub'},{evo:evoWith('mtg:vito-thorn-of-the-dusk-rose')});
 const h=player(s),f=enemies(s)[0];f.hp=f.maxHp=20;
 h.hp=h.maxHp-1;
 const ev=[];heal(s,ev,h,3,'test');assert.equal(ev.find(e=>e.t==='comboLifeGain').amount,3);
 assert.equal(ev.find(e=>e.t==='lifeLoss').amount,3);
 const ally={uid:99,hp:1,maxHp:3};const ae=[];heal(s,ae,ally,2,'lifelink');assert.equal(ally.hp,3);
 assert.equal(ae.some(e=>e.t==='comboLifeGain'||e.t==='lifeLoss'),false);
});
test('r31 trample overflow is one hero lifelink event per strike',()=>{
 const s=arena(['Pgg.','...g'],{g:'grub'},{evo:evoWith('mtg:ajani-s-pridemate')});
 const h=player(s);h.power=9;h.keywords.trample=1;h.keywords.lifelink=1;
 const power=h.power,ev=[];strike(s,ev,h,enemies(s)[0],[1,0]);
 assert.equal(ev.filter(e=>e.t==='comboLifeGain').length,1);
 assert.ok(ev.some(e=>e.t==='trample'));resolveComboEvents(s,ev);assert.equal(h.power,power+1);
});
test('r31 rejects historical revision 30 rather than reinterpreting its decisions',()=>{
 assert.equal(RULES_VERSION,'graftbound-rules-1.8.4-candidate');
 assert.equal(challengeFor(ACTIVE_CHALLENGE).revision,31);
 assert.throws(()=>challengeFor(ACTIVE_CHALLENGE,30),/Unknown or retired/);
 const s=startRanked();s.ranked.revision=30;s.ranked.rulesVersion='graftbound-rules-1.8.3-beta';
 assert.throws(()=>applySegment(s,[]),/Rules version mismatch|Unknown or retired/);
});

test('r31 Nemata base encounter health is 19 without changing printed stats',()=>{
 const s=arena(['P...','...n'],{n:'nemata'}),n=enemies(s)[0];
 assert.equal(n.power,4);assert.equal(n.toughness,5);
 assert.equal(n.hp,19);assert.equal(n.legendaryVitality,14);
});
