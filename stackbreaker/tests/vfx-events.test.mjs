import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARDS} from '../src/cards.js';
import {createGame,pass} from '../src/engine.js';
import {describeSpellResolution,captureSpellAnchors,createSpellVfxController,lightningGeometry,lightningVisualMode} from '../src/vfx-events.js';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const scenario={
 id:'vfx-case',version:'sb-mtg-training-0.3.0',title:'VFX test',
 intro:'A controlled spell sequence.',hint:'Pass priority.',explanation:'Deterministic.',
 tier:'Apprentice',life:{player:10,opponent:10},
 mana:{W:0,U:0,B:0,R:0,G:0,C:0},lands:[],units:[],hand:[],
 stack:[{id:'bolt-a',card:'Lightning Bolt',controller:'opponent',targetId:'player'}],
 activeActor:'opponent',opponentPolicy:'alwaysPass',objective:{type:'survive'}
};
const initial=override=>createGame({...structuredClone(scenario),...override});
function node(data,rect={left:20,top:10,width:50,height:40}){
 return {dataset:data,getBoundingClientRect:()=>rect};
}
test('priority pass without stack resolution and unchanged state emit no VFX event',()=>{
 const s=initial();
 assert.equal(describeSpellResolution(s,{...structuredClone(s),log:[...s.log,'Opponent passes priority.']}),null);
 assert.equal(describeSpellResolution(s,s),null);
 assert.equal(describeSpellResolution({...s,status:'won'},pass(s)),null);
});
test('Lightning Bolt resolution reports authoritative damage and actual target',()=>{
 const s=initial(),next=pass(s);
 const x=describeSpellResolution(s,next);
 assert.deepEqual([x.card,x.effect,x.sourceStackId,x.targetId,x.outcome],
 ['Lightning Bolt','damage','bolt-a','player','damage-dealt']);
 assert.equal(s.stack.length,1);
});
test('prevention never falsely reports a damage-dealt VFX event',()=>{
 const s=initial(),shield={...structuredClone(s),preventedSpellDamage:{'bolt-a':'player'}};
 const x=describeSpellResolution(shield,pass(shield));
 assert.equal(x.outcome,'prevented');
});
test('countered target reported only when the rules engine removed the spell',()=>{
 const p=initial({stack:[
  {id:'bolt-a',card:'Lightning Bolt',controller:'opponent',targetId:'player'},
  {id:'counter-a',card:'Counterspell',controller:'player',targetId:'bolt-a'}
 ]});
 const next=pass(p);
 const event=describeSpellResolution(p,next);
 assert.equal(event.sourceStackId,'counter-a');assert.equal(event.effect,'counter');
 assert.equal(event.outcome,'countered');
 assert.deepEqual(event.relatedStackIds,['bolt-a']);
 assert.equal(next.life.player,10);
});
test('uncounterability is not falsely labeled a successful counter',()=>{
 const uncounterable="Urza's Rage";
 assert.equal(CARDS[uncounterable].uncounterable,true);
 const s=initial({stack:[
  {id:'immune',card:uncounterable,controller:'opponent',targetId:'player',spell:true},
  {id:'counter-a',card:'Counterspell',controller:'player',targetId:'immune'}
 ]});
 const x=describeSpellResolution(s,pass(s));
 assert.equal(x.outcome,'uncounterable');assert.deepEqual(x.relatedStackIds,[]);
});
test('all-illegal-target nonresolution is classified distinctly from damage',()=>{
 const s=initial({units:[{id:'target-a',card:'Grizzly Bears',controller:'opponent',zone:'battlefield'}],
  stack:[{id:'bolt-a',card:'Lightning Bolt',controller:'opponent',targetId:'target-a'}]});
 const dead=structuredClone(s);dead.units[0].zone='graveyard';
 const x=describeSpellResolution(dead,pass(dead));
 assert.equal(x.outcome,'invalid-target');
});
test('source and target rectangles captured prior to DOM replacement',()=>{
 const root={querySelectorAll:selector=>({
  '[data-stack-target]':[node({stackTarget:'counter-a'},{left:200,top:30,width:100,height:50}),node({stackTarget:'bolt-a'},{left:100,top:40,width:90,height:36})],
  '[data-unit]':[node({unit:'bear-a'})],
  '[data-target-person]':[node({targetPerson:'player'},{left:0,top:200,width:60,height:60})]
 })[selector]||[]};
 const spell={sourceStackId:'counter-a',targetId:'bolt-a',targetKind:'stack'};
 assert.deepEqual(captureSpellAnchors(root,spell),{
  source:{x:250,y:55,width:100,height:50},
  target:{x:145,y:58,width:90,height:36},field:null,affected:[]
 });
 const player={sourceStackId:'bolt-a',targetId:'player',targetKind:'life'};
 assert.deepEqual(captureSpellAnchors(root,player).target,{x:30,y:230,width:60,height:60});
 assert.equal(captureSpellAnchors(root,{...spell,targetId:'missing'}).target,null);
});
test('controller honors reduced motion without appending visual overlays',()=>{
 const doc={body:{appendChild(){throw Error('No overlay allowed')}},createElement(){throw Error('No DOM call')}};
 const ctrl=createSpellVfxController(doc,{matchMedia:()=>({matches:true})});
 assert.equal(ctrl.play({effect:'damage'},{source:{x:0,y:0},target:{x:50,y:10}}).reason,'reduced-motion');
 ctrl.cancel();
});
test('controller makes one pointer-inert overlay and safely cancels older cues',()=>{
 const timers=new Map(),children=[];
 let nextId=0;
 const mk=()=>{const el={className:'',dataset:{},style:{},children:[],removed:false,
  setAttribute(name,val){this[name]=val;},appendChild(x){this.children.push(x);},
  remove(){this.removed=true;const idx=children.indexOf(this);if(idx>=0)children.splice(idx,1)}};
  return el;};
 const doc={body:{appendChild(e){children.push(e)}},createElement:mk};
 const view={matchMedia:()=>({matches:false}),setTimeout:fn=>{const id=++nextId;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id)};
 const ctrl=createSpellVfxController(doc,view);
 const event={effect:'damage',outcome:'damage-dealt'},anchors={source:{x:10,y:20},target:{x:110,y:20}};
 assert.equal(ctrl.play(event,anchors).played,true);
 assert.equal(children.length,1);assert.equal(children[0]['aria-hidden'],'true');
 assert.equal(children[0].children[0].style.width,'100px');
 assert.equal(ctrl.play(event,anchors).played,true);assert.equal(children.length,1);
 const id=[...timers.keys()][0];timers.get(id)();
 assert.equal(children.length,0);
 ctrl.cancel();
});
test('CSS and standalone bundler reference Step 1 VFX without changing save IDs',()=>{
 const ui=load('src/ui.js'),build=load('build.py'),css=load('observatory.css'),built=load('index.html');
 assert.match(ui,/describeSpellResolution\(before,after\)/);
 assert.match(ui,/captureSpellAnchors\(document,event\)/);
 assert.match(ui,/spellVfx\.play\(event,anchors\)/);
 assert.match(build,/'src\/vfx-events\.js'/);
 assert.match(css,/\.sb-vfx-layer/);
 assert.match(css,/prefers-reduced-motion/);
 assert.ok(built.includes('function describeSpellResolution('));
 assert.ok(built.includes('dc-stackbreaker-progress-v3'));
});


test('Lightning Bolt geometry is branching, repeatable and never uses game RNG',()=>{
 const source={x:315,y:70},target={x:40,y:290};
 const first=lightningGeometry(source,target,'bolt-a');
 const second=lightningGeometry(source,target,'bolt-a');
 assert.deepEqual(first,second);
 assert.equal(first.branches.length,3);
 assert.match(first.path,/^M315 70 L/);
 assert.ok(first.distance>300);
 assert.equal(lightningGeometry(source,source,'bolt-a'),null);
 assert.equal(lightningGeometry(null,target),null);
 assert.equal(lightningVisualMode({card:'Lightning Bolt',effect:'damage',outcome:'damage-dealt'}),'impact');
 assert.equal(lightningVisualMode({card:'Lightning Bolt',effect:'damage',outcome:'prevented'}),'shield');
 assert.equal(lightningVisualMode({card:'Lightning Bolt',effect:'damage',outcome:'invalid-target'}),'dissipate');
 assert.equal(lightningVisualMode({card:'Shock',effect:'damage',outcome:'damage-dealt'}),'generic');
 assert.equal(lightningVisualMode({card:'Lightning Bolt',effect:'damage',outcome:'countered'}),'generic');
 assert.doesNotMatch(load('src/vfx-events.js'),/Math\.random/);
});
function fakeVfxDOM(){
 const children=[],timers=new Map(),cleared=[];
 let nextId=0;
 const make=(tag)=>{
  const el={tagName:tag,children:[],attrs:{},style:{},dataset:{},
   setAttribute(k,v){this.attrs[k]=v;},
   appendChild(node){this.children.push(node);node.parent=this;return node;},
   remove(){if(this.parent){const i=this.parent.children.indexOf(this);if(i>=0)this.parent.children.splice(i,1)}
    else {const i=children.indexOf(this);if(i>=0)children.splice(i,1)}}
  };
  return el;
 };
 const doc={
  body:{appendChild(n){children.push(n);return n;}},
  documentElement:{clientWidth:390,clientHeight:844},
  createElement:make,createElementNS:(ns,tag)=>make(tag)
 };
 const view={
  innerWidth:390,innerHeight:844,matchMedia:()=>({matches:false}),
  setTimeout:(fn,ms)=>{const id=++nextId;timers.set(id,{fn,ms});return id;},
  clearTimeout:id=>{cleared.push(id);timers.delete(id)}
 };
 const nodes=tag=>children.flatMap(c=>c.children).flatMap(c=>[c,...c.children]).filter(c=>c.tagName===tag);
 return {doc,view,children,timers,cleared,nodes};
}
const boltEvent=outcome=>({
 card:'Lightning Bolt',effect:'damage',outcome,
 sourceStackId:'bolt-a',targetId:'player',
 damageAmount:outcome==='damage-dealt'?3:0,terminalStatus:null
});
const boltAnchors={source:{x:315,y:70},target:{x:40,y:290}};
test('successful Lightning Bolt spawns branched electric paths, impact and actual damage label',()=>{
 const fake=fakeVfxDOM(),ctrl=createSpellVfxController(fake.doc,fake.view);
 const result=ctrl.play(boltEvent('damage-dealt'),boltAnchors);
 assert.deepEqual(result,{played:true,reason:'ok',mode:'impact'});
 const layer=fake.children[0];
 assert.equal(layer.attrs['aria-hidden'],'true');
 assert.equal(layer.attrs['data-vfx-mode'],'impact');
 assert.equal(fake.view.innerWidth,390);
 const svg=layer.children[0];
 assert.equal(svg.attrs.viewBox,'0 0 390 844');
 assert.equal(svg.children.filter(c=>c.tagName==='path').length,5);
 assert.ok(svg.children.some(c=>c.attrs.class==='sb-vfx-bolt-glow'));
 assert.ok(svg.children.some(c=>c.attrs.class==='sb-vfx-bolt-impact'));
 assert.ok(svg.children.some(c=>c.attrs.class==='sb-vfx-bolt-impact-core'));
 assert.equal(svg.children.find(c=>c.tagName==='text').textContent,'−3');
 assert.deepEqual([...fake.timers.values()].map(t=>t.ms),[800]);
 ctrl.cancel();assert.equal(fake.children.length,0);
});
test('prevented Lightning Bolt has a shield but never a red impact or damage number',()=>{
 const fake=fakeVfxDOM();
 const r=createSpellVfxController(fake.doc,fake.view).play(boltEvent('prevented'),boltAnchors);
 assert.equal(r.mode,'shield');
 const objects=fake.children[0].children[0].children;
 assert.ok(objects.some(o=>o.attrs.class==='sb-vfx-bolt-shield'));
 assert.ok(!objects.some(o=>o.attrs.class==='sb-vfx-bolt-impact'));
 assert.ok(!objects.some(o=>o.tagName==='text'));
});
test('no longer legal target shows dissipation at source, without shooting the bolt',()=>{
 const fake=fakeVfxDOM();
 const r=createSpellVfxController(fake.doc,fake.view).play(boltEvent('invalid-target'),{source:boltAnchors.source,target:null});
 assert.equal(r.mode,'dissipate');
 const objects=fake.children[0].children[0].children;
 assert.equal(objects.length,1);
 assert.equal(objects[0].attrs.class,'sb-vfx-bolt-miss');
 assert.equal(fake.timers.values().next().value.ms,420);
});
test('lethal damage effect is still a normal impact, with terminal status from real game state',()=>{
 const s=initial({life:{player:3,opponent:10}});
 const next=pass(s);
 const event=describeSpellResolution(s,next);
 assert.equal(next.status,'lost');
 assert.equal(event.terminalStatus,'lost');
 assert.equal(event.damageAmount,3);
 const fake=fakeVfxDOM();
 const r=createSpellVfxController(fake.doc,fake.view).play(event,boltAnchors);
 assert.equal(r.mode,'impact');
 assert.equal(fake.children[0].attrs['data-vfx-terminal'],'lost');
});
test('new input cancels Lightning Bolt effect, with no second rules resolution',()=>{
 const fake=fakeVfxDOM(),ctrl=createSpellVfxController(fake.doc,fake.view);
 ctrl.play(boltEvent('damage-dealt'),boltAnchors);
 assert.equal(fake.children.length,1);
 ctrl.cancel();
 assert.equal(fake.children.length,0);
 assert.equal(fake.timers.size,0);
 const original=initial();
 assert.equal(describeSpellResolution(original,pass(original)).sourceStackId,'bolt-a');
 assert.equal(original.stack.length,1,'presentation never mutates the live stack');
});
test('full Lightning Bolt SVG is disabled with prefers-reduced-motion',()=>{
 const fake=fakeVfxDOM();
 fake.view.matchMedia=()=>({matches:true});
 const r=createSpellVfxController(fake.doc,fake.view).play(boltEvent('damage-dealt'),boltAnchors);
 assert.equal(r.reason,'reduced-motion');
 assert.equal(fake.children.length,0);
});
test('lightning visual CSS, standalone output and overlay are all included',()=>{
 const source=load('src/vfx-events.js'),css=load('observatory.css'),built=load('index.html');
 assert.ok(source.includes('sb-vfx-bolt-svg'));
 assert.ok(source.includes('sb-vfx-bolt-damage'));
 assert.ok(css.includes('@keyframes sb-bolt-flight'));
 assert.ok(css.includes('@keyframes sb-bolt-impact'));
 assert.ok(css.includes('@keyframes sb-bolt-shield'));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
 assert.ok(built.includes('function lightningGeometry('));
 assert.ok(built.includes('sb-vfx-bolt-svg'));
});
