import test from 'node:test';
import assert from 'node:assert/strict';
import {SmokeField,computeImpactTime} from '../dev/animation-studio/smoke-fluid.js';
import {SCENARIO,IMPACT_TIME,resolveBoardFire,DAMAGE} from '../dev/animation-studio/scenario.js';

const origin={x:2.5/8,y:5.5/8};
const speeds=[1,.8,.65,.5], grids=[44,64,112];
const readings=[];
for(const cells of grids)for(const spreadSpeed of speeds){
  const field=new SmokeField(cells,cells,{spreadSpeed,spriteDensity:1.5});
  field.trackTargets(SCENARIO.map(u=>({x:(u.x+.5)/8*(cells-1),y:(u.y+.5)/8*(cells-1)})));
  for(let frame=1;frame<=126;frame++)field.advanceTo(frame/30,origin);
  const last=field.arrivals.every(t=>t!=null)?Math.max(...field.arrivals):null;
  readings.push({cells,spreadSpeed,field,last,impact:computeImpactTime(field.arrivals,spreadSpeed,IMPACT_TIME)});
}
test('all seven flame-front arrivals exist for 44/64/112-cell solver at each spread',()=>{
  for(const v of readings){
    assert.ok(v.last!=null,`${v.cells} / ${v.spreadSpeed} missing arrivals`);
    assert.equal(v.field.arrivals.length,7);
    assert.equal(v.field.skipped,false);
  }
});
test('impact is a single beat 0.2–0.5s after last reached, ordered for four speeds',()=>{
  for(const v of readings){
    const gap=v.impact-v.last;
    assert.ok(gap>=.2-1e-6&&gap<=.5+1e-6,`gap ${v.cells}/${v.spreadSpeed} ${gap.toFixed(3)}s`);
  }
  for(const cells of grids){
    const row=readings.filter(r=>r.cells===cells);
    assert.ok(row.every((v,i)=>i===0||v.impact>=row[i-1].impact));
  }
});
test('grid variation in arrival is under 120ms at every speed',()=>{
  for(const sp of speeds){
    const arrivals=readings.filter(v=>v.spreadSpeed===sp).map(v=>v.last);
    assert.ok(Math.max(...arrivals)-Math.min(...arrivals)<=.12,`${sp}: ${arrivals}`);
  }
});
test('damage still resolves simultaneously as original Pyroclasm fixture',()=>{
  assert.equal(DAMAGE,2);
  assert.deepEqual(resolveBoardFire(SCENARIO).map(u=>u.hp),[3,0,2,0,0,2,1]);
  assert.deepEqual(resolveBoardFire(SCENARIO).filter(u=>u.dead).map(u=>u.uid),[2,4,5]);
});
test('0.6s dropped frame leaves debt and does not skip physics time',()=>{
  const field=new SmokeField(64,64,{spreadSpeed:.65});
  for(let t=1;t<=45;t++)field.advanceTo(t/30,origin);
  const before=field.time;
  field.advanceTo(before+.6,origin);
  assert.ok(field.time<before+.6-.1,'did not jump to wall time');
  assert.equal(field.skipped,false);
  for(let t=1;t<=15;t++)field.advanceTo(before+.6,origin);
  assert.ok(Math.abs(field.time-(before+.6))<.04);
  const other=new SmokeField(64,64,{spreadSpeed:.65});
  other.advanceTo(2.2,origin);
  assert.equal(other.skipped,true,'tab resume beyond 1s is flagged');
  other.reset();assert.equal(other.skipped,false);
  assert.equal(other.arrivals.length,0);
});
