import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CanvasBattleScene} from '../dev/animation-studio/canvas-scene.js';
import {SCENARIO,resolveBoardFire} from '../dev/animation-studio/scenario.js';
import {arenaPolygon,clipToArena} from '../dev/animation-studio/arena-projection.js';

const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fakeContext=()=>{
  const events=[];
  const grad={addColorStop:()=>{}};
  const c={events,createRadialGradient:()=>grad};
  for(const method of ['setTransform','fillRect','beginPath','moveTo','lineTo','closePath','fill','stroke','ellipse','save','restore','clip','drawImage'])
    c[method]=(...args)=>{events.push({method,args});};
  return c;
};
const fakeCanvas=()=>{
  const context=fakeContext(),calls=[];
  const canvas={
    clientWidth:390,clientHeight:460,width:0,height:0,
    getContext:(type)=>{calls.push(type);return type==='2d'?context:null;}
  };
  return {canvas,context,calls};
};

test('Canvas 2D scene never requests WebGL and supports full preview Scene API',()=>{
  const {canvas,context,calls}=fakeCanvas();
  const scene=new CanvasBattleScene(canvas);
  scene.zoom=1.17;
  scene.loadArena({w:8,h:8},11,'warrens');
  assert.deepEqual(calls,['2d']);
  assert.equal(scene.mode,'canvas-2d');
  assert.ok(scene.cam);
  for(const u of SCENARIO){
    const visual=scene.addUnit(u,u.sprite);
    assert.ok(scene.units.has(u.uid));
    assert.deepEqual(visual.pos,scene.world(u.x,u.y));
    assert.ok(Number.isFinite(scene.headPos(u.uid)[1]));
  }
  assert.equal(scene.units.size,7);
  scene.play(1,'cast');scene.hit(1);scene.light(scene.centerPos(1),[1,0,0],5);
  scene.shake(.3);scene.setQuality('high');
  globalThis.window={devicePixelRatio:3};
  scene.frame(1/30);
  assert.ok(canvas.width<=canvas.clientWidth*1.5,'small DPR caps memory allocations');
  assert.ok(context.events.filter(e=>e.method==='fillRect').length>50,'draws full 8x8 board and creature sprites');
  const p=scene.project(scene.world(1,1));
  assert.ok(p.x>0&&p.x<390&&p.y>0&&p.y<460,'scene projection fits portrait screen');
  scene.removeUnit(1);
  assert.equal(scene.units.size,6);
  scene.loadArena({w:8,h:8},11,'warrens');
  assert.equal(scene.units.size,0,'reset clears fallen/remaining units');
  delete globalThis.window;
});

test('fallback board and smoke share identical 8x8 projected boundaries',()=>{
  const {canvas,context}=fakeCanvas();
  const scene=new CanvasBattleScene(canvas);
  scene.loadArena({w:8,h:8},11,'warrens');
  const corners=arenaPolygon(scene,.04);
  assert.equal(corners.length,4);
  assert.ok(corners.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  assert.ok(corners.every(p=>p.x>=0&&p.x<=390&&p.y>=0&&p.y<=460),
    'entire projected tile hull fits a mobile portrait viewport');
  clipToArena(context,scene,.04);
  assert.equal(context.events.at(-1).method,'clip','same clip is used by physics effect layers');
});

test('compatibility mode retains damage/ash semantics rather than creating new gameplay rules',()=>{
  const hits=resolveBoardFire(SCENARIO);
  assert.equal(hits.length,7);
  assert.equal(hits.filter(u=>u.dead).length,3);
  const code=source('../dev/animation-studio/canvas-scene.js');
  assert.doesNotMatch(code,/localStorage|sessionStorage|\/api\/|fetch\(|webgl2|createRenderer\(/i);
  assert.match(code,/class CanvasBattleScene/);
});

test('mobile starts without asset downloads or WebGL; desktop can fall back after initialization failure',()=>{
  const studio=source('../dev/animation-studio/studio.js');
  const html=source('../dev/animation-studio/index.html');
  assert.match(studio,/touchMobile/);
  assert.match(studio,/import\('\.\.\/\.\.\/src\/rendering\/scene\.js'\)/);
  assert.match(studio,/import\('\.\.\/\.\.\/src\/rendering\/sprites\.js'\)/);
  assert.doesNotMatch(studio,/^import \{ Scene \} from/m,
    'mobile must not statically import the full WebGL scene');
  assert.match(studio,/if\(preferCompatible\)\{\s*startCompatibleScene\('mobile'\)/);
  assert.match(studio,/const assets=await loadAssets\(\);\s*sc=new Scene\(canvas,assets\)/);
  assert.match(studio,/catch\(err\)\{\s*startCompatibleScene\(err\?\.message/);
  assert.match(studio,/new CanvasBattleScene\(compatCanvas\)/);
  assert.match(studio,/canvas\.style\.display='none'/);
  assert.match(studio,/sc\.mode==='canvas-2d'/);
  assert.match(html,/id="renderer-status"/);
  assert.match(html,/Mobile compatibility:/);
  assert.doesNotMatch(studio,/Unable to prepare the GRAFTBOUND preview\. This requires WebGL2/);
});

test('runtime GPU context loss recovers using mobile-safe scene; failure UI can be re-mounted',()=>{
  const studio=source('../dev/animation-studio/studio.js');
  assert.match(studio,/canvas\.addEventListener\('webglcontextlost'/);
  assert.match(studio,/event\.preventDefault\(\)/);
  assert.match(studio,/startCompatibleScene\('WebGL context lost'\)/);
  assert.match(studio,/if\(!loading\)\{\s*loading=document\.createElement\('div'\)/);
  assert.match(studio,/effects\.parentNode\.appendChild\(loading\)/);
});
