import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DAMAGE, SCENARIO, FIRE_BOARD_WIPE_EFFECT, isFireBoardWipeEligible, resolveBoardFire
} from '../dev/animation-studio/scenario.js';

const read = relative=>readFileSync(new URL(relative,import.meta.url),'utf8');

test('Pyroclasm is the canonical 2-damage reference for this scoped visual',()=>{
  assert.deepEqual(FIRE_BOARD_WIPE_EFFECT,{
    id:'red-fire-board-wipe',previewCard:'Pyroclasm',
    colors:['R'],visualTheme:'fire',action:'board-wipe',targets:'all-creatures',
    previewDamage:2,studioOnly:true
  });
  assert.equal(FIRE_BOARD_WIPE_EFFECT.previewDamage,DAMAGE);
  assert.equal(FIRE_BOARD_WIPE_EFFECT.studioOnly,true);
  assert.equal(isFireBoardWipeEligible(FIRE_BOARD_WIPE_EFFECT),true);
  const hits=resolveBoardFire(SCENARIO);
  assert.equal(hits.length,7);
  assert.equal(hits.filter(u=>u.dead).length,3);
  assert.equal(hits[0].hp,3,'even the caster takes 2 damage');
});

test('only red fire-based ALL-creature board wipes are eligible',()=>{
  const base={...FIRE_BOARD_WIPE_EFFECT};
  // Reuse does not depend on the card title, only its reviewed semantics.
  assert.equal(isFireBoardWipeEligible({...base,previewCard:'Another reviewed red fire sweeper'}),true);
  assert.equal(isFireBoardWipeEligible({...base,colors:['R','W']}),true);
  for(const candidate of [
    {...base,colors:['B']},                   // a black sweeper
    {...base,colors:[]},                      // colorless
    {...base,visualTheme:'frost'},            // red but not fire
    {...base,visualTheme:'smoke'},
    {...base,action:'single-target-damage'},  // red fire bolt
    {...base,targets:'target-creature'},      // targeted burn
    {...base,targets:'opponents-creatures'},  // different scope
    {...base,action:'creature-buff'},
    null,undefined,'Pyroclasm',{}
  ]) assert.equal(isFireBoardWipeEligible(candidate),false,JSON.stringify(candidate));
});

test('studio names the effect Pyroclasm / red fire wipes; never an invented separate spell',()=>{
  const html=read('../dev/animation-studio/index.html');
  const studio=read('../dev/animation-studio/studio.js');
  assert.match(html,/<h1>PYRO<span>CLASM<\/span><\/h1>/);
  assert.match(html,/Pyroclasm.*red, fire-based creature board wipes/);
  assert.match(html,/CAST PYROCLASM/);
  assert.match(html,/Effect scope:/);
  assert.match(studio,/FIRE_BOARD_WIPE_EFFECT/);
  assert.match(studio,/isFireBoardWipeEligible\(FIRE_BOARD_WIPE_EFFECT\)/);
  assert.match(studio,/function drawPyroclasm\(t\)/);
  assert.doesNotMatch(html,/cinderstorm/i);
  assert.doesNotMatch(studio,/cinderstorm/i);
});
