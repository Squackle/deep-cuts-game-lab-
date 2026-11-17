// Regression for real iPhone complaint: no full description in any mobile battlefield panel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleUI } from '../src/ui/battle-ui.js';
import { readFileSync } from 'node:fs';

function inspectAt(width, options={}) {
  const oldDoc=globalThis.document, oldWindow=globalThis.window;
  const classes=new Set(), styles=new Map();
  const el={
    innerHTML:'',
    classList:{
      add:(...names)=>names.forEach(n=>classes.add(n)),
      remove:(...names)=>names.forEach(n=>classes.delete(n)),
      contains:name=>classes.has(name)
    },
    style:{setProperty:(name,value,priority='')=>styles.set(name,[value,priority])}
  };
  globalThis.document={getElementById:id=>id==='inspect'?el:null};
  globalThis.window={
    innerWidth:options.innerWidth ?? width,
    matchMedia:()=>({matches:options.mediaMatches ?? width<=760}),
    screen:{width:options.screenWidth ?? width,height:options.screenHeight ?? width},
    visualViewport:{width:options.visualWidth ?? width},
    navigator:{maxTouchPoints:options.touch ?? 5}
  };
  const ui=Object.create(BattleUI.prototype);
  ui.intents=[{uid:2}];ui.intentText=()=> 'Will move';
  ui.positionTerrainInspect=()=>{}; // the responsive HTML must work independently of positioning
  const enemy={uid:2,name:'Caustic Caterpillar',side:'enemy',defId:'causticCaterpillar',
    creatureTypes:'Insect',hp:1,maxHp:1,power:1,toughness:1,move:2,statuses:{},keywords:{}};
  ui.showInspect(enemy);
  const result={html:el.innerHTML,full:ui.unitDetailsHTML,classes,styles};
  if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;
  if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
  return result;
}
for(const width of [320,375,390,402,430,760]){
  test('at '+width+' CSS px, inspected creatures are bounded without descriptive text',()=>{
    const p=inspectAt(width);
    assert.ok(p.classes.has('unit-compact'));
    assert.match(p.html,/Caustic Caterpillar/);
    assert.match(p.html,/data-unit-details/);
    assert.match(p.html,/data-unit-dismiss/);
    assert.match(p.html,/Will move/);
    assert.doesNotMatch(p.html,/Movement 2|Sacrifice this creature|gb-unit-rich|Base attack|Creature details/);
    assert.match(p.full,/Movement 2/);
    assert.equal(p.styles.get('height')[0],'60px');
    assert.equal(p.styles.get('max-height')[0],'60px');
    assert.equal(p.styles.get('max-height')[1],'important');
  });
}
test('even a stale 980px CSS viewport on a touch iPhone stays compact',()=>{
  const p=inspectAt(390,{innerWidth:980,mediaMatches:false,visualWidth:390,screenWidth:390,touch:5});
  assert.ok(p.classes.has('unit-compact'));
  assert.doesNotMatch(p.html,/gb-unit-rich|Movement 2/);
});
test('landscape iPhone uses the compact inspector despite an 844px CSS viewport',()=>{
  const p=inspectAt(390,{innerWidth:844,mediaMatches:false,visualWidth:844,screenWidth:844,screenHeight:390,touch:5});
  // Screen dimensions may swap on orientation; the short edge still identifies a phone.
  assert.ok(p.classes.has('unit-compact'));
  assert.equal(p.styles.get('height')[0],'60px');
});
test('desktop retains the full creature inspector and no 60px cap',()=>{
  const p=inspectAt(1440,{touch:0});
  assert.ok(!p.classes.has('unit-compact'));
  assert.match(p.html,/Movement 2/);
  assert.doesNotMatch(p.html,/gb-unit-brief/);
  assert.equal(p.styles.get('height')[0],'');
});
test('mobile layout has CSS-independent fail safe and reduced 60px dock',()=>{
  const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
  const src=readFileSync(new URL('../src/ui/battle-ui.js',import.meta.url),'utf8');
  assert.match(css,/#hud #inspect\.unit-inspect\.unit-compact\{/);
  assert.match(css,/height:60px!important;max-height:60px!important/);
  assert.match(src,/el\.innerHTML = compact \? brief :/);
  assert.match(src,/const mobile=this\.compactInspector\(\)/);
});
