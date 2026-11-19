import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SmokeField,FIRE_SPREAD_SPEEDS,normalizedSpreadSpeed,spreadImpactDelay}
  from '../dev/animation-studio/smoke-fluid.js';
import {DURATION,IMPACT_TIME} from '../dev/animation-studio/scenario.js';

const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const origin={x:.3125,y:.6875};

function evolve(field,until){
  for(let frame=1;frame<=Math.round(until*30);frame++)
    field.advanceTo(frame/30,origin);
}

function fireReach(field){
  const peak=Math.max(...field.flame),radii=[];
  const cx=origin.x*(field.w-1),cy=origin.y*(field.h-1);
  for(let y=0;y<field.h;y++)for(let x=0;x<field.w;x++){
    const i=y*field.w+x;
    if(field.flame[i]>Math.max(.03,peak*.17) && field.heat[i]>.26)
      radii.push(Math.hypot(x-cx,y-cy)/(field.w-1)*8);
  }
  radii.sort((a,b)=>a-b);
  return radii.length?radii[Math.floor(.90*(radii.length-1))]:0;
}

test('Fire spread speed offers four precise presets and defaults to slower 0.65x in the lab',()=>{
  assert.deepEqual(FIRE_SPREAD_SPEEDS,[1,.8,.65,.5]);
  assert.equal(normalizedSpreadSpeed('0.65'),.65);
  assert.equal(normalizedSpreadSpeed('invalid'),1);
  assert.equal(normalizedSpreadSpeed(2),1);
  const html=source('../dev/animation-studio/index.html');
  const s=html.match(/<select id="spread-speed"[^>]*>([\s\S]*?)<\/select>/);
  assert.ok(s,'fire spread dropdown exists');
  const selected=[...s[1].matchAll(/<option value="([^"]+)" selected>/g)].map(m=>m[1]);
  assert.deepEqual(selected,['0.65'],'the new slowed spread is the default');
  for(const speed of FIRE_SPREAD_SPEEDS)
    assert.match(s[1],new RegExp('<option value="'+speed+'"(?: selected)?>'));
  assert.match(html,/Playback speed is separate/);
  const studio=source('../dev/animation-studio/studio.js');
  assert.match(studio,/spreadSpeed:Number\(spreadSel\.value\)/);
  assert.match(studio,/spreadSel\.addEventListener\('change',\(\)=>\{if\(sc\)begin\(\);\}\)/);
});

test('radial transport settings reduce outward flame-front reach at identical cast time',()=>{
  const speeds=[1,.8,.65,.5],fields=speeds.map(spreadSpeed=>new SmokeField(64,64,{spreadSpeed}));
  fields.forEach(f=>evolve(f,2.03));
  const reaches=fields.map(fireReach);
  assert.ok(reaches.every(r=>Number.isFinite(r)&&r>0),'all four settings still ignite visible flame');
  assert.ok(reaches[2]<reaches[0]-.25,
    '0.65x must clearly expand more slowly than original at 2.03s: '+reaches);
  assert.ok(reaches[3]<reaches[0]-.45,
    '0.50x must be noticeably slower than original: '+reaches);
  for(const f of fields){
    assert.ok(f.stats(origin).flame>0,'fire still burns');
    for(const a of [f.u,f.v,f.heat,f.fuel,f.flame,f.density])
      assert.ok(a.every(Number.isFinite),'simulation remains finite');
    for(const p of [...f.embers,...f.flames])
      assert.ok(p.x>=.7&&p.x<=f.w-1.7&&p.y>=.7&&p.y<=f.h-1.7,
        'ember/flame sprites remain within arena');
  }
});

test('outward transport scales while vortex curl and approved sprite density remain independent',()=>{
  const solver=source('../dev/animation-studio/smoke-fluid.js');
  assert.match(solver,/outward=\(1\+165\*blast\*this\.spreadSpeed\)/);
  assert.match(solver,/radiate=blast\*strength\*36\*this\.spreadSpeed/);
  assert.match(solver,/swirl=\(7\+27\*charge\)/,'swirl retains original dynamics');
  const f=new SmokeField(50,50,{spreadSpeed:.65,spriteDensity:1.5});
  assert.equal(f.spreadSpeed,.65);
  assert.equal(f.spriteDensity,1.5);
  evolve(f,1.4);
  f.reset();
  assert.equal(f.spreadSpeed,.65,'reset keeps selected spread preset');
  assert.equal(f.spriteDensity,1.5,'reset retains selected pixel density');
  assert.equal(f.stats(origin).mass,0);
  assert.equal(f.embers.length,0);
});

test('visual damage, ash and cool-down timing follow each speed; rules and ash smoke remain unchanged',()=>{
  const delays=FIRE_SPREAD_SPEEDS.map(spreadImpactDelay);
  assert.deepEqual(delays,[0,.12,.21,.30]);
  for(const d of delays){
    assert.ok(IMPACT_TIME+d<3.6+d);
    assert.ok(3.6+d<DURATION+d);
  }
  const studio=source('../dev/animation-studio/studio.js');
  assert.match(studio,/elapsed>=IMPACT_TIME\+delay\) impact\(\)/);
  assert.match(studio,/elapsed>=3\.60\+delay\) removeFallen\(\)/);
  assert.match(studio,/elapsed>=DURATION\+delay\)/);
  assert.match(studio,/ashPile\(u,t-spreadDelay\)/);
  assert.match(studio,/drawAshSmoke\(u,levelClock-ashSmokeBornAt,reduced\)/,
    'ash smoke still runs on independent level clock');
  assert.match(studio,/\$\('count'\)\.textContent = '7 \/ 7 HIT'/);
  assert.doesNotMatch(studio,/localStorage|sessionStorage|\/api\//);
});
