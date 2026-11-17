// GRAFTBOUND v1.8.0-beta mobile HUD: aligned zone rail, original pixel gravestone, compact terrain info.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {terrainInspectPlacement} from '../src/ui/terrain-inspect.js';
import {describeTile} from '../src/engine/describe.js';
import {T} from '../src/core/grid.js';
import {ICON} from '../src/ui/icons.js';
import {BattleUI} from '../src/ui/battle-ui.js';

const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('empty Graveyard uses pixel gravestone; occupied Graveyard still shows its latest real card',()=>{
 const ui=src('src/ui/battle-ui.js'),css=src('styles.css');
 assert.match(ICON.graveyard,/viewBox="0 0 32 44"/);
 assert.match(ICON.graveyard,/shape-rendering="crispEdges"/);
 assert.ok((ICON.graveyard.match(/<rect /g)||[]).length>=15,'icon uses hand-authored chunky pixels');
 assert.match(ui,/last \? cardHTML\(last\.id \|\| last,\{small:true,uid:'graveyard-zone',extraClass:'gb-grave-top'\}\) : `<span class="gb-zone-empty gb-grave-empty">\$\{ICON\.graveyard\}<\/span>`/);
 assert.match(css,/\.gb-grave-empty \.ic\{display:block;width:31px;height:43px/);
});

test('all three mobile zones share one alignment rail and fixed counter-row height',()=>{
 const css=src('styles.css');
 assert.match(css,/#hud \.gb-card-zones\{align-items:flex-start\}/);
 assert.match(css,/#hud \.gb-zone\{align-self:flex-start;justify-content:flex-start\}/);
 assert.match(css,/#hud \.gb-zone-meta\{width:100%;height:34px;min-height:34px;display:flex;flex-direction:column;flex-wrap:nowrap/);
 assert.match(css,/#hud \.gb-zone-art\{flex:0 0 auto\}/);
});

test('Leyline shows one summary row and its full effect only through Details',()=>{
 const tile={w:2,h:2,terrain:[T.LEYLINE,0,0,0],phase:'player',units:[],p:{moveLeft:0}};
 const rows=describeTile(tile,0,0);
 assert.ok(rows.some(r=>r.name==='Leyline'&&r.kind==='benefit'));
 const previous=globalThis.document;
 const flags=new Set();
 const panel={innerHTML:'',classList:{add:(...x)=>x.forEach(k=>flags.add(k)),remove:(...x)=>x.forEach(k=>flags.delete(k)),toggle:(k,b)=>b?flags.add(k):flags.delete(k),contains:k=>flags.has(k)}};
 globalThis.document={getElementById:id=>id==='inspect'?panel:null};
 try{
   const inspector=Object.create(BattleUI.prototype);
   inspector.s=tile; inspector.positionTerrainInspect=()=>{};
   inspector.showTile({x:0,y:0});
   assert.match(panel.innerHTML,/>Leyline<\/strong>/);
   assert.match(panel.innerHTML,/>Benefit<\/span>/);
   assert.match(panel.innerHTML,/data-terrain-details/);
   assert.doesNotMatch(panel.innerHTML,/Ancient channel of power/);
   assert.match(inspector.terrainDetailsHTML({x:0,y:0}),/Ancient channel of power/);
   assert.equal(flags.has('terrain-inspect'),true);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('compact tile panel fits beside mobile HUD, not across half the battlefield',()=>{
 const box=(l,t,r,b)=>({left:l,top:t,right:r,bottom:b});
 const q={width:390,height:700,plate:box(10,10,335,126),zones:box(8,490,169,615),tray:box(8,620,300,692),endTurn:box(304,570,385,692),topButtons:box(345,10,383,196)};
 const p=terrainInspectPlacement({...q,desiredHeight:48,minHeight:48,maxWidth:330});
 assert.equal(p.fits,true,JSON.stringify(p));
 assert.equal(p.height,48);
});
