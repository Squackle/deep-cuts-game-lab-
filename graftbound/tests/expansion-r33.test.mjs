import test from 'node:test';
import assert from 'node:assert/strict';
import { arena,evoWith } from './helpers.mjs';
import { player,enemies,attack,cast,endTurn,equipBattle } from '../src/engine/combat.js';
import { resolveCard,rewardCards } from '../src/cards/catalog.js';
import { onBattleGrafts,onHeroAttack } from '../src/engine/trait-triggers.js';
import { comboToken,resolveComboEvents } from '../src/engine/combo-triggers.js';
import { sacrificeAlly,effectivePower } from '../src/engine/abilities.js';
import { cardPool } from '../src/engine/rewards.js';
const card=id=>({id:'mtg:'+id,level:1});
const make=(ids=[],spells=[])=>{const s=arena(['P....','.....','....g'],{g:'grub'},{evo:evoWith(...ids.map(x=>'mtg:'+x)),spellbook:spells.map(card)});s.deck={library:[],hand:spells.map(card),graveyard:[],exile:[],capacity:7};s.spellbook=s.deck.hand;s.p.mana=20;const e=enemies(s)[0];e.hp=e.maxHp=60;return s;};
const ids=['inspiring-overseer','cloudkin-seer','pitiless-plunderer','vindictive-vampire','monastery-swiftspear','krenko-tin-street-kingpin'];
test('r33 exactly six new fixed-level creature grafts; prior pilot retained, encounter Krenko excluded',()=>{
 assert.equal(rewardCards().length,151);for(const id of ids){const c=resolveCard('mtg:'+id);assert.ok(c?.fixedLevel&&c.kind==='creature'&&c.trait,id);}
 assert.ok(!rewardCards().some(c=>c.id==='mtg:krenko-mob-boss'));
 const evo=evoWith('mtg:cloudkin-seer');assert.ok(!cardPool({step:20,tier:'elite',evo}).some(c=>c.id==='mtg:cloudkin-seer'));
});
test('entry grafts independently draw, Overseer produces one canonical gain even at full HP',()=>{
 const s=make(['inspiring-overseer','cloudkin-seer']);s.deck.library=[card('shock'),card('sleep')];const ev=[];onBattleGrafts(s,ev);
 assert.equal(s.deck.hand.length,2);assert.equal(ev.filter(e=>e.t==='comboLifeGain').length,1);assert.equal(ev.find(e=>e.t==='comboLifeGain').amount,1);
});
test('Plunderer and Vindictive Vampire: sacrifice one other ally, one Treasure and one gain and damage',()=>{
 const s=make(['pitiless-plunderer','vindictive-vampire']);const f=enemies(s)[0],hp=f.hp,ev=[];const u=comboToken(s,[],'Saproling',1,1,'test');
 sacrificeAlly(s,ev,u);resolveComboEvents(s,ev);assert.equal(s.combo.treasure,1);assert.equal(f.hp,hp-1);assert.equal(ev.filter(e=>e.t==='comboLifeGain').length,1);
 resolveComboEvents(s,ev);assert.equal(s.combo.treasure,1);
 const enemyEvents=[{t:'death',uid:f.uid}];resolveComboEvents(s,enemyEvents);assert.equal(s.combo.treasure,1);
});
test('Prowess stacks on successful spell and Aura, does not trigger on equip, expires at turn end',()=>{
 const s=make(['monastery-swiftspear'],['harmonize','rancor']);const h=player(s),p=effectivePower(h),t=h.toughness;
 cast(s,'mtg:harmonize',h.x,h.y);assert.equal(effectivePower(h),p+1);assert.equal(h.toughness,t+1);
 cast(s,'mtg:rancor',h.x,h.y);assert.equal(h.statuses.temporaryToughness,2);
 s.equipmentInventory=['mtg:shadowspear'];equipBattle(s,'mtg:shadowspear',h.uid);assert.equal(h.statuses.temporaryToughness,2);
 endTurn(s);assert.equal(h.statuses.temporaryToughness,0);assert.equal(h.toughness,t+1);
});
test('Tin Street attack counter precedes damage and creates exact red 1/1 Goblins on legal cells',()=>{
 const s=make(['krenko-tin-street-kingpin']);const h=player(s),f=enemies(s)[0];f.x=1;f.y=0;const p=h.power;
 const ev=attack(s,f.uid);const tokens=s.units.filter(u=>u.name==='Goblin'&&u.side==='player');
 assert.equal(h.power,p+1);assert.equal(tokens.length,p+1);assert.ok(tokens.every(u=>u.power===1&&u.toughness===1&&u.colors.join()==='R'&&!u.keywords.haste));assert.ok(ev.some(e=>e.t==='summon'));
});
test('Tin Street high power remains board bounded, no duplicate occupied tile',()=>{
 const s=make(['krenko-tin-street-kingpin']);player(s).power=100000;onHeroAttack(s,[]);
 assert.ok(s.units.length<=s.w*s.h);assert.equal(new Set(s.units.map(u=>u.x+','+u.y)).size,s.units.length);
});
