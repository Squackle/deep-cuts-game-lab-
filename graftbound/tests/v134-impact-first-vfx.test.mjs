import test from 'node:test';
import assert from 'node:assert/strict';
import { shock,flameSlash,frost,lightningBolt,fire,impactEnvelope } from '../src/rendering/vfx.js';
import { arena } from './helpers.mjs';
import { cast,player } from '../src/engine/combat.js';

function fixture(){
  const calls={hit:[],bolt:0,burst:0,ring:0};
  const v={pos:[0,0,0],scale:.38,flashCold:0,flash:0,hidden:false};
  const scene={
    speed:20,reduced:false,disposed:false,units:new Map([[7,v]]),
    centerPos:()=>[0,.45,0],heightOf:()=>.75,
    fx:{density:1,burst:()=>{calls.burst++},emit:()=>{},swirl:()=>{}},
    light:()=>({}),addBolt:()=>{calls.bolt++},addRing:()=>{calls.ring++},
    screenFlash:()=>{},shake:()=>{},hit:(uid)=>{calls.hit.push(uid)},
    projectile:async()=>{},tween:async(time,fn)=>{fn(0);fn(.5);fn(1)}
  };
  return {scene,calls,v};
}
const from=[-1,.2,0],to=[0,.4,0];
test('spell impact returns BEFORE the one-second elemental aftermath finishes',async()=>{
  for(const [name,fn] of [
    ['Shock',shock],['Flame Slash',flameSlash],['Frost Breath',frost],
    ['Lightning Bolt',lightningBolt],['Fire projectile',fire]
  ]){
    const {scene,calls}=fixture();
    await fn(scene,{from,to,target:7,big:false,level:1,charged:false});
    assert.deepEqual(calls.hit,[7],name+' should mark impact before returning');
    assert.equal(scene.lingeringSpellEffects?.size,1,name+' aftermath must still be running when damage is displayed');
    const before=calls.bolt+calls.burst+calls.ring;
    await Promise.all([...scene.lingeringSpellEffects]);
    assert.ok(calls.bolt+calls.burst+calls.ring>before,name+' must keep animating after impact');
    // Promise cleanup is queued as a microtask, without affecting battle state.
    await Promise.resolve();await Promise.resolve();
    assert.equal(scene.lingeringSpellEffects.size,0,name+' tracks completed visual cleanup');
  }
});
test('lingering electricity remains at last hit tile when a creature dies',async()=>{
  const {scene,calls,v}=fixture();
  const work=impactEnvelope(scene,7,'shock',800);
  const before=calls.bolt+calls.burst+calls.ring;
  scene.units.delete(7);v.hidden=true;
  await work;
  assert.ok(calls.bolt+calls.burst+calls.ring>before,'dead target must not make aftermath disappear immediately');
});
test('frost visual resets its temporary coating without removing gameplay statuses',async()=>{
  const {scene,v}=fixture();v.statuses={stunned:1};
  await frost(scene,{from,to,target:7});
  assert.equal(scene.lingeringSpellEffects.size,1);
  await Promise.all([...scene.lingeringSpellEffects]);
  assert.equal(v.flashCold,0);
  assert.equal(v.statuses.stunned,1,'VFX never changes simulation rules');
});
test('combat engine produces damage and status events immediately after impact event',()=>{
  const s=arena(['t....','.....','..P..'],{t:'tortoise'},{spellbook:[{id:'mtg:frost-breath',level:1}]});
  s.p.mana=30;s.p.maxMana=30;
  const t=s.units.find(u=>u.defId==='tortoise');
  const ev=cast(s,'mtg:frost-breath',t.x,t.y);
  const start=ev.findIndex(e=>e.t==='spell');
  const damage=ev.findIndex(e=>e.t==='damage'&&e.uid===t.uid);
  const status=ev.findIndex(e=>e.t==='status'&&e.uid===t.uid);
  assert.ok(start>=0&&damage>start,'damage is queued at the same impact before lingering render');
  assert.ok(status>start,'freeze/status is queued without waiting for the VFX timer');
  assert.equal(player(s).hp>0,true);
});
