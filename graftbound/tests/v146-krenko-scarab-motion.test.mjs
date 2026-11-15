import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ADVANCED_BOSS_KEYS,BOSS_STATES,advancedBossPose} from '../src/rendering/advanced-boss-motion.js';
import {BOSS_PRINTINGS,LEGENDARY_BOSS_KEYS} from '../src/rendering/legendary-boss-art.js';

const art=readFileSync(new URL('../src/rendering/legendary-boss-art.js',import.meta.url),'utf8');

test('Krenko and Scarab God remain real legendary identities with all six animation states',()=>{
  assert.equal(ADVANCED_BOSS_KEYS.length,6);
  for(const name of ['krenko','scarab']){
    assert.ok(ADVANCED_BOSS_KEYS.includes(name));
    assert.ok(LEGENDARY_BOSS_KEYS.includes(name));
    assert.ok(BOSS_PRINTINGS[name].set && BOSS_PRINTINGS[name].character);
    for(let state=0;state<BOSS_STATES.length;state++)for(const back of [false,true]){
      const poses=Array.from({length:4},(_,f)=>advancedBossPose(name,state,f,back));
      assert.ok(poses.every(p=>p.back===back && p.name===name));
      assert.ok(new Set(poses.map(p=>JSON.stringify(p))).size>=3,name+' '+BOSS_STATES[state]+' is a still frame');
    }
  }
});
test('Krenko steps, attaches his knife to the swinging hand, and raises a summoning gesture',()=>{
  const walk=Array.from({length:4},(_,f)=>advancedBossPose('krenko',1,f));
  assert.ok(new Set(walk.map(p=>p.goblinStep)).size>=3);
  const attack=Array.from({length:4},(_,f)=>advancedBossPose('krenko',2,f));
  assert.ok(attack[2].goblinBlade>attack[0].goblinBlade);
  const cast=Array.from({length:4},(_,f)=>advancedBossPose('krenko',3,f));
  assert.ok(cast[2].goblinCommand>cast[0].goblinCommand);
  assert.ok(cast[2].goblinHead<cast[0].goblinHead);
  assert.ok(advancedBossPose('krenko',5,3).sink>0);
});
test('Scarab God has supported ceremonial cape, articulated arms and signature reanimation pose',()=>{
  const walk=Array.from({length:4},(_,f)=>advancedBossPose('scarab',1,f));
  assert.ok(new Set(walk.map(p=>p.scarabStep)).size>=3);
  const attack=Array.from({length:4},(_,f)=>advancedBossPose('scarab',2,f));
  assert.ok(attack[2].scarabArm>attack[0].scarabArm);
  const cast=Array.from({length:4},(_,f)=>advancedBossPose('scarab',3,f));
  assert.ok(cast[2].scarabMagic>cast[0].scarabMagic);
  assert.ok(cast[2].scarabCape>cast[0].scarabCape);
  assert.ok(advancedBossPose('scarab',5,3).scarabCape<advancedBossPose('scarab',5,0).scarabCape);
});
test('boss art consumes the new poses and provides distinct nonlooping defeat sheets for all six',()=>{
  assert.ok(art.includes('const step=m?m.goblinStep:walk?phase%2?3:-3:0;'));
  assert.ok(art.includes('const blade=m?m.goblinBlade:0;'));
  assert.ok(art.includes('const armX=56+side*(21+arm*.4),armY=77+b-arm*.65;'));
  assert.ok(art.includes('const pulse=m?m.scarabMagic:0;'));
  assert.ok(art.includes('motion:advanced?advancedBossPose(name,a,f,v===1):null'));
  assert.ok(art.includes('defeat:{row:5,frames:4,fps:7,loop:false}'));
  const source=readFileSync(new URL('../src/rendering/advanced-boss-motion.js',import.meta.url),'utf8');
  for(const forbidden of ['Math.random','localStorage','fetch(','s.rng =','player.hp ='])
    assert.equal(source.includes(forbidden),false,'visual code cannot mutate combat simulation: '+forbidden);
});
