import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { arena } from './helpers.mjs';
import { player,cast,castOptions } from '../src/engine/combat.js';
import { rangedPriority,planEnemy } from '../src/engine/ai.js';
import { resolveCard } from '../src/cards/catalog.js';
import { comboChoices,comboToken,resolveComboEvents } from '../src/engine/combo-triggers.js';
import { impactEnvelope } from '../src/rendering/vfx.js';
import { REAL_CREATURE_MODELS } from '../src/rendering/real-creature-models.js';
import { RULES_VERSION,RANKED_CHALLENGES } from '../src/engine/ranked.js';

const book=(...ids)=>ids.map(id=>({id:'mtg:'+id,level:1}));

test('printed target creature cards may choose friend, foe, or the player',()=>{
 const s=arena(['t....','.....','..P..'],{t:'tortoise'},{spellbook:book('shock','flame-slash','giant-growth','feat-of-resistance')});
 s.p.mana=24;s.p.maxMana=24;
 const h=player(s),t=s.units.find(u=>u.defId==='tortoise');
 for(const id of ['shock','flame-slash','giant-growth']){
  const choices=castOptions(s,'mtg:'+id);
  assert.ok(choices.some(q=>q.x===h.x&&q.y===h.y),id+' targets hero');
  assert.ok(choices.some(q=>q.x===t.x&&q.y===t.y),id+' targets foe');
 }
 assert.ok(!castOptions(s,'mtg:feat-of-resistance').some(q=>q.x===t.x&&q.y===t.y),'target creature you control remains restricted');
 const before=h.hp;cast(s,'mtg:shock',h.x,h.y);
 assert.equal(h.hp,before-2,'friendly fire resolves in authoritative engine');
});

test('ranged enemy selects the visible ally capable of killing it next turn',()=>{
 const s=arena(['.......','...a...','...P...','.......','.......'],{a:'archer'});
 const archer=s.units.find(u=>u.defId==='archer'),hero=player(s);
 const ally={uid:s.nextUid++,side:'player',hero:false,defId:'sproutling',name:'Soldier',x:2,y:1,hp:5,maxHp:5,power:50,toughness:5,move:2,keywords:{},statuses:{}};
 s.units.push(ally);
 assert.equal(rangedPriority(s,archer),ally,'immediate lethal threat outranks hero');
 const plan=planEnemy(s,archer);
 assert.ok(Array.isArray(plan.actions),'planning is deterministic and legal');
 assert.deepEqual(plan,planEnemy(s,archer),'previews and execution use identical plan');
 assert.ok(hero.hp>0);
});

test('Mentor identifies why the optional paid draw cannot be selected',()=>{
 const s=arena(['t....','.....','..P..'],{t:'tortoise'},{spellbook:book('shock')});
 s.traits=['mentor'];s.p.mana=0;s.deck={hand:[],library:[{id:'mtg:shock'}],graveyard:[],capacity:5};
 const ev=[];comboToken(s,ev,'Squirrel');resolveComboEvents(s,ev);
 assert.equal(comboChoices(s)?.kind,'mentor');
 assert.match(comboChoices(s).reason,/Need 1 available mana/);
 assert.equal(comboChoices(s).choices.some(c=>c.arg===1),false);
});

test('wolf and spider models are distinct, grounded and no longer use moth rig',()=>{
 assert.equal(REAL_CREATURE_MODELS.spider.base,'hound');
 assert.equal(REAL_CREATURE_MODELS.friendlySpider.base,'hound');
 assert.equal(REAL_CREATURE_MODELS.wolf.feature,'wolf');
 assert.equal(REAL_CREATURE_MODELS.spider.feature,'spiderling');
 assert.notEqual(REAL_CREATURE_MODELS.wolf.mid,'#839b90');
});

test('shock, fire and frost cover a unit but restore temporary frost material',async()=>{
 const v={pos:[0,0,0],scale:.38,flash:0,flashCold:0,hidden:false};
 const counts={bolt:0,burst:0,ring:0};
 const sc={speed:100,reduced:true,units:new Map([[7,v]]),centerPos:()=>[0,.45,0],heightOf:()=>.8,fx:{burst:()=>counts.burst++},addRing:()=>counts.ring++,addBolt:()=>counts.bolt++,light:()=>{}};
 await impactEnvelope(sc,7,'shock');assert.ok(counts.bolt>0);
 await impactEnvelope(sc,7,'flame');assert.ok(counts.burst>0);
 await impactEnvelope(sc,7,'frost');assert.ok(counts.ring>0);assert.equal(v.flashCold,0);
});

test('concealed reward fronts and deferred hand drawings have runtime hooks',()=>{
 const style=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/ui/battle-ui.js',import.meta.url),'utf8');
 assert.match(style,/\.lc-card\.flipped \.front\s*\{display:none!important/);
 assert.match(style,/\.handcard\.gb-draw-concealed/);
 assert.match(ui,/this\.concealedDraws\.set/);
 assert.match(ui,/await this\.cardAnimations\.play\('draw',e\)/);
});

test('rules change gets new ranked revision without changing score API',()=>{
 assert.equal(RULES_VERSION,'graftbound-rules-1.7.0-beta');
 assert.equal(RANKED_CHALLENGES['gb-expedition-01'].revision,26);
 assert.equal(resolveCard('mtg:shock').target,'creature');
});
