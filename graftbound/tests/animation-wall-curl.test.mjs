import test from 'node:test';import assert from 'node:assert/strict';
import {SmokeField} from '../dev/animation-studio/smoke-fluid.js';
import {readFileSync} from 'node:fs';
const src=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const origin={x:2.5/8,y:5.5/8};
test('wall rollers generate bounded licking Curling Flame C sprites',()=>{
 const f=new SmokeField(64,64,{spreadSpeed:1,spriteDensity:1.5});
 for(let i=1;i<=84;i++)f.advanceTo(i/30,origin);
 assert.ok(f.licks.length>0,`no licks at ${f.time}`);
 assert.ok(f.licks.length<=24);
 assert.ok(f.licks.every(p=>p.x>=.7&&p.x<=f.w-1.7&&p.y>=.7&&p.y<=f.h-1.7));
 for(let y=0;y<f.h;y++){assert.equal(f.u[y*f.w],0);assert.equal(f.u[y*f.w+f.w-1],0)}
 for(let x=0;x<f.w;x++){assert.equal(f.v[x],0);assert.equal(f.v[(f.h-1)*f.w+x],0)}
 f.reset();assert.equal(f.licks.length,0);
});
test('wall curl strengthens near-boundary vorticity while preserving distinct B/C families',()=>{
 const solver=src('../dev/animation-studio/smoke-fluid.js');
 const studio=src('../dev/animation-studio/studio.js');
 assert.match(solver,/wallCurl=edge<4\*this\.scale\?1\.6:1/);
 assert.match(solver,/wallFlameDecay/);
 assert.match(solver,/const cap=reduced\?6:24/);
 assert.match(studio,/for\(const lick of field\.licks\)/);
 assert.match(studio,/pixelAtlas\.flames\[frame\]/);
 assert.match(studio,/ctx\.scale\(-1,1\)/);
 assert.match(studio,/clipToArena\(ctx,sc,0\.04\)/);
});
