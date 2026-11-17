// GRAFTBOUND visual facing: paths, targeted combat, telegraphed attacks, and pushed movement.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { combatFacingTarget } from '../src/rendering/combat-facing.js';
import { Scene } from '../src/rendering/scene.js';
import { chooseSpriteDirection } from '../src/rendering/hd2d-art-pack.js';

const point = id => id === 2 ? [4, 0, 1] : null;
const tile = (x,y) => [x, 0, y];

test('every directed combat animation looks at its actual target, not the hero by default', () => {
  for (const t of ['attack','counter','rangedShot','spit','hex','harpoon','spell']) {
    assert.deepEqual(combatFacingTarget({t, uid:1, target:2}, point, tile), [4,0,1], t);
    assert.equal(combatFacingTarget({t, uid:1, target:999}, point, tile), null, t+' lost target');
  }
  assert.deepEqual(combatFacingTarget({t:'spell',uid:1,x:3,y:6},point,tile), [3,0,6]);
  assert.deepEqual(combatFacingTarget({t:'spell',uid:1,target:999,x:3,y:6},point,tile), [3,0,6]);
  assert.equal(combatFacingTarget({t:'damage',uid:2,target:1},point,tile),null,'a hit does not rotate the victim');
  assert.equal(combatFacingTarget({t:'turn',uid:1},point,tile),null);
});

test('line and area telegraphs face their centre, ignoring invalid tiles', () => {
  for (const t of ['aim','fire','slamHit'])
    assert.deepEqual(combatFacingTarget({t,uid:1,tiles:[{x:1,y:2},{x:3,y:4},null]},point,tile),[2,0,3],t);
  assert.equal(combatFacingTarget({t:'aim',uid:1,tiles:[]},point,tile),null);
});

function fakeScene() {
  const actor={uid:1,pos:[0,0,0],dir:[0,-1],anim:'idle'};
  const foe={uid:2,pos:[4,0,1],dir:[0,1]};
  const steps=[];
  const scene={units:new Map([[1,actor],[2,foe]]), world:tile,
    face:Scene.prototype.face,
    tween:(_time,run)=>{steps.push([...actor.dir]);run(1);return Promise.resolve();}};
  return {scene,actor,foe,steps};
}

test('scene rotates only the attacker; two-view and four-view sprites agree', () => {
  const {scene,actor,foe}=fakeScene();
  assert.equal(Scene.prototype.faceCombatEvent.call(scene,{t:'attack',uid:1,target:2}),true);
  assert.deepEqual(actor.dir,[4,1]);assert.deepEqual(foe.dir,[0,1]);
  const cameraFacing=[-1,0],awayDot=actor.dir[0]*cameraFacing[0]+actor.dir[1]*cameraFacing[1];
  assert.equal(chooseSpriteDirection(['front','back'],awayDot,0).index,0);
  assert.equal(chooseSpriteDirection(['front','back','left','right'],awayDot,0).index,0);
  assert.equal(Scene.prototype.faceCombatEvent.call(scene,{t:'damage',uid:2}),false);
  assert.equal(Scene.prototype.faceCombatEvent.call(scene,{t:'attack',uid:111,target:2}),false);
});

test('every movement segment faces its travel direction, including turns',async()=>{
  const {scene,actor,steps}=fakeScene();
  await Scene.prototype.movePath.call(scene,1,[{x:0,y:0},{x:0,y:1},{x:1,y:1}]);
  assert.deepEqual(steps,[[0,1],[1,0]]);
  assert.deepEqual(actor.dir,[1,0]);assert.deepEqual(actor.pos,[1,0,1]);assert.equal(actor.anim,'idle');
});

test('forced slide also faces its direction, without rewriting game state',async()=>{
  const {scene,actor}=fakeScene();
  await Scene.prototype.slide.call(scene,1,[{x:0,y:0},{x:0,y:-2}]);
  assert.deepEqual(actor.dir,[0,-2]);assert.deepEqual(actor.pos,[0,0,-2]);
});

test('combat playback applies facing before animations without touching the rules engine',()=>{
  const ui=readFileSync(new URL('../src/ui/battle-ui.js',import.meta.url),'utf8');
  assert.match(ui,/if \(e\.uid != null\) sc\.faceCombatEvent\(e\);\s*switch \(e\.t\)/);
  assert.match(ui,/case 'move': sc\.onStep/);
  assert.match(ui,/case 'attack':/);
});
