// Title-screen showcase faces its orbiting camera; combat facing is unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cameraFacingDirection, chooseSpriteDirection } from '../src/rendering/hd2d-art-pack.js';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('showcase hero faces the camera at every quarter orbit and in between', () => {
  for (const yaw of [-Math.PI, -Math.PI / 2, -Math.PI / 4, 0, Math.PI / 4, Math.PI / 2, Math.PI, 3 * Math.PI]) {
    const dir = cameraFacingDirection(yaw);
    assert.ok(Math.abs(Math.hypot(...dir) - 1) < 1e-12, 'unit facing direction');
    const camFwd = [-Math.sin(yaw), -Math.cos(yaw)];
    const awayDot = dir[0] * camFwd[0] + dir[1] * camFwd[1];
    assert.ok(Math.abs(awayDot + 1) < 1e-12, 'faces viewer, not away');
    assert.equal(chooseSpriteDirection(['front', 'back'], awayDot, 0).index, 0);
    assert.equal(chooseSpriteDirection(['front', 'back', 'left', 'right'], awayDot, 0).index, 0);
  }
});

test('title mode follows moving camera and initial showcase is front-facing', () => {
  assert.match(source, /v\.dir = cameraFacingDirection\(this\.scene\.yaw\)/);
  assert.match(source, /if \(this\.mode === 'title'\) \{\s*const titleHero = this\.scene\.units\.get\(1\);\s*if \(titleHero\?\.side === 'player'\) titleHero\.dir = cameraFacingDirection\(this\.scene\.yaw\)/);
  assert.match(source, /if \(this\.mode === 'title' \|\| this\.mode === 'intro'\) \{\s*this\.scene\.yawTarget \+= dt \* 0\.1/);
});
