import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ADVANCED_BOSS_KEYS,advancedBossPose,BOSS_STATES} from '../src/rendering/advanced-boss-motion.js';
import {LEGENDARY_BOSS_KEYS,BOSS_PRINTINGS} from '../src/rendering/legendary-boss-art.js';
const source=readFileSync(new URL('../src/rendering/legendary-boss-art.js',import.meta.url),'utf8');

test('Arasta and Drakuseth remain distinct official-printing bosses with six deterministic animation states',()=>{
  for(const name of ['arasta','drakuseth']){
    assert.ok(ADVANCED_BOSS_KEYS.includes(name));
    assert.ok(LEGENDARY_BOSS_KEYS.includes(name));
    assert.ok(BOSS_PRINTINGS[name].set&&BOSS_PRINTINGS[name].character);
    for(let state=0;state<BOSS_STATES.length;state++)for(const back of [false,true]){
      const poses=Array.from({length:4},(_,f)=>advancedBossPose(name,state,f,back));
      assert.ok(poses.every(p=>p.name===name&&p.back===back));
      assert.ok(new Set(poses.map(p=>JSON.stringify(p))).size>=3,
        name+' '+BOSS_STATES[state]+' must be a real animated pose, not a still picture');
      assert.deepEqual(poses,Array.from({length:4},(_,f)=>advancedBossPose(name,state,f,back)));
    }
  }
});
test('Arasta articulates all leg pairs, lunges, extends web strands and collapses differently',()=>{
  const walk=Array.from({length:4},(_,f)=>advancedBossPose('arasta',1,f));
  assert.ok(new Set(walk.map(x=>x.spiderStep)).size>=3);
  const attack=Array.from({length:4},(_,f)=>advancedBossPose('arasta',2,f));
  assert.ok(attack[2].spiderLunge>attack[0].spiderLunge);
  const cast=Array.from({length:4},(_,f)=>advancedBossPose('arasta',3,f));
  assert.ok(cast[2].webTension>cast[0].webTension);
  assert.ok(cast[2].abdomenBreath>cast[0].abdomenBreath);
  assert.ok(advancedBossPose('arasta',5,3).sink>advancedBossPose('arasta',5,0).sink);
});
test('Drakuseth articulates wing lift, neck extension, jaw opening and flame-breath size',()=>{
  const walk=Array.from({length:4},(_,f)=>advancedBossPose('drakuseth',1,f));
  assert.ok(new Set(walk.map(p=>p.wingLift)).size>=3);
  assert.ok(new Set(walk.map(p=>p.tailFlex)).size>=3);
  const attack=Array.from({length:4},(_,f)=>advancedBossPose('drakuseth',2,f));
  assert.ok(attack[2].neckThrust>attack[0].neckThrust);
  assert.ok(attack[2].jawOpen>attack[0].jawOpen);
  const cast=Array.from({length:4},(_,f)=>advancedBossPose('drakuseth',3,f));
  assert.ok(cast[2].flameBloom>cast[0].flameBloom);
  assert.ok(cast[2].wingLift>cast[0].wingLift);
  assert.ok(advancedBossPose('drakuseth',5,3).wingLift<advancedBossPose('drakuseth',5,0).wingLift);
});
test('battlefield art source consumes independent boss poses and adds defeat state without changing AI',()=>{
  assert.ok(source.includes('const step=m?(i%2?m.spiderStep:-m.spiderStep):0;'));
  assert.ok(source.includes('const tensile=m?m.webTension:0;'));
  assert.ok(source.includes('const flap=m?m.wingLift*.5:'));
  assert.ok(source.includes('const neck=m?m.neckThrust:0,jaw=m?m.jawOpen:0;'));
  assert.ok(source.includes('const spread=m?m.flameBloom:0;'));
  assert.ok(source.includes('advanced?ANIMS+1:ANIMS'));
  assert.ok(source.includes('defeat:{row:5,frames:4,fps:7,loop:false}'));
  const module=readFileSync(new URL('../src/rendering/advanced-boss-motion.js',import.meta.url),'utf8');
  for(const forbidden of ['Math.random','localStorage','window.','player.hp =','s.rng ='])
    assert.equal(module.includes(forbidden),false,'visual pose must not consume gameplay RNG');
});
