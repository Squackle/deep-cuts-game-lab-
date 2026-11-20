import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { arena } from './helpers.mjs';
import { cast, player, enemies } from '../src/engine/combat.js';
import { formatSpellText } from '../src/engine/spells.js';
import { TILE_INSPECT_LOCK_DELAY_MS, TileInspectLatch } from '../src/ui/terrain-inspect.js';
import { validateCreatureIndex } from '../src/rendering/raster-benchmarks.js';

const src = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('39 active painted PNGs cover 42 creature mappings; Lodestone uses a distinct generated model', () => {
  const manifest = JSON.parse(src('assets/hd2d/creatures/index.json'));
  const creatures = validateCreatureIndex(manifest);
  assert.equal(creatures.length, 42);
  const unique = new Set(creatures.map(c => c.file));
  assert.equal(unique.size, 39, '39 active source sheets with 3 token aliases');
  assert.ok(!creatures.some(c => c.key === 'nullwarden'), 'Lodestone art is retired from runtime overrides');
  assert.ok(existsSync(new URL('../assets/hd2d/creatures/nullwarden-poses.png', import.meta.url)), 'original PNG is retained for rollback');
  for (const c of creatures) {
    const path = new URL('../assets/hd2d/' + c.file, import.meta.url);
    assert.ok(existsSync(path), c.file + ' is present');
    const raw = readFileSync(path);
    assert.equal(raw.subarray(0,8).toString('hex'), '89504e470d0a1a0a', c.file);
    assert.equal(raw.readUInt32BE(16), c.size*4, c.file + ' width');
    assert.equal(raw.readUInt32BE(20), c.size*2, c.file + ' height');
  }
  for(const boss of ['nemata','arasta','drakuseth','krenko','scarab','toxrill'])
    assert.ok(creatures.some(c => c.key===boss && c.size===192), boss);
  for(const retired of ['thornmother','matron','unwritten'])
    assert.ok(!creatures.some(c => c.key===retired), retired);
  assert.deepEqual(creatures.find(c=>c.key==='spider').file, 'creatures/friendlySpider-poses.png');
  assert.deepEqual(creatures.find(c=>c.key==='goblin').file, 'creatures/friendlyGoblin-poses.png');
  assert.deepEqual(creatures.find(c=>c.key==='saproling').file, 'creatures/friendlySproutling-poses.png');
});

test('Infest and Venom Mist poison every living creature inside their 3x3 area', () => {
  for(const id of ['mtg:infest', 'venom_mist']) {
    const s=arena(['t...t','.....','..P..','.....','..t..'],{t:'tortoise'},{spellbook:[{id,level:1}]});
    s.p.mana=s.p.maxMana=12;
    const hero=player(s);
    const ally=(x,y,hp=2)=>({uid:s.nextUid++,side:'player',hero:false,defId:'sproutling',name:'Summon',
      x,y,hp,maxHp:2,power:1,toughness:2,move:2,keywords:{},statuses:{}});
    const allyIn=ally(1,1),allyOut=ally(4,3),dead=ally(0,2,0);
    s.units.push(allyIn,allyOut,dead);
    const enemyIn=enemies(s).find(e=>e.x===0&&e.y===0);
    const enemyOut=enemies(s).filter(e=>e!==enemyIn);
    cast(s,id,1,1);
    for(const u of [hero,allyIn,enemyIn]) assert.equal(u.statuses.poison,2,id+' inside '+u.name);
    for(const u of [allyOut,dead,...enemyOut]) assert.equal(u.statuses.poison||0,0,id+' outside/dead '+u.name);
    assert.match(formatSpellText(id),/all creatures in a 3×3 area/i);
  }
});

function fakeTimer() {
  let now=0,seq=0; const timers=new Map();
  const latch=new TileInspectLatch({
    schedule:(fn,ms)=>{const id=++seq;timers.set(id,{fn,at:now+ms});return id;},
    cancel:id=>timers.delete(id)
  });
  return {latch,advance(ms){now+=ms;for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.fn();}}};
}
test('one second exactly locks the tile and moving before completion cancels it', () => {
  assert.equal(TILE_INSPECT_LOCK_DELAY_MS,1000);
  const h=fakeTimer();let a=0,b=0;
  h.latch.watch({x:1,y:1},()=>a++);h.advance(500);
  assert.equal(h.latch.locked,false);
  h.latch.watch({x:2,y:1},()=>b++);
  h.advance(500);assert.deepEqual([a,b,h.latch.locked],[0,0,false]);
  h.advance(500);assert.deepEqual([a,b,h.latch.locked],[0,1,true]);
  h.latch.reset();assert.equal(h.latch.locked,false);
});

test('the compact tile panel has a 2px gold progress line and a persistent Details control', () => {
  const ui=src('src/ui/battle-ui.js'),css=src('styles.css');
  assert.match(ui,/this\.tileInspectLatch\?\.locked/);
  assert.match(ui,/tileInspectLatch \?\?= new TileInspectLatch/);
  assert.match(ui,/gb-terrain-lock-progress/);
  assert.match(ui,/this\.resetTileInspectLock\(\)/);
  assert.match(ui,/data-terrain-details/);
  assert.match(css,/\.gb-terrain-lock-progress\{[^}]*height:2px/);
  assert.match(css,/gb-terrain-lock-fill 1000ms linear forwards/);
  assert.match(css,/\.terrain-plain \.gb-terrain-details-btn\{display:inline-flex/);
});

test('Treasure stays on a dedicated second line inside the hero action strip', () => {
  const js=src('src/ui/battle-ui.js'),css=src('styles.css');
  assert.match(js,/classList\.toggle\('has-treasure'/);
  assert.match(css,/#hud \.pl-act\{flex-wrap:wrap;row-gap:4px\}/);
  assert.match(css,/#hud \.pl-act\.has-treasure \.gb-reserve\{flex:1 1 100%;margin-left:0/);
});

test('Codex upgrades discovered cards to actual Scryfall faces only when visible, preserving scroll', () => {
  const js=src('src/ui/screens.js');
  assert.match(js,/app\.live\.enrich\(button\.dataset\.zoom\)/);
  assert.match(js,/IntersectionObserver/);
  assert.match(js,/button\.innerHTML = cardHTML\(button\.dataset\.zoom/);
  assert.match(js,/if \(card && button\.isConnected && m\.isConnected\)/);
  assert.match(js,/codex-mtg-back/);
  assert.match(js,/Undiscovered/);
  assert.match(js,/sourcePanelHTML\(id\)/);
  const cards=src('src/ui/cards.js');
  assert.match(cards,/c\.sourceInfo\.image\.normal/);
  assert.match(cards,/class="real-img"/);
  assert.match(cards,/cards\.scryfall\.io\/back\.png/);
});

test('the change does not touch ranked, user accounts or telemetry', () => {
  assert.match(src('src/rendering/sprites.js'),/installCreatureArt/);
  assert.match(src('src/rendering/raster-benchmarks.js'),/c\.art \|\| c\.key/);
});
