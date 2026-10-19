import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,pass,tapLand} from '../src/engine.js';
import {describeSpellResolution,createSpellVfxController,captureSpellAnchors} from '../src/vfx-events.js';
import {observeResolutionChanges,resolutionFxMode,spellColor,renderResolutionFx,SPELL_FX_MODES,PREVIEW_ONLY_FX} from '../src/resolution-fx.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const scenario={id:'fx-suite-fixture',version:'sb-mtg-training-0.3.0',title:'FX suite',
 intro:'Evaluate visual effects',hint:'Pass priority',explanation:'No rules changed',
 tier:'Apprentice',life:{player:12,opponent:12},
 mana:{W:0,U:0,B:0,R:0,G:0,C:0},lands:[],units:[],hand:[],
 stack:[{id:'spell-a',card:'Healing Salve',controller:'player',targetId:'player'}],
 activeActor:'opponent',opponentPolicy:'alwaysPass',objective:{type:'survive'}
};
const unit=(id,card='Grizzly Bears')=>({id,card,zone:'battlefield',controller:'player',damage:0,powerBoost:0,toughnessBoost:0});
function run(card,targetId=null,extra={}){
 const s=createGame({...structuredClone(scenario),...extra,
  stack:[{id:'spell-a',card,controller:'player',targetId,spell:true}]});
 const next=pass(s);
 return {before:s,after:next,event:describeSpellResolution(s,next)};
}
test('lifegain actually changes life and triggers healing energy, never invented gain',()=>{
 const {event,after}=run('Healing Salve','player');
 assert.equal(event.changes.life.player,3);
 assert.equal(after.life.player,15);
 assert.equal(resolutionFxMode(event),'heal');
 assert.equal(resolutionFxMode({...event,changes:{life:{player:0,opponent:0},units:[]}}),'none');
});
test('exile, bounce and destruction have distinct observed graveyard/hand/exile effects',()=>{
 const units=[unit('bear-a')];
 for(const [card,zone,mode] of [
  ['Swords to Plowshares','exile','exile'],['Unsummon','hand','bounce'],['Murder','graveyard','destroy']
 ]){
  const {event,after}=run(card,'bear-a',{units});
  assert.equal(after.units[0].zone,zone,card);
  assert.equal(resolutionFxMode(event),mode);
 }
});
test('summoning and growth trigger only from actual new permanents or stat changes',()=>{
 const summon=run('Llanowar Elves');
 assert.equal(resolutionFxMode(summon.event),'summon');
 assert.equal(summon.after.units.length,1);
 const grow=run('Giant Growth','bear-a',{units:[unit('bear-a')]});
 assert.equal(resolutionFxMode(grow.event),'buff');
 assert.equal(grow.event.changes.units[0].power,3);
 const counter=run('Snakeskin Veil','bear-a',{units:[unit('bear-a')]});
 assert.equal(resolutionFxMode(counter.event),'counters');
});
test('protection, board wipe and damage wave follow the real engine outcome',()=>{
 const units=[unit('bear-a'),unit('bear-b','Runeclaw Bear')];
 const shield=run('Heroic Intervention',null,{units});
 assert.equal(resolutionFxMode(shield.event),'shield');
 assert.equal(shield.after.units[0].indestructible,true);
 const wipe=run('Wrath of God',null,{units});
 assert.equal(resolutionFxMode(wipe.event),'wipe');
 assert.equal(wipe.after.units[0].zone,'graveyard');
 const prevented=run('Wrath of God',null,{units:units.map(x=>({...x,indestructible:true}))});
 assert.equal(resolutionFxMode(prevented.event),'none');
 const wave=run('Pyroclasm',null,{units});
 assert.equal(resolutionFxMode(wave.event),'damage-wave');
});
test('unsupported mechanics cannot trigger in Classic without an explicitly labeled fixture',()=>{
 for(const mode of PREVIEW_ONLY_FX){
  assert.equal(resolutionFxMode({card:'Some Card',fxType:mode,outcome:'resolved'}),'none',mode);
  assert.equal(resolutionFxMode({card:'Some Card',fxType:mode,visualFixture:true,outcome:'resolved'}),mode);
 }
 assert.equal(resolutionFxMode({fxType:'summon',visualFixture:true,outcome:'resolved'}),'summon');
 assert.equal(resolutionFxMode({effect:'exile',outcome:'invalid-target',
  changes:{units:[{kind:'zone',to:'exile'}]}}),'none');
 assert.equal(resolutionFxMode({effect:'destroy',outcome:'countered',
  changes:{units:[{kind:'zone',to:'graveyard'}]}}),'none');
});
test('all five Magic colors have stable distinct hues and colorless fallback',()=>{
 const all=['W','U','B','R','G'].map(c=>spellColor([c]));
 assert.equal(new Set(all).size,5);
 assert.equal(spellColor([]),spellColor(['C']));
 assert.equal(spellColor(['X']),spellColor(['C']));
});
test('real tap mana action triggers visual only from a verified changed land',()=>{
 const s=createGame({...structuredClone(scenario),lands:[{id:'forest-a',card:'Forest',controller:'player'}]});
 const next=tapLand(s,'forest-a');
 assert.equal(s.lands[0].tapped,false);
 assert.equal(next.lands[0].tapped,true);
 assert.equal(resolutionFxMode({card:'Forest',fxType:'tap',verifiedTap:true,outcome:'resolved'}),'tap');
 assert.equal(resolutionFxMode({card:'Forest',fxType:'tap',outcome:'resolved'}),'none');
});
function dom(){
 const layers=[];
 const make=tag=>({tagName:tag,className:'',dataset:{},
  style:{setProperty(k,v){this[k]=v}},attrs:{},children:[],
  setAttribute(k,v){this.attrs[k]=v},
  appendChild(n){n.parent=this;this.children.push(n);return n},
  remove(){let arr=this.parent?.children||layers;const i=arr.indexOf(this);if(i>=0)arr.splice(i,1)}
 });
 const root={createElement:make,createElementNS:(ns,t)=>make(t),
  body:{appendChild(n){layers.push(n);return n}},
  documentElement:{clientWidth:390,clientHeight:844}};
 const timers=new Map();let id=0;
 const view={innerWidth:390,innerHeight:844,
  matchMedia:()=>({matches:false}),setTimeout:(fn,ms)=>{let x=++id;timers.set(x,{fn,ms});return x},
  clearTimeout:x=>timers.delete(x)};
 return {root,view,layers,timers};
}
test('each of 18 reusable FX has an inert color-coded DOM scene and cancels cleanly',()=>{
 const f=dom(),ctrl=createSpellVfxController(f.root,f.view);
 const anchors={source:{x:65,y:150},target:{x:275,y:245},field:{x:200,y:310},
  affected:[{x:140,y:300},{x:270,y:310}]};
 for(const mode of SPELL_FX_MODES){
  const event={visualFixture:true,fxType:mode,outcome:'resolved',card:'Preview',
   sourceStackId:'test',colors:['G'],changes:{life:{player:3,opponent:0},units:[]}};
  const r=ctrl.play(event,anchors);
  assert.equal(r.played,true,mode);
  assert.equal(r.mode,mode);
  assert.equal(f.layers.length,1);
  assert.equal(f.layers[0].attrs['aria-hidden'],'true');
  assert.equal(f.layers[0].attrs['data-spell-fx'],mode);
  assert.ok(f.layers[0].children.some(x=>x.className.includes('sb-fx-scene')));
  assert.equal(f.timers.size,1);
 }
 ctrl.cancel();assert.equal(f.layers.length,0);
});
test('zone moves use inert card silhouettes; copies/tokens fan into distinct cards',()=>{
 const f=dom(),ctrl=createSpellVfxController(f.root,f.view);
 const anchors={source:{x:90,y:100},target:{x:260,y:230},hand:{x:120,y:600}};
 const expected={exile:1,bounce:1,summon:1,destroy:1,draw:2,token:3,reanimate:1,copy:2,scry:3};
 for(const [mode,count] of Object.entries(expected)){
  const result=ctrl.play({visualFixture:true,fxType:mode,card:'Preview',
   outcome:'resolved',sourceStackId:'preview',colors:['B']},anchors);
  assert.equal(result.played,true);
  const scene=f.layers[0].children.find(c=>c.className.includes('sb-fx-scene'));
  const ghosts=scene.children.filter(c=>c.className.includes('sb-fx-card-ghost'));
  assert.equal(ghosts.length,count,mode);
  assert.ok(ghosts.every(c=>c.children[0].className==='sb-fx-card-glyph'));
  if(mode==='bounce')assert.equal(ghosts[0].style['--fx-card-dy'],'370px');
  assert.equal(scene.attrs['data-fx-color'],'B');
 }
 ctrl.cancel();
});
test('reduced-motion playback and hidden document do not insert new animations',()=>{
 const f=dom();
 f.view.matchMedia=()=>({matches:true});
 const ctrl=createSpellVfxController(f.root,f.view);
 const r=ctrl.play({visualFixture:true,fxType:'heal'},{source:{x:1,y:1},target:{x:2,y:2}});
 assert.equal(r.reason,'reduced-motion');
 assert.equal(f.layers.length,0);
});
test('original Stackbreaker standalone bundle and visual-only controls are intact',()=>{
 const html=read('index.html'),css=read('observatory.css'),build=read('build.py');
 const preview=read('vfx-lab/index.html'),script=read('vfx-lab/preview.js');
 assert.ok(html.includes('function resolutionFxMode('));
 assert.ok(html.includes('function renderResolutionFx('));
 assert.ok(html.includes('dc-stackbreaker-progress-v3'));
 assert.ok(html.includes('dc-stackbreaker-last-level'));
 assert.match(build,/'src\/resolution-fx\.js','src\/vfx-events\.js'/);
 assert.ok(css.includes('@keyframes sb-fx-portal'));
 assert.ok(css.includes('@keyframes sb-fx-wave'));
 assert.ok(css.includes('prefers-reduced-motion'));
 for(const mode of ['heal','exile','summon','bounce','shield','wipe','draw','counters',
  'token','reanimate','tap','untap','copy','scry','destroy-fx','buff','weaken']){
  assert.ok(preview.includes('data-mode="'+mode+'"'),mode);
 }
 assert.ok(preview.includes('VISUAL PREVIEW ONLY'));
 assert.ok(script.includes('visualFixture:!!data.fxType'));
 assert.doesNotThrow(()=>new Function(script.replace(/^import[^\n]*\n/,'')),'preview entrypoint must be valid JavaScript');
});
