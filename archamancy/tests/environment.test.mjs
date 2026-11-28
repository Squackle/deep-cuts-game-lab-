import assert from 'node:assert/strict';
import test from 'node:test';
import {extendCreek} from '../environment-art.mjs';
import {environmentBounds} from '../environment.mjs';

const rect = (left, top, width, height) => ({left, top, width, height, right: left + width, bottom: top + height});

test('decorative terrain covers asymmetric safe areas and ultrawide viewports at board scale', () => {
 const views = [
  [rect(156, 14, 393, 235.8), rect(0, 0, 667, 269)],
  [rect(0, 76, 1180, 708), rect(0, 0, 1180, 860)],
  [rect(1360, 0, 2400, 1440), rect(0, 0, 5120, 1440)]
 ];
 for (const [board, viewport] of views) {
  const bounds = environmentBounds(board, viewport, 1000, 600);
  const scale = board.width / 1000;
  assert(board.left + bounds.left * scale <= viewport.left);
  assert(board.left + bounds.right * scale >= viewport.right);
  assert(board.top + bounds.top * scale <= viewport.top);
  assert(board.top + bounds.bottom * scale >= viewport.bottom);
 }
 assert.equal(environmentBounds(rect(0, 0, 0, 0), rect(0, 0, 390, 844), 1000, 600), null);
});

test('small viewport changes can reveal cached scenery without repainting it', () => {
 const saved = environmentBounds(rect(118, 12, 608, 364.8), rect(0, 0, 844, 390), 1000, 600);
 const resized = environmentBounds(rect(120, 16, 608, 364.8), rect(0, 0, 848, 397), 1000, 600);
 assert.deepEqual(resized, saved);
});

test('peripheral streams continue edge crossings without relocating the original channel', () => {
 const channel = [[216, -30], [217, -25], [221, 400], [224, 625], [225, 630]];
 const before = structuredClone(channel);
 const continued = extendCreek(channel, 600);
 assert.deepEqual(channel, before);
 assert.deepEqual(continued.slice(5, -5), before);
 assert(continued[0][1] < -200 && continued.at(-1)[1] > 800);
 const spring = channel.slice(0, 3);
 assert.deepEqual(extendCreek(spring, 600).slice(-3), spring);
});
