import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BEAST_FRAME,BEAST_STUDY_FEATURES,beastRigPose,drawBeastStudyFrame} from '../src/rendering/detailed-beast-art.js';
import {CREATURE_MOTION_FAMILIES} from '../src/rendering/creature-motion.js';
import {REAL_CREATURE_MODELS} from '../src/rendering/real-creature-models.js';
const loader=readFileSync(new URL('../src/rendering/real-creature-models.js',import.meta.url),'utf8');
const palette={dark:'#41312a',mid:'#84634d',light:'#e6c49b'};
function spy(){
  const calls=[],g={calls};
  for(const k of ['save','restore','beginPath','closePath','stroke','fill','clip'])
    g[k]=()=>calls.push(k);
  for(const k of ['moveTo','lineTo','bezierCurveTo','rect','ellipse','translate','quadraticCurveTo'])
    g[k]=(...args)=>calls.push([k,...args]);
  g.createRadialGradient=(...args)=>{calls.push(['gradient',...args]);return {addColorStop(){}}};
  return g;
}
test('all real Wolf, Direwolf and Drake runtime identities choose native 96px art',()=>{
  assert.equal(BEAST_FRAME,96);
  assert.deepEqual(BEAST_STUDY_FEATURES,['wolf','direwolf','friendlyDrake']);
  for(const [key,feature] of [
    ['hound','wolf'],['wolf','wolf'],['alpha','direwolf'],['friendlyDrake','friendlyDrake']]){
    assert.equal(REAL_CREATURE_MODELS[key]?.feature,feature);
    assert.ok(CREATURE_MOTION_FAMILIES[feature],key+' must support authored motion states');
  }
});
test('Wolves and Direwolves preserve four jointed legs through both directional views',()=>{
  for(const name of ['wolf','direwolf']){
    const front=beastRigPose(name,1,0,0),back=beastRigPose(name,1,2,1);
    assert.equal(front.legs.length,4);
    assert.equal(back.legs.length,4);
    assert.equal(front.back,false);assert.equal(back.back,true);
    assert.equal(new Set(front.legs.map(x=>x.hip.join(','))).size,4);
    assert.notDeepEqual(front.legs.map(x=>x.foot),beastRigPose(name,1,2,0).legs.map(x=>x.foot));
    assert.ok(beastRigPose(name,2,2,0).headShift>beastRigPose(name,2,0,0).headShift);
    assert.ok(beastRigPose(name,5,3,0).slump>0);
  }
});
test('Drake wings, legs, neck and jaw respond to authored animation states',()=>{
  const p0=beastRigPose('friendlyDrake',0,0,0);
  assert.equal(p0.legs.length,4);
  assert.ok(beastRigPose('friendlyDrake',3,2,0).wing>beastRigPose('friendlyDrake',3,0,0).wing);
  assert.ok(beastRigPose('friendlyDrake',2,2,0).headShift>beastRigPose('friendlyDrake',2,0,0).headShift);
  assert.ok(beastRigPose('friendlyDrake',5,3,1).slump>0);
  assert.equal(beastRigPose('friendlyDrake',0,0,1).back,true);
});
test('Wolf, Direwolf and Drake render different original anatomy, not recolored borrowed Hound art',()=>{
  const fingerprints=[];
  for(const kind of BEAST_STUDY_FEATURES){
    const g=spy();drawBeastStudyFrame(g,kind,0,2,2,palette);
    assert.deepEqual(g.calls.find(x=>Array.isArray(x)&&x[0]==='rect'),['rect',0,0,96,96]);
    assert.equal(g.calls.filter(x=>x==='clip').length,1);
    assert.ok(g.calls.filter(x=>x==='fill').length>=12,kind+' needs real material surfaces');
    assert.ok(g.calls.filter(x=>x==='stroke').length>=12,kind+' needs articulated geometry');
    fingerprints.push(JSON.stringify(g.calls));
  }
  assert.equal(new Set(fingerprints).size,3);
});
test('all six animation states contain at least three distinct source frames per view',()=>{
  for(const kind of BEAST_STUDY_FEATURES)for(const view of [0,1])
    for(let state=0;state<=5;state++){
      const frames=[];
      for(let frame=0;frame<4;frame++){
        const g=spy();
        drawBeastStudyFrame(g,kind,view,state,frame,palette);
        frames.push(JSON.stringify(g.calls));
      }
      assert.ok(new Set(frames).size>=3,kind+' view '+view+' state '+state+' is static');
    }
});
test('battle renderer selects native beasts without changing combat scale or replay rules',()=>{
  assert.ok(loader.includes("BEAST_FRAME, BEAST_STUDY_FEATURES, drawBeastStudyFrame"));
  assert.ok(loader.includes('const beast=BEAST_STUDY_FEATURES.includes(config.feature);'));
  assert.ok(loader.includes('const detailed=species||humanoid||beast||token||magic||monster;'));
  assert.ok(loader.includes('else if(beast)drawBeastStudyFrame(cctx,config.feature,view,anim.row,frame,config);'));
  assert.ok(loader.includes("beast?'beast-anatomy-study-v1'"));
  assert.ok(loader.includes('pixelScale:base.h*(base.pixelScale||1)/height'));
  const source=readFileSync(new URL('../src/rendering/detailed-beast-art.js',import.meta.url),'utf8');
  for(const forbidden of ['Math.random','localStorage','window.','fetch(','player.hp =','s.rng ='])
    assert.ok(!source.includes(forbidden));
  assert.equal(beastRigPose('caterpillar',0,0),null);
  assert.throws(()=>drawBeastStudyFrame(spy(),'caterpillar',0,0,0,palette),/Unsupported native beast/);
});
