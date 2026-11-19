import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ashSmokePuffs, ASH_SMOKE_CYCLE } from '../dev/animation-studio/ash-smoke.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('each ash mound emits only subtle, cool, non-fiery drifting flecks',()=>{
  assert.equal(ASH_SMOKE_CYCLE,3.2);
  for(const uid of [2,4,5]){
    for(const t of [0.5,1,2,3,4,5,17,35,200,3600]){
      const puffs=ashSmokePuffs(t,uid);
      assert.ok(puffs.length>=1&&puffs.length<=6,'at most six faint pixels clusters per mound');
      for(const p of puffs){
        assert.ok(Number.isFinite(p.x)&&Math.abs(p.x)<.24,'smoke drifts only slightly sideways');
        assert.ok(p.rise>0&&p.rise<1.1,'smoke ascends a short distance');
        assert.ok(p.alpha>0&&p.alpha<=.22,'smoke is transparent and subtle');
        assert.ok(p.size>0&&p.size<=.07,'pixel clusters are tiny');
      }
    }
  }
  const code=read('../dev/animation-studio/studio.js');
  assert.match(code,/ctx\.fillStyle='#aab0ae'/,'wisps use cool grey, not orange flames');
  assert.doesNotMatch(read('../dev/animation-studio/ash-smoke.js'),/setInterval|setTimeout|Math\.random|localStorage|fetch\(/);
});

test('ash smoke animates indefinitely rather than fading out with 5.2-second Pyroclasm',()=>{
  const times=[0.5,2,4,6,9,15,30,90,240,500,3600];
  const visible=times.map(t=>ashSmokePuffs(t,2));
  assert.ok(visible.every(puffs=>puffs.length>0));
  assert.notDeepEqual(visible[0],visible[1]);
  assert.notDeepEqual(visible[4],visible[6]);
  assert.notDeepEqual(visible[8],visible[9]);
  assert.deepEqual(ashSmokePuffs(123,4),ashSmokePuffs(123,4),'deterministic for the same level time');
  assert.deepEqual(ashSmokePuffs(-1,4),[]);
  assert.deepEqual(ashSmokePuffs(NaN,4),[]);
});

test('reduced motion lowers count but still leaves a gentle persistent ash wisp',()=>{
  for(const t of [1,5,10,100,900]){
    const reduced=ashSmokePuffs(t,5,true);
    const full=ashSmokePuffs(t,5,false);
    assert.ok(reduced.length>=1&&reduced.length<=2);
    assert.ok(reduced.length<full.length);
    assert.ok(reduced.every(x=>x.alpha<=.16));
  }
});

test('smoke remains independent of the capped spell clock until battlefield reset',()=>{
  const code=read('../dev/animation-studio/studio.js');
  assert.match(code,/let levelClock=0, ashSmokeBornAt=null/);
  assert.match(code,/levelClock\+=dt/);
  assert.match(code,/ashSmokeBornAt=levelClock/);
  assert.match(code,/drawAshSmoke\(u,levelClock-ashSmokeBornAt,reduced\)/);
  assert.match(code,/levelClock=0; ashSmokeBornAt=null/);
  assert.match(code,/if\(elapsed>=DURATION\) \{playing=false/);
  assert.match(code,/if\(removed\)drawAshSmoke/);
  assert.match(code,/clipToArena\(ctx,sc,0\.04\)/,'persistent flecks stay within the board');
  assert.doesNotMatch(code,/drawAshSmoke\(u,t/,'ash residue cannot reuse the frozen cinematic time');
});
