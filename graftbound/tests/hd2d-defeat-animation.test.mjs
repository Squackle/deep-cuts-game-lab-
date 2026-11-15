import test from 'node:test';
import assert from 'node:assert/strict';
import { spriteAnimationFrame, defeatTiming } from '../src/rendering/sprite-animation.js';
import { Scene } from '../src/rendering/scene.js';

const anims={
  idle:{row:0,frames:6,fps:5,loop:true},
  walk:{row:1,frames:8,fps:12,loop:true},
  attack:{row:2,frames:8,fps:14,loop:false},
  hurt:{row:3,frames:4,fps:10,loop:false},
  defeat:{row:4,frames:8,fps:10,loop:false}
};
test('old looping walks and finished attacks retain existing behavior',()=>{
  assert.deepEqual(spriteAnimationFrame('walk',9/12,anims),{state:'walk',frame:1,reset:false});
  assert.deepEqual(spriteAnimationFrame('attack',4,anims),{state:'idle',frame:0,reset:true});
  assert.deepEqual(spriteAnimationFrame('unknown',0,anims),{state:'idle',frame:0,reset:false});
});
test('authored defeat holds its final frame, never switching to an idle/living pose',()=>{
  assert.deepEqual(spriteAnimationFrame('defeat',.2,anims),{state:'defeat',frame:2,reset:false});
  assert.deepEqual(spriteAnimationFrame('defeat',4,anims),{state:'defeat',frame:7,reset:false});
});
test('authored death exposure and legacy fade duration stay independent of game rules',()=>{
  assert.deepEqual(defeatTiming(anims),{authored:true,seconds:.8,fadeStart:.65});
  assert.deepEqual(defeatTiming({idle:anims.idle}),{authored:false,seconds:.55,fadeStart:0});
  assert.deepEqual(defeatTiming(null),{authored:false,seconds:.55,fadeStart:0});
  assert.deepEqual(defeatTiming({...anims,defeat:{frames:100,fps:1}}),{authored:true,seconds:1.4,fadeStart:.65});
});
async function simulatedDeath(withDefeat){
  const scene=Object.create(Scene.prototype), calls=[];
  const u={uid:12,key:'mtg_friendlySquirrel',anim:'idle',animT:5,animSet:withDefeat?anims:{idle:anims.idle,hurt:anims.hurt},flash:0,dissolve:0};
  scene.units=new Map([[12,u]]);scene.centerPos=()=>[0,0,0];
  scene.fx={burst:()=>{}};
  scene.addRing=()=>{};
  scene.tween=async (duration,draw)=>{calls.push(duration);draw(.5);draw(1)};
  scene.removeUnit=id=>scene.units.delete(id);
  await scene.death(12);
  return {u,calls,hasUnit:scene.units.has(12)};
}
test('Scene.death consumes authored animation and removes dead unit after visual completion',async()=>{
  const {u,calls,hasUnit}=await simulatedDeath(true);
  assert.equal(u.anim,'defeat');assert.equal(u.animT,0);
  assert.deepEqual(calls,[.8]);assert.equal(u.dissolve,1);assert.equal(hasUnit,false);
});
test('existing legacy sprite death remains unchanged at 0.55 seconds',async()=>{
  const {u,calls,hasUnit}=await simulatedDeath(false);
  assert.equal(u.anim,'hurt');assert.deepEqual(calls,[.55]);assert.equal(hasUnit,false);
});
