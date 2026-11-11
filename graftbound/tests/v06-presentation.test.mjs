import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import { swayFor, SWAY, WIND, buildEnvironment } from '../src/rendering/environment.js';
import { buildEncounter } from '../src/engine/encounters.js';
import { ACTS } from '../src/data/encounters.js';
import { coplanarOverlaps, STRIDE } from '../src/rendering/geometry.js';
import { rewardCards } from '../src/cards/catalog.js';
const src = f => readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');

test('wind: tiny sway amplitudes, rigid things never sway, reduced motion / ambient-off disable it', () => {
  for (const [k, a] of Object.entries(SWAY)) assert.ok(a <= 0.06, k);
  for (const k of ['crystal', 'shard', 'mushroom']) assert.equal(swayFor(k), 0);
  assert.equal(swayFor('pine', { reduced: true }), 0); assert.equal(swayFor('pine', { enabled: false }), 0); assert.ok(swayFor('pine', { quality: 'performance' }) < swayFor('pine'));
  for (const w of Object.values(WIND)) { assert.ok(w.rate <= 0.4, 'sparse particles'); assert.ok(Math.abs(Math.hypot(...w.dir) - 1) < 0.02, 'one consistent breeze direction'); }
});
test('foliage is anchored: shader displacement scales with corner height² (base never moves), units pass sway 0', () => {
  const gl = src('rendering/gl.js'), sc = src('rendering/scene.js');
  assert.match(gl, /aCorner\.y \* aCorner\.y\) \* aSway \* gust/); assert.match(gl, /SPR_FLOATS = 16/);
  assert.match(sc, /\[v\.flash, v\.dissolve, v\.outline, v\.flashCold\]\);/, 'unit quads use the default sway of 0');
});
test('no terrain regression: crystals and v0.6 terrain keep the floor free of coplanar overlaps', () => {
  for (const act of [0, 1, 2]) for (let seed = 1; seed < 6; seed++) {
    const enc = buildEncounter(ACTS[act].mid[0], seed * 17, 'battle'); enc.crystals = enc.crystals.map(c => ({ ...c, charged: seed % 2 === 0 }));
    const env = buildEnvironment(enc, seed, ['hollow', 'warrens', 'nexus'][act]); const board = [];
    for (let i = 0; i < env.opaque.length; i += STRIDE * 3) { const xs = [0, 1, 2].map(k => env.opaque[i + k * STRIDE]), zs = [0, 1, 2].map(k => env.opaque[i + k * STRIDE + 2]); if (Math.max(...xs.map(Math.abs)) <= 4.4 && Math.max(...zs.map(Math.abs)) <= 4.4) for (let k = 0; k < STRIDE * 3; k++) board.push(env.opaque[i + k]); }
    assert.equal(coplanarOverlaps(new Float32Array(board)), 0);
  }
});
test('all 13 curated real spells have DISTINCT VFX identities implemented as their own functions', async () => {
  const { VFX, SPELL_VFX } = await import('../src/rendering/vfx.js');
  const spells = rewardCards().filter(c => c.kind === 'spell'); assert.equal(spells.length, 13);
  const ids = spells.map(c => c.vfx); assert.equal(new Set(ids).size, 13, ids.join());
  for (const c of spells) { assert.equal(SPELL_VFX[c.name], c.vfx, c.name); assert.equal(typeof VFX[c.vfx], 'function', c.vfx); }
  assert.equal(new Set(Object.values(SPELL_VFX).map(k => VFX[k])).size, 13, 'no two spells share an effect function');
  const v = src('rendering/vfx.js'); assert.match(v, /export async function shock/); assert.ok(!/shock[^\n]*sleep\(sc, 2\d\d\)/.test(v), 'Shock stays fast (no long buildup)');
  assert.match(readFileSync(new URL('../dev/vfx.html', import.meta.url), 'utf8'), /SPELL_VFX/, 'dev gallery lists every spell');
});
test('UI wiring: auto-end setting, tooltips (hover + keyboard focus + tap), hazard confirmation, ranked recorder', () => {
  const ui = src('ui/battle-ui.js'), main = src('main.js'), sc = src('ui/screens.js');
  assert.match(ui, /maybeAutoEnd\(\)/); assert.match(ui, /shouldAutoEnd\(s, \{ busy: this\.busy, targeting: !!this\.spell/); assert.match(sc, /data-k="autoEnd"/);
  assert.match(ui, /warnOk\(tag, warn\)/); assert.match(ui, /showTile\(t\)/); assert.match(main, /addEventListener\('focusin'/); assert.match(main, /addEventListener\('pointerover'/);
  assert.match(ui, /this\.app\.record\(d\)/); assert.ok(!/movePlayer\(s, t\.x, t\.y\)\)/.test(ui), 'every battle action routes through exec()');
  assert.match(sc, /LOCAL · UNVERIFIED · UNRANKED/); assert.match(sc, /data-tip="\$\{esc\(NODE_TIP/);
});
