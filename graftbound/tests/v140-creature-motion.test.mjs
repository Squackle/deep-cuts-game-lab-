import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {CREATURE_MOTION_FAMILIES,creaturePose,materialLightDelta} from '../src/rendering/creature-motion.js';
import {REAL_CREATURE_MODELS} from '../src/rendering/real-creature-models.js';
const source=readFileSync(new URL('../src/rendering/real-creature-models.js',import.meta.url),'utf8');

test('all initial ordinary-creature families have registered runtime identities and independent visual rigs',()=>{
  const groups={
    wolf:['wolf','direwolf'],
    drake:['friendlyDrake'],
    goblin:['friendlyGoblin','torchgoblin'],
    saproling:['saproling']
  };
  for(const [family,features] of Object.entries(groups)) {
    for(const feature of features) {
      assert.ok(CREATURE_MOTION_FAMILIES[feature],family+' missing motion for '+feature);
      assert.ok(Object.entries(REAL_CREATURE_MODELS).some(([id,r])=>r.feature===feature),
        family+' feature has no runtime creature identity '+feature);
    }
  }
});
test('wolves are true diagonal four-leg walkers, not one static model translated across tiles',()=>{
  const walk=Array.from({length:4},(_,i)=>creaturePose('wolf',1,i));
  assert.equal(new Set(walk.map(x=>x.nearStep)).size,3);
  assert.equal(walk[0].nearStep,-walk[0].farStep);
  assert.ok(walk.some(p=>p.bob<0));
  assert.notDeepEqual(walk.map(x=>x.tail),[0,0,0,0]);
  assert.notDeepEqual(creaturePose('wolf',2,1),creaturePose('wolf',2,2));
  assert.ok(creaturePose('wolf',2,2).advance>creaturePose('wolf',2,0).advance);
  assert.notEqual(creaturePose('wolf',1,0).nearStep,creaturePose('wolf',1,0,true).nearStep);
});
test('drakes articulate wings, while goblins thrust weapons and saprolings sway their mushroom caps',()=>{
  for(const state of [1,2,3]){
    const beats=Array.from({length:4},(_,i)=>creaturePose('friendlyDrake',state,i));
    assert.ok(new Set(beats.map(x=>x.wing)).size>1,'drake needs wing motion in '+state);
  }
  assert.ok(creaturePose('friendlyGoblin',2,2).strike>creaturePose('friendlyGoblin',2,0).strike);
  assert.ok(creaturePose('torchgoblin',2,2).strike>creaturePose('torchgoblin',2,0).strike);
  assert.ok(creaturePose('saproling',2,2).tilt<creaturePose('saproling',2,0).tilt);
  assert.ok(creaturePose('saproling',3,2).strike>0);
});
test('damage recoil and defeat are distinct in each supported family and are side-effect-free',()=>{
  for(const name of Object.keys(CREATURE_MOTION_FAMILIES)){
    const hurt=creaturePose(name,4,2),defeat=creaturePose(name,5,3);
    assert.ok(hurt.advance<0);
    assert.ok(defeat.collapse>0);
    assert.equal(defeat.bob,defeat.collapse);
    assert.deepEqual(hurt,creaturePose(name,4,2));
  }
  assert.equal(creaturePose('unknown',1,2),null);
  assert.throws(()=>creaturePose('wolf',-1,0),/Invalid creature animation/);
  assert.throws(()=>creaturePose('wolf',2,4),/Invalid creature frame/);
});
test('material illumination is directional, bounded and continuous without per-pixel hash speckling',()=>{
  for(const material of ['wolf','saproling','friendlySoldier','friendlyDrake','golem']){
    const a=materialLightDelta(5,5,96,96,material);
    const b=materialLightDelta(90,90,96,96,material);
    assert.ok(a>b,material+' upper-left surface should be lighter than lower-right');
    for(let y=2;y<=92;y+=9)for(let x=2;x<=92;x+=9){
      const v=materialLightDelta(x,y,96,96,material);
      assert.ok(v>=-24 && v<=24 && Number.isInteger(v));
      assert.ok(Math.abs(v-materialLightDelta(x+1,y,96,96,material))<=4,
        material+' shading should form coherent clusters, not hash noise');
    }
  }
  assert.notEqual(materialLightDelta(42,30,96,96,'golem'),materialLightDelta(42,30,96,96,'wolf'));
});
test('actual runtime overlay consumes these poses; noisy material hash and gameplay changes are absent',()=>{
  assert.ok(source.includes("import { CREATURE_MOTION_FAMILIES, creaturePose, materialLightDelta } from './creature-motion.js';"));
  assert.ok(source.includes('motion=creaturePose(feature,anim,frame,back)'));
  assert.ok(source.includes('const delta=materialLightDelta(x,y,w,h,material,edge);'));
  for(const family of ['friendlyDrake','friendlyGoblin','wolf','torchgoblin','saproling'])
    assert.ok(source.includes("case '"+family+"'"),family+' does not render its motion');
  assert.equal(source.includes('((x*47)^(y*89)'),false,'old coordinate hash must be removed');
  assert.ok(source.includes("defeat:{row:baseRows,frames:4,fps:7,loop:false}"),
    'each upgraded family needs a real defeat atlas row');
  assert.ok(source.includes('anim.row!==baseRows'),
    'defeat may not be a still-living borrowed legacy sprite');
  assert.ok(source.includes('anims,views:manifest.views,cols'),
    'species-specific animation metadata must reach the runtime renderer');
  const body=readFileSync(new URL('../src/rendering/creature-motion.js',import.meta.url),'utf8');
  for(const forbidden of ['Math.random','localStorage','window.','player.hp ='])
    assert.equal(body.includes(forbidden),false,'drawing must not change combat simulation: '+forbidden);
});
