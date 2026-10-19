import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateStages} from '../src/galaxies.js';
import {commanderScenario} from '../src/commander.js';
import {validateScenario,createGame,autoplay} from '../src/engine.js';
import {RULES_VERSION} from '../src/cards.js';
import {
  ADVANCED_RULES_PREVIEW,STACK_SCHEMA_VERSION,MAX_PRIORITY_ACTIONS,MAX_STACK_OBJECTS,
  makeTypedStackEntry,fromClassicStackEntry,fromClassicScenario,classicTargetProjection,
  validateModeAndTargets,createPriorityWindow,putStackObject,passPriority,
  replayPriorityWindow,serializePriorityWindow,deserializePriorityWindow,canonicalStackJson
} from '../src/advanced-foundation.js';
const j=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const classic=[...j('data/scenarios.json'),...j('data/campaign-expansion.json')];
const all=[...classic,...generateStages(classic)].map((p,i)=>commanderScenario(p,i));
const mk=(id='one',controller='player')=>({id,kind:'spell',cardId:'Lightning Bolt',
  controller,isCast:true,chosenModes:[],targets:['player'],originActionIndex:0});
test('Step 5 is a new isolated preview: Classic 0.3 and 250 IDs stay intact',()=>{
 assert.equal(RULES_VERSION,'sb-mtg-training-0.3.0');
 assert.equal(ADVANCED_RULES_PREVIEW,'sb-mtg-training-0.4.0-preview');
 assert.equal(all.length,250);
 assert.equal(all[0].id,'sb-01');assert.equal(all.at(-1).id,'sg-250');
 assert.equal(new Set(all.map(s=>s.id)).size,250);
 for(const caseFile of all){
   assert.equal(caseFile.version,RULES_VERSION);
   assert.deepEqual(validateScenario(caseFile),{valid:true,errors:[]},caseFile.id);
 }
 assert.equal(autoplay(createGame(all[0])).status,'lost');
 assert.match(readFileSync(new URL('../src/ui.js',import.meta.url),'utf8'),/dc-stackbreaker-progress-v3/);
 assert.match(readFileSync(new URL('../src/daily.js',import.meta.url),'utf8'),/dc-stackbreaker-daily-local-v1/);
});
test('Every original Classic stack entry converts without mutating Classic or introducing targetId fields',()=>{
 for(const s of all){
   const old=structuredClone(s.stack);
   const modern=fromClassicScenario(s);
   assert.equal(modern.length,s.stack.length);
   for(let n=0;n<modern.length;n++){
     assert.equal(modern[n].id,old[n].id);
     assert.equal(modern[n].cardId,old[n].card);
     assert.equal(modern[n].controller,old[n].controller);
     assert.equal(modern[n].isCast,old[n].spell!==false);
     assert.deepEqual(modern[n].chosenModes,[]);
     assert.equal(classicTargetProjection(modern[n]),old[n].targetId??null);
     assert.equal(Object.hasOwn(modern[n],'targetId'),false);
   }
   assert.deepEqual(s.stack,old);
 }
});
test('Explicit typed kinds never mistake an ability, trigger or copy for a cast',()=>{
 for(const kind of ['ability','trigger','copy']){
   const item=makeTypedStackEntry({...mk(kind),kind,isCast:false});
   assert.equal(item.isCast,false);assert.equal(item.kind,kind);
   assert.throws(()=>makeTypedStackEntry({...item,isCast:true}),/Cast and noncast/);
 }
 assert.throws(()=>makeTypedStackEntry({...mk(),isCast:false}),/Cast and noncast/);
 assert.throws(()=>makeTypedStackEntry({...mk(),targetId:'player'}),/compatibility projection/);
 assert.throws(()=>makeTypedStackEntry({...mk(),targets:['player',{}]}),/Invalid target/);
 assert.throws(()=>makeTypedStackEntry({...mk(),choices:{nested:{bad:Infinity}}}),/Nonfinite/);
});
test('Multiple independent targets and a modal choice can be normalized and validated',()=>{
 const card={modes:{
   creature:{targetSlots:['creature']},
   artifacts:{targetSlots:['artifact','artifact']}
 },distinctSlotGroups:[[0,1]]};
 const allowed=(slot,id)=>slot==='creature'?id==='creature-one':
   id==='sol-ring'||id==='arcane-signet';
 const chosen=validateModeAndTargets(card,{chosenModes:['artifacts'],
   targets:['sol-ring','arcane-signet']},allowed);
 assert.deepEqual(chosen,{chosenModes:['artifacts'],targets:['sol-ring','arcane-signet']});
 assert.throws(()=>validateModeAndTargets(card,{chosenModes:['artifacts'],
   targets:['sol-ring','sol-ring']},allowed),/must differ/);
 assert.throws(()=>validateModeAndTargets(card,{chosenModes:['artifacts'],
   targets:['sol-ring','creature-one']},allowed),/Illegal spell target/);
 assert.throws(()=>validateModeAndTargets(card,{chosenModes:['creature'],targets:['creature-one','sol-ring']},allowed),/Wrong number/);
 assert.throws(()=>validateModeAndTargets(card,{chosenModes:['bogus'],targets:[]},allowed),/Unknown or missing/);
 assert.throws(()=>validateModeAndTargets(card,{chosenModes:['creature'],targets:['player']},allowed),/Illegal spell target/);
});
test('Simple nonmodal multi-target card does not require a fake mode',()=>{
 const card={targetSlots:['any','creature']};
 assert.deepEqual(validateModeAndTargets(card,{targets:['opponent','creature-one']},
  (slot,id)=>slot==='any'&&id==='opponent'||slot==='creature'&&id==='creature-one'),
  {chosenModes:[],targets:['opponent','creature-one']});
 assert.throws(()=>validateModeAndTargets(card,{chosenModes:['red'],targets:['opponent','creature-one']},()=>true),/Modes are not available/);
});
test('The player retains priority after casting; one pass hands priority to opponent',()=>{
 let s=createPriorityWindow({activeActor:'opponent',currentActor:'player',stack:[mk('original','opponent')],passedBy:['opponent']});
 const original=structuredClone(s);
 s=putStackObject(s,'player',mk('response'));
 assert.equal(s.currentActor,'player');assert.deepEqual(s.passedBy,[]);
 assert.deepEqual(s.stack.map(x=>x.id),['original','response']);
 assert.equal(s.lastEvents[0].type,'spell.cast');assert.equal(s.step,1);
 assert.deepEqual(original.stack.map(x=>x.id),['original']);
 const step=passPriority(s,'player');
 assert.equal(step.outcome.type,'awaiting-opponent');
 assert.equal(step.state.currentActor,'opponent');
 assert.deepEqual(step.state.passedBy,['player']);
 assert.equal(step.state.stack.length,2);
});
test('Only two consecutive passes resolve the TOP object, then active player has priority',()=>{
 let s=createPriorityWindow({activeActor:'opponent',currentActor:'player',stack:[mk('original','opponent'),mk('answer')]});
 const p1=passPriority(s,'player');s=p1.state;
 const p2=passPriority(s,'opponent');s=p2.state;
 assert.equal(p2.outcome.type,'resolve-top');assert.equal(p2.outcome.item.id,'answer');
 assert.deepEqual(s.stack.map(x=>x.id),['original']);
 assert.equal(s.currentActor,'opponent');assert.deepEqual(s.passedBy,[]);
 assert.equal(s.status,'playing');
 assert.equal(passPriority(s,'opponent').state.currentActor,'player');
 assert.throws(()=>passPriority(s,'player'),/does not have priority/);
});
test('The next two passes end a window only when stack is empty',()=>{
 let s=createPriorityWindow({activeActor:'opponent',currentActor:'opponent',stack:[]});
 s=passPriority(s,'opponent').state;
 const result=passPriority(s,'player');
 assert.equal(result.outcome.type,'window-ended');
 assert.equal(result.state.status,'ended');
 assert.throws(()=>passPriority(result.state,'opponent'),/already ended/);
});
test('First cast following a pass clears the pass chain and rejects illegal controllers',()=>{
 let s=createPriorityWindow({activeActor:'opponent',currentActor:'player',stack:[mk('original','opponent')],passedBy:['opponent']});
 assert.throws(()=>putStackObject(s,'player',mk('bad','opponent')),/Only the controller/);
 assert.throws(()=>putStackObject(s,'opponent',mk('also-bad','opponent')),/does not have priority/);
 s=putStackObject(s,'player',mk('yes'));
 assert.deepEqual(s.passedBy,[]);
 assert.throws(()=>putStackObject(s,'player',mk('yes')),/Duplicate/);
});
test('Stable serialization survives shuffled object keys and round-trip, without claiming proof',()=>{
 const seed=createPriorityWindow({stack:[makeTypedStackEntry({...mk(),choices:{z:2,a:{y:1,x:2}}})]});
 const txt=serializePriorityWindow(seed);
 assert.deepEqual(deserializePriorityWindow(txt),seed);
 assert.equal(serializePriorityWindow(deserializePriorityWindow(txt)),txt);
 assert.equal(canonicalStackJson({a:2,z:{y:2,x:1}}),canonicalStackJson({z:{x:1,y:2},a:2}));
 assert.throws(()=>deserializePriorityWindow(JSON.stringify({...seed,rulesVersion:'sb-mtg-training-0.3.0'})),/Wrong advanced rules version/);
 assert.throws(()=>deserializePriorityWindow(JSON.stringify({...seed,injectedProof:true})),/Unknown window fields/);
 assert.throws(()=>deserializePriorityWindow(JSON.stringify({...seed,stack:[{...seed.stack[0],targetId:'player'}]})),/compatibility projection/);
 assert.throws(()=>deserializePriorityWindow('{broken'),/Invalid serialized JSON/);
});
test('Deterministic explicit action replay has no browser or VFX dependencies',()=>{
 const seed={activeActor:'opponent',currentActor:'player',
  stack:[mk('original','opponent')],passedBy:['opponent']};
 const actions=[
  {type:'put',actor:'player',entry:mk('answer')},
  {type:'pass',actor:'player'},
  {type:'pass',actor:'opponent'},
  {type:'pass',actor:'opponent'},
  {type:'pass',actor:'player'},
  {type:'pass',actor:'opponent'},
  {type:'pass',actor:'player'}
 ];
 const one=replayPriorityWindow(seed,actions),two=replayPriorityWindow(seed,actions);
 assert.deepEqual(one,two);
 assert.deepEqual(one.outcomes.map(x=>x.type),['added','awaiting-opponent','resolve-top','awaiting-opponent','resolve-top','awaiting-opponent','window-ended']);
 assert.equal(one.state.status,'ended');
 assert.equal(one.state.stack.length,0);
 assert.throws(()=>replayPriorityWindow(seed,[{type:'summon-free'}]),/Unknown priority action/);
 assert.throws(()=>replayPriorityWindow(seed,Array(MAX_PRIORITY_ACTIONS+1).fill({type:'pass',actor:'player'})),/Invalid replay length/);
});
test('Safety caps and stale object ids fail closed',()=>{
 assert.equal(STACK_SCHEMA_VERSION,1);
 assert.throws(()=>createPriorityWindow({stack:[mk('dupe'),mk('dupe')]}),/Duplicate stack/);
 assert.throws(()=>createPriorityWindow({stack:Array.from({length:MAX_STACK_OBJECTS+1},(_,i)=>mk('card-'+i))}),/Stack size limit/);
 assert.throws(()=>createPriorityWindow({currentActor:'player',passedBy:['player']}),/Invalid pass order/);
 const malformed=makeTypedStackEntry({...mk(),choices:{ok:true}});
 assert.equal(malformed.choices.ok,true);
 assert.throws(()=>makeTypedStackEntry({...mk(),choices:{bad:()=>{}}}),/Only plain JSON/);
});
