import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SQUIRREL_FRAME_SIZE,SQUIRREL_ANIMS,SQUIRREL_VIEWS,squirrelPose,installPainterlySquirrel} from '../src/rendering/painterly-squirrel.js';
import {REAL_CREATURE_MODELS} from '../src/rendering/real-creature-models.js';
const loader=readFileSync(new URL('../src/rendering/sprites.js',import.meta.url),'utf8');
test('Squirrel keeps real token identity and is no longer left as the generic Hound art',()=>{
  assert.equal(REAL_CREATURE_MODELS.friendlySquirrel.base,'hound','test guards why the replacement is needed');
  assert.match(loader,/installPainterlySquirrel\(images,manifest\)/);
  assert.ok(loader.indexOf('installPainterlySquirrel(images,manifest)')>loader.indexOf('installRealCreatureModels(images,manifest)'));
});
test('dedicated art declares two true directions and its own 96px sprite scale',()=>{
  assert.equal(SQUIRREL_FRAME_SIZE,96);
  assert.deepEqual(SQUIRREL_VIEWS,['front','back']);
  assert.deepEqual(Object.keys(SQUIRREL_ANIMS),['idle','walk','attack','cast','hurt','defeat']);
  for(const [i,[state,data]] of Object.entries(SQUIRREL_ANIMS).entries()){
    assert.equal(data.row,i);assert.equal(data.frames,4);
    assert.ok(data.fps>=5&&data.fps<=15);
    assert.equal(data.loop,state==='idle'||state==='walk');
  }
});
test('idle breathing, articulated gait, attacking lunge and defeat poses are not static frames',()=>{
  const walk=Array.from({length:4},(_,i)=>squirrelPose('walk',i));
  assert.equal(new Set(walk.map(p=>p.stride)).size,4);
  assert.ok(walk.some(p=>p.bob<0));
  assert.notDeepEqual(squirrelPose('idle',0),squirrelPose('idle',2));
  assert.ok(squirrelPose('attack',2).lunge>squirrelPose('attack',0).lunge);
  assert.ok(squirrelPose('defeat',3).tuck>squirrelPose('defeat',0).tuck);
  assert.notEqual(squirrelPose('walk',1).tail,squirrelPose('walk',3).tail);
});
test('cosmetic poses are deterministic and do not consume gameplay randomness',()=>{
  for(const state of Object.keys(SQUIRREL_ANIMS))for(let f=0;f<4;f++)
    assert.deepEqual(squirrelPose(state,f),squirrelPose(state,f));
  assert.equal(installPainterlySquirrel({}, {sprites:{}}),0,'Node engine context is DOM-free');
});
