import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,activate,pass} from '../src/engine.js';
import {generateStages} from '../src/galaxies.js';
import {commanderScenario} from '../src/commander.js';
import core from '../data/scenarios.json' with {type:'json'};
import expansion from '../data/campaign-expansion.json' with {type:'json'};
import {emptyMasteryLedger,emptyMasteryRun,appendMasteryTransition,completeMasteryWin,MASTERY_CATALOG} from '../src/mastery.js';
import {createSpellVfxController} from '../src/vfx-events.js';
import {
 COSMETIC_STORAGE_KEY,COSMETIC_TYPES,COSMETIC_META,cosmeticChoices,
 emptyCosmeticEquip,sanitizeCosmeticEquip,hasCosmeticGrant,
 equipLocalCosmetic,readCosmeticEquip,writeCosmeticEquip,effectiveCosmeticEquip,
 cosmeticAppearanceOnly
} from '../src/cosmetics.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const scenarios=[...core,...expansion,...generateStages([...core,...expansion])].map((s,i)=>commanderScenario(s,i));
const createStore=()=>{const d=new Map();return {
 getItem:key=>d.get(key)||null,setItem:(key,val)=>d.set(key,String(val)),
 removeItem:key=>d.delete(key),raw:d
}};
function genuineLocalWin(){
 const scenario=scenarios[0];let g=createGame(scenario),run=emptyMasteryRun();
 for(const op of [s=>activate(s,'ward',null),pass,pass,pass]){
  if(g.status!=='playing')break;
  const next=op(g);run=appendMasteryTransition(run,g,next);g=next;
 }
 assert.equal(g.status,'won');
 return completeMasteryWin(emptyMasteryLedger(),scenario,g,run,scenarios).ledger;
}
test('gallery definitions preserve 13 titles, seven frames, six FX themes and 24 fixed achievement grants',()=>{
 assert.deepEqual(COSMETIC_TYPES,['title','frame','vfx']);
 assert.equal(MASTERY_CATALOG.achievements.length,24);
 for(const [type,length] of [['title',13],['frame',7],['vfx',6]]){
  const choices=cosmeticChoices(type);
  assert.equal(choices.length,length,type);
  assert.equal(new Set(choices.map(x=>x.id)).size,length,type);
  assert.ok(choices.every(x=>typeof x.achievementId==='string'&&x.name));
 }
 assert.equal(cosmeticChoices('invalid').length,0);
 assert.equal(COSMETIC_META.white,'White · Radiance');
});
test('no cosmetic is unlocked without a genuine mastery ledger; defaults remain available',()=>{
 const ledger=emptyMasteryLedger(),raw=emptyCosmeticEquip();
 assert.deepEqual(sanitizeCosmeticEquip(null,ledger),raw);
 for(const type of COSMETIC_TYPES){
  for(const c of cosmeticChoices(type)){
   assert.equal(hasCosmeticGrant(ledger,type,c.id),false,c.id);
   const denied=equipLocalCosmetic(raw,ledger,type,c.id);
   assert.equal(denied.ok,false,c.id);
   assert.equal(denied.equip[type],null);
  }
  const def=equipLocalCosmetic(raw,ledger,type,null);
  assert.equal(def.ok,true);
  assert.equal(def.equip[type],null);
 }
 assert.equal(equipLocalCosmetic(raw,ledger,'invalid','white').ok,false);
});
test('real Selfless Spirit victory permits first-responder title and white frame only',()=>{
 const ledger=genuineLocalWin();
 assert.equal(hasCosmeticGrant(ledger,'title','first-responder'),true);
 assert.equal(hasCosmeticGrant(ledger,'frame','white'),true);
 assert.equal(hasCosmeticGrant(ledger,'vfx','white'),false);
 assert.equal(hasCosmeticGrant(ledger,'title','apprentice'),false);
 assert.equal(hasCosmeticGrant(ledger,'frame','gold'),false);
 const a=equipLocalCosmetic(emptyCosmeticEquip(),ledger,'title','first-responder');
 assert.equal(a.ok,true);
 const b=equipLocalCosmetic(a.equip,ledger,'frame','white');
 assert.equal(b.ok,true);
 assert.deepEqual([b.equip.title,b.equip.frame,b.equip.vfx],['first-responder','white',null]);
 assert.equal(cosmeticAppearanceOnly(b.equip).label,'First Responder');
 assert.equal(cosmeticAppearanceOnly(b.equip).frame,'white');
});
test('tampering with local equipment cannot equip unearned cosmetic, or inject markup',()=>{
 const ledger=genuineLocalWin();
 const bad={schemaVersion:1,localUnverified:true,title:'<script>alert(1)</script>',
  frame:'gold',vfx:'red'};
 assert.deepEqual(sanitizeCosmeticEquip(bad,ledger),emptyCosmeticEquip());
 const forced={...bad,title:'first-responder',frame:'white'};
 const valid=sanitizeCosmeticEquip(forced,ledger);
 assert.equal(valid.title,'first-responder');
 assert.equal(valid.frame,'white');
 assert.equal(valid.vfx,null);
 assert.equal(equipLocalCosmetic(valid,ledger,'frame','__proto__').ok,false);
 assert.equal(equipLocalCosmetic(valid,ledger,'vfx','white').ok,false);
 // Even a forged catalog grant in local storage is not an authenticated reward.
 assert.equal(cosmeticAppearanceOnly(valid).localUnverified,true);
});
test('stale unlocks are revoked from appearance if the underlying win is missing',()=>{
 const earned=genuineLocalWin();
 const equip=equipLocalCosmetic(
  equipLocalCosmetic(emptyCosmeticEquip(),earned,'title','first-responder').equip,
  earned,'frame','white').equip;
 const reset=effectiveCosmeticEquip(equip,emptyMasteryLedger());
 assert.equal(reset.title,null);
 assert.equal(reset.frame,null);
 assert.equal(cosmeticAppearanceOnly(reset).frame,'none');
});
test('cosmetics persist under their own isolated key and recover from corrupt/blocked storage',()=>{
 const l=genuineLocalWin(),store=createStore();
 store.setItem('dc-stackbreaker-progress-v3','{"sb-01":3}');
 store.setItem('dc-stackbreaker-last-level','7');
 store.setItem('dc-stackbreaker-daily-local-v1','{}');
 store.setItem('dc-stackbreaker-mastery-local-v1','{"wins":{}}');
 const equipped={...emptyCosmeticEquip(),title:'first-responder',frame:'white'};
 assert.equal(writeCosmeticEquip(store,equipped,l),true);
 assert.deepEqual(readCosmeticEquip(store,l),equipped);
 for(const k of ['dc-stackbreaker-progress-v3','dc-stackbreaker-last-level','dc-stackbreaker-daily-local-v1','dc-stackbreaker-mastery-local-v1'])
  assert.ok(store.getItem(k),'untouched '+k);
 assert.equal(readCosmeticEquip({getItem:()=>'{invalid'},l).title,null);
 assert.equal(writeCosmeticEquip({setItem(){throw Error('blocked')}},equipped,l),false);
 assert.ok(store.raw.has(COSMETIC_STORAGE_KEY));
});
test('appearance-only selection leaves identical rules transitions and puzzles',()=>{
 const baseline=createGame(scenarios[0]);const original=JSON.stringify(baseline);
 const l=genuineLocalWin();
 const e=equipLocalCosmetic(emptyCosmeticEquip(),l,'frame','white').equip;
 assert.equal(JSON.stringify(baseline),original);
 const first=activate(baseline,'ward',null),second=activate(baseline,'ward',null);
 assert.deepEqual(first,second);
 assert.ok(!('cosmeticTheme' in first));
 assert.ok(!('cosmetics' in first));
 assert.equal(cosmeticAppearanceOnly(e).localUnverified,true);
 assert.equal(scenarios.length,250);
});
function simpleDom(){
 const layers=[];
 const element=tag=>({tagName:tag,attrs:{},children:[],style:{setProperty(k,v){this[k]=v}},
  setAttribute(k,v){this.attrs[k]=v},appendChild(node){node.parent=this;this.children.push(node);return node},
  remove(){const parent=this.parent?.children||layers;const idx=parent.indexOf(this);if(idx>=0)parent.splice(idx,1)}});
 const root={body:{appendChild(el){layers.push(el);return el}},createElement:element,
  createElementNS:(namespace,tag)=>element(tag)};
 const view={innerWidth:1000,innerHeight:800,matchMedia:()=>({matches:false}),
  setTimeout:()=>1,clearTimeout:()=>{}};
 return {root,view,layers};
}
test('VFX theme annotates only the inert overlay; unsupported theme is ignored',()=>{
 const d=simpleDom();const ctrl=createSpellVfxController(d.root,d.view);
 const anchors={source:{x:70,y:160},target:{x:320,y:200}};
 let result=ctrl.play({card:'Preview',visualFixture:true,fxType:'heal',outcome:'resolved',
  changes:{life:{player:3,opponent:0},units:[]},cosmeticTheme:'green'},anchors);
 assert.equal(result.played,true);
 assert.equal(d.layers[0].attrs['data-vfx-theme'],'green');
 assert.equal(d.layers[0].attrs['aria-hidden'],'true');
 assert.equal(d.layers[0].attrs['data-spell-fx'],'heal');
 assert.equal(d.layers[0].attrs['data-vfx-outcome'],'resolved');
 result=ctrl.play({card:'Preview',visualFixture:true,fxType:'heal',outcome:'resolved',
  cosmeticTheme:'<img onerror=alert(1)>'},anchors);
 assert.equal(result.played,true);
 assert.ok(!('data-vfx-theme' in d.layers[0].attrs));
 ctrl.cancel();assert.equal(d.layers.length,0);
});
test('reduced-motion vetoes cosmetic FX without suppressing actual game effects',()=>{
 const d=simpleDom();d.view.matchMedia=()=>({matches:true});
 const ctrl=createSpellVfxController(d.root,d.view);
 assert.equal(ctrl.play({cosmeticTheme:'red',visualFixture:true,fxType:'heal'}, {source:{x:0,y:0}}).reason,'reduced-motion');
 assert.equal(d.layers.length,0);
});
test('local gallery, safety copy, builder and standalone bundle preserve all prior modes',()=>{
 const html=read('index.html'),template=read('template.html'),css=read('observatory.css'),ui=read('src/ui.js'),builder=read('build.py');
 for(const s of ['id="cosmeticsPanel"','id="cosmeticGallery"','id="cosmeticsPreview"','LOCAL / UNVERIFIED'])
  assert.ok(template.includes(s),s);
 assert.ok(css.includes('prefers-reduced-motion'));
 assert.ok(css.includes('.cosmetics-preview[data-frame="prismatic"]'));
 assert.ok(css.includes('.sb-vfx-layer[data-vfx-theme="blue"]'));
 assert.ok(ui.includes('equipLocalCosmetic('));
 assert.ok(ui.includes('decoratedSpellEvent(event)'));
 assert.ok(ui.includes('effectiveCosmeticEquip(localCosmetics,masteryLedger).vfx'));
 assert.ok(ui.includes('data-cosmetic-type'));
 assert.ok(builder.includes("'src/mastery.js','src/cosmetics.js','src/ui.js'"));
 for(const s of ['function equipLocalCosmetic(', 'function renderCosmeticGallery(', 'const masteryCatalog=', 'const dailyManifest=','dc-stackbreaker-progress-v3','dc-stackbreaker-daily-local-v1']) assert.ok(html.includes(s),s);
 assert.ok(!ui.includes('/api/my-profile/mastery'));
 assert.ok(!ui.includes('stackbreaker_mastery_grant'));
});
