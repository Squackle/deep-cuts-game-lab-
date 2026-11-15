import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ADVANCED_BOSS_KEYS,BOSS_STATES,advancedBossPose} from '../src/rendering/advanced-boss-motion.js';
import {LEGENDARY_BOSS_KEYS} from '../src/rendering/legendary-boss-art.js';
const art=readFileSync(new URL('../src/rendering/legendary-boss-art.js',import.meta.url),'utf8');

const LEGACY=['thornmother','matron','unwritten'];
test('all three original act bosses have six authored deterministic states in both directions',()=>{
  assert.equal(ADVANCED_BOSS_KEYS.length,9);
  for(const name of LEGACY){
    assert.ok(ADVANCED_BOSS_KEYS.includes(name));
    assert.ok(!LEGENDARY_BOSS_KEYS.includes(name),'legacy boss must not masquerade as a Magic legendary');
    for(let state=0;state<BOSS_STATES.length;state++)for(const back of [false,true]){
      const poses=Array.from({length:4},(_,f)=>advancedBossPose(name,state,f,back));
      assert.ok(poses.every(x=>x.name===name&&x.back===back));
      assert.ok(new Set(poses.map(p=>JSON.stringify(p))).size>=3,
        name+' '+BOSS_STATES[state]+' is a repeated static frame');
      assert.deepEqual(poses,Array.from({length:4},(_,f)=>advancedBossPose(name,state,f,back)));
    }
  }
});
test('Thornmother roots, crown, branch lashes, heartwood and defeat move as a coherent body',()=>{
  const walk=Array.from({length:4},(_,f)=>advancedBossPose('thornmother',1,f));
  assert.equal(new Set(walk.map(p=>p.thornRoot)).size,4);
  const attack=Array.from({length:4},(_,f)=>advancedBossPose('thornmother',2,f));
  assert.ok(attack[2].thornLash>attack[0].thornLash);
  const cast=Array.from({length:4},(_,f)=>advancedBossPose('thornmother',3,f));
  assert.ok(cast[2].heartwoodPulse>cast[0].heartwoodPulse);
  assert.ok(cast[2].thornCrown>cast[0].thornCrown);
  assert.ok(advancedBossPose('thornmother',5,3).sink>0);
});
test('Pyre Matron moves its brood feet, foreclaws, furnaced abdomen and crown independently',()=>{
  const walk=Array.from({length:4},(_,f)=>advancedBossPose('matron',1,f));
  assert.ok(new Set(walk.map(p=>p.broodStride)).size>=3);
  const attack=Array.from({length:4},(_,f)=>advancedBossPose('matron',2,f));
  assert.ok(attack[2].clawSwipe>attack[0].clawSwipe);
  const cast=Array.from({length:4},(_,f)=>advancedBossPose('matron',3,f));
  assert.ok(cast[2].moltenPulse>cast[0].moltenPulse);
  assert.ok(advancedBossPose('matron',5,3).hornTilt>0);
});
test('The Unwritten drifts, sweeps scrolls, articulates void limbs and casts from its mask',()=>{
  const walk=Array.from({length:4},(_,f)=>advancedBossPose('unwritten',1,f));
  assert.ok(new Set(walk.map(p=>p.voidFloat)).size>=3);
  const attack=Array.from({length:4},(_,f)=>advancedBossPose('unwritten',2,f));
  assert.ok(attack[2].voidArm>attack[0].voidArm);
  const cast=Array.from({length:4},(_,f)=>advancedBossPose('unwritten',3,f));
  assert.ok(cast[2].glyphBurst>cast[0].glyphBurst);
  assert.ok(cast[2].maskBend>cast[0].maskBend);
  assert.ok(advancedBossPose('unwritten',5,3).scrollFlutter<0);
});
test('real atlas consumes all three identities without altering Magic rules, saves or RNG',()=>{
  for(const name of LEGACY)assert.ok(art.includes('function '+name+'(g,S)'));
  assert.ok(art.includes("const m=S.motion"));
  assert.ok(art.includes('const root=m?m.thornRoot:0,lash=m?m.thornLash:0,crown=m?m.thornCrown:0;'));
  assert.ok(art.includes('const step=m?m.broodStride:0,claw=m?m.clawSwipe:0;'));
  assert.ok(art.includes('const flutter=m?m.scrollFlutter:0,arm=m?m.voidArm:0,glow=m?m.glyphBurst:0;'));
  assert.ok(art.includes('advanced?ANIMS+1:ANIMS'));
  assert.ok(art.includes("defeat:{row:5,frames:4,fps:7,loop:false}"));
  const motion=readFileSync(new URL('../src/rendering/advanced-boss-motion.js',import.meta.url),'utf8');
  for(const forbidden of ['Math.random','localStorage','window.','player.hp =','s.rng ='])
    assert.equal(motion.includes(forbidden),false);
});
