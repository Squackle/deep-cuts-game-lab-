import test from 'node:test';
import assert from 'node:assert/strict';
import { SmokeField } from '../dev/animation-studio/smoke-fluid.js';
import { arenaPoint, arenaPolygon, drawSmokeOnArena } from '../dev/animation-studio/arena-projection.js';

const origin={x:.33,y:.66};
function evolve(field,seconds=3.4,source=origin){
  for(let frame=1;frame<=Math.round(seconds*30);frame++)field.advanceTo(frame/30,source);
}
test('invisible chamber zeroes outward velocities on all four edges even after the storm hits them',()=>{
  const f=new SmokeField(64,64);
  evolve(f,3.25);
  for(let y=0;y<f.h;y++){
    assert.equal(f.u[y*f.w],0,'left wall: no outward flow');
    assert.equal(f.u[y*f.w+f.w-1],0,'right wall: no outward flow');
  }
  for(let x=0;x<f.w;x++){
    assert.equal(f.v[x],0,'top wall: no outward flow');
    assert.equal(f.v[(f.h-1)*f.w+x],0,'bottom wall: no outward flow');
  }
  for(const arr of [f.u,f.v,f.density,f.heat]) assert.ok(arr.every(Number.isFinite),'finite fluid state');
});
test('smoke mass remains trapped while embers and billows reflect at box walls',()=>{
  const f=new SmokeField(56,56);
  evolve(f,3.5,{x:.84,y:.5});
  const total=f.stats({x:.84,y:.5});
  assert.ok(total.mass>1, 'smoke remains inside the chamber after the impact');
  assert.ok(f.density.some(n=>n>0.01));
  for(const p of [...f.puffs,...f.embers]){
    assert.ok(p.x>=.7&&p.x<=f.w-1.7,'x particle contained');
    assert.ok(p.y>=.7&&p.y<=f.h-1.7,'y particle contained');
  }
  const idx=(y,x)=>y*f.w+x;
  const wall=f.density[idx(28,f.w-1)];
  const adjacent=f.density[idx(28,f.w-2)];
  assert.equal(wall,adjacent,'gas at solid right wall is not deleted');
  f.reset();
  assert.equal(f.stats().mass,0);
});
test('tile projection aligns arena corners to true 8 by 8 world coordinates',()=>{
  const scene={
    w:8,h:8,cam:{},
    world:(x,y)=>[x-3.5,0,y-3.5],
    project:([x,y,z])=>({x:200+x*11+z*6,y:180+z*8-y*7})
  };
  assert.deepEqual(arenaPoint(scene,0,0,.12),{x:132,y:147.16});
  const bounds=arenaPolygon(scene,.12);
  assert.equal(bounds.length,4);
  assert.deepEqual(bounds[2],arenaPoint(scene,1,1,.12));
  assert.ok(bounds.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
});
test('a single board-shaped clip contains a perspective-warped field even in a rotated camera',()=>{
  const scene={w:8,h:8,cam:{},
    world:(x,y)=>[x-3.5,0,y-3.5],
    project:([x,h,z])=>({x:240+x*12+z*7,y:220+z*9-x*2-h*8})};
  const actions=[],ctx={save:()=>actions.push('save'),restore:()=>actions.push('restore'),
    beginPath:()=>actions.push('path'),moveTo:()=>{},lineTo:()=>{},closePath:()=>{},
    clip:()=>actions.push('clip'),transform:()=>{},drawImage:()=>actions.push('draw'),
    set globalAlpha(v){actions.push('alpha')}
  };
  drawSmokeOnArena(ctx,{width:80,height:80},scene,{steps:5});
  assert.equal(actions.filter(a=>a==='draw').length,5*5*2,'mesh has two warped triangles per tile patch');
  assert.equal(actions.filter(a=>a==='clip').length,1+5*5*2,'board mask and each affine texture triangle are clipped');
});
