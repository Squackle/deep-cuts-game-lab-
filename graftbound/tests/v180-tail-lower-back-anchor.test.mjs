// GRAFTBOUND v1.8.0-beta: grafted tails emerge from the lower back instead of the buttocks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blankNativeAnchor, blankNativeTailRoot } from '../src/rendering/native-blank-art.js';
import { BENCHMARK_STATES } from '../src/rendering/raster-benchmarks.js';
const source = path => readFileSync(new URL('../src/rendering/' + path, import.meta.url), 'utf8');

test('native tail roots attach between back and hip, clearly above buttocks in every authored pose', () => {
  let checked = 0;
  for (const view of [0, 1]) for (const [state, meta] of Object.entries(BENCHMARK_STATES))
    for (let frame = 0; frame < meta.frames; frame++) {
      const A = blankNativeAnchor(state, frame, view);
      const root = blankNativeTailRoot(A);
      assert.ok(root[1] > A.back[1] + 7, state + ' lower-back root below shoulder blades');
      assert.ok(root[1] <= A.hip[1] - 9, state + ' tail root above the hip/glute anchor');
      assert.ok(Math.abs(root[0] - A.back[0]) <= 4, state + ' lumbar attachment near spine');
      assert.ok(root.every(n => Number.isInteger(n) && n >= 0 && n < 128));
      checked++;
    }
  assert.ok(checked >= 30);
});

test('native scaled, fur and serpent tails all share the updated pose-specific lumbar socket', () => {
  const s = source('native-blank-art.js');
  assert.match(s, /function tail\(g,A,kind,tier,view,frame\)\{\s*const \[hx,hy\]=blankNativeTailRoot\(A\)/);
  assert.match(s, /socket\(g,hx\+sign\*3,hy\+1/);
  assert.match(s, /if\(t\.tail&&want\('rest'\)\)tail\(g,A,m\.tailKind,level\(t\.tail\),view,frame\)/);
});

test('legacy pixel fallback also starts its tail higher on the lower back', () => {
  assert.match(source('graft-morphology.js'), /if\(t\.tail\)\{let k=t\.tail,tx=42\+xx,ty=42\+yy/);
});
