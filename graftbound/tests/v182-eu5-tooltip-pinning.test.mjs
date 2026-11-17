import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BattleUI } from '../src/ui/battle-ui.js';
import { TileInspectLatch, TILE_INSPECT_LOCK_DELAY_MS } from '../src/ui/terrain-inspect.js';
import { arena } from './helpers.mjs';

const source = p => readFileSync(new URL('../'+p, import.meta.url), 'utf8');
function fakeClock() {
  let now=0, next=0;const pending=new Map();
  const latch=new TileInspectLatch({
    schedule:(fn,ms)=>{const id=++next;pending.set(id,{fn,at:now+ms});return id;},
    cancel:id=>pending.delete(id),
  });
  return {latch,advance(ms){now+=ms;for(const [id,{fn,at}] of [...pending])if(at<=now){pending.delete(id);fn();}},pending};
}
function panel() {
  const names=new Set();
  const attributes=new Map();
  return {innerHTML:'',classList:{add:(...x)=>x.forEach(v=>names.add(v)),remove:(...x)=>x.forEach(v=>names.delete(v)),
    contains:v=>names.has(v),toggle:(v,on)=>{if(on)names.add(v);else names.delete(v);}},
    setAttribute:(k,v)=>attributes.set(k,v),removeAttribute:k=>attributes.delete(k),
    getAttribute:k=>attributes.get(k),style:{setProperty(){}},names};
}
function setup() {
  const old=globalThis.document;const inspect=panel();
  globalThis.document={getElementById:id=>id==='inspect'?inspect:null};
  const clock=fakeClock();
  const ui=Object.create(BattleUI.prototype);
  ui.s=arena(['.....','.....','..P..','.....','.....'],{});
  ui.hover=null;ui.spell=null;ui.busy=false;ui.intents=[];ui.tileInspectLatch=clock.latch;
  ui.refreshHighlights=()=>{};ui.positionTerrainInspect=()=>{};ui.refresh=()=>{};ui.reject=()=>{};
  ui.app={};
  return {ui,inspect,clock,restore(){if(old===undefined)delete globalThis.document;else globalThis.document=old;}};
}
test('visible 1-second gold bar and JavaScript pin agree; cannot be unlocked by leaving or crossing tiles',()=>{
  const h=setup();try{
    const {ui,inspect,clock}=h;
    ui.setHover({x:1,y:1});
    assert.equal(inspect.classList.contains('terrain-locking'),true);
    assert.match(inspect.innerHTML,/data-terrain-details/);
    clock.advance(TILE_INSPECT_LOCK_DELAY_MS-1);
    assert.equal(clock.latch.locked,false);
    clock.advance(1);
    assert.equal(clock.latch.locked,true);
    assert.equal(inspect.classList.contains('terrain-locked'),true);
    assert.deepEqual(ui.pinnedTerrainTile,{x:1,y:1});
    const markup=inspect.innerHTML;
    for(const next of [{x:4,y:4},null,{x:2,y:2}])ui.setHover(next);
    assert.deepEqual(ui.terrainTile,{x:1,y:1});
    assert.equal(inspect.innerHTML,markup);
    assert.equal(inspect.classList.contains('show'),true);
    assert.equal(inspect.classList.contains('terrain-locked'),true);
    ui.cancel();
    assert.equal(clock.latch.locked,false);
    assert.equal(ui.pinnedTerrainTile,null);
    assert.equal(inspect.classList.contains('show'),false);
  }finally{h.restore();}
});
test('visual animation completion activates the same pin once; late timer cannot pin another tile',()=>{
  const h=setup();try{
    const {ui,inspect,clock}=h;
    ui.setHover({x:1,y:1});
    ui.tileInspectLatch.lockNow();
    assert.equal(ui.tileInspectLatch.locked,true);
    assert.equal(inspect.classList.contains('terrain-locked'),true);
    ui.onTile({x:4,y:4},false); // deliberate selection, not hover
    assert.equal(ui.tileInspectLatch.locked,false);
    assert.equal(ui.pinnedTerrainTile,null);
    clock.advance(999);
    assert.equal(ui.tileInspectLatch.locked,false, 'the old tile timer cannot re-pin after selection');
    clock.advance(1);
    assert.equal(ui.tileInspectLatch.locked,true, 'the deliberately selected tile gets its own fresh timer');
    assert.deepEqual(ui.pinnedTerrainTile,{x:4,y:4});
  }finally{h.restore();}
});
test('moving off the board before one second cancels pending lock',()=>{
  const h=setup();try{
    const {ui,clock}=h;
    ui.setHover({x:1,y:1}); clock.advance(500);
    ui.setHover(null);clock.advance(1000);
    assert.equal(clock.latch.locked,false);
    assert.equal(ui.pinnedTerrainTile,null);
  }finally{h.restore();}
});
test('locked tile Details is pointer-interactive, while unlocked hover remains pass-through',()=>{
  const css=source('styles.css'),ui=source('src/ui/battle-ui.js');
  assert.match(css,/#hud #inspect\.terrain-inspect\.terrain-locking\{pointer-events:none!important\}/);
  assert.match(css,/#hud #inspect\.terrain-inspect\.terrain-locked\{pointer-events:auto!important/);
  assert.match(ui,/animationName === 'gb-terrain-lock-fill'/);
  assert.match(ui,/\.lockNow\(\)/);
  assert.match(ui,/\[data-terrain-details\]/);
  assert.match(ui,/this\.openTerrainDetails\(\)/);
  assert.match(ui,/cv\.addEventListener\('pointerleave'/);
});

test('opening tile Details immediately releases the pin, hides the hover panel, and allows normal play on return',()=>{
  const h=setup();try{
    const {ui,inspect,clock}=h;
    const opened=[];
    ui.app.openModal=details=>opened.push(details);
    ui.terrainDetailsHTML=t=>`Tile ${t.x},${t.y} rules`;
    ui.setHover({x:1,y:1});clock.advance(TILE_INSPECT_LOCK_DELAY_MS);
    assert.equal(clock.latch.locked,true);
    const originalBattle=ui.s;
    ui.openTerrainDetails();
    assert.deepEqual(opened,['Tile 1,1 rules']);
    assert.equal(clock.latch.locked,false,'Details clears lock immediately');
    assert.equal(ui.pinnedTerrainTile,null);
    assert.equal(ui.terrainTile,null,'Details cannot reopen a stale tile');
    assert.equal(ui.hover,null);
    assert.equal(inspect.classList.contains('show'),false,'panel no longer blocks play');
    assert.equal(inspect.classList.contains('terrain-locked'),false);
    assert.equal(ui.s,originalBattle,'only UI state was changed');
    // The modal has now been dismissed: a new pointer hover must work without clicking unlock.
    ui.setHover({x:4,y:4});
    assert.deepEqual(ui.terrainTile,{x:4,y:4});
    assert.equal(inspect.classList.contains('show'),true);
    assert.equal(inspect.classList.contains('terrain-locking'),true);
    assert.equal(clock.latch.locked,false);
    clock.advance(TILE_INSPECT_LOCK_DELAY_MS);
    assert.equal(clock.latch.locked,true);
    assert.deepEqual(ui.pinnedTerrainTile,{x:4,y:4});
  }finally{h.restore();}
});
test('terrain Details ignores absent battle or tile and never changes combat state',()=>{
  const h=setup();try{
    const {ui,clock}=h;
    const opened=[];ui.app.openModal=html=>opened.push(html);ui.terrainDetailsHTML=t=>String(t.x);
    ui.openTerrainDetails();assert.deepEqual(opened,[]);
    ui.setHover({x:2,y:1});clock.advance(TILE_INSPECT_LOCK_DELAY_MS);
    ui.s=null;
    ui.openTerrainDetails();assert.deepEqual(opened,[]);
    assert.equal(clock.latch.locked,true,'ignored click cannot accidentally reset an unrelated UI state');
  }finally{h.restore();}
});
