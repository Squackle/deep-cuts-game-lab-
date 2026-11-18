import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import { REAL_CREATURES } from '../src/cards/real-pool.js';
import { GRAFT_TRAITS } from '../src/cards/trait-registry.js';
import { isReviewedAbilityWord, toGameCard } from '../src/cards/compatibility.js';
import { poolRecord } from '../src/cards/real-pool.js';
import { buildReferenceSet } from '../src/cards/reference-set.js';
import { resolveCard } from '../src/cards/catalog.js';
import { newEvolution, deriveStats } from '../src/engine/evolution.js';
import { createBattle, player, enemies, cast, chooseCombo, activateCombo, endTurn, BATTLE_VERSION } from '../src/engine/combat.js';
import { comboChoices, hasComboChoices, comboToken, comboActivate, comboActiveOptions, resolveComboEvents } from '../src/engine/combo-triggers.js';
import { sacrificeAlly, dealDamage, counterBlocked } from '../src/engine/abilities.js';
import { actAlly } from '../src/engine/ai.js';
import { availableMana } from '../src/engine/mana.js';
import { REAL_CREATURE_MODELS } from '../src/rendering/real-creature-models.js';
import { RANKED_CHALLENGES, RULES_VERSION, CARD_POOL_VERSION, validDecision, applyDecision, startRanked } from '../src/engine/ranked.js';
import { RUN_VERSION } from '../src/engine/run.js';
import { RUN_MIGRATIONS, createStore, memoryStorage } from '../src/engine/save.js';

const picks=[
'Soul Warden',"Ajani's Pridemate",'Mentor of the Meek','Mulldrifter','Murmuring Mystic','Nadir Kraken',
'Sea Gate Oracle','Dungeon Geists','Zulaport Cutthroat','Ayara, First of Locthwain','Reassembling Skeleton',
'Morbid Opportunist','Ophiomancer','Guttersnipe','Electrostatic Field','Goblin Rabblemaster',
'Storm-Kiln Artist',"Chandra's Spitfire",'Ivy Lane Denizen','Champion of Lambholt',
'Eternal Witness','Hornet Queen','Deep Forest Hermit'];
const spells=['shock','lightning-bolt','raise-the-alarm','revitalize','divination','pyroclasm','giant-growth','drain-life']
  .map(x=>({id:'mtg:'+x,level:1}));
const make=(names=[],{deck=true,hp=null,wide=9,foe='goblin'}={})=>{
 const evo=newEvolution();evo.absorbed=names.map((name,i)=>({cardId:resolveCard('mtg:'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''))?.id||name,index:i}));
 const stats=deriveStats(evo);
 const encounter={name:'Combo test',w:wide,h:9,terrain:Array(wide*9).fill(0),playerStart:{x:2,y:4},enemies:foe?[{defId:foe,x:wide-2,y:4}]:[]};
 return createBattle({evo,stats,spellbook:spells,seed:4096,encounter,deckMode:deck,startHp:hp});
};
const closeChoice=(s,prefer)=>{
 let seen=0;while(hasComboChoices(s)&&seen++<80){const c=comboChoices(s),v=prefer?.(c)||c.choices.find(x=>x.arg===0)||c.choices[0];assert.ok(v,`no option for ${c?.kind}`);chooseCombo(s,c.kind,v.arg);}assert.ok(seen<80,'combo queue must terminate');
};

// None of the 23 may be replaced by an unselected proxy card.
test('exactly the 23 owner-selected identities are new: 133 total real reward cards, no duplicates',()=>{
 const names=REAL_CREATURES.map(c=>c.name);assert.equal(new Set(names).size,names.length);
 assert.equal(names.length,102);assert.deepEqual(names.filter(x=>picks.includes(x)).sort(),picks.slice().sort());
 assert.equal(buildReferenceSet().rejected.length,0);assert.equal(buildReferenceSet().cards.length,133);
 for(const name of picks){const t=GRAFT_TRAITS[name];assert.ok(t&&t.id&&t.trigger&&t.note,name);}
 assert.equal(BATTLE_VERSION,11);assert.equal(RUN_VERSION,9);
 assert.equal(RANKED_CHALLENGES['gb-expedition-01'].revision,29);
 assert.equal(RULES_VERSION,'graftbound-rules-1.8.2-beta');assert.equal(CARD_POOL_VERSION,'real-pool-133-v7');
});

test('Soul Warden + Ajani + Vito: summoning heals/grows/bolts even at full health, across chained events',()=>{
 const s=make(['Soul Warden',"Ajani's Pridemate",'Vito, Thorn of the Dusk Rose']);
 closeChoice(s);const h=player(s);const p=h.power;const foe=enemies(s)[0];const before=foe.hp;
 const ev=[];comboToken(s,ev,'Squirrel',1,1);resolveComboEvents(s,ev);
 assert.ok(h.power>=p+1,'life event grants a +1/+1 counter');assert.ok(foe.hp<before,'Vito deals bonus damage from life gain');
 assert.ok(ev.some(e=>e.t==='comboLifeGain'));assert.ok(ev.some(e=>e.t==='status'&&e.status.includes('pridemate')));
});

test('Mentor of the Meek: enter 2-power ally, optional pay exactly one mana, real card draw',()=>{
 const s=make(['Mentor of the Meek']);closeChoice(s);
 const ev=[];comboToken(s,ev,'Squirrel',1,1);resolveComboEvents(s,ev);
 assert.equal(comboChoices(s)?.kind,'mentor');const before=availableMana(s),n=s.deck.hand.length;
 chooseCombo(s,'mentor',1);assert.equal(availableMana(s),before-1);assert.equal(s.deck.hand.length,n+1);
 const ev2=[];comboToken(s,ev2,'Squirrel',3,3);resolveComboEvents(s,ev2);assert.equal(hasComboChoices(s),false,'3-power ally should not trigger Mentor');
});

test('Mulldrifter and Sea Gate Oracle operate on the REAL shuffled encounter Library',()=>{
 const s=make(['Mulldrifter','Sea Gate Oracle']);
 assert.equal(s.deck.hand.length,5,'original three and Mulldrifter two');
 assert.equal(comboChoices(s)?.kind,'oracle');const top=s.deck.library.slice(0,2).map(x=>x.id),n=s.deck.hand.length;
 chooseCombo(s,'oracle',top[1]);assert.equal(s.deck.hand.length,n+1);assert.equal(s.deck.hand.at(-1).id,top[1]);
 assert.equal(s.deck.library.at(-1).id,top[0]);
});

test('Murmuring Mystic + Nadir Kraken: spellcast creates Flying Bird; draw choice pays mana and spawns distinct Tentacle',()=>{
 const s=make(['Murmuring Mystic','Nadir Kraken']);closeChoice(s);
 const ev=[];resolveComboEvents(s,[{t:'comboSpellCast',uid:player(s).uid,id:'mtg:shock'},...ev]);
 const bird=s.units.find(u=>u.traitToken==='birdIllusion');assert.ok(bird);assert.equal(bird.keywords.flying,1);
 const before=s.p.mana;
 resolveComboEvents(s,[{t:'cardDraw',id:'mtg:divination',uid:player(s).uid}]);
 assert.equal(comboChoices(s)?.kind,'nadir');chooseCombo(s,'nadir',1);
 assert.equal(s.p.mana,before-1);assert.ok(s.units.some(u=>u.traitToken==='tentacle'));
 assert.ok(player(s).comboCounters.nadir>0);
});

test('Dungeon Geists: target selection and two real skipped turns on a nonboss',()=>{
 const s=make(['Dungeon Geists']);assert.equal(comboChoices(s)?.kind,'geists');
 const foe=enemies(s)[0];chooseCombo(s,'geists',foe.uid);assert.equal(foe.statuses.stunned,2);
 closeChoice(s);endTurn(s);assert.equal(foe.statuses.stunned,1);
 endTurn(s);assert.equal(foe.statuses.stunned,0);
});

test('Zulaport + Blood Artist + Morbid: friendly sacrifice resolves multiple death effects; Morbid only once per phase',()=>{
 const s=make(['Zulaport Cutthroat','Blood Artist','Morbid Opportunist']);closeChoice(s);
 const f=enemies(s)[0];f.hp=80;f.maxHp=80;
 const ev=[];const a=comboToken(s,ev,'Squirrel');resolveComboEvents(s,ev);const hand=s.deck.hand.length;
 const death=[];sacrificeAlly(s,death,a);resolveComboEvents(s,death);
 assert.ok(death.some(e=>e.t==='graftTrigger'&&/Zulaport/.test(e.name)));
 assert.ok(death.some(e=>e.t==='graftTrigger'&&/Blood Artist/.test(e.name)));
 assert.equal(s.deck.hand.length,hand+1,'Morbid first death draws');
 const ev2=[];const b=comboToken(s,ev2,'Squirrel');resolveComboEvents(s,ev2);
 const before=s.deck.hand.length;const d=[];sacrificeAlly(s,d,b);resolveComboEvents(s,d);
 assert.equal(s.deck.hand.length,before,'Morbid second death of same turn does not draw');
});

test('Ayara + Reassembling Skeleton: black entry drains, manual sacrifice draws, paid reassembly exhausted',()=>{
 const s=make(['Ayara, First of Locthwain','Reassembling Skeleton'],{foe:'alpha'});closeChoice(s);
 const sk=s.units.find(u=>u.sourceGraft==='skeleton');assert.ok(sk);
 assert.ok(comboActiveOptions(s).some(o=>o.kind==='ayara'&&o.arg===sk.uid));
 const prior=s.deck.hand.length;activateCombo(s,'ayara',sk.uid);
 assert.equal(sk.hp,0);assert.equal(s.deck.hand.length,prior+1);
 s.p.mana=3;assert.ok(comboActiveOptions(s).some(o=>o.kind==='skeleton'));
 const mana=availableMana(s);activateCombo(s,'skeleton',0);
 assert.equal(availableMana(s),mana-2);assert.ok(s.units.some(u=>u.sourceGraft==='skeleton'&&u.hp>0&&u.tapped));
});

test('Ophiomancer checks ANY controlled Snake and creates at most one when absent, including enemy phase',()=>{
 const s=make(['Ophiomancer']);closeChoice(s);
 const initial=s.units.filter(u=>u.hp>0&&u.types?.includes('Snake'));assert.equal(initial.length,1);
 const second=[];resolveComboEvents(s,[{t:'turn',phase:'enemy',turn:1},...second]);
 assert.equal(s.units.filter(u=>u.hp>0&&u.types?.includes('Snake')).length,1);
 const ev=[];sacrificeAlly(s,ev,initial[0]);resolveComboEvents(s,ev);
 resolveComboEvents(s,[{t:'turn',phase:'enemy',turn:1}]);
 assert.equal(s.units.filter(u=>u.hp>0&&u.types?.includes('Snake')).length,1);
});

test('Guttersnipe, Electrostatic Field, Storm-Kiln Artist, Chandra: one cast creates linked damage and real Treasure',()=>{
 const s=make(['Guttersnipe','Electrostatic Field','Storm-Kiln Artist',"Chandra's Spitfire"]);closeChoice(s);
 const e=enemies(s)[0];e.hp=60;e.maxHp=60;const p=player(s);const before=p.statuses.empowered||0;
 const ev=resolveComboEvents(s,[{t:'comboSpellCast',uid:p.uid,id:'mtg:shock'}]);
 assert.equal(e.hp,57);assert.equal(s.combo.treasure,1);
 assert.equal(p.statuses.empowered,before+6,'two separate noncombat pings are two Chandra triggers');
 assert.ok(ev.some(z=>/Storm-Kiln/.test(z.name||'')));
});

test('Goblin Rabblemaster: a Goblin is created on turn start and attacking goblins grant temporary attack',()=>{
 const s=make(['Goblin Rabblemaster']);closeChoice(s);
 const gob=s.units.find(u=>u.traitToken==='goblin');assert.ok(gob);assert.equal(gob.keywords.haste,1);
 const p=player(s);const old=p.statuses.empowered||0;
 resolveComboEvents(s,[{t:'attack',uid:gob.uid,target:enemies(s)[0].uid}]);
 assert.equal(p.statuses.empowered,old+1);
});

test('Ivy Lane + Champion: green entries offer targeted counters, grow hero, and suppress weaker defenders',()=>{
 const s=make(['Ivy Lane Denizen','Champion of Lambholt']);closeChoice(s);const p=player(s),base=p.power;
 const ev=[];comboToken(s,ev,'Squirrel');resolveComboEvents(s,ev);
 assert.equal(comboChoices(s)?.kind,'ivy');chooseCombo(s,'ivy',p.uid);
 assert.ok(p.power>=base+2);assert.equal(counterBlocked(p,enemies(s)[0],true),'champion');
});

test('Eternal Witness: selected real graveyard card returns, does not become a random fake draw',()=>{
 const s=make(['Eternal Witness']);closeChoice(s);
 const c=s.deck.hand.shift();s.deck.graveyard.push(c);
 assert.ok(comboActiveOptions(s).some(o=>o.kind==='witness'&&o.arg===c.id));
 activateCombo(s,'witness',c.id);
 assert.ok(s.deck.hand.some(x=>x.id===c.id));assert.ok(!comboActiveOptions(s).some(o=>o.kind==='witness'));
});

test('Hornet Queen / Deep Forest Hermit: four distinct species models, Deathtouch, expiring Squirrel boost',()=>{
 const s=make(['Hornet Queen','Deep Forest Hermit'],{wide:13});closeChoice(s);
 const hornets=s.units.filter(u=>u.sourceGraft==='hornetQueen');const sq=s.units.filter(u=>u.sourceGraft==='hermit');
 assert.equal(hornets.length,4);assert.equal(sq.length,4);
 assert.ok(hornets.every(u=>u.keywords.flying&&u.keywords.deathtouch));
 assert.ok(sq.every(u=>u.power===2));
 s.turn=4;resolveComboEvents(s,[{t:'turn',phase:'player',turn:4}]);assert.ok(sq.every(u=>u.power===1));
 const keys=['friendlyBirdIllusion','friendlyTentacle','friendlySkeleton','friendlySnake','friendlyGoblin','friendlyHornet','friendlySquirrel'];
 assert.equal(new Set(keys.map(k=>REAL_CREATURE_MODELS[k].feature)).size,7);
 for(const k of keys)assert.ok(REAL_CREATURE_MODELS[k].custom,k);
});

test('Replay validator accepts paid choices and activated powers, rejects malformed extras',()=>{
 const d1={seq:0,type:'combo',kind:'mentor',arg:1},d2={seq:1,type:'graft',kind:'witness',arg:'mtg:shock'};
 assert.equal(validDecision(d1,0),true);assert.equal(validDecision(d2,1),true);
 assert.equal(validDecision({...d1,additional:1},0),false);
 const one=make(['Mentor of the Meek']);closeChoice(one);
 const ev=[];comboToken(one,ev,'Squirrel');resolveComboEvents(one,ev);
 const run={ranked:{seq:0,rulesVersion:RULES_VERSION},phase:'battle',battle:one};
 const copy=structuredClone(run);
 applyDecision(run,d1);applyDecision(copy,d1);
 assert.deepEqual(run,copy);assert.equal(run.ranked.seq,1);
});

test('Save migration preserves previous v8 battle and creates an additive empty combo ledger',()=>{
 const s=make([]);delete s.combo;s.v=9;
 const run={v:8,battle:s,ranked:{rulesVersion:'graftbound-rules-1.2.7-beta'}};
 RUN_MIGRATIONS[8](run);
 assert.equal(run.v,9);assert.equal(run.battle.v,10);
 assert.deepEqual(run.battle.combo,{choices:[],counters:{},actions:{},treasure:0});
 assert.ok(run.archivedRanked);assert.equal(run.ranked,undefined);
});

test('UI has accessible paid choice and active-graft controls, and real on-screen card zone remains',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/ui/battle-ui.js',import.meta.url),'utf8');
 assert.ok(html.includes('id="graftPowers"'));assert.ok(html.includes('id="gb-card-zones"'));
 assert.ok(html.indexOf('id="btn-menu"') < html.indexOf('id="graftPowers"'),'ability button is in protected top-button rail, not HUD over the player plate');
 for(const k of ['promptComboChoices','data-combo-arg','gb-combo-options','openGraftSkills','graftPowers'])assert.ok(ui.includes(k),k);
});


test('Reassembled Skeleton genuinely skips the next ally AI action, then can fight',()=>{
 const s=make(['Reassembling Skeleton'],{foe:'alpha'});closeChoice(s);
 const first=s.units.find(u=>u.sourceGraft==='skeleton');const gone=[];
 sacrificeAlly(s,gone,first);resolveComboEvents(s,gone);
 s.p.mana=3;activateCombo(s,'skeleton',0);
 const sk=s.units.find(u=>u.sourceGraft==='skeleton'&&u.hp>0);
 assert.ok(sk.tapped,'newly reassembled ally starts exhausted');
 s.phase='enemy';
 const step=[];const prev={x:sk.x,y:sk.y};
 actAlly(s,step,sk);
 assert.equal(sk.tapped,false,'exhausted flag clears after skipped action');
 assert.deepEqual({x:sk.x,y:sk.y},prev,'exhausted ally does not move');
 assert.ok(step.some(e=>e.t==='stunnedSkip'&&e.uid===sk.uid));
 const next=[];actAlly(s,next,sk);
 assert.equal(next.some(e=>e.t==='stunnedSkip'),false,'normal AI resumes next action');
});


test('Storm-Kiln Scryfall Treasure + Magecraft metadata is accurate but never granted as unsupported generic keyword',()=>{
 const c=REAL_CREATURES.find(x=>x.name==='Storm-Kiln Artist');
 assert.deepEqual(c.keywords,['Treasure','Magecraft']);
 const normalized=poolRecord(c);
 assert.equal(isReviewedAbilityWord('Storm-Kiln Artist','Treasure'),true);
 const converted=toGameCard(normalized);
 assert.equal(converted.ok,true,converted.reasons?.join('; '));
 assert.equal(converted.card.trait,'stormkiln');
 assert.deepEqual(converted.card.keywords,{});
 assert.equal(isReviewedAbilityWord('Unknown Card','Treasure'),false);
});

test('full battlefield disables paid Skeleton revival rather than spending 2 mana for nothing',()=>{
 const s=make(['Reassembling Skeleton'],{wide:7});
 closeChoice(s);
 const old=s.units.find(u=>u.sourceGraft==='skeleton'&&u.hp>0);
 sacrificeAlly(s,[],old);
 s.p.mana=3;
 assert.ok(comboActiveOptions(s).some(o=>o.kind==='skeleton'),'power available with a free tile');
 for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){
   if(s.units.some(u=>u.hp>0&&u.x===x&&u.y===y))continue;
   s.units.push({uid:s.nextUid++,side:'player',hero:false,defId:'sproutling',name:'Blocker',x,y,hp:1,
     maxHp:1,power:1,toughness:1,move:1,keywords:{},statuses:{}});
 }
 const mana=availableMana(s),actions=s.stats.actions;
 assert.ok(!comboActiveOptions(s).some(o=>o.kind==='skeleton'));
 assert.throws(()=>activateCombo(s,'skeleton',0),/not available/);
 assert.equal(availableMana(s),mana);
 assert.equal(s.stats.actions,actions);
 const blocker=s.units.find(u=>u.name==='Blocker');blocker.hp=0;
 assert.ok(comboActiveOptions(s).some(o=>o.kind==='skeleton'),'opening a tile makes revival available');
 activateCombo(s,'skeleton',0);
 assert.equal(availableMana(s),mana-2);
 assert.ok(s.units.some(u=>u.sourceGraft==='skeleton'&&u.hp>0&&u.x===blocker.x&&u.y===blocker.y));
});

test('Mentor of the Meek cannot charge mana to draw from an empty Library and Graveyard',()=>{
 const s=make(['Mentor of the Meek']);closeChoice(s);
 s.deck.library=[];s.deck.graveyard=[];
 const ev=[];comboToken(s,ev,'Squirrel');resolveComboEvents(s,ev);
 const mana=availableMana(s),actions=s.stats.actions;
 assert.equal(comboChoices(s),null,'an empty Library and Graveyard cannot justify a paid draw');
 assert.equal(hasComboChoices(s),false);
 assert.equal(availableMana(s),mana);
 assert.equal(s.stats.actions,actions);
 // A recyclable real card makes the paid option legitimate again.
 const c=s.deck.hand[0];s.deck.graveyard.push(c);
 const other=[];comboToken(s,other,'Squirrel');resolveComboEvents(s,other);
 assert.ok(comboChoices(s).choices.some(x=>x.arg===1));
});

test('rules-only maintenance patch archives legacy ranked replay without deleting local progress',()=>{
 const storage=memoryStorage(),store=createStore(storage),old=startRanked();
 old.ranked.rulesVersion='graftbound-rules-1.2.8-beta';
 old.ranked.revision=15;
 store.saveRun(old);
 const result=store.loadRun();
 assert.ok(result.run,'existing run still loads');
 assert.ok(result.migrated,'rules-only retirement persists the updated envelope');
 assert.equal(result.run.ranked,undefined);
 assert.equal(result.run.archivedRanked.rulesVersion,'graftbound-rules-1.2.8-beta');
 assert.deepEqual(result.run.map,old.map,'campaign map and progress survive');
 assert.equal(store.loadRun().run.archivedRanked.revision,15);
});
