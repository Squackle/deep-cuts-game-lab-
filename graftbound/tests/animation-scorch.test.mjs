import test from 'node:test';import assert from 'node:assert/strict';
import {SmokeField} from '../dev/animation-studio/smoke-fluid.js';
import {readFileSync} from 'node:fs';
const src=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const origin={x:2.5/8,y:5.5/8};
test('scorch grows where burning fire reaches, stays finite and is resettable',()=>{
 const f=new SmokeField(64,64,{spreadSpeed:.65});
 for(let t=1;t<=150;t++)f.advanceTo(t/30,origin);
 const near=f.scorch[11*16+5],far=f.scorch[0];
 assert.ok(near>far+.04,`near=${near}, far=${far}`);
 assert.ok(f.scorch.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 const before=[...f.scorch];
 for(let t=151;t<=180;t++)f.advanceTo(t/30,origin);
 assert.deepEqual([...f.scorch],before,'char remains static beyond burn');
 f.reset();assert.ok(f.scorch.every(v=>v===0));assert.equal(f.scorchDirty,true);
});
test('scorch renders under actors as cached, fixed-pattern pixel char',()=>{
 const source=src('../dev/animation-studio/studio.js');
 assert.match(source,/function scorchCanvas\(/);
 assert.match(source,/lastScorchPaint>\.18/);
 assert.match(source,/#1a1512/);assert.match(source,/#2a211b/);
 assert.match(source,/drawMobileGround\(target\)/);
 assert.match(source,/drawScorch\(target\);\s*drawTileFirelight\(target\)/);
 assert.match(source,/sc\.groundOverlay=sc\.mode==='canvas-2d'/);
 assert.match(src('../dev/animation-studio/canvas-scene.js'),/this\.groundOverlay\(this\.ctx\)/);
});
