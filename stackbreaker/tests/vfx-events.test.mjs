import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARDS} from '../src/cards.js';
import {createGame,pass} from '../src/engine.js';
import {describeSpellResolution,captureSpellAnchors,createSpellVfxController} from '../src/vfx-events.js';
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
 const uncounterable=Object.keys(CARDS).find(n=>CARDS[n].uncounterable);
 if(!uncounterable)return;
 const s=initial({stack:[
  {id:'immune',card:uncounterable,controller:'opponent',targetId:null,spell:true},
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
  target:{x:145,y:58,width:90,height:36}
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
