import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {generateStages} from '../src/galaxies.js';
import {commanderScenario} from '../src/commander.js';
import {validateScenario} from '../src/engine.js';
import {RULES_VERSION} from '../src/cards.js';
import {serializePriorityWindow,deserializePriorityWindow,makeTypedStackEntry} from '../src/advanced-foundation.js';
import {WARD_RULES_VERSION,WARD_CARDS,createWardGame,castWard,resolveWard,
 beginWardUpkeep,replayWard,canPayWard,wardTargetOptions} from '../src/trigger-ward.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const cases=JSON.parse(read('data/ward-scenarios.json'));
const scene=id=>structuredClone(cases.find(x=>x.id===id));
const event=(s,type)=>s.events.filter(x=>x.type===type);
test('All 6 authored Step 7 solutions genuinely win through deterministic replay',()=>{
 assert.equal(cases.length,6);assert.equal(new Set(cases.map(x=>x.id)).size,6);
 for(const c of cases){
  assert.equal(c.version,WARD_RULES_VERSION);
  const original=structuredClone(c);
  const s=replayWard(c,c.solution);
  assert.equal(s.status,'won',c.id);
  assert.deepEqual(replayWard(c,c.solution),s,c.id);
  assert.deepEqual(c,original,'Replay must not mutate starting scenario');
  assert.deepEqual(s.priority.stack.map(x=>x.id),s.stack.map(x=>x.id),c.id);
  assert.ok(s.history.length>0);
 }
});
test('Ward triggers as a non-targeting ability ABOVE the legal targeted Bolt',()=>{
 let s=createWardGame(scene('tw-001'));
 s=castWard(s,'bolt',{targets:['aerialist']});
 assert.deepEqual(s.stack.map(x=>x.kind),['spell','trigger']);
 assert.deepEqual(s.stack.map(x=>x.id),['bolt','trigger-1']);
 assert.equal(s.stack[1].isCast,false);
 assert.deepEqual(s.stack[1].targets,[]);
 assert.equal(s.stack[1].sourceId,'aerialist');
 assert.equal(s.stack[1].controller,'opponent');
 assert.equal(s.priority.currentActor,'player');
 assert.deepEqual(s.priority.passedBy,[]);
 assert.equal(event(s,'spell.cast').length,1);
 assert.equal(event(s,'trigger.created').length,1);
 assert.equal(event(s,'ward.triggered').length,1);
 assert.equal(canPayWard(s,{generic:2}),true);
 assert.deepEqual(wardTargetOptions(createWardGame(scene('tw-001')),
   {cardId:'Lightning Bolt',controller:'player'},0),['player','opponent','aerialist']);
});
test('Paying ward is optional at resolution, costs two mana, and preserves the spell',()=>{
 let s=castWard(createWardGame(scene('tw-001')),'bolt',{targets:['aerialist']});
 s=resolveWard(s,{payWard:true});
 assert.equal(s.status,'playing');
 assert.deepEqual(s.stack.map(x=>x.id),['bolt']);
 assert.equal(s.mana.player.C,0);
 assert.equal(event(s,'ward.paid').length,1);
 assert.equal(event(s,'ward.countered').length,0);
 s=resolveWard(s);
 assert.equal(s.status,'won');
 assert.equal(s.permanents[0].zone,'graveyard');
});
test('Refusing ward counters the original spell, not the creature or its target',()=>{
 let s=castWard(createWardGame(scene('tw-001')),'bolt',{targets:['aerialist']});
 s=resolveWard(s,{payWard:false});
 assert.equal(s.status,'lost');
 assert.equal(s.permanents[0].zone,'battlefield');
 assert.equal(event(s,'spell.countered')[0].subjectId,'bolt');
 assert.equal(event(s,'ward.countered').length,1);
 assert.equal(event(s,'spell.resolved').length,0);
});
test('Stifle counters ward ability (never the spell); no ward mana required',()=>{
 let s=castWard(createWardGame(scene('tw-002')),'bolt',{targets:['aerialist']});
 assert.deepEqual(wardTargetOptions(s,{cardId:'Stifle',controller:'player'},0),['trigger-1']);
 assert.throws(()=>castWard(s,'stifle',{targets:['bolt']}),/Illegal spell target/);
 s=castWard(s,'stifle',{targets:['trigger-1']});
 assert.deepEqual(s.stack.map(x=>x.id),['bolt','trigger-1','stifle']);
 s=resolveWard(s);
 assert.equal(event(s,'trigger.countered').length,1);
 assert.equal(s.stack.length,1);
 s=resolveWard(s);
 assert.equal(s.status,'won');assert.equal(event(s,'ward.paid').length,0);
});
test('Cannot pay ward when mana is inadequate, even after targeting legally',()=>{
 let s=castWard(createWardGame(scene('tw-002')),'bolt',{targets:['aerialist']});
 const before=structuredClone(s);
 assert.equal(canPayWard(s,{generic:2}),false);
 assert.throws(()=>resolveWard(s,{payWard:true}),/Cannot pay/);
 assert.deepEqual(s,before,'An impossible payment cannot partially mutate state');
 s=resolveWard(s);
 assert.equal(s.status,'lost');
});
test('Ward on your own creature triggers when opponent targets it, not friendly targeting',()=>{
 const s=createWardGame(scene('tw-003'));
 assert.equal(s.stack.at(-1).kind,'trigger');
 assert.equal(s.stack.at(-1).controller,'player');
 assert.deepEqual(s.stack.at(-1).targets,[]);
 const done=resolveWard(s);
 assert.equal(done.status,'won');assert.equal(done.life.player,2);
 assert.equal(event(done,'ward.countered')[0].subjectId,'bolt');
 const friendly=scene('tw-001');
 friendly.permanents[0].controller='player';
 friendly.hand[0].controller='player';
 let own=castWard(createWardGame(friendly),'bolt',{targets:['aerialist']});
 assert.equal(own.stack.length,1);
 assert.equal(event(own,'ward.triggered').length,0);
});
test('Ward retains source last-known information if ward permanent leaves battlefield',()=>{
 let s=createWardGame(scene('tw-004'));
 assert.equal(s.stack.at(-1).choices.sourceLki.cardId,'Waterfall Aerialist');
 const t=s.stack.at(-1).id;
 s=castWard(s,'edict',{targets:['opponent']});
 s=resolveWard(s);
 assert.equal(s.permanents[0].zone,'graveyard');
 assert.equal(s.stack.at(-1).id,t,'Trigger still exists after source leaves');
 s=resolveWard(s);
 assert.equal(s.status,'won');
 assert.equal(event(s,'ward.countered')[0].subjectId,'bolt');
 assert.equal(event(s,'permanent.sacrificed').length,1);
});
test('APNAP: active player stacks triggers first, nonactive triggers resolve first',()=>{
 let s=castWard(createWardGame(scene('tw-005')),'alarm',{targets:[]});
 s=resolveWard(s);
 assert.equal(s.stack.length,6);
 assert.deepEqual(s.stack.map(x=>x.controller),[
 'opponent','opponent','player','player','player','player']);
 assert.equal(event(s,'trigger.created').length,6);
 assert.equal(event(s,'creature.entered').length,2);
 assert.equal(s.stack[0].cardId,'Soul Warden');
 assert.equal(s.stack.at(-1).cardId,'Impact Tremors');
 const after=resolveWard(s);
 assert.equal(after.life.opponent,1,'Player-owned Impact Tremors on top resolves first');
});
test('A controller may choose an explicit ordering for simultaneous own triggers',()=>{
 let s=castWard(createWardGame(scene('tw-005')),'alarm',{targets:[]});
 s=resolveWard(s,{triggerOrder:{
  opponent:['trigger-5','trigger-2'],
  player:['trigger-6','trigger-4','trigger-3','trigger-1']
 }});
 assert.deepEqual(s.stack.map(x=>x.id),[
  'trigger-5','trigger-2','trigger-6','trigger-4','trigger-3','trigger-1']);
 const before=castWard(createWardGame(scene('tw-005')),'alarm',{targets:[]});
 assert.throws(()=>resolveWard(before,{triggerOrder:{player:['trigger-1']}}),/Illegal owner trigger ordering/);
 assert.deepEqual(before.stack.map(x=>x.id),['alarm'],'Atomic rejection');
});
test('Test of Endurance uses an intervening-if at trigger creation AND resolution',()=>{
 const initial=scene('tw-006');
 const tooLow=structuredClone(initial);tooLow.life.player=49;
 const noTrigger=beginWardUpkeep(createWardGame(tooLow),'player');
 assert.equal(noTrigger.stack.length,0);
 let s=beginWardUpkeep(createWardGame(initial),'player');
 assert.equal(s.stack.at(-1).kind,'trigger');
 assert.equal(s.stack.at(-1).choices.effect,'test-endurance');
 const changed=structuredClone(s);
 changed.life.player=49; // models a life-loss response while trigger is stacked
 const failed=resolveWard(changed);
 assert.equal(event(failed,'intervening-if.failed').length,1);
 assert.equal(failed.status,'lost');
 const success=resolveWard(s);
 assert.equal(success.status,'won');
 assert.equal(event(success,'intervening-if.succeeded').length,1);
});
test('Priority snapshots are versioned, deterministic and retain triggered objects',()=>{
 const s=castWard(createWardGame(scene('tw-001')),'bolt',{targets:['aerialist']});
 const serial=serializePriorityWindow(s.priority);
 assert.deepEqual(deserializePriorityWindow(serial),s.priority);
 assert.equal(serializePriorityWindow(deserializePriorityWindow(serial)),serial);
 assert.equal(makeTypedStackEntry(s.stack.at(-1)).kind,'trigger');
 assert.equal(s.priority.stack.at(-1).isCast,false);
});
test('Bad targets, bogus spells and bad replay decisions fail without mutations',()=>{
 const s=createWardGame(scene('tw-002'));const original=structuredClone(s);
 assert.throws(()=>castWard(s,'bolt',{targets:['missing']}),/Illegal spell target/);
 assert.throws(()=>castWard(s,'missing',{targets:[]}),/Card not in hand/);
 assert.throws(()=>castWard(s,'stifle',{targets:['aerialist']}),/Illegal spell target/);
 assert.throws(()=>resolveWard(s),/Nothing to resolve/);
 assert.deepEqual(s,original);
 assert.throws(()=>replayWard(scene('tw-001'),[{action:'hack'}]),/Unsupported ward replay/);
 assert.throws(()=>replayWard(scene('tw-001'),Array(101).fill({action:'resolve'})),/Replay length cap/);
});
test('Old 250 Classic puzzles, versions, saves and Step 6 copy route remain separate',()=>{
 const classic=[...JSON.parse(read('data/scenarios.json')),...JSON.parse(read('data/campaign-expansion.json'))];
 const full=[...classic,...generateStages(classic)].map((c,i)=>commanderScenario(c,i));
 assert.equal(full.length,250);
 assert.equal(new Set(full.map(x=>x.id)).size,250);
 assert.equal(RULES_VERSION,'sb-mtg-training-0.3.0');
 for(const c of full)assert.deepEqual(validateScenario(c),{valid:true,errors:[]},c.id);
 assert.equal(read('src/advanced-stack.js').includes("from './advanced-foundation.js'"),true);
 assert.equal(read('src/trigger-ward.js').includes('dc-stackbreaker-progress-v3'),false);
 assert.equal(read('src/trigger-ward.js').includes('localStorage'),false);
});
test('Standalone local-only Step 7 UI compiles and declares no account or local save writes',()=>{
 const ui=read('ward/play.js'),html=read('ward/index.html');
 assert.ok(ui.includes("from '../src/trigger-ward.js'"));
 assert.ok(ui.includes("import cases from '../data/ward-scenarios.json'"));
 assert.ok(html.includes('LOCAL / UNVERIFIED'));
 assert.ok(!ui.includes('localStorage'));
 assert.ok(!ui.includes('fetch('));
 assert.ok(!ui.includes('dc-stackbreaker-progress-v3'));
 assert.ok(html.includes('id="resolveButton"'));
 assert.doesNotThrow(()=>execFileSync(process.execPath,['--check',new URL('../ward/play.js',import.meta.url).pathname],{stdio:'pipe'}));
});
