import test from 'node:test';
import assert from 'node:assert/strict';
import {PRESET,gridFor,impactFor,PyroclasmVisual} from '../src/rendering/pyroclasm-live.js';
import {SmokeField} from '../src/rendering/pyroclasm/smoke-fluid.js';
test('approved cinematic preset and bounded grids',()=>{assert.deepEqual(PRESET,{spriteDensity:1.5,spreadSpeed:.65,fire:1.5,smoke:1.35});assert.equal(gridFor(390,false,false),64);assert.equal(gridFor(1200,true,false),44);assert.equal(gridFor(1200,false,true),44);});
test('impact is bounded and follows lab timing',()=>{const field=new SmokeField(44,44,PRESET);field.trackTargets([{x:4,y:4}]);assert.ok(Math.abs(impactFor(field)-3.37)<.001);field.arrivals=[2.8];assert.ok(impactFor(field)>=3.2&&impactFor(field)<=3.91);});
test('actual tile residue bounded and reset releases pending visual',async()=>{const fx=new PyroclasmVisual({});let removed=false;fx.canvas={remove(){removed=true;}};fx.addAsh(1,[2,0,3]);fx.addAsh(2,[2,0,3]);assert.equal(fx.ash.size,1);const done=new Promise(resolve=>{fx.active={resolve};});fx.reset();await done;assert.equal(fx.ash.size,0);assert.equal(fx.active,null);assert.equal(removed,true);});
