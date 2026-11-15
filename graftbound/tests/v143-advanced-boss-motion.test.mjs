import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ADVANCED_BOSS_KEYS,BOSS_STATES,advancedBossPose} from '../src/rendering/advanced-boss-motion.js';
import {BOSS_PRINTINGS,LEGENDARY_BOSS_KEYS} from '../src/rendering/legendary-boss-art.js';
const art=readFileSync(new URL('../src/rendering/legendary-boss-art.js',import.meta.url),'utf8');

test('all six distinctive legendary bosses have independently articulated runtime states',()=>{
  assert.deepEqual(ADVANCED_BOSS_KEYS,['nemata','arasta','drakuseth','krenko','scarab','toxrill','thornmother','matron','unwritten']);
  assert.equal(BOSS_STATES.join(','),'idle,walk,attack,cast,hurt,defeat');
  for(const name of LEGENDARY_BOSS_KEYS){
    assert.ok(ADVANCED_BOSS_KEYS.includes(name),name+' must have a native animation rig');
    assert.ok(BOSS_PRINTINGS[name].set&&BOSS_PRINTINGS[name].character);
  }
});
test('Nemata has independently articulated roots, canopy, branch attacks and Treefolk collapse',()=>{
  const walk=Array.from({length:4},(_,f)=>advancedBossPose('nemata',1,f));
  assert.equal(new Set(walk.map(x=>x.rootStep)).size,4);
  const strikes=Array.from({length:4},(_,f)=>advancedBossPose('nemata',2,f));
  assert.ok(strikes[2].armReach>strikes[0].armReach);
  assert.ok(strikes[2].pressure>strikes[1].pressure);
  const cast=Array.from({length:4},(_,f)=>advancedBossPose('nemata',3,f));
  assert.ok(new Set(cast.map(x=>x.leafPulse)).size>=3);
  assert.ok(cast[2].armReach>cast[0].armReach);
  assert.ok(advancedBossPose('nemata',5,3).sink>advancedBossPose('nemata',5,0).sink);
  assert.notDeepEqual(advancedBossPose('nemata',0,0),advancedBossPose('nemata',0,2));
});
test('Toxrill has independently animated slime pressure, feelers and body compression',()=>{
  for(let state=0;state<6;state++){
    const poses=Array.from({length:4},(_,f)=>advancedBossPose('toxrill',state,f));
    assert.ok(new Set(poses.map(p=>JSON.stringify(p))).size>=3);
  }
  assert.ok(advancedBossPose('toxrill',2,2).slugAdvance>0);
  assert.ok(advancedBossPose('toxrill',3,2).slimePulse>advancedBossPose('toxrill',3,0).slimePulse);
  assert.ok(advancedBossPose('toxrill',5,3).feelerBend>advancedBossPose('toxrill',5,1).feelerBend);
  assert.equal(advancedBossPose('toxrill',1,2,true).back,true);
});
test('visual poses are deterministic and invalid inputs cannot mutate the rules engine',()=>{
  for(const name of ADVANCED_BOSS_KEYS)for(let state=0;state<6;state++)for(let f=0;f<4;f++)
    assert.deepEqual(advancedBossPose(name,state,f,!!(f%2)),advancedBossPose(name,state,f,!!(f%2)));
  assert.equal(advancedBossPose('golem',2,1),null);
  assert.throws(()=>advancedBossPose('nemata',-1,0),/Invalid boss pose/);
  assert.throws(()=>advancedBossPose('toxrill',6,0),/Invalid boss pose/);
  assert.throws(()=>advancedBossPose('nemata',2,4),/Invalid boss pose/);
  const module=readFileSync(new URL('../src/rendering/advanced-boss-motion.js',import.meta.url),'utf8');
  for(const forbidden of ['Math.random','localStorage','window.','player.hp =','state.damage ='])
    assert.equal(module.includes(forbidden),false);
});
test('actual boss atlas consumes the new poses for all nine boss identities',()=>{
  assert.ok(art.includes("import {ADVANCED_BOSS_KEYS,advancedBossPose} from './advanced-boss-motion.js';"));
  assert.ok(art.includes('motion:advanced?advancedBossPose(name,a,f,v===1):null'));
  assert.ok(art.includes("advanced?ANIMS+1:ANIMS"));
  assert.ok(art.includes("artPack:'advanced-boss-motion-v1'"));
  assert.ok(art.includes("defeat:{row:5,frames:4,fps:7,loop:false}"));
  assert.ok(art.includes("const m=S.motion,b=m?Math.round(m.sink*.15"));
  assert.ok(art.includes("const shift=m?m.slugAdvance+m.mantleWave*.45:0"));
  assert.ok(art.includes("if(S.defeat)"));
});
