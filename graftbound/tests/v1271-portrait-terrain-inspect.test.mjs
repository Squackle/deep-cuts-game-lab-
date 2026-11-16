import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {terrainInspectPlacement} from '../src/ui/terrain-inspect.js';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const rect=(left,top,right,bottom)=>({left,top,right,bottom});
const intersects=(a,b)=>a.left<b.right+8&&a.right>b.left-8&&a.top<b.bottom+8&&a.bottom>b.top-8;

// These cover iPhone portrait and the owner screenshot's high Library/Graveyard dock.
for(const scenario of [
  {name:'compact portrait iPhone',width:320,height:568,plate:rect(10,10,265,127),zones:rect(8,330,125,449),tray:rect(8,453,220,563),endTurn:rect(234,455,312,560),topButtons:rect(275,10,309,194)},
  {name:'portrait iPhone',width:390,height:844,plate:rect(10,10,335,137),zones:rect(8,523,132,643),tray:rect(8,648,300,830),endTurn:rect(303,720,385,832),topButtons:rect(344,10,380,200)},
  {name:'owner screenshot high deck piles',width:390,height:700,plate:rect(10,10,335,126),zones:rect(8,138,111,265),tray:rect(8,445,300,681),endTurn:rect(304,572,385,682),topButtons:rect(347,10,383,196)},
  {name:'large portrait device',width:430,height:932,plate:rect(10,10,370,137),zones:rect(8,587,131,711),tray:rect(8,721,326,921),endTurn:rect(340,794,419,921),topButtons:rect(385,10,419,206)},
  {name:'desktop Library overlap regression',width:1280,height:720,plate:rect(10,10,300,178),zones:rect(12,570,182,704),tray:rect(304,592,980,714),endTurn:rect(1080,620,1262,708),topButtons:rect(1080,10,1270,52)},
  {name:'short landscape Library overlap regression',width:780,height:460,plate:rect(10,10,300,164),zones:rect(12,307,182,447),tray:rect(240,344,650,451),endTurn:rect(666,358,772,451),topButtons:rect(602,10,772,56)},
]){
  test(`${scenario.name}: terrain summary never covers UI controls`,()=>{
    const pos=terrainInspectPlacement(scenario);
    assert.equal(pos.fits,true,JSON.stringify({scenario,pos}));
    const box={left:pos.left,top:pos.top,right:pos.left+pos.width,bottom:pos.top+pos.height};
    for(const name of ['plate','zones','tray','endTurn','topButtons']) assert.equal(intersects(box,scenario[name]),false,`${name} intersects ${JSON.stringify(box)}`);
    assert.ok(pos.width>=150&&pos.height<=74);
  });
}

test('tiny viewport fails closed rather than covering card controls',()=>{
  const pos=terrainInspectPlacement({width:280,height:300,plate:rect(0,0,240,150),zones:rect(0,155,140,245),tray:rect(0,240,220,297),endTurn:rect(222,243,278,298),topButtons:rect(245,0,279,195)});
  assert.equal(pos.fits,false);
});

test('terrain only: compact interactive summary and full rule details without changing simulation',()=>{
  const ui=source('src/ui/battle-ui.js'),css=source('styles.css'),rules=source('src/engine/describe.js');
  assert.match(ui,/terrainInspectPlacement\(/);
  assert.match(ui,/this\.positionTerrainInspect\(\)/);
  assert.doesNotMatch(ui,/if\s*\(!window\.matchMedia\('\(max-width: 760px\)'\)\.matches\)\s*\{\s*el\.style\.removeProperty\('--gb-terrain-top'/,'desktop must not bypass selected-tile placement');
  assert.match(ui,/this\.app\.openModal\(this\.terrainDetailsHTML/);
  assert.match(ui,/data-terrain-details/);
  assert.match(ui,/classList\.add\('terrain-inspect','show'\)/);
  assert.match(ui,/classList\.contains\('terrain-no-room'\)/);
  assert.match(css,/#hud #inspect\.terrain-inspect\s*\{/);
  assert.ok(css.includes('/* Position selected terrain details beneath the hero plate at every screen size,'),'terrain placement CSS must apply on desktop too');
  assert.match(css,/pointer-events:auto!important/);
  assert.match(css,/max-height:var\(--gb-terrain-height,74px\)!important/);
  assert.match(css,/transition:opacity \.14s ease,transform \.14s ease/, 'prevent panel position sweeping across UI controls');
  assert.match(rules,/R\.leyline\.manaBonus/,'Leyline details derive from live rules, not hardcoded preview text');
});
