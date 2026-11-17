// Mobile unit inspector: compact at all phone widths, full rules available on demand.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {terrainInspectPlacement} from '../src/ui/terrain-inspect.js';
const src = p => readFileSync(new URL('../'+p, import.meta.url),'utf8');
const box=(left,top,right,bottom)=>({left,top,right,bottom});
const overlap=(a,b)=>a.left<b.right+8&&a.right>b.left-8&&a.top<b.bottom+8&&a.bottom>b.top-8;
const mobileScreens = [
  { name:'small iPhone',width:320,height:568,plate:box(10,10,265,127),zones:box(8,330,125,449),tray:box(8,453,220,563),endTurn:box(234,455,312,560),topButtons:box(275,10,309,194)},
  { name:'portrait 390',width:390,height:844,plate:box(10,10,335,137),zones:box(8,523,132,643),tray:box(8,648,300,830),endTurn:box(303,720,385,832),topButtons:box(344,10,380,200)},
  { name:'screenshot-style controls',width:390,height:700,plate:box(10,10,335,126),zones:box(8,138,111,265),tray:box(8,445,300,681),endTurn:box(304,572,385,682),topButtons:box(347,10,383,196)},
];
for(const x of mobileScreens){
 test(`mobile unit mini-dock on ${x.name} fits without covering other HUD controls`,()=>{
   const p=terrainInspectPlacement({...x,desiredHeight:72,minHeight:72,maxWidth:300});
   assert.equal(p.fits,true,JSON.stringify(p));assert.equal(p.height,72);
   const dock=box(p.left,p.top,p.left+p.width,p.top+p.height);
   for(const name of ['plate','zones','tray','endTurn','topButtons']) assert.equal(overlap(dock,x[name]),false,`overlaps ${name}`);
 });
}
test('mobile uses a 72px compact creature summary with explicit on-demand detail and dismiss actions',()=>{
 const js=src('src/ui/battle-ui.js'),css=src('styles.css');
 assert.match(js,/desiredHeight:unit\?\(mobile\?72:224\)/);
 assert.match(js,/minHeight:unit\?\(mobile\?72:112\)/);
 assert.match(js,/maxWidth:unit\?\(mobile\?300:350\)/);
 assert.match(js,/data-unit-details/);assert.match(js,/data-unit-dismiss/);
 assert.match(js,/this\.app\.openModal\(this\.unitDetailsHTML\)/);
 assert.match(js,/this\.setHover\(null\)/);
 assert.match(js,/gb-unit-vitals/);assert.match(js,/compactIntent/);assert.match(js,/compactPreview/);
 assert.match(js,/class="gb-unit-rich"/);
 assert.match(css,/#hud #inspect\.unit-inspect\{padding:5px 7px;max-height:72px!important;height:72px!important/);
 assert.match(css,/#hud #inspect\.unit-inspect \.gb-unit-rich\{display:none\}/);
 assert.match(css,/#hud #inspect\.unit-inspect \.gb-unit-brief\{display:flex/);
 assert.match(css,/@media\(max-width:760px\)/);
});

test('creature inspection renders concise vitals while retaining complete details and can dismiss without gameplay changes',async()=>{
  const {BattleUI}=await import('../src/ui/battle-ui.js');
  const previous=globalThis.document, previousWindow=globalThis.window;
  // Simulate an actual mobile viewport: production renders only the compact DOM.
  globalThis.window={matchMedia:()=>({matches:true}),innerWidth:390,screen:{width:390},navigator:{maxTouchPoints:5}};
  const classes=new Set();
  const el={innerHTML:'',classList:{add:(...names)=>names.forEach(n=>classes.add(n)),remove:(...names)=>names.forEach(n=>classes.delete(n))}};
  globalThis.document={getElementById:id=>id==='inspect'?el:null};
  try{
    const inspector=Object.create(BattleUI.prototype);
    inspector.intents=[{uid:'caterpillar'}];
    inspector.intentText=()=> 'Will move';
    inspector.positionTerrainInspect=()=>{};
    const unit={uid:'caterpillar',name:'Caustic Caterpillar',side:'enemy',defId:'causticCaterpillar',
      creatureTypes:'Insect',hp:1,maxHp:1,power:1,toughness:1,move:2,statuses:{},keywords:{}};
    const prev={dealt:[{e:unit,dmg:1,dead:true}],taken:0};
    inspector.showInspect(unit,prev);
    assert.ok(classes.has('show')&&classes.has('unit-inspect'));
    assert.match(el.innerHTML,/gb-unit-brief/);
    assert.match(el.innerHTML,/Caustic Caterpillar/);
    assert.match(el.innerHTML,/1\/1 · ♥1\/1/);
    assert.match(el.innerHTML,/Will move/);
    assert.match(el.innerHTML,/defeated/);
    assert.match(el.innerHTML,/data-unit-details/);
    assert.match(el.innerHTML,/data-unit-dismiss/);
    assert.match(inspector.unitDetailsHTML,/Movement 2/);
    assert.match(inspector.unitDetailsHTML,/Insect/);
    assert.match(inspector.unitDetailsHTML,/You take nothing/);
    inspector.showInspect(null);
    assert.equal(inspector.unitDetailsHTML,null);
    assert.equal(classes.has('show'),false);
  }finally {
    if(previous===undefined)delete globalThis.document;else globalThis.document=previous;
    if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;
  }
});
