import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SPECIES_FRAME,SPECIES_STUDY_FEATURES,speciesRigPose,drawSpeciesStudyFrame} from '../src/rendering/detailed-species-art.js';
import {CREATURE_MOTION_FAMILIES} from '../src/rendering/creature-motion.js';
import {REAL_CREATURE_MODELS} from '../src/rendering/real-creature-models.js';
const src=readFileSync(new URL('../src/rendering/real-creature-models.js',import.meta.url),'utf8');
const palette={dark:'#292723',mid:'#806547',light:'#e3bb8a'};
function spy(){
  const calls=[], ctx={calls};
  for(const name of ['beginPath','closePath','save','restore','fill','stroke','clip'])
    ctx[name]=()=>calls.push(name);
  for(const name of ['moveTo','lineTo','bezierCurveTo','rect','ellipse','translate'])
    ctx[name]=(...args)=>calls.push([name,...args]);
  ctx.createRadialGradient=(...args)=>{calls.push(['gradient',...args]);return {addColorStop(){}}};
  return ctx;
}
test('the live registry includes five distinct anatomically rebuilt spider, snake and flying insect identities',()=>{
  assert.equal(SPECIES_FRAME,96);
  for(const [identity,feature] of [
    ['spider','spiderling'],['friendlySpider','spiderling'],
    ['friendlySnake','friendlySnake'],['friendlyHornet','friendlyHornet'],['moth','stinger']]){
    assert.equal(REAL_CREATURE_MODELS[identity].feature,feature);
    assert.ok(SPECIES_STUDY_FEATURES.includes(feature));
    assert.ok(CREATURE_MOTION_FAMILIES[feature],feature+' requires all six animation states');
  }
  assert.equal(new Set(SPECIES_STUDY_FEATURES).size,4);
});
test('spiders have exactly eight independently placed legs and coherent front/back views',()=>{
  const idle=speciesRigPose('spiderling',0,0,0);
  const step=speciesRigPose('spiderling',1,2,0);
  const back=speciesRigPose('spiderling',1,2,1);
  assert.equal(idle.legs.length,8);
  assert.equal(idle.legs.filter(x=>x.side===-1).length,4);
  assert.equal(idle.legs.filter(x=>x.side===1).length,4);
  assert.equal(new Set(idle.legs.map(x=>x.foot.join(','))).size,8);
  assert.notDeepEqual(step.legs.map(x=>x.foot),idle.legs.map(x=>x.foot));
  assert.notDeepEqual(step.legs.map(x=>x.foot),back.legs.map(x=>x.foot));
  assert.ok(speciesRigPose('spiderling',2,2).headShift>speciesRigPose('spiderling',2,0).headShift);
  assert.ok(speciesRigPose('spiderling',5,3).bodyDrop>0);
});
test('snakes have no legs and separate undulation, bite, recoil and defeat postures',()=>{
  for(let state=0;state<=5;state++){
    const p=speciesRigPose('friendlySnake',state,1);
    assert.deepEqual(p.legs,[]);
    assert.deepEqual(p,speciesRigPose('friendlySnake',state,1));
  }
  assert.notEqual(speciesRigPose('friendlySnake',1,1).coilPulse,speciesRigPose('friendlySnake',1,3).coilPulse);
  assert.ok(speciesRigPose('friendlySnake',2,2).neckBend>0);
  assert.ok(speciesRigPose('friendlySnake',4,2).neckBend<0);
  assert.ok(speciesRigPose('friendlySnake',5,3).bodyDrop>0);
});
test('hornets and stingers have six legs, paired wing animation and moving antennae',()=>{
  for(const name of ['friendlyHornet','stinger']){
    const idle=Array.from({length:4},(_,frame)=>speciesRigPose(name,0,frame));
    assert.equal(idle[0].legs.length,6);
    assert.equal(idle[0].legs.filter(x=>x.side===-1).length,3);
    assert.equal(idle[0].legs.filter(x=>x.side===1).length,3);
    assert.ok(new Set(idle.map(x=>x.wingLift)).size>=3);
    const walk=Array.from({length:4},(_,frame)=>speciesRigPose(name,1,frame));
    assert.ok(new Set(walk.map(x=>x.legs.map(y=>y.foot.join(':')).join(','))).size>=3);
    assert.ok(speciesRigPose(name,2,2).sting>0);
    assert.ok(speciesRigPose(name,5,3).bodyDrop>0);
  }
});
test('each species directly paints independent directional frames with stable frame clipping',()=>{
  for(const feature of SPECIES_STUDY_FEATURES)for(const view of [0,1])for(const animation of [0,1,2,3,4,5]){
    const g=spy();
    drawSpeciesStudyFrame(g,feature,view,animation,2,palette);
    assert.equal(g.calls.filter(x=>x==='clip').length,1,feature+' must stay inside its atlas cell');
    assert.ok(g.calls.filter(x=>x==='fill').length>=4,feature+' paints real body parts');
    assert.ok(g.calls.filter(x=>x==='stroke').length>=10,feature+' paints articulated parts');
    assert.deepEqual(g.calls.find(x=>Array.isArray(x)&&x[0]==='rect'),['rect',0,0,96,96]);
  }
  assert.throws(()=>drawSpeciesStudyFrame(spy(),'hound',0,0,0,palette),/Unknown original species/);
  assert.equal(speciesRigPose('hound',0,0),null);
});
test('real runtime replaces incompatible Hound/Moth bases without inflating a tile or consuming gameplay RNG',()=>{
  assert.match(src,/const detailed=SPECIES_STUDY_FEATURES\.includes\(config\.feature\)/);
  assert.match(src,/if\(detailed\)drawSpeciesStudyFrame\(cctx,config\.feature,view,anim\.row,frame,config\)/);
  assert.match(src,/if\(!detailed && !config\.custom && anim\.row!==baseRows\)/);
  assert.match(src,/pixelScale:base\.h\*\(base\.pixelScale\|\|1\)\/height/);
  assert.match(src,/artPack:'species-anatomy-study-v1'/);
  for(const relative of ['../src/rendering/creature-motion.js','../src/rendering/detailed-species-art.js']){
    const c=readFileSync(new URL(relative,import.meta.url),'utf8');
    for(const forbidden of ['Math.random','localStorage','window.','player.hp ='])
      assert.ok(!c.includes(forbidden),relative+' must not affect combat or saves');
  }
});
