import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { raisedTailGeometry } from '../src/rendering/native-blank-art.js';
import { twoViewHeroTurn } from '../src/rendering/scene.js';

test('grafted tail stays at hip height across views and walk frames',()=>{
  for(const view of [0,1])for(const frame of [0,1,2,3])for(const tier of [1,2,3]){
    const t=raisedTailGeometry([63,78],tier,view,frame);
    assert.ok(t.tipY<=t.hy-6,'tail cannot sag beneath its hip');
    assert.ok(t.upper1[1]<t.rootTop[1],'tail rises out of the sacrum');
    assert.ok(t.tip[1]<t.rootBottom[1],'tail tip is raised above the lower root');
    assert.equal(Math.sign(t.tip[0]-t.hx),view===1?-1:1);
    assert.ok(t.outerTip[0]>=0 && t.outerTip[0]<128,'tail stays inside the native frame');
  }
});
test('two-view hero turns toward each sideways and diagonal travel direction',()=>{
  const views=['front','back'];
  const right=twoViewHeroTurn('blank',views,0,1);
  const left=twoViewHeroTurn('blank',views,0,-1);
  assert.ok(right>2 && left< -2);
  assert.ok(Math.abs(right)<3.06 && Math.abs(left)<3.06,'yaw capped to preserve visible sprite width');
  assert.ok(twoViewHeroTurn('blank',views,1,.5)>2,'diagonal movement uses signed angle');
  assert.ok(twoViewHeroTurn('blank',views,-1,-.5)< -2,'opposite diagonal uses reverse angle');
  assert.equal(twoViewHeroTurn('blank',views,1,0),0);
  assert.equal(twoViewHeroTurn('mtg_hound',views,0,1),0,'other creatures unchanged');
  assert.equal(twoViewHeroTurn('blank',['front','back','left','right'],0,1),0,'authored four-view art unchanged');
});
test('turning is wired to actual path direction and the sprite vertex shader',()=>{
  const scene=readFileSync(new URL('../src/rendering/scene.js',import.meta.url),'utf8');
  const gl=readFileSync(new URL('../src/rendering/gl.js',import.meta.url),'utf8');
  assert.match(scene,/this\.face\(v, b\)/,'direction updated before every move segment');
  assert.match(scene,/v\.dir = \[dx \/ length, dz \/ length\]/,'facing normalized');
  assert.match(scene,/twoViewHeroTurn\(v\.key, v\.views \|\| man\.views, frontDot, sideDot\)/);
  assert.match(gl,/facingRight \* \(aCorner\.x - 0\.5\)/,'vertex shader orients the creature plane');
  assert.match(gl,/if \(abs\(aSway\) <= 2\.0\)/,'ordinary foliage wind remains separate');
});
test('all three card zones use the same top alignment and stacked label/count layout',()=>{
  const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
  assert.match(css,/#hud \.gb-card-zones \{ align-items:flex-start; \}/);
  assert.match(css,/#hud \.gb-card-zones \.gb-zone-art \{ flex:0 0 auto; box-sizing:border-box; \}/);
  assert.match(css,/#hud \.gb-card-zones \.gb-zone-meta \{[^}]*flex-direction:column;[^}]*min-height:46px;/);
});
