import test from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { newEvolution, deriveStats } from '../src/engine/evolution.js';
import { createBattle, channel, endTurn, cast, player, enemies } from '../src/engine/combat.js';
import { newRun, concludeBattle, RUN_VERSION, skipReward } from '../src/engine/run.js';
import { recordRunEnd, newMeta } from '../src/engine/progression.js';
import { makeRng } from '../src/core/rng.js';
import { rarityFirstPick, generatePack, RARITY_TABLE, cardPool } from '../src/engine/rewards.js';
import { resolveCard } from '../src/cards/catalog.js';
import { GRAFT_TRAITS } from '../src/cards/trait-registry.js';
import { REAL_CREATURES } from '../src/cards/real-pool.js';
import { toGameCard } from '../src/cards/compatibility.js';
import { checkFacts } from '../src/cards/live.js';
import { traitDraw, onHeroAttack, onHeroSpell, onBattleGrafts } from '../src/engine/trait-triggers.js';
import { availableMana, spendMana, addChannel, CHANNEL_MANA_CAP, CHANNEL_CHARGE_CAP } from '../src/engine/mana.js';
import { motionDuration } from '../src/ui/card-animation-director.js';
import { cardHTML, sourcePanelHTML } from '../src/ui/cards.js';
import { treatmentFor } from '../src/ui/pack-opening.js';
import { splitWurmcoil } from '../src/engine/printed-triggers.js';
import { spawnEnemy } from '../src/engine/ai.js';
import { BATTLE_VERSION } from '../src/engine/combat.js';
import { createStore, memoryStorage, KEYS, RUN_MIGRATIONS } from '../src/engine/save.js';
import { encounterBenchmarks } from '../src/engine/scoring.js';
import { visualManaTier, profileFor, intensityOf } from '../src/rendering/casting.js';
import { readFileSync } from 'node:fs';

const arena = () => ({name:'test',w:7,h:7,terrain:Array(49).fill(0),playerStart:{x:3,y:3},enemies:[{defId:'goblin',x:5,y:3}]});
const fight = ({traits=[],spells=[],deckMode=false,startHp=null}={}) => {
  const evo=newEvolution(); evo.absorbed=traits.map((id,i)=>({cardId:id,index:i}));
  const stats=deriveStats(evo);
  const b=createBattle({evo,stats,spellbook:spells,encounter:arena(),seed:33,startHp,deckMode});
  return b;
};

test('v1.2.6 tiers are real noninterchangeable per-slot probabilities',()=>{
  assert.deepEqual(RARITY_TABLE.battle,{common:60,uncommon:28,rare:10,mythic:2});
  assert.deepEqual(RARITY_TABLE.elite,{common:30,uncommon:42,rare:23,mythic:5});
  assert.deepEqual(RARITY_TABLE.boss,{common:12,uncommon:33,rare:43,mythic:12});
  assert.ok(RARITY_TABLE.boss.rare > RARITY_TABLE.elite.rare && RARITY_TABLE.elite.rare > RARITY_TABLE.battle.rare);
  for(const table of Object.values(RARITY_TABLE))assert.equal(Object.values(table).reduce((a,b)=>a+b,0),100);
});

test('rarity-first actual weighted rolls are close to declared odds and independent of pool bucket size',()=>{
  const candidates=['common','uncommon','rare','mythic'].flatMap((rarity,i)=>Array.from({length:i*11+1},(_,j)=>({id:`${i}:${j}`,rarity})));
  const n=24000;
  for(const [tier,weights] of Object.entries(RARITY_TABLE)){
    const rng=makeRng(2026); const got={common:0,uncommon:0,rare:0,mythic:0};
    for(let i=0;i<n;i++)got[rarityFirstPick(rng,candidates,weights).rarity]++;
    for(const [r,weight] of Object.entries(weights))assert.ok(Math.abs(100*got[r]/n-weight)<1.4,`${tier}/${r} actual=${100*got[r]/n} expected=${weight}`);
  }
});

test('Boss guarantees Rare+ and Elite guarantees Uncommon+ whenever eligible, across 1000 seeds',()=>{
  for(const tier of ['boss','elite']){
    const pool=cardPool({step:20,tier});assert.ok(pool.some(c=>c.rarity==='mythic'),`${tier} needs real mythics`);
    for(let seed=1;seed<=1000;seed++){
      const p=generatePack(seed,{tier,step:20});assert.equal(p.length,3);assert.equal(new Set(p).size,3);
      assert.ok(p.some(id=>tier==='boss'?['rare','mythic'].includes(resolveCard(id).rarity):resolveCard(id).rarity!=='common'),`${tier} ${seed}`);
      assert.deepEqual(generatePack(seed,{tier,step:20}),p,'deterministic');
    }
  }
});

test('Pauper excludes all Rare/Mythic even with boss rarity guarantees',()=>{
  for(let i=1;i<=100;i++){
    const p=generatePack(i,{step:20,tier:'boss',noRares:true});
    assert.equal(p.length,3);assert.ok(p.every(id=>!['rare','mythic'].includes(resolveCard(id).rarity)));
  }
});

test('curated Mythic cards are actually eligible at later stages and represent real Magic identities',()=>{
  const names=cardPool({step:23,tier:'boss'}).filter(c=>c.rarity==='mythic').map(c=>c.name);
  for(const name of ['Brimaz, King of Oreskos','Sheoldred, the Apocalypse','Wurmcoil Engine'])assert.ok(names.includes(name),name);
  assert.ok(GRAFT_TRAITS['Young Pyromancer']);assert.ok(GRAFT_TRAITS['Archmage Emeritus']);
});

test('cosmetic treatments are deterministic and never affect underlying rarity',()=>{
  const id='mtg:typhoid-rats'; const card=resolveCard(id);const original=card.rarity;
  for(let seed=0;seed<300;seed++){
    const type=treatmentFor(seed,id,1);
    assert.ok(['original','etched','masterwork'].includes(type));assert.equal(type,treatmentFor(seed,id,1));
    assert.equal(resolveCard(id).rarity,original);
  }
});

test('Channel mana reserve and spell charges carry across turns, capped at two, consumed atomically',()=>{
  const s=fight(); assert.equal(s.v,BATTLE_VERSION);assert.equal(availableMana(s),s.p.mana);
  const first=addChannel(s);assert.ok(first.t==='mana');assert.equal(s.p.channel,1);assert.equal(s.p.storedMana,1);
  addChannel(s);addChannel(s);assert.equal(s.p.channel,CHANNEL_CHARGE_CAP);assert.equal(s.p.storedMana,CHANNEL_MANA_CAP);
  const before=availableMana(s);assert.throws(()=>spendMana(s,before+1),/Not enough mana/);assert.equal(availableMana(s),before);
  spendMana(s,before);assert.equal(availableMana(s),0);assert.equal(s.p.storedMana,0);
  assert.equal(s.p.channel,2);
});

test('Channel reserve persists into a second turn and is retained in serialised battle state',()=>{
  const s=fight();for(const foe of enemies(s)){foe.power=0;foe.hp=50;foe.maxHp=50;}const c=channel(s);assert.ok(c.some(x=>x.t==='stance'));
  assert.equal(s.p.channel,1);assert.equal(s.p.storedMana,1);
  endTurn(s);assert.equal(s.turn,2);assert.equal(s.p.storedMana,1);assert.equal(s.p.channel,1);
  const copy=JSON.parse(JSON.stringify(s));assert.equal(copy.p.storedMana,1);assert.equal(copy.p.channel,1);
});

test('Sheoldred draw trigger restores life; Elvish Visionary triggers opening draw when deck exists',()=>{
  const s=fight({traits:['mtg:sheoldred-the-apocalypse'],spells:[{id:'mtg:shock',level:1}],deckMode:true,startHp:4});
  const prev=player(s).hp,ev=[];s.deck.library.push({id:'mtg:shock',level:1});
  const n=traitDraw(s,ev,1);assert.equal(n,1);assert.ok(player(s).hp>prev);assert.ok(ev.some(e=>e.t==='cardDraw'));
  const visionary=fight({traits:['mtg:elvish-visionary'],spells:[{id:'mtg:shock',level:1},{id:'mtg:lightning-bolt',level:1},{id:'mtg:drain-life',level:1},{id:'mtg:fireball',level:1}],deckMode:true});
  assert.ok(visionary.traits.includes('visionary'));
  assert.ok(visionary.openingEvents.some(e=>e.t==='cardDraw'));
});

test('Brimaz graft summons a capped friendly Cat Soldier on declaration',()=>{
  const s=fight({traits:['mtg:brimaz-king-of-oreskos']});const ev=[];
  onHeroAttack(s,ev);assert.ok(s.units.some(u=>u.name==='Cat Soldier'&&u.side==='player'&&u.power===1));
  assert.ok(ev.some(e=>e.t==='summon'&&e.ally));
  for(let i=0;i<6;i++)onHeroAttack(s,ev);
  assert.ok(s.units.filter(u=>u.name==='Cat Soldier'&&u.hp>0).length<=3);
});

test('Young Pyromancer and Talrand add distinct bounded spell-trigger token armies',()=>{
  const s=fight({traits:['mtg:young-pyromancer','mtg:talrand-sky-summoner']});const ev=[];
  onHeroSpell(s,ev);
  assert.ok(s.units.some(u=>u.name==='Elemental'&&u.power===1));
  assert.ok(s.units.some(u=>u.name==='Drake'&&u.power===2&&u.keywords.flying));
  for(let i=0;i<8;i++)onHeroSpell(s,ev);
  assert.ok(s.units.filter(u=>u.name==='Elemental'&&u.hp>0).length<=3);
  assert.ok(s.units.filter(u=>u.name==='Drake'&&u.hp>0).length<=3);
});

test('final act guardian victory is a saved win with no final booster or skipped-reward Spark',()=>{
  const r=newRun({seed:1234});r.act=2;r.current=12;r.phase='battle';
  const b=fight();b.nodeType='boss';b.phase='won';b.act=2;b.name='The Scarab God';
  b.bench=encounterBenchmarks('boss',2,1);r.battle=b;
  const sparkBefore=r.sparkBonus;
  const result=concludeBattle(r);
  assert.equal(result.outcome,'won');assert.equal(result.final,true);
  assert.equal(r.phase,'won');assert.equal(r.pending,null);assert.equal(r.victoryScene,'pending');assert.equal(r.sparkBonus,sparkBefore);assert.equal(r.stats.bossesDefeated,1);
  assert.throws(()=>skipReward(r),/No reward pending/);
});

test('completion statistics count only once when refreshing and replaying the victory screen',()=>{
 const m=newMeta(),r=newRun({seed:991});r.phase='won';r.startedAt=678901;
 assert.equal(recordRunEnd(m,r,true),true);assert.equal(recordRunEnd(m,r,true),false);
 assert.equal(m.stats.runs,1);assert.equal(m.stats.wins,1);
});

test('old Gearhulk encounters migrate into Wurmcoil while preserving old player library and challenge progress',()=>{
 const r=newRun({seed:999});r.v=7;r.phase='battle';r.battle=fight({spells:[{id:'mtg:shock',level:1}],deckMode:true});r.battle.opp={library:[{id:'fictional'}]};r.battle.pendingChoices={gearhulk:'draw'};
 r.battle.units.push({uid:999,defId:'champion',name:'Combustible Gearhulk',keywords:{firstStrike:1},hp:10});
 const stored=JSON.stringify(r.battle.deck);
 const m=RUN_MIGRATIONS[7](r);
 assert.equal(m.v,RUN_VERSION);assert.equal(m.battle.v,BATTLE_VERSION);
 assert.ok(!('opp' in m.battle));assert.ok(!('pendingChoices' in m.battle));
 assert.equal(m.battle.units.at(-1).name,'Wurmcoil Engine');assert.ok(m.battle.units.at(-1).keywords.deathtouch);
 assert.equal(JSON.stringify(m.battle.deck),stored);
});

test('card zone animation is skippable, reduced-motion safe and stays separate from rules state',()=>{
 assert.equal(motionDuration('off'),0);assert.equal(motionDuration('full',true),0);
 assert.ok(motionDuration('full')>motionDuration('minimal'));assert.ok(motionDuration('auto')>0);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/ui/battle-ui.js',import.meta.url),'utf8');
 const fin=readFileSync(new URL('../src/ui/screens.js',import.meta.url),'utf8');
 assert.equal((html.match(/id="gb-card-zones"/g)||[]).length,1,'Exactly one Library/Graveyard widget');
 assert.equal((html.match(/id="card-zones"/g)||[]).length,0,'Legacy duplicate cannot obscure the battlefield');
 assert.ok(ui.includes('backHTML()'));
 assert.ok(ui.includes('this.cardAnimations.stop()'),'All active card flights must cancel on battle exit');
 assert.ok(ui.includes('cardCastMove'));assert.ok(fin.includes('gb-finale')&&fin.includes('View Run Statistics'));
});

test('Shock is fast but visually distinct and magnitude/level intensity remains bounded',()=>{
 assert.equal(profileFor('shock').arcs,4);
 assert.ok(profileFor('shock').build+profileFor('shock').gather < profileFor('lightningBolt').build+profileFor('lightningBolt').gather);
 assert.ok(intensityOf(500)<=2);assert.equal(visualManaTier(2),2);
});

test('Creature rewards with real Oracle abilities display their reviewed GRAFTBOUND trigger, not a vanilla description',()=>{
 for(const id of ['mtg:young-pyromancer','mtg:brimaz-king-of-oreskos','mtg:archmage-emeritus','mtg:sheoldred-the-apocalypse']){
  const c=resolveCard(id),html=cardHTML(id,{small:true}),detail=sourcePanelHTML(id);
  assert.ok(c.trait&&c.adaptationNote,`${id} needs a real tested trait`);
  assert.match(html,/Graft ability:/);
  assert.ok(!html.includes('No abilities — pure body.'),id);
  assert.ok(detail.includes('GRAFTBOUND')&&detail.includes('adaptation'),id);
 }
});

test('Wurmcoil Engine dies into exactly one Deathtouch and one Lifelink 3/3 Wurm',()=>{
 const s=fight(),ev=[];const source=spawnEnemy(s,'champion',1,1);source.hp=0;
 assert.equal(splitWurmcoil(s,ev,source),2);
 const tokens=s.units.filter(u=>['wurmTouch','wurmLife'].includes(u.defId));
 assert.equal(tokens.length,2);
 assert.ok(tokens.every(u=>u.hp===3&&u.maxHp===3&&u.power===3&&u.toughness===3));
 assert.ok(tokens.some(u=>u.keywords.deathtouch)&&tokens.some(u=>u.keywords.lifelink));
 assert.equal(splitWurmcoil(s,ev,source),0,'Death trigger cannot resolve twice');
});


test('Scryfall Magecraft ability word is verified as a card fact but modeled only via its reviewed Archmage trigger', () => {
  const printed = REAL_CREATURES.find(c => c.name === 'Archmage Emeritus');
  assert.deepEqual(printed.keywords, ['Magecraft']);
  const sf = {source:'scryfall',name:printed.name,cmc:printed.cmc,manaCost:printed.mana_cost,
    typeLine:printed.type_line,power:printed.power,toughness:printed.toughness,keywords:['Magecraft'],
    colors:['U'],rarity:'rare',oracleText:'Magecraft — Whenever you cast or copy an instant or sorcery spell, draw a card.'};
  const adapted = toGameCard(sf);
  assert.equal(adapted.ok, true, adapted.reasons?.join('; '));
  assert.equal(adapted.card.trait, 'archmage');
  assert.deepEqual(adapted.card.keywords, {});
  assert.deepEqual(adapted.card.sourceInfo.keywords, ['Magecraft']);
  assert.deepEqual(checkFacts(adapted.card,sf), []);
  const unreviewed = toGameCard({...sf,name:'Unreviewed Magecraft Card'});
  assert.equal(unreviewed.ok, false);
  assert.ok(unreviewed.reasons.includes('unsupported keyword: Magecraft'));
});
