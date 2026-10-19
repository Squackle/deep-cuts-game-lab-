import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pyroblastVisualMode,fireballGeometry} from '../src/pyroblast-vfx.js';
import {createSpellVfxController,describeSpellResolution} from '../src/vfx-events.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source={x:110,y:320},target={x:490,y:120},anchors={source,target};
const event=(effect,outcome,targetKind,targetId='blue-spell')=>({
 card:'Pyroblast',effect,outcome,targetKind,targetId,
 sourceStackId:'pyro-a',relatedStackIds:outcome==='countered'?[targetId]:[],terminalStatus:null
});
const counter=()=>event('counter','countered','stack');
const destroy=()=>event('destroy','destroyed','creature','blue-permanent');
function fakeDOM(reduced=false){
 const children=[],timers=new Map();let nextTimer=0;
 const make=tag=>({
  tagName:tag,style:{},attrs:{},dataset:{},children:[],
  setAttribute(k,v){this.attrs[k]=String(v)},
  appendChild(n){n.parent=this;this.children.push(n);return n},
  remove(){const group=this.parent?.children||children;const i=group.indexOf(this);if(i>=0)group.splice(i,1)}
 });
 const doc={
  body:{appendChild(n){children.push(n);return n}},
  documentElement:{clientWidth:390,clientHeight:844},
  createElement:make,createElementNS:(namespace,tag)=>make(tag)
 };
 const view={innerWidth:390,innerHeight:844,matchMedia:()=>({matches:reduced}),
  setTimeout:(fn,delay)=>{const id=++nextTimer;timers.set(id,{fn,delay});return id},
  clearTimeout:id=>timers.delete(id)
 };
 return {doc,view,children,timers};
}
test('Pyroblast requires verified outcome and never invents a successful counter',()=>{
 assert.equal(pyroblastVisualMode(counter()),'fire-counter');
 assert.equal(pyroblastVisualMode(destroy()),'fire-destroy');
 assert.equal(pyroblastVisualMode(event('counter','invalid-target','stack')),'fire-miss');
 assert.equal(pyroblastVisualMode(event('destroy','invalid-target','creature')),'fire-miss');
 assert.equal(pyroblastVisualMode(event('counter','uncounterable','stack')),'fire-resist');
 assert.equal(pyroblastVisualMode(event('counter','no-counter','stack')),'generic');
 assert.equal(pyroblastVisualMode({...counter(),relatedStackIds:[]}), 'generic');
 assert.equal(pyroblastVisualMode(event('destroy','destroyed','stack')),'generic');
 assert.equal(pyroblastVisualMode({card:'Red Elemental Blast',effect:'counter',outcome:'countered'}),'generic');
});
test('curved fireball geometry is deterministic, continuous and requires distinct endpoints',()=>{
 const a=fireballGeometry(source,target,'pyro-a');
 const b=fireballGeometry(source,target,'pyro-a');
 assert.deepEqual(a,b);
 assert.match(a.path,/^M110 320 C/);
 assert.ok(a.path.endsWith('490 120'));
 assert.ok(a.distance>400);
 assert.equal(fireballGeometry(source,source),null);
 assert.equal(fireballGeometry(null,target),null);
 assert.doesNotMatch(read('src/pyroblast-vfx.js'),/Math\.random/);
});
test('successful counter fires a curved projectile and fireburst at its real stack target',()=>{
 const fake=fakeDOM(),ctrl=createSpellVfxController(fake.doc,fake.view);
 assert.deepEqual(ctrl.play(counter(),anchors),{played:true,reason:'ok',mode:'fire-counter'});
 const layer=fake.children[0];
 assert.equal(layer.attrs['data-vfx-mode'],'fire-counter');
 assert.equal(layer.attrs['aria-hidden'],'true');
 const svg=layer.children[0];
 assert.equal(svg.tagName,'svg');assert.equal(svg.attrs.viewBox,'0 0 390 844');
 assert.ok(svg.children.some(x=>x.attrs.class==='sb-vfx-fire-trail'));
 assert.ok(svg.children.some(x=>x.attrs.class==='sb-vfx-fire-orb'));
 assert.ok(svg.children.some(x=>x.attrs.class==='sb-vfx-fire-counterburst'));
 assert.equal(svg.children.filter(x=>x.attrs.class==='sb-vfx-fire-impact-spark').length,6);
 assert.equal([...fake.timers.values()][0].delay,900);
 ctrl.cancel();assert.equal(fake.children.length,0);
});
test('destroy effect explodes only for a verified destroyed permanent, not for a counter',()=>{
 const fake=fakeDOM();
 const r=createSpellVfxController(fake.doc,fake.view).play(destroy(),anchors);
 assert.equal(r.mode,'fire-destroy');
 const nodes=fake.children[0].children[0].children;
 assert.ok(nodes.some(n=>n.attrs.class==='sb-vfx-fire-destroyburst'));
 assert.ok(!nodes.some(n=>n.attrs.class==='sb-vfx-fire-counterburst'));
});
test('uncounterable blocks the Pyroblast effect instead of fabricating destruction',()=>{
 const fake=fakeDOM();
 const r=createSpellVfxController(fake.doc,fake.view).play(event('counter','uncounterable','stack'),anchors);
 assert.equal(r.mode,'fire-resist');
 const nodes=fake.children[0].children[0].children;
 assert.ok(nodes.some(n=>n.attrs.class==='sb-vfx-fire-resist'));
 assert.ok(!nodes.some(n=>n.attrs.class==='sb-vfx-fire-counterburst'));
 assert.ok(!nodes.some(n=>n.attrs.class==='sb-vfx-fire-destroyburst'));
});
test('invalid target fizzles at Pyroblast source without any projectile',()=>{
 const fake=fakeDOM(),ctrl=createSpellVfxController(fake.doc,fake.view);
 const r=ctrl.play(event('counter','invalid-target','stack'),{source,target:null});
 assert.equal(r.mode,'fire-miss');
 const nodes=fake.children[0].children[0].children;
 assert.equal(nodes.length,1);
 assert.equal(nodes[0].attrs.class,'sb-vfx-fire-miss');
 assert.equal([...fake.timers.values()][0].delay,420);
});
test('unverified Pyroblast has no VFX and cannot claim a legitimate counter',()=>{
 const fake=fakeDOM(),ctrl=createSpellVfxController(fake.doc,fake.view);
 assert.equal(ctrl.play(event('counter','no-counter','stack'),anchors).reason,'unverified-pyroblast-outcome');
 assert.equal(fake.children.length,0);
});
test('red effect respects reduced motion and new actions cancel without touching game state',()=>{
 const disabled=fakeDOM(true);
 const controller=createSpellVfxController(disabled.doc,disabled.view);
 assert.equal(controller.play(counter(),anchors).reason,'reduced-motion');
 assert.equal(disabled.children.length,0);
 const normal=fakeDOM(false);
 const next=createSpellVfxController(normal.doc,normal.view);
 next.play(counter(),anchors);
 assert.equal(normal.children.length,1);
 next.cancel();
 assert.equal(normal.children.length,0);
 assert.equal(normal.timers.size,0);
 assert.equal(describeSpellResolution({stack:[]},{stack:[]}),null);
});
test('Pyroblast remains a VFX-only fixture; no new game rules or stage data',()=>{
 const cards=read('src/cards.js'),engine=read('src/engine.js');
 const preview=read('vfx-lab/index.html');
 const script=read('vfx-lab/preview.js');
 assert.ok(!cards.includes("'Pyroblast':"));
 assert.ok(!engine.includes("case 'pyroblast'"));
 assert.match(preview,/VISUAL PREVIEW ONLY/);
 assert.match(script,/createSpellVfxController/);
 assert.match(script,/relatedStackIds/);
});
test('source and bundle include new fireball effects and accessibility guards',()=>{
 const build=read('build.py'),css=read('observatory.css'),html=read('index.html');
 assert.match(build,/'src\/pyroblast-vfx\.js','src\/dust-vfx\.js','src\/resolution-fx\.js','src\/vfx-events\.js'/);
 assert.ok(css.includes('sb-vfx-fire-trail'));
 assert.ok(css.includes('sb-fire-counterburst'));
 assert.ok(css.includes('sb-fire-destroyburst'));
 assert.ok(css.includes('prefers-reduced-motion'));
 assert.ok(html.includes('function pyroblastVisualMode('));
 assert.ok(html.includes('function renderPyroblastVfx('));
 assert.ok(html.includes('dc-stackbreaker-progress-v3'));
});
