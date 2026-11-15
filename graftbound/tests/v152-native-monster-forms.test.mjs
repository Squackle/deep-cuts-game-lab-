import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MONSTER_FRAME,MONSTER_STUDY_FEATURES,monsterRigPose,drawMonsterStudyFrame}
 from '../src/rendering/detailed-monster-art.js';
import {CREATURE_MOTION_FAMILIES} from '../src/rendering/creature-motion.js';
import {REAL_CREATURE_MODELS} from '../src/rendering/real-creature-models.js';

const src=readFileSync(new URL('../src/rendering/real-creature-models.js',import.meta.url),'utf8');
const palette={dark:'#334334',mid:'#6d9c81',light:'#ebdcb9'};
function spy(){
  const calls=[],g={calls};
  for(const name of ['beginPath','closePath','save','restore','stroke','fill','clip'])
    g[name]=()=>calls.push(name);
  for(const name of ['moveTo','lineTo','rect','ellipse','translate','quadraticCurveTo','bezierCurveTo'])
    g[name]=(...args)=>calls.push([name,...args]);
  g.createRadialGradient=(...args)=>{calls.push(['gradient',...args]);return {addColorStop(){}}};
  return g;
}
test('the actual runtime registry has four distinct original monster anatomy families',()=>{
  assert.equal(MONSTER_FRAME,96);
  assert.deepEqual(MONSTER_STUDY_FEATURES,['caterpillar','rhino','wurm','toxrill']);
  for(const [identity,feature,kind] of [
    ['grub','caterpillar','larval'],['tortoise','rhino','hoofed'],
    ['champion','wurm','burrowing'],['slug','toxrill','slug-horror']]){
    assert.equal(REAL_CREATURE_MODELS[identity]?.feature,feature);
    assert.equal(CREATURE_MOTION_FAMILIES[feature],kind);
  }
});
test('caterpillar has individually contracted segments, stepped prolegs and head feelers',()=>{
  const gait=Array.from({length:4},(_,f)=>monsterRigPose('caterpillar',1,f));
  assert.ok(new Set(gait.map(x=>x.segmentCompression)).size>=3);
  assert.ok(new Set(gait.map(x=>x.prolegStep)).size>=3);
  assert.ok(monsterRigPose('caterpillar',2,2).feelerTilt<0);
  assert.ok(monsterRigPose('caterpillar',5,3).sink>0);
});
test('rhino has four grounded limbs, horn thrust, weight shift and recoil',()=>{
  const gait=Array.from({length:4},(_,f)=>monsterRigPose('rhino',1,f));
  assert.ok(new Set(gait.map(x=>x.hoofStride)).size>=3);
  assert.ok(monsterRigPose('rhino',2,2).hornThrust>0);
  assert.ok(monsterRigPose('rhino',4,2).shoulderRoll>0);
});
test('wurm has coil/neck/maw poses without fabricated legs',()=>{
  const gait=Array.from({length:4},(_,f)=>monsterRigPose('wurm',1,f));
  assert.ok(new Set(gait.map(x=>x.bodyUndulation)).size>=3);
  assert.ok(monsterRigPose('wurm',2,2).neckArch>0);
  assert.ok(monsterRigPose('wurm',2,2).mawOpen>0);
});
test('slug horror has continuous mantle, independently flexing eye stalks and slime',()=>{
  const gait=Array.from({length:4},(_,f)=>monsterRigPose('toxrill',1,f));
  assert.ok(new Set(gait.map(x=>x.slugGlide)).size>=3);
  assert.ok(new Set(gait.map(x=>x.mantleRipple)).size>=3);
  assert.ok(monsterRigPose('toxrill',3,2).corrosivePulse>0);
  assert.ok(monsterRigPose('toxrill',5,3).eyeStalkFlex>0);
});
test('all two-view and six-state 96px cells have distinct geometry and atlas clipping',()=>{
  const shapes=[];
  for(const feature of MONSTER_STUDY_FEATURES){
    for(const view of [0,1])for(let state=0;state<6;state++){
      const stamps=[];
      for(let frame=0;frame<4;frame++){
        const g=spy();drawMonsterStudyFrame(g,feature,view,state,frame,palette);
        assert.deepEqual(g.calls.find(x=>Array.isArray(x)&&x[0]==='rect'),['rect',0,0,96,96]);
        assert.equal(g.calls.filter(x=>x==='clip').length,1);
        assert.ok(g.calls.filter(x=>x==='fill').length>=5);
        assert.ok(g.calls.filter(x=>x==='stroke').length>=5);
        stamps.push(JSON.stringify(g.calls));
        if(view===0&&state===2&&frame===2)shapes.push(stamps.at(-1));
      }
      assert.ok(new Set(stamps).size>=3,feature+' '+view+' '+state+' has repeated static sprites');
    }
  }
  assert.equal(new Set(shapes).size,4,'anatomical species must not share identical geometry');
});
test('actual game caches originals rather than overlaying borrowed quadruped sprites',()=>{
  assert.ok(src.includes('MONSTER_FRAME, MONSTER_STUDY_FEATURES, drawMonsterStudyFrame'));
  assert.ok(src.includes('const detailed=species||humanoid||beast||token||magic||monster;'));
  assert.ok(src.includes('else if(monster)drawMonsterStudyFrame(cctx,config.feature,view,anim.row,frame,config);'));
  assert.ok(src.includes("monster?'monster-anatomy-study-v1'"));
  assert.ok(src.includes('pixelScale:base.h*(base.pixelScale||1)/height'));
  const art=readFileSync(new URL('../src/rendering/detailed-monster-art.js',import.meta.url),'utf8');
  for(const forbidden of ['Math.random','fetch(','localStorage','window.','player.hp =','s.rng ='])
    assert.ok(!art.includes(forbidden),'art code must not consume gameplay state or RNG');
  assert.equal(monsterRigPose('hound',1,2),null);
  assert.throws(()=>drawMonsterStudyFrame(spy(),'hound',0,0,0,palette),/Unsupported original monster/);
});
