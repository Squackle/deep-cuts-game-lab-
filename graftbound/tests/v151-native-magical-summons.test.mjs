import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAGIC_FRAME,MAGIC_STUDY_FEATURES,magicRigPose,drawMagicStudyFrame} from '../src/rendering/detailed-magic-art.js';
import {CREATURE_MOTION_FAMILIES} from '../src/rendering/creature-motion.js';
import {REAL_CREATURE_MODELS} from '../src/rendering/real-creature-models.js';
const loader=readFileSync(new URL('../src/rendering/real-creature-models.js',import.meta.url),'utf8');
const palette={dark:'#25334c',mid:'#587e9e',light:'#e3d9c0'};
function spy(){
  const calls=[],g={calls};
  for(const n of ['save','restore','beginPath','closePath','stroke','fill','clip'])
    g[n]=()=>calls.push(n);
  for(const n of ['rect','moveTo','lineTo','ellipse','translate','bezierCurveTo','quadraticCurveTo'])
    g[n]=(...args)=>calls.push([n,...args]);
  g.createRadialGradient=(...args)=>{calls.push(['gradient',...args]);return {addColorStop(){}}};
  return g;
}
test('four different live creature identities have original 96px anatomy instead of borrowed base silhouettes',()=>{
  assert.equal(MAGIC_FRAME,96);
  assert.deepEqual(MAGIC_STUDY_FEATURES,['friendlyElemental','friendlyBirdIllusion','friendlyTentacle','angel']);
  for(const [id,kind] of [['friendlyElemental','flame-being'],['friendlyBirdIllusion','winged-illusion'],
    ['friendlyTentacle','tentacular'],['angel','celestial']]){
    assert.equal(REAL_CREATURE_MODELS[id].feature,id);
    assert.equal(CREATURE_MOTION_FAMILIES[id],kind);
  }
});
test('native spell creatures preserve stable deterministic attachment positions and both authored directions',()=>{
  for(const feature of MAGIC_STUDY_FEATURES)for(const view of [0,1]){
    const frame=magicRigPose(feature,0,0,view);
    assert.equal(frame.back,view===1);
    assert.equal(frame.kind,CREATURE_MOTION_FAMILIES[feature]);
    assert.deepEqual(frame,magicRigPose(feature,0,0,view));
    assert.ok(magicRigPose(feature,5,3,view).sink>0);
    assert.ok(magicRigPose(feature,2,2,view).thrust>0);
    assert.ok(magicRigPose(feature,3,2,view).charge>0);
  }
});
test('Elemental flame tongues, Bird wing membranes, Tentacle coils and Angel weapon are species-specific',()=>{
  assert.ok(magicRigPose('friendlyElemental',2,2).flameArc>0);
  assert.ok(magicRigPose('friendlyBirdIllusion',1,2).wingSpread>
    magicRigPose('friendlyBirdIllusion',1,0).wingSpread);
  assert.ok(magicRigPose('friendlyTentacle',2,2).tentacleLunge>0);
  assert.ok(magicRigPose('angel',2,2).swordReach>0);
  assert.ok(magicRigPose('angel',3,2).haloLift>0);
  const bodies=MAGIC_STUDY_FEATURES.map(feature=>{
    const g=spy();drawMagicStudyFrame(g,feature,0,2,2,palette);
    assert.equal(g.calls.filter(x=>x==='clip').length,1,'one atlas safety clip');
    assert.ok(g.calls.filter(x=>x==='fill').length>8,feature+' needs detailed surfaces');
    assert.ok(g.calls.filter(x=>x==='stroke').length>8,feature+' needs separately articulated details');
    assert.deepEqual(g.calls.find(x=>Array.isArray(x)&&x[0]==='rect'),['rect',0,0,96,96]);
    return JSON.stringify(g.calls);
  });
  assert.equal(new Set(bodies).size,4,'different species must have distinct actual geometry');
});
test('all six states and two views have at least three different drawn poses, not static slides',()=>{
  for(const feature of MAGIC_STUDY_FEATURES)for(const view of [0,1])for(let state=0;state<6;state++){
    const stamps=[];
    for(let frame=0;frame<4;frame++){
      const g=spy();drawMagicStudyFrame(g,feature,view,state,frame,palette);
      stamps.push(JSON.stringify(g.calls));
    }
    assert.ok(new Set(stamps).size>=3,feature+' view '+view+' state '+state+' has repeated poses');
  }
});
test('actual runtime loads and caches 96px native magical atlases with original world scale',()=>{
  assert.ok(loader.includes('MAGIC_FRAME, MAGIC_STUDY_FEATURES, drawMagicStudyFrame'));
  assert.ok(loader.includes('const detailed=species||humanoid||beast||token||magic||monster;'));
  assert.ok(loader.includes('else if(magic)drawMagicStudyFrame(cctx,config.feature,view,anim.row,frame,config);'));
  assert.ok(loader.includes("magic?'magic-anatomy-study-v1'"));
  assert.ok(loader.includes('pixelScale:base.h*(base.pixelScale||1)/height'));
  const art=readFileSync(new URL('../src/rendering/detailed-magic-art.js',import.meta.url),'utf8');
  for(const bad of ['Math.random','localStorage','window.','fetch(','player.hp =','s.rng ='])
    assert.equal(art.includes(bad),false,'no gameplay or network dependencies in runtime art');
  assert.equal(magicRigPose('hound',0,0),null);
  assert.throws(()=>drawMagicStudyFrame(spy(),'hound',0,0,0,palette),/Unsupported native magical identity/);
});
