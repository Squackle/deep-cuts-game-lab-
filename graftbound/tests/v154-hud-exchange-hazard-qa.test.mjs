import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {arena} from './helpers.mjs';
import {planEnemy,pathDamage} from '../src/engine/ai.js';
import {enemies,endTurn} from '../src/engine/combat.js';
import {T} from '../src/core/grid.js';
import {terrainInspectPlacement} from '../src/ui/terrain-inspect.js';
import {RULES_VERSION,RANKED_CHALLENGES,replayRun} from '../src/engine/ranked.js';

const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const rect=(left,top,right,bottom)=>({left,top,right,bottom});
const overlap=(a,b)=>a.left<b.right+8&&a.right>b.left-8&&a.top<b.bottom+8&&a.bottom>b.top-8;
const pictured={width:390,height:700,plate:rect(10,10,335,158),actions:rect(10,166,140,205),
 zones:rect(8,140,145,258),tray:rect(8,455,295,688),endTurn:rect(305,585,382,690),topButtons:rect(344,8,382,196)};
for(const [type,desiredHeight,minHeight] of [['tile',148,108],['creature',224,112]]){
 test(type+' inspector does not overlap Library, character, controls or separate counters',()=>{
   const pos=terrainInspectPlacement({...pictured,desiredHeight,minHeight,maxWidth:type==='tile'?330:350});
   assert.equal(pos.fits,true,JSON.stringify(pos));
   const box=rect(pos.left,pos.top,pos.left+pos.width,pos.top+pos.height);
   for(const k of ['plate','actions','zones','tray','endTurn','topButtons']) assert.equal(overlap(box,pictured[k]),false,type+' overlaps '+k);
   assert.ok(pos.height>=minHeight);
 });
}
test('tile info is a short label and details row; the full rules and hazards stay in a modal',()=>{
 const css=source('styles.css'),ui=source('src/ui/battle-ui.js');
 assert.match(css,/#hud #inspect\.terrain-inspect \.gb-terrain-brief-copy\{display:none!important\}/);
 assert.match(css, /#hud #inspect\.terrain-inspect\{height:var\(--gb-terrain-height,54px\)!important/);
 assert.match(ui,/desiredHeight:unit\?\(mobile\?48:224\):mobile\?48:/);
 assert.match(ui,/data-terrain-details/);
 assert.match(ui,/this\.terrainDetailsHTML\(this\.terrainTile\)/);
 assert.match(ui,/el\.classList\.add\('unit-inspect','show'\)/);
 assert.match(ui,/this\.positionActionCounters\(\)/);
 assert.match(css,/#hud #inspect\.unit-inspect,#hud #inspect\.terrain-inspect\{/);
});
test('v1.5.0: movement and attack counters are integrated into the hero plate action strip',()=>{
 const ui=source('src/ui/battle-ui.js'),html=source('index.html'),css=source('styles.css');
 assert.match(html,/id="gb-action-counters"/);
 const hero=ui.slice(ui.indexOf("$('plate').innerHTML"),ui.indexOf("$('enc-turn')"));
 assert.match(hero,/class="pl-act"/); assert.match(hero,/class="moves"/); assert.match(hero,/class="atk/);
 assert.match(css,/#hud \.gb-action-counters:empty\{display:none!important\}/);
});
test('v1.8.0: plain and special terrain both use compact inspection, with Details for special tiles',()=>{
 const ui=source('src/ui/battle-ui.js'),css=source('styles.css');
 assert.match(ui,/terrain-plain/); assert.match(css,/#inspect\.terrain-inspect\.terrain-plain/);
 assert.match(ui,/terrain-plain'\)\?46:54/);
 assert.match(ui,/data-terrain-details/);
});
test('exchange lists real GRAFTBOUND effects with separate inspect and confirmed release actions',()=>{
 const ui=source('src/ui/screens.js');
 assert.match(ui,/gameSummary\(ac\)/);
 assert.match(ui,/data-exchange-detail/);
 assert.match(ui,/inspectCard\(app, run\.evo\.absorbed\[/);
 assert.match(ui,/back: openExchange/);
 assert.match(ui,/data-g="\$\{i\}"/);
 assert.match(ui,/app\.confirm\(/);
});
test('mandatory survivable lava crossing progresses and inflicts real terrain damage',()=>{
 const s=arena(['#######','#P~~~g#','#######'],{g:'ashbrute'});
 const e=enemies(s)[0]; e.hp=e.maxHp=20;
 const first=planEnemy(s,e);
 assert.deepEqual(first.to,{x:3,y:1});
 assert.ok(first.path.some(t=>s.terrain[t.y*s.w+t.x]===T.LAVA));
 assert.equal(pathDamage(s,e,first.path),4);
 const hp=e.hp;endTurn(s);
 assert.deepEqual({x:e.x,y:e.y},{x:3,y:1});
 assert.equal(e.hp,hp-4);
 assert.deepEqual(planEnemy(s,e).to,{x:2,y:1});
});
test('lethal mandatory lava crossing is still rejected',()=>{
 const s=arena(['#######','#P~~~g#','#######'],{g:'grub'});
 assert.equal(planEnemy(s,enemies(s)[0]).to,null);
});
test('AI rule changes have their own ranked replay fingerprint',()=>{
 assert.equal(RULES_VERSION,'graftbound-rules-1.8.0-beta');
 assert.equal(RANKED_CHALLENGES['gb-expedition-01'].revision,27);
 assert.throws(()=>replayRun('gb-expedition-01',[],{revision:21}),/retired challenge/);
});