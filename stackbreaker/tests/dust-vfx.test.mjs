import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,pass} from '../src/engine.js';
import {captureDustCard,dustVisualMode,dustParticleLayout,renderSpellDust} from '../src/dust-vfx.js';
import {captureSpellAnchors,createSpellVfxController,describeSpellResolution} from '../src/vfx-events.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const scenario={
 id:'dust-fixture',version:'sb-mtg-training-0.3.0',title:'Counter dust',
 intro:'Testing visuals',hint:'pass',explanation:'rules unchanged',tier:'Apprentice',
 life:{player:10,opponent:10},mana:{W:0,U:0,B:0,R:0,G:0,C:0},
 lands:[],units:[],hand:[],
 stack:[{id:'bolt-a',card:'Lightning Bolt',controller:'opponent',targetId:'player'},
        {id:'counter-a',card:'Counterspell',controller:'player',targetId:'bolt-a'}],
 activeActor:'opponent',opponentPolicy:'alwaysPass',objective:{type:'survive'}
};
const setup=override=>createGame({...structuredClone(scenario),...override});
const rect=(left,top,width=130,height=85)=>({left,top,width,height});
function stackNode(id,x,y,name,src=''){
 return {dataset:{stackTarget:id},getBoundingClientRect:()=>rect(x,y),
  querySelector:()=>src?{currentSrc:src}:null};
}
const rootWith=(nodes)=>({
 querySelectorAll:selector=>selector==='[data-stack-target]'?nodes:[],
});
function fakeDOM(){
 const children=[],timers=new Map();let id=0;
 function node(tag){return {
  tagName:tag,style:{},attrs:{},children:[],dataset:{},
  setAttribute(k,v){this.attrs[k]=v;},
  appendChild(n){n.parent=this;this.children.push(n);return n;},
  remove(){const arr=this.parent?.children||children;const i=arr.indexOf(this);if(i>=0)arr.splice(i,1)}
 }}
 const root={createElement:node,createElementNS:(ns,tag)=>node(tag),
  documentElement:{clientWidth:390,clientHeight:844},
  body:{appendChild(n){children.push(n);return n}}};
 const view={innerWidth:390,innerHeight:844,matchMedia:()=>({matches:false}),
  setTimeout:(fn,delay)=>{const key=++id;timers.set(key,{fn,delay});return key},
  clearTimeout:key=>timers.delete(key)};
 return {root,view,children,timers};
}
test('real Counterspell resolution removes target and yields counter dust, not Lightning Bolt hit',()=>{
 const before=setup();
 const after=pass(before);
 const e=describeSpellResolution(before,after);
 assert.equal(e.card,'Counterspell');
 assert.equal(e.targetCard,'Lightning Bolt');
 assert.equal(e.outcome,'countered');
 assert.deepEqual(e.relatedStackIds,['bolt-a']);
 assert.equal(dustVisualMode(e),'dust-counter');
 assert.equal(after.stack.length,0);
 assert.equal(after.life.player,10);
 assert.equal(before.stack.length,2);
 const again=describeSpellResolution(after,after);
 assert.equal(again,null);
});
test('ordinary resolution, failed counter, prevention and uncounterable never fake dust',()=>{
 assert.equal(dustVisualMode({effect:'counter',outcome:'no-counter'}),'none');
 assert.equal(dustVisualMode({effect:'counter',outcome:'uncounterable'}),'none');
 assert.equal(dustVisualMode({effect:'damage',outcome:'damage-dealt'}),'none');
 assert.equal(dustVisualMode({targetKind:'stack',outcome:'countered',targetId:'x',relatedStackIds:[]}), 'none');
 assert.equal(dustVisualMode(null),'none');
});
test('all targets illegal results in source-only ash distinct from a successful counter',()=>{
 const before=setup({units:[{id:'bear',card:'Grizzly Bears',controller:'opponent',zone:'battlefield'}],
   stack:[{id:'swords-a',card:'Swords to Plowshares',controller:'player',targetId:'bear'}]});
 const alreadyGone=structuredClone(before);
 alreadyGone.units[0].zone='graveyard';
 const after=pass(alreadyGone),event=describeSpellResolution(alreadyGone,after);
 assert.equal(event.outcome,'invalid-target');
 assert.equal(event.card,'Swords to Plowshares');
 assert.equal(dustVisualMode(event),'dust-fizzle');
 assert.equal(after.life.opponent,10,'all-illegal-target spell has no effect');
});
test('pre-render snapshot uses the actual targeted stack card and its Scryfall art',()=>{
 const before=setup(),after=pass(before),e=describeSpellResolution(before,after);
 const ui=rootWith([
  stackNode('counter-a',20,30),
  stackNode('bolt-a',190,50,'Lightning Bolt','https://cards.scryfall.io/art_crop/front/0/foo.jpg')
 ]);
 const anchors=captureSpellAnchors(ui,e);
 assert.deepEqual(anchors.dustCard,{
  rect:{x:190,y:50,width:130,height:85},title:'Lightning Bolt',
  imageSrc:'https://cards.scryfall.io/art_crop/front/0/foo.jpg'
 });
 assert.deepEqual(anchors.target,{x:255,y:92.5,width:130,height:85});
 assert.deepEqual(anchors.source,{x:85,y:72.5,width:130,height:85});
 const snap=captureDustCard(ui,e);
 assert.equal(snap.title,e.targetCard);
});
test('illegal-target snapshot uses the source card and cannot spoof remote artwork',()=>{
 const e={card:'Swords to Plowshares',sourceStackId:'swords-a',outcome:'invalid-target'};
 const snap=captureDustCard(rootWith([stackNode('swords-a',5,5,'', 'https://untrusted.example/card.png')]),e);
 assert.equal(snap.title,'Swords to Plowshares');
 assert.equal(snap.imageSrc,null);
 assert.equal(captureDustCard(rootWith([]),e),null);
});
test('deterministic 24 dust particles with no random state or mutation',()=>{
 const a=dustParticleLayout('counter-a:bolt-a');
 assert.deepEqual(a,dustParticleLayout('counter-a:bolt-a'));
 assert.equal(a.length,24);
 assert.ok(a.some(p=>p.x!==0||p.y!==0));
 assert.ok(a.every(p=>p.size>=2&&p.size<=6&&p.delay>=0&&p.delay<210));
 assert.doesNotMatch(read('src/dust-vfx.js'),/Math\.random/);
});
test('countered spell visually survives old DOM removal only as inert snapshot and ash',()=>{
 const f=fakeDOM(),e={card:'Counterspell',sourceStackId:'counter-a',targetId:'bolt-a',
  targetCard:'Lightning Bolt',targetKind:'stack',effect:'counter',outcome:'countered',
  relatedStackIds:['bolt-a']};
 const anchors={source:{x:40,y:140},target:{x:270,y:180},dustCard:{
  rect:{width:145,height:90},title:'Lightning Bolt',
  imageSrc:'https://cards.scryfall.io/art_crop/front/0/foo.jpg'
 }};
 const controller=createSpellVfxController(f.root,f.view);
 const result=controller.play(e,anchors);
 assert.equal(result.mode,'dust-counter');
 assert.equal(f.children.length,1);
 const layer=f.children[0];
 assert.equal(layer.attrs['aria-hidden'],'true');
 assert.equal(layer.attrs['data-vfx-mode'],'dust-counter');
 const host=layer.children.find(n=>n.attrs.class===undefined&&n.className?.includes('sb-vfx-dust-host'));
 assert.ok(host,'removed target is rendered as temporary dust ghost');
 const ghost=host.children[0];
 assert.equal(ghost.className,'sb-vfx-dust-card');
 assert.equal(ghost.children[0].src,anchors.dustCard.imageSrc);
 assert.equal(ghost.children[1].textContent,'Lightning Bolt');
 assert.equal(host.children[1].children.length,24);
 assert.equal([...f.timers.values()][0].delay,880);
 controller.cancel();
 assert.equal(f.children.length,0);
 assert.equal(f.timers.size,0);
});
test('all-illegal-target fizzle displays source-only gray ash and no target line',()=>{
 const f=fakeDOM(),e={card:'Swords to Plowshares',sourceStackId:'swords-a',
  targetId:'gone',targetKind:'creature',effect:'exile',outcome:'invalid-target'};
 const result=createSpellVfxController(f.root,f.view).play(e,{
  source:{x:185,y:150},target:null,
  dustCard:{rect:{width:150,height:90},title:'Swords to Plowshares',imageSrc:null}
 });
 assert.equal(result.mode,'dust-fizzle');
 const layer=f.children[0];
 assert.equal(layer.children.filter(n=>n.className==='sb-vfx-dust-link').length,0);
 const host=layer.children.find(n=>n.className?.includes('sb-vfx-dust-host'));
 assert.ok(host.className.includes('sb-vfx-dust-fizzle'));
 assert.equal(host.children[0].children.at(-1).textContent,'Swords to Plowshares');
 assert.equal([...f.timers.values()][0].delay,650);
});
test('Pyroblast counter can add dust to verified fireball hit without changing its fireburst mode',()=>{
 const f=fakeDOM(),e={card:'Pyroblast',sourceStackId:'pyro-a',targetId:'blue-spell',
  targetKind:'stack',effect:'counter',outcome:'countered',relatedStackIds:['blue-spell'],targetCard:'Blue Spell'};
 const r=createSpellVfxController(f.root,f.view).play(e,{
  source:{x:40,y:100},target:{x:260,y:150}
 });
 assert.equal(r.mode,'fire-counter');
 assert.ok(f.children[0].children.some(n=>n.tagName==='svg'));
 assert.ok(f.children[0].children.some(n=>n.className?.includes('sb-vfx-dust-host')));
});
test('reduced motion skips dust VFX and all new actions still cancel the cue',()=>{
 const f=fakeDOM();f.view.matchMedia=()=>({matches:true});
 const event={card:'Counterspell',sourceStackId:'c',targetId:'x',
  targetKind:'stack',outcome:'countered',relatedStackIds:['x'],effect:'counter'};
 assert.equal(createSpellVfxController(f.root,f.view).play(event,{source:{x:4,y:4},target:{x:200,y:30}}).reason,'reduced-motion');
 assert.equal(f.children.length,0);
});
test('standalone generated Classic build and labeled preview include dust and fizzle without rules changes',()=>{
 const build=read('build.py'),ui=read('src/ui.js'),css=read('observatory.css');
 const html=read('index.html'),preview=read('vfx-lab/index.html'),script=read('vfx-lab/preview.js');
 assert.match(build,/'src\/dust-vfx\.js','src\/vfx-events\.js'/);
 assert.match(ui,/captureSpellAnchors\(document,event\)/);
 assert.match(css,/@keyframes sb-dust-counter-card/);
 assert.match(css,/@keyframes sb-dust-fizzle-card/);
 assert.match(css,/prefers-reduced-motion/);
 assert.ok(html.includes('function renderSpellDust('));
 assert.ok(html.includes('dc-stackbreaker-progress-v3'));
 assert.ok(preview.includes('VISUAL PREVIEW ONLY'));
 assert.ok(preview.includes('data-mode="dust-counter"'));
 assert.ok(preview.includes('data-mode="dust-fizzle"'));
 assert.ok(script.includes("card:data.card||'Pyroblast'"));
});
