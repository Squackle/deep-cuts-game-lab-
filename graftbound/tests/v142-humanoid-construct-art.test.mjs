import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HUMANOID_FRAME,HUMANOID_STUDY_FEATURES,humanoidRigPose,drawHumanoidStudyFrame}
 from '../src/rendering/detailed-humanoid-art.js';
import {CREATURE_MOTION_FAMILIES} from '../src/rendering/creature-motion.js';
import {REAL_CREATURE_MODELS} from '../src/rendering/real-creature-models.js';

const source=readFileSync(new URL('../src/rendering/real-creature-models.js',import.meta.url),'utf8');
const palette={dark:'#3c453d',mid:'#78978f',light:'#bfcfa5'};
function spy(){
  const calls=[],g={calls};
  for(const name of ['save','restore','beginPath','closePath','stroke','fill','clip'])
    g[name]=()=>calls.push(name);
  for(const name of ['rect','moveTo','lineTo','ellipse','translate','bezierCurveTo','quadraticCurveTo'])
    g[name]=(...args)=>calls.push([name,...args]);
  g.createRadialGradient=(...args)=>{calls.push(['gradient',...args]);return {addColorStop(){}}};
  return g;
}
test('real runtime identities receive original cached 96px feline, skeleton, zombie and construct families',()=>{
  assert.equal(HUMANOID_FRAME,96);
  assert.equal(HUMANOID_STUDY_FEATURES.length,6);
  for(const [identity,kind] of [
    ['friendlyCatSoldier','friendlyCatSoldier'],
    ['friendlySkeleton','friendlySkeleton'],['zombie','zombie'],
    ['nullwarden','golem'],['golemVigilance','golem'],
    ['golemTrample','gearhulk'],['golemFly','titan'],['sentinel','titan']]){
    assert.equal(REAL_CREATURE_MODELS[identity]?.feature,kind,identity+' lacks its own anatomy');
    assert.ok(CREATURE_MOTION_FAMILIES[kind],kind+' must have six states');
    assert.ok(HUMANOID_STUDY_FEATURES.includes(kind));
  }
});
test('every native study has seven stable anatomy anchor groups in two authored directions',()=>{
  for(const feature of HUMANOID_STUDY_FEATURES){
    const front=humanoidRigPose(feature,0,0,0);
    const rear=humanoidRigPose(feature,0,0,1);
    assert.ok(front&&!front.back&&rear.back);
    for(const pose of [front,rear]){
      for(const key of ['head','hip','leftShoulder','rightShoulder','leftElbow','rightElbow',
        'leftHand','rightHand','leftKnee','rightKnee','leftFoot','rightFoot']){
        const p=pose[key];assert.ok(Array.isArray(p)&&p.length===2);
        assert.ok(p.every(v=>Number.isFinite(v)&&v>=0&&v<96),feature+' invalid '+key);
      }
    }
    assert.notDeepEqual(humanoidRigPose(feature,1,0,0).leftFoot,
      humanoidRigPose(feature,1,2,0).leftFoot,'walk animation must move feet');
    assert.notDeepEqual(humanoidRigPose(feature,2,0,0).rightHand,
      humanoidRigPose(feature,2,2,0).rightHand,'attack must move right hand');
    assert.ok(humanoidRigPose(feature,5,3,0).collapse>0);
  }
});
test('the Cat Soldier has a separate moving sword; Skeleton uses open bones, Zombie uses flesh',()=>{
  const cat=spy(),skel=spy(),zombie=spy(),golem=spy();
  drawHumanoidStudyFrame(cat,'friendlyCatSoldier',0,2,2,palette);
  drawHumanoidStudyFrame(skel,'friendlySkeleton',0,2,2,palette);
  drawHumanoidStudyFrame(zombie,'zombie',0,2,2,palette);
  drawHumanoidStudyFrame(golem,'golem',0,2,2,palette);
  for(const g of [cat,skel,zombie,golem]){
    assert.ok(g.calls.filter(x=>x==='stroke').length>15,'needs articulated anatomy');
    assert.ok(g.calls.filter(x=>x==='fill').length>5,'needs species-specific surfaces');
    assert.deepEqual(g.calls.find(x=>Array.isArray(x)&&x[0]==='rect'),['rect',0,0,96,96]);
    assert.equal(g.calls.filter(x=>x==='clip').length,1);
  }
  const fingerprint=g=>JSON.stringify(g.calls);
  assert.equal(new Set([cat,skel,zombie,golem].map(fingerprint)).size,4,
    'recoloring the same geometry is not acceptable');
});
test('stone Golem, plated Gearhulk, and Sentinel Titan have different hardware anatomy',()=>{
  const views=[];
  for(const kind of ['golem','gearhulk','titan']){
    const g=spy();drawHumanoidStudyFrame(g,kind,1,2,1,palette);
    views.push(JSON.stringify(g.calls));
  }
  assert.equal(new Set(views).size,3,'construct families must not be palette swaps');
});
test('all six states have at least three genuinely distinct poses in both directions',()=>{
  for(const feature of HUMANOID_STUDY_FEATURES)for(const view of [0,1])
    for(let state=0;state<=5;state++){
      const stamps=[];
      for(let frame=0;frame<4;frame++){
        const g=spy();
        drawHumanoidStudyFrame(g,feature,view,state,frame,palette);
        stamps.push(JSON.stringify(g.calls));
      }
      assert.ok(new Set(stamps).size>=3,
        feature+' view '+view+' state '+state+' contains repeated geometry');
    }
});
test('real atlas loader uses the new body without drawing over borrowed legacy models',()=>{
  assert.ok(source.includes("HUMANOID_STUDY_FEATURES, drawHumanoidStudyFrame"));
  assert.ok(source.includes('const humanoid=HUMANOID_STUDY_FEATURES.includes(config.feature);'));
  assert.ok(source.includes('const detailed=species||humanoid||beast||token||magic;'));
  assert.ok(source.includes('if(!detailed && !config.custom && anim.row!==baseRows)'));
  assert.ok(source.includes('if(humanoid)drawHumanoidStudyFrame(cctx,config.feature,view,anim.row,frame,config)'));
  assert.ok(source.includes("artPack:humanoid?'humanoid-anatomy-study-v1':beast?'beast-anatomy-study-v1':token?'token-anatomy-study-v1':magic?'magic-anatomy-study-v1':'species-anatomy-study-v1'"));
  assert.ok(source.includes('pixelScale:base.h*(base.pixelScale||1)/height'));
  const art=readFileSync(new URL('../src/rendering/detailed-humanoid-art.js',import.meta.url),'utf8');
  for(const forbidden of ['Math.random','localStorage','fetch(','window.','player.hp ='])
    assert.ok(!art.includes(forbidden),'original art has forbidden engine dependency '+forbidden);
  assert.equal(humanoidRigPose('hound',1,2),null);
  assert.throws(()=>drawHumanoidStudyFrame(spy(),'hound',0,1,2,palette),/Unsupported native humanoid/);
});
