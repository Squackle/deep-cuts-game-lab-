import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TOKEN_FRAME,TOKEN_STUDY_FEATURES,tokenRigPose,drawTokenStudyFrame}
 from '../src/rendering/detailed-token-art.js';
import {REAL_CREATURE_MODELS} from '../src/rendering/real-creature-models.js';
import {CREATURE_MOTION_FAMILIES} from '../src/rendering/creature-motion.js';
import {BENCHMARKS,BENCHMARK_STATES} from '../src/rendering/raster-benchmarks.js';

const loader=readFileSync(new URL('../src/rendering/real-creature-models.js',import.meta.url),'utf8');
const sources=readFileSync(new URL('../src/rendering/sprites.js',import.meta.url),'utf8');
const palette={dark:'#25422d',mid:'#64976c',light:'#ddf1ac'};
function spy(){
  const calls=[],g={calls};
  for(const name of ['save','restore','beginPath','closePath','stroke','fill','clip'])
    g[name]=()=>calls.push(name);
  for(const name of ['rect','moveTo','lineTo','bezierCurveTo','ellipse','translate','quadraticCurveTo'])
    g[name]=(...args)=>calls.push([name,...args]);
  g.createRadialGradient=(...args)=>{calls.push(['gradient',...args]);return {addColorStop(){}}};
  return g;
}
test('Saproling and Sproutling use 96px native fungal art instead of borrowed Grub',()=>{
  assert.equal(TOKEN_FRAME,96);
  assert.deepEqual(TOKEN_STUDY_FEATURES,['saproling']);
  for(const name of ['friendlySproutling','saproling']){
    assert.equal(REAL_CREATURE_MODELS[name]?.feature,'saproling');
    assert.equal(CREATURE_MOTION_FAMILIES.saproling,'fungal');
  }
});
test('approved high-fidelity Squirrel raster remains authoritative over procedural token studies',()=>{
  assert.equal(REAL_CREATURE_MODELS.friendlySquirrel?.feature,'friendlySquirrel');
  assert.equal(TOKEN_STUDY_FEATURES.includes('friendlySquirrel'),false);
  const approved=BENCHMARKS.find(v=>v.key==='mtg_friendlySquirrel');
  assert.deepEqual({file:approved.file,size:approved.size,pivot:approved.pivot},
    {file:'squirrel-poses.png',size:96,pivot:91});
  assert.equal(Object.keys(BENCHMARK_STATES).length,5,'real benchmark art is still a five-state pose study');
  const creature=sources.indexOf('installRealCreatureModels(images,manifest);');
  const raster=sources.indexOf('await installRasterBenchmarks(images,manifest,img);');
  assert.ok(creature>=0&&raster>creature,
    'approved painted Squirrel benchmark must override fallback sprite, never vice versa');
});
test('Saproling roots, mushroom cap and spore bursts maintain physical motion continuity',()=>{
  assert.equal(tokenRigPose('saproling',0,0,0).back,false);
  assert.equal(tokenRigPose('saproling',0,0,1).back,true);
  assert.notEqual(tokenRigPose('saproling',1,0).capSway,
    tokenRigPose('saproling',1,2).capSway);
  assert.ok(tokenRigPose('saproling',3,2).sporeBurst>
    tokenRigPose('saproling',3,0).sporeBurst);
  assert.ok(tokenRigPose('saproling',2,2).rootLift>0);
  assert.ok(tokenRigPose('saproling',5,3).squash>0);
});
test('fungal model paints articulated roots, layered mushroom cap and gills',()=>{
  const g=spy();drawTokenStudyFrame(g,'saproling',0,2,2,palette);
  assert.deepEqual(g.calls.find(x=>Array.isArray(x)&&x[0]==='rect'),['rect',0,0,96,96]);
  assert.equal(g.calls.filter(x=>x==='clip').length,1);
  assert.ok(g.calls.filter(x=>x==='fill').length>=10,'native fungus needs layered materials');
  assert.ok(g.calls.filter(x=>x==='stroke').length>=12,'native fungus needs articulated appendages');
});
test('all six Saproling animation states draw distinct native frames in both views',()=>{
  for(const view of [0,1])for(let state=0;state<=5;state++){
    const signatures=[];
    for(let frame=0;frame<4;frame++){
      const g=spy();
      drawTokenStudyFrame(g,'saproling',view,state,frame,palette);
      signatures.push(JSON.stringify(g.calls));
    }
    assert.ok(new Set(signatures).size>=3,
      'Saproling view '+view+' state '+state+' has repeated static art');
  }
});
test('native Saproling runtime integration is visual only and preserves the one-tile scale',()=>{
  assert.ok(loader.includes('TOKEN_FRAME, TOKEN_STUDY_FEATURES, drawTokenStudyFrame'));
  assert.ok(loader.includes('const token=TOKEN_STUDY_FEATURES.includes(config.feature);'));
  assert.ok(loader.includes('const detailed=species||humanoid||beast||token;'));
  assert.ok(loader.includes('else if(token)drawTokenStudyFrame(cctx,config.feature,view,anim.row,frame,config);'));
  assert.ok(loader.includes("token?'token-anatomy-study-v1'"));
  assert.ok(loader.includes('pixelScale:base.h*(base.pixelScale||1)/height'));
  const raw=readFileSync(new URL('../src/rendering/detailed-token-art.js',import.meta.url),'utf8');
  for(const forbidden of ['Math.random','localStorage','window.','fetch(','player.hp =','s.rng ='])
    assert.equal(raw.includes(forbidden),false,'fungal source must stay visual-only');
  assert.equal(tokenRigPose('friendlySquirrel',0,0),null);
  assert.throws(()=>drawTokenStudyFrame(spy(),'friendlySquirrel',0,0,0,palette),/Unsupported native token/);
});
