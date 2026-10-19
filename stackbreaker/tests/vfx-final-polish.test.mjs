import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describeSpellVfxForA11y,createSpellVfxController} from '../src/vfx-events.js';
import {fitDustBounds,renderSpellDust} from '../src/dust-vfx.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const hit=(extra={})=>({
 card:'Lightning Bolt',effect:'damage',outcome:'damage-dealt',damageAmount:3,
 sourceStackId:'bolt-a',targetId:'player',targetKind:'life',...extra
});
const counter=(extra={})=>({
 card:'Counterspell',effect:'counter',outcome:'countered',
 sourceStackId:'counter-a',targetId:'bolt-a',targetCard:'Lightning Bolt',
 targetKind:'stack',relatedStackIds:['bolt-a'],...extra
});
const anchors={
 source:{x:45,y:120},target:{x:230,y:190},
 dustCard:{title:'Lightning Bolt',rect:{width:140,height:86},imageSrc:null}
};
function fixture(){
 const elements=[],timers=new Map(),events=new Map(),docEvents=new Map();let tid=0;
 const listeners=(store)=>(name,handler)=>{
  (store.get(name)||store.set(name,[]).get(name)).push(handler);
 };
 const make=tag=>({
  tagName:tag,className:'',style:{setProperty(k,v){this[k]=v}},attrs:{},dataset:{},children:[],
  setAttribute(k,v){this.attrs[k]=v},
  appendChild(n){n.parent=this;this.children.push(n);return n},
  remove(){const siblings=this.parent?.children||elements;const i=siblings.indexOf(this);if(i>=0)siblings.splice(i,1)}
 });
 const doc={hidden:false,createElement:make,createElementNS:(n,t)=>make(t),
  body:{appendChild(n){elements.push(n);return n}},
  documentElement:{clientWidth:390,clientHeight:844},
  addEventListener:listeners(docEvents)};
 const view={innerWidth:390,innerHeight:844,matchMedia:()=>({matches:false}),
  addEventListener:listeners(events),
  setTimeout:(fn,ms)=>{let id=++tid;timers.set(id,{fn,ms});return id},
  clearTimeout:id=>timers.delete(id)};
 return {
  doc,view,elements,timers,events,docEvents,
  fire:(event)=>{for(const fn of events.get(event)||[])fn()},
  fireDoc:(event)=>{for(const fn of docEvents.get(event)||[])fn()}
 };
}
test('accessible live region messages describe only authoritative resolution outcomes',()=>{
 assert.equal(describeSpellVfxForA11y(hit()),'Lightning Bolt resolves and deals 3 damage to you.');
 assert.equal(describeSpellVfxForA11y(counter()),'Counterspell counters Lightning Bolt. The spell leaves the stack.');
 assert.equal(describeSpellVfxForA11y({...hit(),outcome:'invalid-target'}),
  'Lightning Bolt fails to resolve: all its targets are illegal.');
 assert.equal(describeSpellVfxForA11y({...hit(),outcome:'prevented'}),
  'Lightning Bolt resolves; damage is prevented.');
 assert.equal(describeSpellVfxForA11y({...counter(),outcome:'uncounterable'}),
  'Counterspell resolves, but Lightning Bolt cannot be countered.');
 assert.equal(describeSpellVfxForA11y({...counter(),outcome:'no-counter'}),
  'Counterspell resolves without countering Lightning Bolt.');
 assert.equal(describeSpellVfxForA11y({...hit(),outcome:'destroyed',targetCard:'Grizzly Bears'}),
  'Lightning Bolt destroys Grizzly Bears.');
 assert.equal(describeSpellVfxForA11y(null),'');
});
test('dust ghost clamps left/right/top/bottom to small viewport without visual overflow',()=>{
 assert.deepEqual(fitDustBounds({x:0,y:0},{width:220,height:130},{width:110,height:100}),
  {x:55,y:50,width:94,height:84});
 assert.deepEqual(fitDustBounds({x:400,y:300},{width:150,height:90},{width:390,height:844}),
  {x:307,y:300,width:150,height:90});
 assert.deepEqual(fitDustBounds({x:60,y:80},{width:140,height:80},{width:390,height:844}),
  {x:78,y:80,width:140,height:80});
 assert.equal(fitDustBounds({x:Infinity,y:0},{},{width:320,height:600}),null);
});
test('the actual temporary dust ghost uses fitted viewport coordinates and bounded dimensions',()=>{
 const f=fixture();f.doc.documentElement.clientWidth=110;f.doc.documentElement.clientHeight=100;
 const layer=f.doc.createElement('div');
 const ghost=renderSpellDust(f.doc,layer,counter(),{
  source:{x:4,y:4},target:{x:106,y:99},dustCard:anchors.dustCard
 },'dust-counter');
 assert.equal(ghost.style.left,'55px');assert.equal(ghost.style.top,'50px');
 assert.equal(ghost.style['--dust-width'],'94px');assert.equal(ghost.style['--dust-height'],'84px');
 assert.equal(ghost.children[1].children.length,24);
});
test('viewport changes, scroll, and orientation changes cancel in-flight visual layers',()=>{
 const f=fixture(),ctrl=createSpellVfxController(f.doc,f.view);
 for(const action of ['resize','scroll','orientationchange','pagehide']){
  const result=ctrl.play(counter(),anchors);
  assert.equal(result.played,true);
  assert.equal(f.elements.length,1);
  f.fire(action);
  assert.equal(f.elements.length,0,action);
  assert.equal(f.timers.size,0);
 }
});
test('page visibility cancels in-flight visuals and hidden pages never create one',()=>{
 const f=fixture(),ctrl=createSpellVfxController(f.doc,f.view);
 assert.equal(ctrl.play(hit(),anchors).played,true);
 f.doc.hidden=true;f.fireDoc('visibilitychange');
 assert.equal(f.elements.length,0);
 assert.equal(ctrl.play(hit(),anchors).reason,'hidden-document');
 f.doc.hidden=false;
 assert.equal(ctrl.play(hit(),anchors).played,true);
 ctrl.cancel();assert.equal(f.elements.length,0);
});
test('rapid spell resolutions use only one latest overlay, never block interaction',()=>{
 const f=fixture(),ctrl=createSpellVfxController(f.doc,f.view);
 for(let i=0;i<12;i++){
  const current=i%2?counter():hit();
  const response=ctrl.play(current,anchors);
  assert.equal(response.played,true);
  assert.equal(f.elements.length,1);
  assert.equal(f.timers.size,1);
  assert.equal(f.elements[0].attrs['aria-hidden'],'true');
 }
 ctrl.cancel();assert.equal(f.elements.length,0);
 assert.equal(f.timers.size,0);
});
test('the live region is updated independently of visual effects and keyboard focus remains intact',()=>{
 const ui=read('src/ui.js'),template=read('template.html'),css=read('observatory.css'),preview=read('vfx-lab/index.html');
 assert.match(ui,/notify\(describeSpellVfxForA11y\(event\)\)/);
 assert.match(template,/id="live"[^>]*role="status" aria-live="polite"/);
 assert.match(css,/\.sb-vfx-layer \*\{pointer-events:none!important\}/);
 assert.match(css,/@media\(max-width:480px\)/);
 assert.match(css,/@media\(forced-colors:active\)/);
 assert.match(preview,/data-mode="dust-counter"/);
 assert.match(preview,/data-mode="dust-fizzle"/);
});
test('compiled Classic standalone bundle has all new polish, with original saves untouched',()=>{
 const build=read('build.py'),html=read('index.html'),css=read('observatory.css');
 assert.match(build,/'src\/dust-vfx\.js','src\/vfx-events\.js'/);
 assert.ok(html.includes('function describeSpellVfxForA11y('));
 assert.ok(html.includes('function fitDustBounds('));
 assert.ok(html.includes('<style>'+read('design-tokens.css')+read('styles.css')+css+'</style>'));
 assert.ok(html.includes('dc-stackbreaker-progress-v3'));
 assert.ok(html.includes('dc-stackbreaker-last-level'));
});
