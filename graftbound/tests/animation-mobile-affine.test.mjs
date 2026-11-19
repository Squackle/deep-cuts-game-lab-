import test from 'node:test';
import assert from 'node:assert/strict';
import {drawSmokeOnArena,arenaPoint} from '../dev/animation-studio/arena-projection.js';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const scene={w:8,h:8,cam:{mode:'canvas-2d'},world:(x,z)=>[x-3.5,0,z-3.5],project:([x,y,z])=>({x:210+14*x-7*z,y:180+9*z+4*x-y*12})};
test('mobile affine projection uses one drawImage and remains finite',()=>{
 const actions=[],ctx={save(){actions.push('save')},restore(){actions.push('restore')},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){actions.push('clip')},transform(...m){actions.push({matrix:m})},drawImage(...x){actions.push({draw:x})},set globalAlpha(a){}};
 const sheet={width:80,height:80};
 drawSmokeOnArena(ctx,sheet,scene,{elevation:.15,steps:4});
 assert.equal(actions.filter(a=>a.draw).length,1);
 assert.equal(actions.filter(a=>a==='clip').length,1);
 const m=actions.find(a=>a.matrix).matrix;
 assert.ok(m.every(Number.isFinite));
 const A=arenaPoint(scene,0,0,.15),B=arenaPoint(scene,1,0,.15),C=arenaPoint(scene,0,1,.15);
 assert.ok(Math.abs(m[4]-A.x)<1e-6);
 assert.ok(Math.abs(m[0]*80+m[4]-B.x)<1e-6);
 assert.ok(Math.abs(m[2]*80+m[4]-C.x)<1e-6);
});
test('perspective mesh path remains available for 3D battle rendering',()=>{
 const other={...scene,cam:{mode:'webgl2'}};
 let draws=0;
 const ctx={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},transform(){},drawImage(){draws++},set globalAlpha(a){}};
 drawSmokeOnArena(ctx,{width:64,height:64},other,{steps:5});
 assert.equal(draws,50);
});
test('mobile matches scene DPR and provides no-filter adaptive rendering',()=>{
 const code=source('../dev/animation-studio/studio.js'),solver=source('../dev/animation-studio/smoke-fluid.js');
 assert.match(code,/sc\?\.mode==='canvas-2d'\?1\.5:2/);
 assert.match(code,/orientationchange/);
 assert.match(code,/visualViewport\?\.addEventListener/);
 assert.match(code,/adaptiveStage/);
 assert.match(solver,/cheapBloom/);
 assert.match(solver,/skipBloom/);
 assert.doesNotMatch(code,/\.\.\.f,x:f\.x|\.\.\.e,x:e\.x/);
});
