import test from 'node:test';
import assert from 'node:assert/strict';
import { arena,evoWith } from './helpers.mjs';
import { player,enemies,cast,chooseCombo,activateCombo,equipBattle,castOptions,endTurn } from '../src/engine/combat.js';
import { heal,has,dealDamage } from '../src/engine/abilities.js';
import { comboToken,resolveComboEvents,pilotPhaseStart,comboChoices } from '../src/engine/combo-triggers.js';
import { resolveCard,rewardCards } from '../src/cards/catalog.js';
import { cardPool,generatePack,maxSpellLevel } from '../src/engine/rewards.js';
import { traitDraw } from '../src/engine/trait-triggers.js';
const card=id=>({id:'mtg:'+id,level:1});
const make=(ids=[],traits=[])=>{const s=arena(['P....','.....','....g'],{g:'grub'},{evo:evoWith(...traits.map(x=>'mtg:'+x)),spellbook:ids.map(card)});s.deck={library:[],hand:ids.map(card),graveyard:[],exile:[],capacity:7};s.spellbook=s.deck.hand;s.p.mana=20;const e=enemies(s)[0];e.hp=e.maxHp=30;return s;};
const use=(s,id,target=player(s))=>cast(s,'mtg:'+id,target.x,target.y);
test('approved pilot catalog: exactly 145, costs, rarity and fixed levels',()=>{
 const ids=['essence-warden','bloodthirsty-aerialist','marauding-blight-priest','kessig-flamebreather','welcoming-vampire','verdant-force','opt','village-rites','sleep','harmonize','skullclamp','shadowspear'];
 assert.equal(rewardCards().length,145);for(const id of ids){const c=resolveCard('mtg:'+id);assert.ok(c.pilot,id);assert.equal(maxSpellLevel(c.id),1);}
 assert.deepEqual(ids.slice(0,6).map(id=>resolveCard('mtg:'+id).rating),[4.5,10.5,8,6.5,11,19]);
 assert.deepEqual(ids.slice(6,10).map(id=>resolveCard('mtg:'+id).cost),[1,1,4,4]);
 assert.deepEqual(ids.slice(10).map(id=>resolveCard('mtg:'+id).equipCost),[1,2]);
});
test('Verdant Force eligible at Act II boss and late III elite only; normal packs still three',()=>{
 const includes=(step,tier,opts={})=>cardPool({step,tier,...opts}).some(c=>c.id==='mtg:verdant-force');
 assert.ok(includes(15,'boss'));assert.ok(includes(18,'elite'));assert.ok(!includes(17,'elite'));assert.ok(!includes(14,'boss'));assert.ok(!includes(23,'battle'));assert.ok(!includes(18,'elite',{noRares:true}));
 assert.ok(!includes(18,'elite',{actualTier:'battle'}));
 for(let i=1;i<=30;i++)assert.equal(generatePack(i,{step:18,tier:'elite'}).length,3);
 assert.ok(!cardPool({step:20,tier:'elite',spellbook:[card('sleep')],equipmentInventory:['mtg:shadowspear'],evo:evoWith('mtg:essence-warden')}).some(c=>['mtg:sleep','mtg:shadowspear','mtg:essence-warden'].includes(c.id)));
});
test('full HP Warden arrival triggers one gain; Aerialist and Blight-Priest respond once',()=>{
 const s=make([],['essence-warden','bloodthirsty-aerialist','marauding-blight-priest']);const h=player(s),f=enemies(s)[0],p=h.power,hp=f.hp;const ev=[];
 comboToken(s,ev,'Saproling',1,1,'test');resolveComboEvents(s,ev);
 assert.equal(ev.filter(x=>x.t==='comboLifeGain').length,1);assert.equal(h.power,p+1);assert.equal(f.hp,hp-1);resolveComboEvents(s,ev);assert.equal(h.power,p+1);
});
test('Welcoming Vampire draws once each phase; Verdant Force creates actual 1/1 green tokens',()=>{
 const s=make([],['welcoming-vampire','verdant-force']);s.deck.library=[card('opt'),card('sleep'),card('harmonize')];const ev=[];
 s.turn=5;s.phase='player';pilotPhaseStart(s,ev);pilotPhaseStart(s,ev);
 assert.equal(ev.filter(x=>x.t==='summon').length,1);assert.equal(s.deck.hand.length,1);
 const extra=[];comboToken(s,extra,'Saproling',1,1,'test');resolveComboEvents(s,extra);assert.equal(s.deck.hand.length,1);
 s.phase='enemy';pilotPhaseStart(s,ev);assert.equal(s.deck.hand.length,2);
 const token=s.units.find(u=>u.sourceGraft==='verdantForce');assert.equal(token.power,1);assert.equal(token.toughness,1);assert.deepEqual(token.colors,['G']);
});
test('Flamebreather triggers from successful noncreature casts, including aura',()=>{
 const s=make(['harmonize','rancor'],['kessig-flamebreather']);const f=enemies(s)[0],hp=f.hp;
 use(s,'harmonize');use(s,'rancor');assert.equal(f.hp,hp-2);
});
test('Harmonize refills between individual draws and never draws exile or itself',()=>{
 const s=make(['harmonize']);s.deck.library=[card('opt')];s.deck.graveyard=[card('sleep'),card('village-rites')];s.deck.exile=[card('shock')];
 use(s,'harmonize');assert.equal(s.deck.hand.length,3);assert.equal(s.deck.reshuffles,1);assert.ok(s.deck.hand.every(c=>!['mtg:harmonize','mtg:shock'].includes(c.id)));
});
test('Opt true top/bottom choices survive JSON roundtrip; casting copy is held out of draw',()=>{
 const s=make(['opt']);s.deck.library=[card('sleep'),card('harmonize')];use(s,'opt');
 assert.equal(comboChoices(s).cardId,'mtg:sleep');assert.ok(!s.deck.graveyard.length);assert.throws(()=>endTurn(s),/pending/);
 const copy=JSON.parse(JSON.stringify(s));chooseCombo(copy,'scry',1);
 assert.deepEqual(copy.deck.hand.map(c=>c.id),['mtg:harmonize']);assert.deepEqual(copy.deck.library.map(c=>c.id),['mtg:sleep']);assert.equal(copy.deck.graveyard.at(-1).id,'mtg:opt');
 chooseCombo(s,'scry',0);assert.equal(s.deck.hand[0].id,'mtg:sleep');
 const empty=make(['opt']);use(empty,'opt');assert.equal(comboChoices(empty).cardId,null);chooseCombo(empty,'scry',0);assert.equal(empty.deck.hand.length,0);
});
test('Village Rites requires a living nonhero ally, sacrifices before drawing',()=>{
 const s=make(['village-rites']);assert.equal(castOptions(s,'mtg:village-rites').length,0);const u=comboToken(s,[],'Saproling',1,1,'test');s.deck.library=[card('opt'),card('sleep')];
 use(s,'village-rites',u);assert.equal(u.hp,0);assert.equal(s.deck.hand.length,2);
});
test('Sleep applies once per boss per encounter, ordinary foes can be affected again',()=>{
 const s=make(['sleep']);const f=enemies(s)[0];f.boss=true;
 const ev=use(s,'sleep');assert.equal(f.statuses.stunned,1);f.statuses.stunned=0;s.p.cast={};s.deck.hand.push(card('sleep'));
 const again=use(s,'sleep');assert.equal(f.statuses.stunned,0);assert.ok(again.some(e=>e.t==='legendaryResistance'));
});
test('Skullclamp kills 1/1, draws two, and equipment transfers cannot resurrect corpse',()=>{
 const s=make();s.equipmentInventory=['mtg:skullclamp'];const u=comboToken(s,[],'Saproling',1,1,'test');s.deck.library=[card('sleep'),card('opt')];
 equipBattle(s,'mtg:skullclamp',u.uid);assert.equal(u.hp,0);assert.equal(s.deck.hand.length,2);assert.ok(s.equipmentInventory.includes('mtg:skullclamp'));
 const v=comboToken(s,[],'Saproling',2,2,'test');equipBattle(s,'mtg:skullclamp',v.uid);assert.equal(u.hp,0);assert.equal(v.power,3);assert.equal(v.toughness,1);
});
test('Shadowspear activation costs one unequipped, suppresses only existing enemies, equip is +1/+1 keywords',()=>{
 const s=make();s.equipmentInventory=['mtg:shadowspear'];const f=enemies(s)[0];f.keywords.hexproof=1;f.statuses.indestructible=1;const mana=s.p.mana;
 activateCombo(s,'shadowspear',0);assert.equal(s.p.mana,mana-1);assert.ok(!has(f,'hexproof'));assert.ok(f.keywords.hexproof);assert.ok(f.statuses.indestructible);const h=player(s),p=h.power;equipBattle(s,'mtg:shadowspear',h.uid);assert.equal(h.power,p+1);assert.ok(has(h,'lifelink')&&has(h,'trample'));
});
