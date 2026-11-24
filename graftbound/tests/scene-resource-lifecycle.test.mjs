import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from '../src/rendering/scene.js';
import { SPR_FLOATS } from '../src/rendering/gl.js';

function fixture() {
  const scene = Object.create(Scene.prototype);
  const freed = [], shared = { t: 'shared', w: 32, h: 64 };
  const anims = { idle: { row: 0, frames: 1, fps: 5, loop: true } };
  scene.r = { freeTexture: tex => freed.push(tex), qName: 'balanced' };
  scene.man = { sprites: { blank: { w: 32, h: 32, pivotY: 30 } }, anims, views: ['front', 'back'], foliage: { frames: { rock: { x: 0, y: 0, w: 8, h: 8 } } } };
  scene.tex = { blank: shared }; scene.foliageTex = shared;
  scene.units = new Map(); scene.static = { foliage: [] }; scene.shadows = [];
  scene.cam = { fwd: [0, 0, 1], right: [1, 0, 0] };
  scene.focus = [0, 0, 0]; scene.time = 0; scene.speed = 100; scene.w = 8; scene.h = 8;
  scene.sprBuf = new Float32Array(500 * 6 * SPR_FLOATS);
  const add = uid => scene.addUnit({ uid, side: 'player', x: 1, y: 1 }, 'blank');
  return { scene, freed, shared, add };
}

test('private creature textures release exactly once; shared atlas survives removal and replacement', () => {
  const { scene, freed, add, shared } = fixture();
  const owned = { t: 'private' };
  const first = add(1); first.ownTex = owned; first.tex = owned;
  const second = add(1);
  assert.deepEqual(freed, [owned]);
  assert.equal(second.tex, shared);
  assert.equal(scene.removeUnit(1, first), false);
  assert.equal(scene.units.get(1), second);
  assert.equal(scene.removeUnit(1), true);
  assert.equal(scene.removeUnit(1), false);
  assert.deepEqual(freed, [owned]);
});

test('sprite buffer expands for more than 500 quads and reuses its allocation', () => {
  const { scene, add } = fixture();
  for (let uid = 1; uid <= 25; uid++) add(uid);
  scene.static.foliage = Array.from({ length: 600 }, (_, i) => ({ kind: 'rock', x: i % 8, z: Math.floor(i / 8) }));
  const old = scene.sprBuf;
  const batches = scene.buildSprites(0);
  assert.notEqual(scene.sprBuf, old);
  assert.equal(batches.reduce((n, b) => n + b.count, 0), 625 * 6);
  assert.ok(batches.every(b => b.data.length >= b.count * SPR_FLOATS));
  const grown = scene.sprBuf;
  scene.buildSprites(0);
  assert.equal(scene.sprBuf, grown);
});

test('camera-relative facing dead zone depends on angle, not target distance', () => {
  const { scene, add } = fixture();
  const a = add(1), b = add(2);
  a.dir = [0.03, 1]; b.dir = [0.3, 10];
  a.lastFlip = b.lastFlip = false;
  scene.buildSprites(0);
  assert.equal(a.lastFlip, false);
  assert.equal(b.lastFlip, false);
  a.dir = [1, 0]; b.dir = [10, 0];
  scene.buildSprites(0);
  assert.equal(a.lastFlip, true);
  assert.equal(b.lastFlip, true);
});

test('walk animation resets its clock at start and at arrival', async () => {
  const { scene, add } = fixture();
  const v = add(1); v.animT = 4;
  let clockAtStep;
  scene.onStep = unit => { clockAtStep = unit.animT; };
  await scene.movePath(1, [{ x: 1, y: 1 }, { x: 2, y: 1 }]);
  assert.equal(clockAtStep, 0);
  assert.equal(v.anim, 'idle');
  assert.equal(v.animT, 0);
  assert.deepEqual(v.pos, scene.world(2, 1));
});

test('overlapping counter-hit and attack recovery both return to the true tile', async () => {
  const { scene, add }=fixture(), a=add(1), b=add(2);
  b.pos=scene.world(2,1);
  const pending=[];
  scene.fx={burst(){}};scene.light=()=>{};scene.shake=()=>{};
  scene.tween=async (dur, fn)=>{if(dur===0.2||dur===0.16)pending.push(fn);else fn(1);};
  await scene.lunge(1,2);
  assert.ok(Math.abs(a.lunge[0])>0);
  scene.hit(1);
  pending[1](0.5);
  assert.notEqual(scene.headPos(1)[0],a.pos[0]);
  pending[0](1);pending[1](1);
  assert.ok(a.lunge.every(x=>x===0));
  assert.ok(a.recoil.every(x=>x===0));
  assert.equal(scene.headPos(1)[0],a.pos[0]);
});
test('older attack recovery cannot overwrite the next strike', async () => {
  const {scene,add}=fixture(),a=add(1),b=add(2),c=add(3);
  b.pos=scene.world(2,1);c.pos=scene.world(0,1);
  const pending=[];
  scene.tween=async(dur,fn)=>{if(dur===0.2)pending.push(fn);else fn(1);};
  await scene.lunge(1,2);await scene.lunge(1,3);
  const strike=a.lunge.slice();
  pending[0](1);
  assert.deepEqual(a.lunge,strike);
  pending[1](1);assert.ok(a.lunge.every(x=>x===0));
});
test('mixed swarm, foliage and shadow effects generate finite complete sprite batches', () => {
  const {scene,add,shared}=fixture();
  for(let uid=1;uid<=64;uid++){const v=add(uid);v.pos=scene.world((uid-1)%8,Math.floor((uid-1)/8));if(uid%4===0)v.tex={...shared};}
  scene.static.foliage=Array.from({length:600},(_,i)=>({kind:'rock',x:i%8,z:Math.floor(i/8)}));
  scene.shadowTex=scene.boneTex=scene.toxicTex={w:256,h:256};
  for(let i=0;i<160;i++)scene.addShadow({tex:['shadow','bones','toxic'][i%3],frames:[[0,0]],pos:[i%8,0,0],size:.3,life:1});
  const batches=scene.buildSprites(0);
  assert.equal(batches.reduce((n,b)=>n+b.count,0),(64+600+160)*6);
  for(const b of batches)assert.ok(b.data.subarray(0,b.count*SPR_FLOATS).every(Number.isFinite));
});
