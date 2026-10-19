import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,pass,activate,tapLand} from '../src/engine.js';
import {generateStages} from '../src/galaxies.js';
import {commanderScenario} from '../src/commander.js';
import core from '../data/scenarios.json' with {type:'json'};
import expansion from '../data/campaign-expansion.json' with {type:'json'};
import {
 MASTERY_CATALOG,MASTERY_STORAGE_KEY,emptyMasteryRun,emptyMasteryLedger,
 observeMasteryTransition,appendMasteryTransition,markMasteryRunUnclean,
 completeMasteryWin,evaluateMastery,readLocalMastery,writeLocalMastery,safeMasteryLoad
} from '../src/mastery.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const scenarios=[...core,...expansion,...generateStages([...core,...expansion])].map((s,i)=>commanderScenario(s,i));
const catalog=MASTERY_CATALOG.achievements;
const item=(arr,id)=>arr.find(x=>x.id===id);
function runPuzzle(i,steps) {
 let state=createGame(scenarios[i]),run=emptyMasteryRun();
 const apply=operation=>{
  const next=operation(state);
  run=appendMasteryTransition(run,state,next);
  state=next;
 };
 for(const step of steps)apply(step);
 for(let k=0;k<9&&state.status==='playing';k++)apply(pass);
 return {scenario:scenarios[i],state,run};
}
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),snapshot:m}};
test('catalog preserves all 24 contracted achievements with 15 local and 9 future-only',()=>{
 assert.equal(MASTERY_CATALOG.catalogVersion,1);
 assert.equal(catalog.length,24);
 assert.equal(new Set(catalog.map(a=>a.id)).size,24);
 const contract=JSON.parse(read('planning/daily-mastery-advanced-contracts-v1.json'));
 assert.deepEqual(catalog.map(a=>a.id),contract.mastery.achievements.map(a=>a.id));
 assert.equal(catalog.filter(a=>a.status==='local-eligible').length,15);
 assert.equal(catalog.filter(a=>a.status==='future-advanced').length,6);
 assert.equal(catalog.filter(a=>a.status==='server-required').length,3);
 const evaluated=evaluateMastery(emptyMasteryLedger());
 assert.equal(evaluated.length,24);
 assert.ok(evaluated.every(a=>!a.unlocked&&a.localUnverified));
 assert.match(item(evaluated,'daily-first').lockedReason,/server-verified/i);
 assert.match(item(evaluated,'stack-surgeon').lockedReason,/Advanced rules/i);
});
test('actual Counterspell stack transition emits correctly sourced semantic events only on counter success',()=>{
 const scenario=scenarios[1],base=createGame(scenario);
 const twice=tapLand(tapLand(base,'land-1'),'land-2');
 const cast=activate(twice,'counter','bolt');
 const events=observeMasteryTransition(twice,cast,0);
 assert.ok(events.some(e=>e.type==='spell.cast'&&e.subjectId==='counter'));
 assert.ok(events.every((e,i)=>e.eventIndex===i));
 const resolved=pass(cast);
 const actual=observeMasteryTransition(cast,resolved,1);
 assert.ok(actual.some(e=>e.type==='spell.countered'&&e.subjectId==='bolt'&&e.causeId==='counter'));
 assert.ok(actual.some(e=>e.type==='spell.resolved'&&e.subjectId==='counter'));
 assert.ok(actual.some(e=>e.type==='priority.passed'));
 assert.equal(observeMasteryTransition(resolved,resolved,2).length,0);
 const broken=structuredClone(cast);broken.stack[0].card="Urza's Rage";
 const next=pass(broken);
 assert.ok(!observeMasteryTransition(broken,next,1).some(e=>e.type==='spell.countered'),'uncounterable target cannot earn counter credit');
});
test('genuine engine win records only one puzzle with counter tag and never a visual click',()=>{
 const {scenario,state,run}=runPuzzle(1,[
  s=>tapLand(s,'land-1'),s=>tapLand(s,'land-2'),
  s=>activate(s,'counter','bolt')
 ]);
 assert.equal(state.status,'won');
 assert.ok(run.events.some(e=>e.type==='puzzle.completed'&&e.subjectId===scenario.id));
 assert.ok(run.events.some(e=>e.type==='spell.countered'));
 const result=completeMasteryWin(emptyMasteryLedger(),scenario,state,run,scenarios);
 assert.equal(result.added,true);
 assert.equal(result.ledger.wins['sb-02@1'].counter,true);
 assert.deepEqual(result.newUnlocks,['first-response']);
 const repeated=completeMasteryWin(result.ledger,scenario,state,run,scenarios);
 assert.equal(repeated.added,false);
 assert.deepEqual(repeated.newUnlocks,[]);
 assert.equal(Object.keys(repeated.ledger.wins).length,1);
 const invalid=completeMasteryWin(emptyMasteryLedger(),scenario,state,{
  ...emptyMasteryRun(),events:[{type:'fx.preview',eventIndex:0,actionIndex:0}]
 },scenarios);
 assert.equal(invalid.added,false);
 assert.equal(Object.keys(invalid.ledger.wins).length,0);
});
test('actual Selfless Spirit protection resolves while source leaves and correctly earns protection credit',()=>{
 const {scenario,state,run}=runPuzzle(0,[s=>activate(s,'ward',null)]);
 assert.equal(state.status,'won');
 assert.ok(run.events.some(e=>e.type==='ability.activated'));
 assert.ok(run.events.some(e=>e.type==='protection.granted'));
 const result=completeMasteryWin(emptyMasteryLedger(),scenario,state,run,scenarios);
 assert.equal(result.ledger.wins['sb-01@1'].protection,true);
 assert.equal(result.ledger.wins['sb-01@1'].exile,false);
});
test('hints and undo mark a full run unclean; redo does not duplicate a puzzle count',()=>{
 const initial=emptyMasteryRun();
 assert.equal(initial.clean,true);
 const hinted=markMasteryRunUnclean(initial);
 assert.equal(hinted.clean,false);
 assert.equal(markMasteryRunUnclean(hinted).clean,false);
 const {scenario,state,run}=runPuzzle(0,[s=>activate(s,'ward',null)]);
 const clean=completeMasteryWin(emptyMasteryLedger(),scenario,state,run,scenarios).ledger;
 assert.equal(clean.wins['sb-01@1'].clean,true);
 const dirty=completeMasteryWin(emptyMasteryLedger(),scenario,state,{...run,clean:false},scenarios).ledger;
 assert.equal(dirty.wins['sb-01@1'].clean,false);
 assert.equal(item(evaluateMastery(dirty),'clean-stack').progress,0);
 assert.equal(item(evaluateMastery(clean),'clean-stack').progress,1);
});
test('only real player life gain and exiling permanents count toward mechanic mastery',()=>{
 const s=createGame(scenarios[1]),after=tapLand(s,'land-3');
 const healing=activate(after,'salve','player');
 const healed=pass(healing);
 assert.equal(healed.life.player,s.life.player+3);
 const a=observeMasteryTransition(healing,healed,1);
 assert.ok(a.some(e=>e.type==='life.changed'&&e.delta===3));
 assert.ok(!a.some(e=>e.type==='spell.countered'));
 const before=createGame(scenarios[0]);
 const falseData={...structuredClone(before),log:[...before.log,'Fireball visual sparkle']};
 assert.ok(!observeMasteryTransition(before,falseData,2).some(e=>e.type==='life.changed'));
});
test('distinct case tracking counts a completed world and galaxies only from 10 unique puzzle wins per world',()=>{
 const ledger=emptyMasteryLedger();
 for(let world=0;world<5;world++){
  const first=world*50;
  for(let i=0;i<10;i++){
   const s=scenarios[first+i];
   ledger.wins[s.id+'@1']={id:s.id,revision:1,rulesVersion:s.version,worldIndex:world*5,galaxyIndex:world,clean:true,counter:false,protection:false,lifegain:false,exile:false,maxStars:3};
  }
 }
 const scores=evaluateMastery(ledger);
 assert.equal(item(scores,'galactic-explorer').unlocked,true);
 assert.equal(item(scores,'five-galaxies').unlocked,true);
 assert.equal(item(scores,'perfect-ten').unlocked,true);
 assert.equal(item(scores,'ten-responses').unlocked,true);
 assert.equal(item(scores,'fifty-solutions').unlocked,true);
 assert.equal(item(scores,'centurion').unlocked,false);
 const duplicate=structuredClone(ledger);
 duplicate.wins['sb-01@1']={...duplicate.wins['sb-01@1']};
 assert.deepEqual(evaluateMastery(duplicate),scores);
});
test('daily wins and future advanced events do not unlock until server and engine gates exist',()=>{
 const ledger=emptyMasteryLedger();
 for(let i=0;i<30;i++){
  const s=scenarios[i];
  ledger.wins[s.id+'@1']={id:s.id,revision:1,rulesVersion:s.version,worldIndex:Math.floor(i/10),galaxyIndex:0,clean:true,counter:true,protection:true,lifegain:true,exile:true,maxStars:3};
 }
 const scores=evaluateMastery(ledger);
 for(const a of catalog.filter(x=>x.engineGate||x.requiresServerVerification)){
  const current=item(scores,a.id);
  assert.equal(current.unlocked,false,a.id);
  assert.equal(current.progress,0,a.id);
  assert.ok(current.lockedReason,a.id);
 }
 assert.equal(item(scores,'countermage').unlocked,true);
 assert.equal(item(scores,'banisher').unlocked,true);
});
test('ledger persists to its own local key and bad/foreign entries are filtered without touching Classic progress',()=>{
 const storage=store();
 storage.setItem('dc-stackbreaker-progress-v3',JSON.stringify({'sb-01':3}));
 storage.setItem('dc-stackbreaker-last-level','37');
 const {scenario,state,run}=runPuzzle(0,[s=>activate(s,'ward',null)]);
 const ledger=completeMasteryWin(emptyMasteryLedger(),scenario,state,run,scenarios).ledger;
 assert.equal(writeLocalMastery(storage,ledger),true);
 assert.ok(storage.snapshot.has(MASTERY_STORAGE_KEY));
 assert.deepEqual(readLocalMastery(storage),ledger);
 assert.deepEqual(JSON.parse(storage.getItem('dc-stackbreaker-progress-v3')),{'sb-01':3});
 assert.equal(storage.getItem('dc-stackbreaker-last-level'),'37');
 const contaminated={...ledger,wins:{...ledger.wins,'__illegal@1':{id:'__illegal'}}};
 assert.equal(Object.keys(safeMasteryLoad(contaminated).wins).length,1);
 assert.equal(Object.keys(readLocalMastery({getItem:()=>'{broken'}).wins).length,0);
 assert.equal(writeLocalMastery({setItem:()=>{throw Error('disabled')}},ledger),false);
});
test('the runtime view cannot grant real profiles or count daily practice as a verified achievement',()=>{
 const ui=read('src/ui.js'),html=read('index.html'),template=read('template.html'),css=read('observatory.css'),build=read('build.py');
 assert.match(ui,/if\(!dailyRoute\)\{\s*masteryTransitionHistory\.push/);
 assert.match(ui,/if\(!dailyRoute\)masteryRun=markMasteryRunUnclean/);
 assert.match(ui,/if\(hint&&!dailyRoute\)masteryRun=markMasteryRunUnclean/);
 assert.match(ui,/completeMasteryWin\(masteryLedger,scenarios\[index\],s,masteryRun,scenarios\)/);
 assert.match(ui,/renderMasteryPanel\(\)/);
 assert.match(template,/id="masteryPanel"/);
 assert.match(template,/LOCAL \/ UNVERIFIED/);
 assert.match(css,/\.mastery-list/);
 assert.match(build,/'src\/mastery\.js','src\/ui\.js'/);
 assert.ok(html.includes('function evaluateMastery('));
 assert.ok(html.includes('const masteryCatalog='));
 assert.ok(html.includes('dc-stackbreaker-progress-v3'));
 assert.ok(html.includes('dc-stackbreaker-daily-local-v1'));
 assert.doesNotMatch(ui,/\/api\/my-profile\/mastery/);
 assert.doesNotMatch(ui,/stackbreaker_mastery_grant/);
});
