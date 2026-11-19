import test from 'node:test';
import assert from 'node:assert/strict';
import { SmokeField } from '../dev/animation-studio/smoke-fluid.js';

// Visual gas is decoupled from engine actions and should have predictable, local emission.
test('smoke begins at the spellcaster, not as a full-screen overlay', () => {
  const field=new SmokeField(90,60),origin={x:.31,y:.68};
  field.advanceTo(.17,origin);
  const close=field.density[Math.round(origin.y*59)*90+Math.round(origin.x*89)];
  const far=field.density[3*90+85];
  assert.ok(close>.01,'caster is emitting smoke');
  assert.ok(far<.000001,'remote battlefield remains clear at the beginning');
  assert.ok(field.stats(origin).mass>0);
});
test('advected smoke forms a moving outward plume and is resettable', () => {
  const field=new SmokeField(90,60),origin={x:.31,y:.68};
  // Evolve at the simulator's 30 Hz tick rather than leaping past its bounded
  // frame catch-up budget, as a browser's requestAnimationFrame loop does.
  for(let frame=1;frame<=23;frame++) field.advanceTo(frame/30,origin);
  const early=field.stats(origin);
  for(let frame=24;frame<=92;frame++) field.advanceTo(frame/30,origin);
  const late=field.stats(origin);
  assert.ok(late.radius>early.radius+1, 'plume must visibly spread out from player');
  assert.ok(late.remote>early.remote, 'density must reach more distant battlefield cells');
  assert.ok(field.embers.length>0, 'fire embers should be carried in the same flow');
  assert.ok(field.puffs.length>0,'billows should be carried in the same airflow');
  for (const a of [field.u,field.v,field.density,field.heat]) {
    assert.ok(a.every(Number.isFinite),'simulation must remain finite');
  }
  field.reset();
  assert.equal(field.stats(origin).mass,0);
  assert.equal(field.embers.length,0);
  assert.equal(field.puffs.length,0);
  assert.equal(field.time,0);
});
test('reduced motion still shows emanating localized gas without high-density sparks',()=>{
  const f=new SmokeField(50,32),origin={x:.4,y:.6};
  f.advanceTo(1.2,origin,true);
  assert.ok(f.stats(origin).mass>0);
  assert.ok(f.embers.length<=48);
});
test('simulated fluid is presentation only, without cookies, APIs or saving', () => {
  const s = String(SmokeField);
  assert.doesNotMatch(s,/localStorage|sessionStorage|\/api\/|fetch\(|saveRun|Math\.random/);
});

test('all moving smoke lobes emerge from the caster before traveling through the arena',()=>{
 const f=new SmokeField(90,60),start={x:.31,y:.68};
 f.advanceTo(.16,start);
 assert.ok(f.puffs.length>0);
 for(const puff of f.puffs) assert.ok(Math.hypot(puff.x-start.x*89,puff.y-start.y*59)<9,
   'an early billow must not spawn away from caster');
});
