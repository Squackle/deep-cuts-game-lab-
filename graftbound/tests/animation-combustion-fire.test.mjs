import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SmokeField, flameColor } from '../dev/animation-studio/smoke-fluid.js';

const origin={x:.31,y:.68};
function evolve(field,until,source=origin){
 for(let frame=1;frame<=Math.round(until*30);frame++)field.advanceTo(frame/30,source);
}
test('fire palette moves from red/orange to yellow-white as temperature increases',()=>{
 const cold=flameColor(0),mid=flameColor(.5),hot=flameColor(1);
 assert.deepEqual(cold,[185,31,5]);
 assert.deepEqual(hot,[255,248,194]);
 assert.ok(cold[1]<mid[1]&&mid[1]<hot[1]);
 assert.ok(hot[2]>cold[2]);
 assert.ok(flameColor(-10).every(Number.isFinite));
 assert.ok(flameColor(12).every(Number.isFinite));
});
test('caster is the only emission source: burning fuel creates flame locally, not distant smoke',()=>{
 const f=new SmokeField(72,72);
 evolve(f,.32);
 const z=f.stats(origin);
 assert.ok(z.fuel>0,'fuel field must be injected');
 assert.ok(z.flame>0,'combustion must ignite and generate flame');
 assert.ok(z.heat>0,'combustion heats the gas');
 assert.ok(z.flame>z.mass,'build-up should be fire-first, not soot-first');
 const far=2*f.w+f.w-3;
 assert.equal(f.fuel[far],0,'far corner has no fuel');
 assert.equal(f.flame[far],0,'far corner has no magically spawned flame');
});
test('finite burning consumes fuel and produces heat, luminous reaction and small soot',()=>{
 const f=new SmokeField(48,48),i=24*f.w+24;
 f._inject(24,24,2.4,2.8,3);
 const fuel=f.fuel[i],soot=f.density[i];
 f.time=3.46; // turn off caster emission; observe only existing reactants
 f.step({x:24/47,y:24/47});
 assert.ok(f.fuel[i]<fuel,'fuel is consumed during burning and advection');
 assert.ok(f.flame[i]>0,'reaction generates luminous flame');
 assert.ok(f.density[i]>0,'smoke is a by-product');
 assert.ok(f.density[i]<f.flame[i],'soot must not dominate flame at ignition');
 assert.ok(soot>=0);
});
test('rolling flame expands inside bounded arena without non-finite fields',()=>{
 const f=new SmokeField(64,64);
 evolve(f,3.16);
 const z=f.stats(origin);
 assert.ok(z.flame>z.mass,'peak simulated reaction dominates soot');
 assert.ok(z.radius>2,'transport moves material away from caster');
 assert.ok(f.flames.length>0,'visible flame tongues are carried by velocity field');
 for(const p of f.flames){
   assert.ok(p.x>=.7&&p.x<=f.w-1.7,'flame constrained by walls on X');
   assert.ok(p.y>=.7&&p.y<=f.h-1.7,'flame constrained by walls on Y');
 }
 for(const arr of [f.density,f.heat,f.flame,f.fuel,f.u,f.v])assert.ok(arr.every(Number.isFinite),'finite fluid field');
});
test('fire particles and their fuel disappear on reset; reduced motion is bounded',()=>{
 const f=new SmokeField(56,56);
 for(let frame=1;frame<=40;frame++)f.advanceTo(frame/30,origin,true);
 assert.ok(f.flames.length>0&&f.flames.length<=45);
 f.reset();
 assert.equal(f.flames.length,0);
 assert.equal(f.stats(origin).flame,0);
 assert.equal(f.stats(origin).fuel,0);
 assert.equal(f.time,0);
});
test('Animation Lab only: flame tongues and reaction rendering respect the physical tile clip',()=>{
 const code=readFileSync(new URL('../dev/animation-studio/studio.js',import.meta.url),'utf8');
 const flame=readFileSync(new URL('../dev/animation-studio/smoke-fluid.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../dev/animation-studio/index.html',import.meta.url),'utf8');
 assert.match(code,/function drawContainedFlames\(/);
 assert.match(code,/clipToArena\(ctx,sc,0\.04\)/);
 assert.match(code,/drawContainedFlames\(smoke,reduced\)/);
 assert.match(code,/fire:Number\(fireSel\.value\)/);
 assert.match(flame,/nextFuel/);
 assert.match(flame,/nextFlame/);
 assert.match(flame,/lastRenderMetrics/);
 assert.match(html,/id="fire"/);
 assert.doesNotMatch(code,/localStorage|sessionStorage|\/api\//);
});

test('unheated fuel does not spontaneously ignite; temperature must exceed ignition threshold',()=>{
 const cold=new SmokeField(40,40),hot=new SmokeField(40,40);
 const i=20*40+20;
 // Use smooth multi-cell fuel plumes; semi-Lagrangian advection intentionally
 // dissipates unrealistically isolated one-cell sources during transport.
 cold._inject(20,20,3,3,0);
 hot._inject(20,20,3,3,4);
 cold.time=hot.time=3.44;
 cold.step({x:.5,y:.5});
 hot.step({x:.5,y:.5});
 assert.equal(cold.flame[i],0,'fuel with no heat has zero reaction');
 assert.ok(hot.flame[i]>0,'hot fuel reacts');
 assert.ok(hot.fuel[i]<cold.fuel[i],'combustion consumes additional fuel');
});

test('fire polish caps heat and flame reaction rather than saturating to a white slab',()=>{
 const f=new SmokeField(56,56);
 evolve(f,3.03);
 assert.ok(Math.max(...f.flame)<=6.5001,'flame field stays within its reaction range');
 assert.ok(Math.max(...f.heat)<=6.2001,'heat remains within the artist-directed color range');
 assert.ok(f.flames.length<=96,'peak flame tongues are bounded for browser performance');
 const studio=readFileSync(new URL('../dev/animation-studio/studio.js',import.meta.url),'utf8');
 assert.match(studio,/ctx\.bezierCurveTo\(/,'the flame body uses a curved, wind-bent silhouette');
 assert.doesNotMatch(studio,/#fff7cb/,'the previous additive white spike core was removed');
});
