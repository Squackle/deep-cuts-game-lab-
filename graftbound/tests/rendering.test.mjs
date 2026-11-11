// Rendering invariants that can be checked without a GPU (pure geometry). Browser checks: tests/e2e.py.
import test from 'node:test'; import assert from 'node:assert/strict';
import { buildEnvironment, MAT, FLOOR_TOP, FOUNDATION_TOP, THEMES } from '../src/rendering/environment.js';
import { STRIDE, coplanarOverlaps, Geo } from '../src/rendering/geometry.js';
import { buildEncounter } from '../src/engine/encounters.js';
import { ACTS } from '../src/data/encounters.js';
import { readFileSync } from 'node:fs';

const tops = (data, y, eps = 1e-4) => { let n = 0; for (let i = 0; i < data.length; i += STRIDE) if (Math.abs(data[i + 1] - y) < eps && data[i + 4] > 0.99) n++; return n; };
test('FLOOR FIX: no upward surface of the arena is coplanar-and-overlapping with another (v0.4 bug)', () => {
  for (const [a, theme] of [[0, 'hollow'], [1, 'warrens'], [2, 'nexus']]) for (let seed = 1; seed < 8; seed++) {
    const enc = buildEncounter(ACTS[a].mid[0], seed * 31, 'battle'); const env = buildEnvironment(enc, seed, theme);
    const board = []; for (let i = 0; i < env.opaque.length; i += STRIDE * 3) { const xs = [0, 1, 2].map(k => env.opaque[i + k * STRIDE]), zs = [0, 1, 2].map(k => env.opaque[i + k * STRIDE + 2]); if (Math.max(...xs.map(Math.abs)) <= 4.4 && Math.max(...zs.map(Math.abs)) <= 4.4) for (let k = 0; k < STRIDE * 3; k++) board.push(env.opaque[i + k]); }
    assert.equal(coplanarOverlaps(new Float32Array(board)), 0, `${theme} seed ${seed}`);
  }
});
test('the foundation top sits below tile bodies, and tile tops are the only surfaces at floor height', () => {
  assert.ok(FOUNDATION_TOP < -0.25 && FLOOR_TOP === 0);
  const enc = buildEncounter(ACTS[0].tutorial[0], 3, 'battle'); const env = buildEnvironment(enc, 3, 'hollow');
  assert.ok(tops(env.opaque, FOUNDATION_TOP) > 0, 'foundation still exists'); assert.equal(tops(env.opaque, 0) % 6, 0);
  const v04 = new Geo(); v04.box(0, -0.55, 0, 8.7, 1.1, 8.7, [1, 1, 1, 1]); v04.slab(0.5, 0.5, 0.97, 0.97, -0.25, 0, 0.045, [1, 1, 1, 1], [1, 1, 1, 1]);
  assert.ok(coplanarOverlaps(v04.build()) > 0, 'the audit detects the v0.4 configuration');
});
test('materials: each act theme uses its own floor set; lava and rift tiles get distinct materials and lights', () => {
  const ids = data => { const s = new Set(); for (let i = 0; i < data.length; i += STRIDE) s.add(data[i + 10]); return s; };
  const e1 = buildEnvironment(buildEncounter(ACTS[1].early[0], 5, 'battle'), 5, 'warrens'); assert.ok(ids(e1.opaque).has(MAT.lava) && ids(e1.opaque).has(MAT.basalt));
  const e2 = buildEnvironment(buildEncounter(ACTS[2].early[0], 5, 'battle'), 5, 'nexus'); assert.ok(ids(e2.opaque).has(MAT.crystal) && e2.emitters.some(e => e.kind === 'rift'));
  assert.ok(Object.keys(THEMES).length === 3 && Object.values(MAT).every(m => m >= 1 && m <= 16), 'materials fit the 4×4 atlas');
  const man = JSON.parse(readFileSync(new URL('../assets/sprites/manifest.json', import.meta.url)));
  assert.equal(Object.keys(man.materials).length, 16);
  for (const [n, id] of Object.entries(MAT)) assert.equal(man.materials[n], id, n);
});
test('every enemy sprite and foliage kind used by the game exists in the asset manifest', async () => {
  const man = JSON.parse(readFileSync(new URL('../assets/sprites/manifest.json', import.meta.url)));
  const { ENEMIES } = await import('../src/data/enemies.js');
  for (const d of Object.values(ENEMIES)) assert.ok(man.sprites[d.sprite], d.sprite);
  for (const th of Object.values(THEMES)) for (const k of [...th.trees, ...th.small]) assert.ok(man.foliage.frames[k], k);
});
test('shader sources sample a pre-filtered atlas by texel footprint (distance shimmer fix)', () => {
  const src = readFileSync(new URL('../src/rendering/gl.js', import.meta.url), 'utf8');
  assert.match(src, /uAtlasBlur/); assert.match(src, /dFdx\(uv\)/);
});
