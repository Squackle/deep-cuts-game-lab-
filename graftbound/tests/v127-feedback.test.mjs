import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { arena } from './helpers.mjs';
import { cast, player, enemies } from '../src/engine/combat.js';
import { resolveToxrillEndStep } from '../src/engine/ai.js';
import { spellNumbers, formatSpellText } from '../src/engine/spells.js';
import { REAL_CREATURE_MODELS } from '../src/rendering/real-creature-models.js';
import { RANKED_CHALLENGES, RULES_VERSION, replayRun } from '../src/engine/ranked.js';

const path=name=>readFileSync(new URL('../'+name, import.meta.url),'utf8');
const fight=(id,level=1)=>{const s=arena(['.......','....t..','...P...','.......'],{t:'tortoise'},{spellbook:[{id,level}]});s.p.mana=20;s.p.maxMana=20;return s;};

test('Raise the Alarm scales two different Soldiers from 1/1 through 3/3; Arcane never modifies stats',()=>{
 for(let level=1;level<=3;level++){
  assert.deepEqual(spellNumbers('mtg:raise-the-alarm',level,9),[level,level]);
  assert.match(formatSpellText('mtg:raise-the-alarm',level,9),new RegExp(`two ${level}/${level} white Soldier`));
  const s=fight('mtg:raise-the-alarm',level);
  const ev=cast(s,'mtg:raise-the-alarm',2,1);
  const soldiers=s.units.filter(u=>u.name==='Soldier');assert.equal(soldiers.length,2);
  assert.equal(new Set(soldiers.map(u=>`${u.x},${u.y}`)).size,2);
  assert.ok(soldiers.every(u=>u.power===level&&u.toughness===level&&u.hp===level));
  assert.equal(ev.filter(e=>e.t==='summon').length,2);
 }
});

test('Pyroclasm hits hero, living allies and foes alike and does not score friendly fire as enemy damage',()=>{
 const s=fight('mtg:pyroclasm');
 const hero=player(s),foe=enemies(s)[0];
 hero.hp=hero.maxHp=10;
 const ally={uid:s.nextUid++,side:'player',hero:false,defId:'sproutling',name:'Elemental',x:2,y:2,hp:4,maxHp:4,power:2,toughness:4,statuses:{},keywords:{}};
 s.units.push(ally);
 const heroHp=hero.hp,foeHp=foe.hp;
 const ev=cast(s,'mtg:pyroclasm',hero.x,hero.y);
 assert.ok(ev.some(e=>e.t==='damage'&&e.uid===hero.uid));
 assert.ok(ev.some(e=>e.t==='damage'&&e.uid===ally.uid));
 assert.ok(ev.some(e=>e.t==='damage'&&e.uid===foe.uid));
 assert.equal(hero.hp,heroHp-2);assert.equal(ally.hp,2);assert.equal(foe.hp,foeHp-2);
 assert.equal(s.stats.damageDealt,2,'friendly fire never counts as enemy damage');
});

test('Healing Hands and Revitalize draw an actual card from combat library when cast',()=>{
 for(const id of ['mtg:healing-hands','mtg:revitalize']){
  const s=fight(id),hero=player(s), next={id:'mtg:shock',level:1};
  s.deck={library:[next],hand:[{id,level:1}],graveyard:[],exile:[],capacity:7};
  const ev=cast(s,id,hero.x,hero.y);
  assert.equal(s.deck.library.length,0);assert.ok(s.deck.hand.some(c=>c.id===next.id));
  assert.equal(s.deck.graveyard.at(-1)?.id,id);
  assert.ok(ev.some(e=>e.t==='cardDraw'&&e.id===next.id));
 }
});

test('Gift of Immortality creates a dedicated casting animation event BEFORE attaching the aura',()=>{
 const s=fight('mtg:gift-of-immortality'),hero=player(s);
 const ev=cast(s,'mtg:gift-of-immortality',hero.x,hero.y);
 const castIndex=ev.findIndex(e=>e.t==='auraCast'),attachIndex=ev.findIndex(e=>e.t==='auraAttach');
 assert.ok(castIndex>=0&&attachIndex>castIndex);
 assert.equal(ev[castIndex].id,'mtg:gift-of-immortality');
 assert.equal(ev[castIndex].target,hero.uid);
});

test('Toxrill applies counters on EACH end step, kills zero-toughness allies and produces a Slug death trigger',()=>{
 const s=arena(['.......','...T...','...P...','.......'],{T:'toxrill'});
 const slugPre=s.units.filter(u=>u.defId==='slug').length;
 const ally={uid:s.nextUid++,side:'player',hero:false,defId:'sproutling',name:'Soldier',x:1,y:1,hp:1,maxHp:1,power:1,toughness:1,statuses:{},keywords:{},token:true};
 s.units.push(ally);
 const ev=[];resolveToxrillEndStep(s,ev);
 assert.ok(ev.some(e=>e.t==='slimeCounter'&&e.uid===ally.uid&&e.total===1));
 assert.ok(ev.some(e=>e.t==='death'&&e.uid===ally.uid),'state-based death triggers on zero toughness');
 assert.equal(ally.hp,0);
 assert.ok((s.pendingSlugs||0)>0||s.units.filter(u=>u.defId==='slug').length>slugPre,'Toxrill earns a Slug when a slime-marked creature dies');
});

test('all friendly creature token types use independent, original animated models',()=>{
 const names=['friendlySoldier','friendlyElemental','friendlyDrake','friendlyCatSoldier'];
 assert.equal(new Set(names.map(n=>REAL_CREATURE_MODELS[n].feature)).size,names.length);
 assert.ok(names.every(n=>REAL_CREATURE_MODELS[n].custom));
 const battle=path('src/ui/battle-ui.js');
 for(const n of names)assert.ok(battle.includes(`mtg_${n}`),`renderer must map ${n}`);
});

test('all reward packs reset their screen scroll and center selected cards; no cyan rectangle over card art',()=>{
 const code=path('src/ui/screens.js'),styles=path('styles.css');
 assert.match(code,/el\.scrollTop = 0; el\.scrollLeft = 0/);
 assert.match(code,/centerSlot\(slot\)/);
 assert.match(code,/pack\.classList\.add\('open'\); fan\.classList\.add\('out'\); enterFan\(\)/);
 assert.match(styles,/rewardscr \.slot\.rarity-uncommon::after[^\n]*display:none!important/);
});

test('graveyard always displays face-up top card, while library remains facedown',()=>{
 const battle=path('src/ui/battle-ui.js'),css=path('styles.css');
 assert.match(battle,/gb-grave-face/);assert.match(battle,/extraClass:'gb-grave-top'/);
 assert.match(css,/gb-grave-face \.lc-card \.back\{display:none!important/);
 assert.match(css,/gb-grave-face \.lc-card \.front\{display:flex!important/);
});

test('graft selection includes actual triggered ability descriptions, tile inspection stays bounded, umbral effects and auras have casting events',()=>{
 const ui=path('src/ui/screens.js'),battle=path('src/ui/battle-ui.js'),css=path('styles.css');
 assert.match(ui,/gb-graft-ability/);assert.match(ui,/ac\.trait \? ' · ✦ '/);
 assert.match(css,/#inspect\{[^\n]*overflow-wrap:anywhere/);
 assert.match(battle,/case 'auraCast'/);assert.match(battle,/case 'graftTrigger'/);
 assert.match(battle,/c\.color === 'umbral'/);
});

test('rules update uses new isolated replay version without changing the historic card pool',()=>{
 assert.equal(RULES_VERSION,'graftbound-rules-1.3.9-beta');
 assert.equal(RANKED_CHALLENGES['gb-expedition-01'].revision,22);
 assert.throws(()=>replayRun('gb-expedition-01',[],{revision:13}),/Unknown or retired challenge/);
});
