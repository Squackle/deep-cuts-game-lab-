import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TOKEN_FRAME,TOKEN_STUDY_FEATURES,tokenRigPose,drawTokenStudyFrame}
 from '../src/rendering/detailed-token-art.js';
import {REAL_CREATURE_MODELS} from '../src/rendering/real-creature-models.js';
import {CREATURE_MOTION_FAMILIES} from '../src/rendering/creature-motion.js';

const loader=readFileSync(new URL('../src/rendering/real-creature-models.js',import.meta.url),'utf8');
const palette={dark:'#493427',mid:'#aa7852',light:'#f7d3a3'};
function spy(){
  const calls=[],g={calls};
  for(const name of ['save','restore','beginPath','closePath','stroke','fill','clip'])
    g[name]=()=>calls.push(name);
  for(const name of ['rect','moveTo','lineTo','bezierCurveTo','ellipse','translate','quadraticCurveTo'])
    g[name]=(...args)=>calls.push([name,...args]);
  g.createRadialGradient=(...args)=>{calls.push(['gradient',...args]);return {addColorStop(){}}};
  return g;
}
test('real Squirrel and Saproling aliases use 96px native instead of borrowed Hound/Grub',()=>{
  assert.equal(TOKEN_FRAME,96);
  assert.deepEqual(TOKEN_STUDY_FEATURES,['friendlySquirrel','saproling']);
  for(const [name,feature] of [
    ['friendlySquirrel','friendlySquirrel'],['friendlySproutling','saproling'],['saproling','saproling']]){
    assert.equal(REAL_CREATURE_MODELS[name]?.feature,feature);
    assert.ok(TOKEN_STUDY_FEATURES.includes(feature));
    assert.ok(CREATURE_MOTION_FAMILIES[feature],name+' missing six-state animation');
  }
});
test('Squirrel maintains independent curled tail, paws, bite and defeat in two directions',()=>{
  const first=tokenRigPose('friendlySquirrel',0,0,0);
  assert.equal(first.back,false);
  assert.equal(tokenRigPose('friendlySquirrel',0,0,1).back,true);
  assert.notEqual(tokenRigPose('friendlySquirrel',0,0).tailCurl,
    tokenRigPose('friendlySquirrel',0,2).tailCurl);
  assert.notEqual(tokenRigPose('friendlySquirrel',1,0).footStep,
    tokenRigPose('friendlySquirrel',1,2).footStep);
  assert.ok(tokenRigPose('friendlySquirrel',2,2).headX>0);
  assert.ok(tokenRigPose('friendlySquirrel',5,3).squash>0);
});
test('Saproling body keeps mushroom cap attached to rooted walking feet and pulsing spores',()=>{
  assert.equal(tokenRigPose('saproling',0,0,0).back,false);
  assert.notEqual(tokenRigPose('saproling',1,0).capSway,
    tokenRigPose('saproling',1,2).capSway);
  assert.ok(tokenRigPose('saproling',3,2).sporeBurst>
    tokenRigPose('saproling',3,0).sporeBurst);
  assert.ok(tokenRigPose('saproling',2,2).rootLift>0);
  assert.ok(tokenRigPose('saproling',5,3).squash>0);
});
test('native Squirrel and Saproling draw independent material bodies and clipping wrappers',()=>{
  const hashes=[];
  for(const feature of TOKEN_STUDY_FEATURES){
    const g=spy();drawTokenStudyFrame(g,feature,0,2,2,palette);
    assert.deepEqual(g.calls.find(x=>Array.isArray(x)&&x[0]==='rect'),['rect',0,0,96,96]);
    assert.equal(g.calls.filter(x=>x==='clip').length,1);
    assert.ok(g.calls.filter(x=>x==='fill').length>=10,feature+' should draw detailed anatomy');
    assert.ok(g.calls.filter(x=>x==='stroke').length>=12,feature+' should draw appendages and contours');
    hashes.push(JSON.stringify(g.calls));
  }
  assert.equal(new Set(hashes).size,2,'Squirrel and Saproling must never be simple recolors');
});
test('all six motion states have >=3 genuinely different frames per original token view',()=>{
  for(const feature of TOKEN_STUDY_FEATURES)for(const view of [0,1])
    for(let state=0;state<=5;state++){
      const signatures=[];
      for(let frame=0;frame<4;frame++){
        const g=spy();
        drawTokenStudyFrame(g,feature,view,state,frame,palette);
        signatures.push(JSON.stringify(g.calls));
      }
      assert.ok(new Set(signatures).size>=3,
        feature+' view '+view+' state '+state+' has repeated static art');
    }
});
test('runtime art integration replaces borrowed bases while preserving one-tile scale',()=>{
  assert.ok(loader.includes('TOKEN_FRAME, TOKEN_STUDY_FEATURES, drawTokenStudyFrame'));
  assert.ok(loader.includes('const token=TOKEN_STUDY_FEATURES.includes(config.feature);'));
  assert.ok(loader.includes('const detailed=species||humanoid||beast||token;'));
  assert.ok(loader.includes('else if(token)drawTokenStudyFrame(cctx,config.feature,view,anim.row,frame,config);'));
  assert.ok(loader.includes("token?'token-anatomy-study-v1'"));
  assert.ok(loader.includes('pixelScale:base.h*(base.pixelScale||1)/height'));
  const raw=readFileSync(new URL('../src/rendering/detailed-token-art.js',import.meta.url),'utf8');
  for(const forbidden of ['Math.random','localStorage','window.','fetch(','player.hp =','s.rng ='])
    assert.equal(raw.includes(forbidden),false,'token art must be visual-only');
  assert.equal(tokenRigPose('friendlyDrake',0,0),null);
  assert.throws(()=>drawTokenStudyFrame(spy(),'friendlyDrake',0,0,0,palette),/Unsupported native token/);
});
