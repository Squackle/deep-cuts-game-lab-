import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RULES_VERSION} from '../src/cards.js';
import {serializePriorityWindow,deserializePriorityWindow,classicTargetProjection,makeTypedStackEntry} from '../src/advanced-foundation.js';
import {ADVANCED_PREVIEW_VERSION,createAdvancedGame,castAdvanced,resolveAdvanced,replayAdvanced,
  projectClassicTargetId,adaptClassicStackEntry,advancedTargetOptions,ADVANCED_CARDS} from '../src/advanced-stack.js';

const examples=JSON.parse(readFileSync(new URL('../data/advanced-scenarios.json',import.meta.url),'utf8'));
const level=id=>examples.find(x=>x.id===id);
function castFirst(s,id,target){return castAdvanced(s,id,{targets:[target],chosenModes:[],xValue:0});}
test('Step 6 preview has its own version and does not alter Classic engine or the 250 scenario keys',()=>{
  assert.equal(ADVANCED_PREVIEW_VERSION,'sb-mtg-training-0.4.0-preview');
  assert.equal(RULES_VERSION,'sb-mtg-training-0.3.0');
  assert.equal(examples.length,4);
  const ids=new Set(examples.map(x=>x.id));assert.equal(ids.size,examples.length);
  assert.ok(examples.every(x=>x.version===ADVANCED_PREVIEW_VERSION&&/^sa-/.test(x.id)));
  assert.equal(ADVANCED_CARDS.Redirect.cost.U,2); // Real Redirect costs {U}{U}.
});
for(const scenario of examples)test(`${scenario.id} ${scenario.title}: valid, deterministic legal win and losing no-response line`,()=>{
  const frozen=structuredClone(scenario);
  const result=replayAdvanced(scenario,scenario.solution);
  assert.equal(result.status,'won',result.log.join(' | '));
  assert.deepEqual(replayAdvanced(scenario,scenario.solution),result);
  assert.deepEqual(scenario,frozen,'source must remain immutable');
  let noResponse=createAdvancedGame(scenario);
  while(noResponse.status==='playing')noResponse=resolveAdvanced(noResponse);
  assert.equal(noResponse.status,'lost','the original threat/uncopied Abrade alone should not win');
});
test('Twincast creates a spell controlled by its caster and does not cast that copy',()=>{
  let s=castFirst(createAdvancedGame(level('sa-002')),'twincast','bolt');
  assert.equal(s.events.filter(e=>e.type==='spell.cast').length,1);
  s=resolveAdvanced(s,{newTargets:['opponent']});
  assert.equal(s.stack.length,2);
  const copied=s.stack.at(-1),original=s.stack[0];
  assert.equal(copied.kind,'copy');assert.equal(copied.isCast,false);
  assert.equal(copied.controller,'player');assert.equal(copied.copiedFromId,'bolt');
  assert.equal(copied.cardId,'Lightning Bolt');assert.deepEqual(copied.targets,['opponent']);
  assert.deepEqual(original.targets,['player']);
  assert.deepEqual(s.events.filter(e=>e.type==='spell.cast').map(e=>e.subjectId),['twincast']);
  assert.equal(s.events.filter(e=>e.type==='spell.copied').length,1);
  s=resolveAdvanced(s);assert.equal(s.status,'won');
  assert.equal(s.life.player,3);assert.equal(s.life.opponent,0);
});
test('Copy inherits mode and initial targets; cannot choose another Abrade mode or spend mana for the copy',()=>{
  let s=castFirst(createAdvancedGame(level('sa-004')),'twincast','abrade');
  const before=structuredClone(s);
  assert.throws(()=>resolveAdvanced(s,{newTargets:['relic-two'],newModes:['creature']}),/Unsupported resolution choice/);
  assert.deepEqual(s,before);
  s=resolveAdvanced(s,{newTargets:['relic-two']});
  const duplicate=s.stack.at(-1);
  assert.deepEqual(duplicate.chosenModes,['artifact']);
  assert.deepEqual(duplicate.targets,['relic-two']);
  assert.equal(duplicate.isCast,false);
  assert.deepEqual(s.stack[0].chosenModes,['artifact']);
  s=resolveAdvanced(s);assert.equal(s.permanents.find(p=>p.id==='relic-two').zone,'graveyard');
  s=resolveAdvanced(s);assert.equal(s.status,'won');
  assert.equal(s.permanents.find(p=>p.id==='relic-one').zone,'graveyard');
});
test('Redirect can change two targets at once; duplicate Arc Trail target is illegal',()=>{
  let s=castFirst(createAdvancedGame(level('sa-003')),'redirect','trail');
  const before=structuredClone(s);
  assert.throws(()=>resolveAdvanced(s,{newTargets:['opponent','opponent']}),/Illegal replacement targets/);
  assert.deepEqual(s,before,'illegal retarget must be atomic');
  s=resolveAdvanced(s,{newTargets:['opponent','enemy']});
  assert.deepEqual(s.stack[0].targets,['opponent','enemy']);
  assert.equal(s.events.filter(e=>e.type==='spell.targets.changed').length,1);
  s=resolveAdvanced(s);assert.equal(s.status,'won');
});
test('Arc Trail target swaps validate the final set rather than intermediate duplicate positions',()=>{
  let s=castFirst(createAdvancedGame(level('sa-003')),'redirect','trail');
  s=resolveAdvanced(s,{newTargets:['ally','player']});
  assert.deepEqual(s.stack[0].targets,['ally','player']);
});
test('Changed targets must be legal for the spell controller, not the player casting Redirect',()=>{
  const x=structuredClone(level('sa-001'));
  x.permanents.push({id:'enemy-warded',type:'creature',cardId:'Grizzly Bears',controller:'opponent',
    zone:'battlefield',toughness:2,damage:0,hexproof:true});
  x.permanents.push({id:'ally-warded',type:'creature',cardId:'Grizzly Bears',controller:'player',
    zone:'battlefield',toughness:2,damage:0,hexproof:true});
  const s=castFirst(createAdvancedGame(x),'redirect','bolt');
  assert.throws(()=>resolveAdvanced(s,{newTargets:['ally-warded']}),/Illegal replacement targets/);
  const changed=resolveAdvanced(s,{newTargets:['enemy-warded']});
  assert.deepEqual(changed.stack[0].targets,['enemy-warded']);
  // Redirect was controlled by player; Bolt was controlled by opponent.
  assert.equal(changed.stack[0].controller,'opponent');
});
test('Twincast cannot copy a creature spell; Redirect can target a spell on the stack',()=>{
  const x=structuredClone(level('sa-002'));
  x.stack[0]={id:'bearspell',kind:'spell',cardId:'Grizzly Bears',controller:'opponent',
    sourceId:null,isCast:true,chosenModes:[],targets:[],xValue:0,choices:{},originActionIndex:0};
  assert.throws(()=>castFirst(createAdvancedGame(x),'twincast','bearspell'),/Illegal spell target/);
  x.hand[0]={id:'redirect',cardId:'Redirect'};
  const s=castFirst(createAdvancedGame(x),'redirect','bearspell');
  const after=resolveAdvanced(s);
  assert.equal(after.stack[0].cardId,'Grizzly Bears');
});
test('A spell copy on the stack can be countered without becoming a physical card',()=>{
  let s=castFirst(createAdvancedGame(level('sa-002')),'twincast','bolt');
  s=resolveAdvanced(s,{newTargets:['opponent']});
  const copiedId=s.stack.at(-1).id;
  s.hand.push({id:'answer',cardId:'Counterspell'});s.mana.U=2;
  s=castFirst(s,'answer',copiedId);
  s=resolveAdvanced(s);
  assert.equal(s.stack.some(x=>x.id===copiedId),false);
  assert.equal(s.stack.length,1);assert.equal(s.stack[0].id,'bolt');
  assert.deepEqual(s.events.filter(x=>x.type==='spell.countered').map(x=>x.wasCopy),[true]);
});
test('Changed targets validate hexproof for the copy controller, not the original controller',()=>{
  const x=structuredClone(level('sa-002'));
  x.permanents.push({id:'enemy-warded',type:'creature',cardId:'Grizzly Bears',controller:'opponent',
    zone:'battlefield',toughness:2,damage:0,hexproof:true});
  const s=castFirst(createAdvancedGame(x),'twincast','bolt');
  assert.throws(()=>resolveAdvanced(s,{newTargets:['enemy-warded']}),/Illegal replacement targets/);
  const a=resolveAdvanced(s);assert.deepEqual(a.stack.at(-1).targets,['player']);
  assert.equal(a.stack.at(-1).controller,'player');
});
test('No-copy and fizzle events must not become cast/resolved mastery evidence',()=>{
  let s=castFirst(createAdvancedGame(level('sa-002')),'twincast','bolt');
  s=resolveAdvanced(s);
  assert.equal(s.events.filter(x=>x.type==='spell.cast').length,1);
  assert.equal(s.events.filter(x=>x.type==='spell.copied').length,1);
  s=resolveAdvanced(s);
  assert.equal(s.status,'lost');
  assert.equal(s.events.filter(x=>x.type==='spell.cast').length,1);
});
test('Replay rejects injected impossible actions and overlong records',()=>{
  assert.throws(()=>replayAdvanced(level('sa-002'),[{action:'whatever'}]),/Unknown replay action/);
  assert.throws(()=>replayAdvanced(level('sa-002'),Array(81).fill({action:'resolve'})),/Replay length limit/);
  assert.throws(()=>castFirst(createAdvancedGame(level('sa-002')),'twincast','missing'),/Illegal spell target/);
  assert.throws(()=>resolveAdvanced(createAdvancedGame(level('sa-002')),{newTargets:['opponent']}),/cannot change targets/);
});
test('Classic targetId compatibility is a projection, never writable advanced target state',()=>{
  const old={id:'oldbolt',card:'Lightning Bolt',controller:'opponent',spell:true,targetId:'player'};
  const modern=adaptClassicStackEntry(old);
  assert.deepEqual(modern.targets,['player']);assert.equal(projectClassicTargetId(modern),'player');
  assert.equal(projectClassicTargetId({...modern,targets:['player','opponent']}),null);
  assert.equal(old.targetId,'player');
});
test('Mode and target cards have distinct, per-slot legal targets',()=>{
  const s=createAdvancedGame(level('sa-004'));
  const abrade={id:'preview',cardId:'Abrade',controller:'player',chosenModes:['artifact']};
  assert.deepEqual(advancedTargetOptions(s,abrade,0).sort(),['relic-one','relic-two']);
  assert.throws(()=>advancedTargetOptions(s,{...abrade,chosenModes:['nope']},0),/valid mode/);
});

test('Step 6 genuinely uses the Step 5 priority window, resetting passes after cast',()=>{
 const origin=createAdvancedGame(level('sa-002'));
 assert.deepEqual(origin.priority.passedBy,['opponent']);
 assert.equal(origin.priority.currentActor,'player');
 assert.equal(origin.priority.stack.length,origin.stack.length);
 const responding=castAdvanced(origin,'twincast',{targets:['bolt']});
 assert.deepEqual(responding.priority.passedBy,[]);
 assert.equal(responding.priority.currentActor,'player','caster retains priority');
 assert.deepEqual(responding.priority.stack.map(x=>x.id),responding.stack.map(x=>x.id));
 assert.equal(responding.priority.lastEvents.at(-1).type,'spell.cast');
 assert.equal(responding.priority.lastEvents.at(-1).subjectId,'twincast');
 const resolved=resolveAdvanced(responding,{newTargets:['opponent']});
 assert.equal(resolved.priority.currentActor,'player');
 assert.deepEqual(resolved.priority.passedBy,['opponent'],'scripted opponent passed after resolution');
 assert.deepEqual(resolved.priority.stack.map(x=>x.id),resolved.stack.map(x=>x.id));
 assert.equal(resolved.stack.at(-1).kind,'copy');
 assert.equal(resolved.priority.stack.at(-1).isCast,false);
 assert.equal(resolved.events.filter(e=>e.type==='spell.cast').length,1);
 assert.equal(resolved.events.filter(e=>e.type==='spell.copied').length,1);
 const copyResolved=resolveAdvanced(resolved);
 assert.equal(copyResolved.status,'won');
 assert.deepEqual(copyResolved.priority.stack.map(x=>x.id),copyResolved.stack.map(x=>x.id));
 assert.deepEqual(origin.priority.stack.map(x=>x.id),['bolt'],'transitions are immutable');
});
test('Advanced priority snapshots round-trip canonically and reject mismatched rules versions',()=>{
 const state=castAdvanced(createAdvancedGame(level('sa-002')),'twincast',{targets:['bolt']});
 const serialized=serializePriorityWindow(state.priority);
 const restored=deserializePriorityWindow(serialized);
 assert.deepEqual(restored,state.priority);
 assert.equal(serializePriorityWindow(restored),serialized);
 assert.equal(restored.rulesVersion,ADVANCED_PREVIEW_VERSION);
 assert.throws(()=>deserializePriorityWindow(serialized.replaceAll('sb-mtg-training-0.4.0-preview','sb-mtg-training-0.3.0')),/Wrong advanced rules version/);
});
test('Twincast controller legality stays bound to copied spell, not original controller',()=>{
 const original=createAdvancedGame(level('sa-002'));
 const before=original.stack[0];
 const normalized=makeTypedStackEntry(before);
 assert.deepEqual(normalized.targets,['player']);
 assert.equal(classicTargetProjection(normalized),'player');
 let s=castAdvanced(original,'twincast',{targets:['bolt']});
 s=resolveAdvanced(s,{newTargets:['opponent']});
 assert.equal(s.stack[0].controller,'opponent');
 assert.equal(s.stack[1].controller,'player');
 assert.equal(s.stack[1].isCast,false);
 assert.equal(s.stack[1].copiedFromId,'bolt');
});
test('The live advanced case page exists without writing Classic or Daily saves',()=>{
 const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const ui=read('advanced/play.js'),html=read('advanced/index.html');
 assert.ok(ui.includes("import cases from '../data/advanced-scenarios.json'"));
 assert.ok(ui.includes('resolveAdvanced'));
 assert.ok(ui.includes('createAdvancedGame'));
 assert.ok(html.includes('LOCAL / UNVERIFIED'));
 assert.ok(!ui.includes('dc-stackbreaker-progress-v3'));
 assert.ok(!ui.includes('dc-stackbreaker-daily-local-v1'));
 assert.ok(html.includes('id="resolveButton"'));
 assert.ok(read('src/advanced-stack.js').includes("from './advanced-foundation.js'"));
});
