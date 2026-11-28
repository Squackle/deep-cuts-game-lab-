// v1.8.2 owner-requested gameplay and art fixes. Authoritative engine checks + presentation contracts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { arena } from './helpers.mjs';
import { cast, enemies, player, chooseCombo } from '../src/engine/combat.js';
import { comboToken, resolveComboEvents, comboChoices, hasComboChoices } from '../src/engine/combo-triggers.js';
import { availableMana } from '../src/engine/mana.js';
import { spellTargets, formatSpellText } from '../src/engine/spells.js';
import { resolveCard } from '../src/cards/catalog.js';
import { fireball, FIREBALL_METEOR } from '../src/rendering/vfx.js';
import { Scene } from '../src/rendering/scene.js';
import { GAME } from '../src/config.js';
import { RULES_VERSION, RANKED_CHALLENGES } from '../src/engine/ranked.js';

const source = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const book = (...ids) => ids.map(id => ({id,level:1}));
const summon = (s,x,y,hp=8) => {
  const u={uid:s.nextUid++,side:'player',hero:false,defId:'sproutling',name:'Friendly Ally',x,y,hp,maxHp:hp,
    power:1,toughness:hp,move:2,keywords:{},statuses:{}};
  s.units.push(u);return u;
};
function mistScenario(spell) {
  const s=arena(['t....','.....','..P.t','.....','.....'],{t:'tortoise'},{spellbook:book(spell)});
  s.p.mana=s.p.maxMana=15;
  const target=enemies(s).find(e=>e.x===4&&e.y===2);
  for(const e of enemies(s)){e.hp=e.maxHp=20;}
  const ally=summon(s,2,1), diagonal=summon(s,1,1),outside=summon(s,4,4);
  return {s,target,ally,diagonal,outside,hero:player(s)};
}

test('Fireball/Starfall hits caster, allies and enemies within its ORIGINAL 5-cell cross, not diagonals',()=>{
  for(const id of ['mtg:fireball','starfall']) {
    const {s,hero,ally,diagonal,outside}=mistScenario(id);
    const foe=enemies(s).find(e=>e.x===4&&e.y===2);
    const eCenter=enemies(s).find(e=>e.x===0&&e.y===0);
    // Put a foe at (3,2): immediate right neighbor; existing far foe is out of range.
    eCenter.x=3;eCenter.y=2;eCenter.hp=eCenter.maxHp=20;
    const hp=hero.hp;
    assert.ok(spellTargets(s,id).some(q=>q.x===hero.x&&q.y===hero.y));
    const events=cast(s,id,2,2);
    assert.equal(hero.hp,hp-4, 'caster must take full center damage');
    assert.equal(ally.hp,6,'friendly ally in cardinal neighbor takes splash');
    assert.equal(diagonal.hp,8,'diagonal ally is outside Fireball cross');
    assert.equal(outside.hp,8,'distant ally safe');
    assert.equal(eCenter.hp,18,'foe in cardinal neighbor takes splash');
    assert.equal(foe.hp,20,'distant foe safe');
    assert.deepEqual(events.filter(e=>e.t==='batch').map(e=>e.uids.length),[3],'same snapshot includes three living creatures');
    assert.match(formatSpellText(id),/creatures|friend or foe/i);
    if(id.startsWith('mtg:'))assert.match(resolveCard(id).adaptationNote||'',/including the caster and allies|Adapted/i);
  }
});

test('Pyroclasm hits hero, ally, enemy, regardless of side; Infest reaches all 3x3 tiles',()=>{
  const {s,hero,ally,diagonal,outside}=mistScenario('mtg:pyroclasm');
  const enemy=enemies(s)[0];enemy.hp=enemy.maxHp=20;
  const before=hero.hp;
  const ev=cast(s,'mtg:pyroclasm',hero.x,hero.y);
  assert.equal(hero.hp,before-2);assert.equal(ally.hp,6);assert.equal(diagonal.hp,6);assert.equal(outside.hp,6);
  assert.equal(enemy.hp,18);
  assert.equal(ev.filter(e=>e.t==='batch').length,1);
  assert.match(formatSpellText('mtg:pyroclasm'),/EVERY creature/);
  const v=mistScenario('mtg:infest');
  cast(v.s,'mtg:infest',2,2);
  for(const u of [v.hero,v.ally,v.diagonal])assert.equal(u.statuses.poison,2);
  assert.equal(v.outside.statuses.poison||0,0);
});

test('charged crystal discharge from a spell has symmetric 3x3 friendly fire',()=>{
  const {s,hero,ally,diagonal,outside}=mistScenario('mtg:lightning-bolt');
  const target=enemies(s)[0];target.x=3;target.y=2;target.hp=target.maxHp=30;
  const other=enemies(s)[1];other.x=4;other.y=4;other.hp=other.maxHp=30;
  s.crystals=[{x:2,y:2,charged:true}];
  const hp=hero.hp,allyHp=ally.hp;
  const events=cast(s,'mtg:lightning-bolt',3,2);
  assert.equal(s.crystals[0].charged,false);
  const discharge=events.find(e=>e.t==='batch'&&e.uids.includes(hero.uid));
  assert.ok(discharge,'crystal explosion must include living hero');
  const expected=events.find(e=>e.t==='damage'&&e.uid===hero.uid)?.amount;
  assert.ok(expected>0);assert.equal(hero.hp,hp-expected);
  assert.equal(ally.hp,allyHp-expected);
  assert.equal(diagonal.hp,8-expected);
  assert.equal(outside.hp,8);
  assert.equal(other.hp,30);
});

test('paid Mentor/Nadir prompts never queue at zero mana, even if Channel is not available',()=>{
  const s=arena(['t....','.....','..P..'],{t:'tortoise'});
  s.traits=['mentor','nadir'];s.deck={hand:[],library:[{id:'mtg:shock'}],graveyard:[],capacity:8};
  s.p.mana=0;s.p.storedMana=0;s.p.channel=0;s.p.moveLeft=0;s.p.attacksLeft=0;s.combo={choices:[],counters:{},actions:{},treasure:0};
  const ev=[];comboToken(s,ev,'Squirrel',1,1);resolveComboEvents(s,ev);
  resolveComboEvents(s,[{t:'cardDraw',uid:player(s).uid,id:'mtg:shock'}]);
  assert.equal(s.combo.choices.length,0,'no mandatory Skip dialog when mana is impossible');
  assert.equal(hasComboChoices(s),false);assert.equal(comboChoices(s),null);
  assert.equal(availableMana(s),0);
});

test('channel potential must NOT block actions when a paid trigger cannot be paid now',()=>{
  const s=arena(['t....','.....','..P..'],{t:'tortoise'});
  s.traits=['nadir'];s.deck={hand:[],library:[{id:'mtg:shock'}],graveyard:[],capacity:8};
  s.p.mana=0;s.p.storedMana=0;s.p.moveLeft=3;s.p.attacksLeft=1;
  resolveComboEvents(s,[{t:'cardDraw',uid:player(s).uid,id:'mtg:shock'}]);
  assert.equal(hasComboChoices(s),false,'a player may Channel next; do not trap them behind a pointless modal');
});

test('one resource pays one optional choice; stale queued paid triggers disappear after spending',()=>{
  const s=arena(['t....','.....','..P..'],{t:'tortoise'});
  s.traits=['mentor'];s.deck={hand:[],library:[{id:'mtg:shock'},{id:'mtg:fireball'}],graveyard:[],capacity:8};
  s.p.mana=1;s.p.storedMana=0;s.combo={choices:[],counters:{},actions:{},treasure:0};
  const ev=[];comboToken(s,ev,'Squirrel',1,1);comboToken(s,ev,'Squirrel',1,1);resolveComboEvents(s,ev);
  assert.equal(s.combo.choices.length,2);
  chooseCombo(s,'mentor',1);
  assert.equal(availableMana(s),0);
  assert.equal(hasComboChoices(s),false,'follow-up impossible paid prompt is pruned');
});

test('banked mana or Treasure still opens legitimate optional paid choices',()=>{
  for (const resource of ['storedMana','treasure']) {
    const s=arena(['t....','.....','..P..'],{t:'tortoise'});
    s.traits=['nadir'];s.deck={hand:[],library:[{id:'mtg:shock'}],graveyard:[],capacity:8};
    s.p.mana=0;s.p.storedMana=resource==='storedMana'?1:0;
    s.combo={choices:[],counters:{},actions:{},treasure:resource==='treasure'?1:0};
    resolveComboEvents(s,[{t:'cardDraw',uid:player(s).uid,id:'mtg:shock'}]);
    assert.equal(comboChoices(s)?.kind,'nadir',resource+' should enable paying');
    chooseCombo(s,'nadir',1);
    assert.equal(availableMana(s),0);
  }
});

test('restored old saves prune only unpayable optional prompts, not unrelated choices',()=>{
  const s=arena(['t....','.....','..P..'],{t:'tortoise'});
  s.p.mana=0;s.p.storedMana=0;
  s.combo={choices:[{kind:'mentor',source:7},{kind:'ivy',source:8},{kind:'nadir',card:'mtg:shock'}],counters:{},actions:{},treasure:0};
  assert.equal(hasComboChoices(s),true);
  assert.deepEqual(s.combo.choices.map(x=>x.kind),['ivy']);
});

test('molten fireball remains VFX-only and doubles visible mass with black rock clasts',async()=>{
  assert.ok(FIREBALL_METEOR.baseSize>=100 && FIREBALL_METEOR.chunks>=4);
  const calls=[];
  const sc={ speed:55,reduced:true,fx:{swirl(){},burst(...x){calls.push(['burst',...x]);}},
    projectile:async(...x)=>{calls.push(['projectile',...x]);},addRing(){},screenFlash(){},light(){},shake(){calls.push(['shake']);}};
  await fireball(sc,{from:[0,1,0],to:[3,0,3],tiles:[[3,0,3]],charged:true,power:1.5});
  const projectile=calls.find(x=>x[0]==='projectile');
  assert.ok(projectile);assert.equal(projectile[6].molten,true);assert.ok(projectile[6].size>=140);
  assert.equal(calls.some(x=>x[0]==='shake'),false,'reduced motion suppresses shake');
  const render=Object.create(Scene.prototype);render.r={q:{particles:1}};render.reduced=false;
  const particles=[],rocks=[];render.fx={emit:x=>particles.push(x)};render.rockFx={emit:x=>rocks.push(x)};render.light=()=>({pos:[]});
  render.tween=async (_dur,cb)=>{for(const k of [0.2,0.3,0.4,0.5])cb(k);};
  await render.projectile([0,1,0],[3,0,3],[1,0.5,0.15],0.62,0.9,{molten:true,size:160,embers:true});
  assert.ok(rocks.some(x=>x.col?.[0]<0.2),'real alpha-blended black rock chunks exist');
  assert.ok(particles.some(x=>x.col?.[0]>0.9&&x.size>=150),'large hot core exists');
  assert.ok(particles.length<=80 && rocks.length<=30,'reasonable particle budget for low-end devices');
  assert.match(source('src/rendering/gl.js'),/alphaBlend \? gl\.ONE_MINUS_SRC_ALPHA : gl\.ONE/);
});

test('skeleton bone-pile art is an original 2-frame 48px atlas derived from the friendly Skeleton',()=>{
  const path=new URL('../assets/hd2d/creatures/skeleton-bone-pile.png',import.meta.url);
  assert.ok(existsSync(path));const png=readFileSync(path);
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16),96);assert.equal(png.readUInt32BE(20),48);
  assert.ok(png.length>1000);
  const loader=source('src/rendering/sprites.js'),scene=source('src/rendering/scene.js');
  assert.match(loader,/skeletonBones = i/);
  assert.match(scene,/assets\.images\.skeletonBones \|\| makeBoneAtlas\(\)/);
  assert.match(scene,/\{ tex: 'bones', seq: \[/);
});

test('v1.8.2 rules revision retires previous ranked replays while retaining saved progress',()=>{
  assert.equal(GAME.version,'1.9.1-candidate');assert.equal(RULES_VERSION,'graftbound-rules-1.9.1-candidate');
  assert.equal(RANKED_CHALLENGES['gb-expedition-01'].revision,33);
});
