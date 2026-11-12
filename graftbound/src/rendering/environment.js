// Arena + surroundings per act theme. Pure geometry/data from (battle terrain, seed, theme); no game rules.
//
// v0.5 floor fix (1 of 2): in v0.4 the foundation block under the board had its TOP FACE at y = 0 — exactly
// coplanar with every tile's top face (also y = 0). Two surfaces with different textures competed for the same
// depth across the whole board, producing the jagged, striped, flickering pattern. The foundation top now sits
// below the tile bodies (y = -0.27, visible only as dark grout between tiles), the slabs no longer emit a hidden
// internal top face, and tests/rendering.test.mjs audits the generated mesh for coplanar overlaps.
import { Geo, jitter } from './geometry.js';
import { T as M, S, RY, RZ, RX, chain } from './math.js';
import { T as TILE } from '../core/grid.js';

export const MAT = { flag: 1, flagmoss: 2, grass: 3, dirt: 4, brick: 5, rock: 6, bark: 7, leaves: 8, cliff: 9, rune: 10, water: 11, moss: 12, basalt: 13, lava: 14, crystal: 15, ash: 16 };
export const FLOOR_TOP = 0, TILE_BOTTOM = -0.25, FOUNDATION_TOP = -0.27;
/** Dev-only switch used by dev/floor.html to reproduce the v0.4 bug for before/after screenshots. */
export const DEBUG = { legacyFloor: false };
export const THEMES = {
  hollow:  { floor: [MAT.flag, MAT.flagmoss], rock: MAT.rock, ground: MAT.grass, near: MAT.dirt, cliff: MAT.cliff, wall: MAT.brick,
    env: { sunDir: [-0.55, 0.75, -0.38], sunCol: [0.9, 0.76, 0.58], ambTop: [0.34, 0.42, 0.44], ambBot: [0.12, 0.13, 0.1], fog: [0.07, 0.11, 0.1], fogR: [7.5, 15] }, tint: [1, 1, 1],
    trees: ['pine', 'oak'], small: ['grass', 'grass', 'fern', 'bush', 'mushroom'], torch: [1, 0.55, 0.22], mote: [0.8, 1, 0.55] },
  warrens: { floor: [MAT.basalt, MAT.basalt, MAT.flag], rock: MAT.basalt, ground: MAT.ash, near: MAT.ash, cliff: MAT.basalt, wall: MAT.basalt,
    env: { sunDir: [-0.4, 0.82, -0.4], sunCol: [0.85, 0.5, 0.32], ambTop: [0.3, 0.2, 0.18], ambBot: [0.16, 0.06, 0.03], fog: [0.11, 0.05, 0.035], fogR: [6.5, 13] }, tint: [1.04, 0.97, 0.92],
    trees: ['deadtree'], small: ['ashgrass', 'ashgrass', 'bramble'], torch: [1, 0.42, 0.12], mote: [1, 0.55, 0.2] },
  nexus:   { floor: [MAT.crystal, MAT.flag, MAT.crystal], rock: MAT.crystal, ground: MAT.crystal, near: MAT.rune, cliff: MAT.cliff, wall: MAT.brick,
    env: { sunDir: [-0.5, 0.8, -0.3], sunCol: [0.62, 0.6, 0.95], ambTop: [0.3, 0.26, 0.45], ambBot: [0.08, 0.05, 0.14], fog: [0.06, 0.04, 0.11], fogR: [7, 14] }, tint: [0.98, 0.97, 1.05],
    trees: ['crystal'], small: ['shard', 'shard', 'mushroom'], torch: [0.7, 0.45, 1], mote: [0.75, 0.6, 1] },
};
const at = (x, y, z, ...r) => chain(M(x, y, z), ...r);

/** v0.6 ambient wind. Sway amplitudes are deliberately tiny (world units at the top of the sprite). Rocks,
 *  crystals and rigid props never sway. Reduced motion or the Ambient setting turns it off entirely. */
export const SWAY = { pine: 0.05, oak: 0.06, deadtree: 0.02, bush: 0.03, fern: 0.035, grass: 0.04, ashgrass: 0.03, bramble: 0.02, mushroom: 0, crystal: 0, shard: 0 };
export const WIND = {
  hollow: { dir: [0.92, 0.38], rise: 0.04, rate: 0.35, leafChance: 0.18, leaf: [0.55, 0.62, 0.25] },
  warrens: { dir: [0.7, 0.71], rise: 0.22, rate: 0.3, leafChance: 0.25, leaf: [0.45, 0.42, 0.4] },
  nexus: { dir: [0.5, 0.86], rise: 0.12, rate: 0.25, leafChance: 0, leaf: [0.7, 0.6, 1] },
};
export function swayFor(kind, { reduced = false, enabled = true, quality = 'high' } = {}) {
  if (reduced || !enabled) return 0;
  return (SWAY[kind] || 0) * (quality === 'performance' ? 0.6 : 1);
}
const W = [1, 1, 1, 1];

export function buildEnvironment(battle, seed = 1, themeId = 'hollow') {
  const th = THEMES[themeId] || THEMES.hollow;
  const g = new Geo(), fx = new Geo();
  const { w, h } = battle;
  const ox = -w / 2 + 0.5, oz = -h / 2 + 0.5;
  let st = seed >>> 0 || 1; const rnd = () => { st = (st * 1664525 + 1013904223) >>> 0; return st / 4294967296; };
  const terr = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : battle.terrain[y * w + x]);
  const foliage = [], lights = [], emitters = [];
  // Foundation: top face BELOW the tile bodies (never coplanar with tile tops).
  if (DEBUG.legacyFloor) g.material(MAT.cliff, q => q.box(0, -0.55, 0, w + 0.7, 1.1, h + 0.7, [0.62, 0.62, 0.58, 1], [0.7, 0.7, 0.64, 1]));
  else g.material(th.cliff, q => q.box(0, (FOUNDATION_TOP - 1.1) / 2, 0, w + 0.7, 1.1 + FOUNDATION_TOP, h + 0.7, [0.62, 0.62, 0.58, 1], [0.22, 0.2, 0.18, 1]));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = terr(x, y), cx = ox + x, cz = oz + y;
    let ao = 1; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (terr(x + dx, y + dy) === TILE.ROCK) ao -= 0.08;
    const tint = jitter([ao, ao, ao * 0.98, 1], 0.1, x * 31 + y * 17 + seed);
    let mat = th.floor[Math.floor(rnd() * th.floor.length)];
    if (t === TILE.BRAMBLE) mat = MAT.dirt;
    if (t === TILE.LEYLINE || t === TILE.RIFT) mat = MAT.rune;
    if (t === TILE.LAVA) {   // lava sits as a recessed glowing pool; its rim is basalt
      g.material(MAT.basalt, q => q.slab(cx, cz, 0.97, 0.97, TILE_BOTTOM, -0.03, 0.03, [0.5, 0.45, 0.42, 1], [0.6, 0.55, 0.5, 1]));
      g.material(MAT.lava, q => q.quad([cx - 0.4, -0.004, cz + 0.4], [cx + 0.4, -0.004, cz + 0.4], [cx + 0.4, -0.004, cz - 0.4], [cx - 0.4, -0.004, cz - 0.4], [1, 1, 1, 1]));
      lights.push({ pos: [cx, 0.4, cz], col: [1, 0.45, 0.12], radius: 2.2, intensity: 1.0, flicker: 0.25, prio: 2 }); emitters.push({ kind: 'lava', pos: [cx, 0, cz] });
      continue;
    }
    g.material(mat, q => q.slab(cx, cz, 0.97, 0.97, TILE_BOTTOM, FLOOR_TOP, 0.045, [0.55, 0.55, 0.52, 1], tint));
    if (t === TILE.ROCK) {
      const s = 0.85 + rnd() * 0.35;
      if (themeId === 'nexus') g.material(MAT.crystal, q => q.with(at(cx, 0.35, cz, RY(rnd() * 3), RZ(0.15), S(0.35 * s, 0.9 * s, 0.35 * s)), r => r.cylinder(0, 0.9, 1, 6, W)));
      else g.material(th.rock, q => q.with(at(cx, 0.1, cz, RY(rnd() * 3), S(s, 0.75 + rnd() * 0.45, s)), r => r.sphere(0.4, 7, 5, [1, 1, 1, 1], (i, j) => jitter([0.95, 0.95, 0.92, 1], 0.2, i * 3 + j * 7 + x))));
      if (themeId === 'hollow') g.material(MAT.moss, q => q.with(at(cx + 0.08, 0.38, cz - 0.05, S(1, 0.45, 1)), r => r.sphere(0.2, 6, 3, W)));
    }
    if (t === TILE.BRAMBLE) { foliage.push({ kind: 'bramble', x: cx - 0.18, z: cz + 0.12, s: 0.75 }); foliage.push({ kind: 'bramble', x: cx + 0.2, z: cz - 0.14, s: 0.6 }); }
    if (t === TILE.LEYLINE) { lights.push({ pos: [cx, 0.35, cz], col: [1, 0.78, 0.35], radius: 1.8, intensity: 0.9, flicker: 0.15, prio: 1 }); emitters.push({ kind: 'ley', pos: [cx, 0.02, cz] }); }
    if (t === TILE.RIFT) { lights.push({ pos: [cx, 0.35, cz], col: [0.7, 0.35, 1], radius: 2, intensity: 1.1, flicker: 0.3, prio: 2 }); emitters.push({ kind: 'rift', pos: [cx, 0.02, cz] }); }
  }
  for (const c of battle.crystals || []) {   // v0.6 interactive crystals (charged glow; spent = dull shard)
    const cx = ox + c.x, cz = oz + c.y;
    foliage.push({ kind: c.charged ? 'crystal' : 'shard', x: cx, z: cz, s: c.charged ? 0.6 : 0.9 });
    if (c.charged) { lights.push({ pos: [cx, 0.6, cz], col: [0.55, 0.75, 1], radius: 2, intensity: 1.1, flicker: 0.12, prio: 2 }); emitters.push({ kind: 'rift', pos: [cx, 0.05, cz] }); }
  }
  const R = 13, N = 26;
  const hgt = (x, z) => { const d = Math.max(Math.abs(x) - w / 2 - 0.4, Math.abs(z) - h / 2 - 0.4); return d < 0 ? -0.4 : -0.42 + Math.sin(x * 0.7 + seed) * 0.12 + Math.cos(z * 0.6) * 0.1 - Math.min(1.2, d * 0.04) - (themeId === 'nexus' ? Math.min(4, d * 0.35) : 0); };
  const wx = -w / 2 - 2.0;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x0 = -R + (i / N) * 2 * R, x1 = -R + ((i + 1) / N) * 2 * R, z0 = -R + (j / N) * 2 * R, z1 = -R + ((j + 1) / N) * 2 * R;
    if (Math.abs((x0 + x1) / 2 - wx) < 1.2) continue;
    const near = Math.abs((x0 + x1) / 2) < w / 2 + 2 && Math.abs((z0 + z1) / 2) < h / 2 + 2;
    g.material(near ? th.near : th.ground, q => q.quad([x0, hgt(x0, z1), z1], [x1, hgt(x1, z1), z1], [x1, hgt(x1, z0), z0], [x0, hgt(x0, z0), z0], near ? [0.62, 0.6, 0.56, 1] : [0.5, 0.56, 0.48, 1]));
  }
  // Back terrace + ruined colonnade (all acts), themed materials.
  const nz = -h / 2 - 1.6;
  g.material(th.floor[0], q => q.box(0, 0.05, nz - 0.6, w + 1.2, 1.0, 2.2, [0.8, 0.8, 0.76, 1], [0.95, 0.95, 0.9, 1]));
  for (let k = 0; k < 3; k++) g.material(th.floor[0], q => q.box(0, -0.3 + k * 0.15, nz + 0.65 - k * 0.22, 2.4, 0.15 + k * 0.15, 0.24, [0.85, 0.85, 0.8, 1]));
  for (let k = -2; k <= 2; k++) {
    const px = k * 1.9, broken = (k + seed) % 3 === 0, ph = broken ? 1.1 + rnd() * 0.5 : 2.6;
    g.material(th.wall, q => q.box(px, 0.55 + ph / 2, nz - 1.2, 0.5, ph, 0.5, [0.9, 0.9, 0.86, 1]));
    if (!broken && k < 2 && (k + 1 + seed) % 3 !== 0) g.material(th.wall, q => q.box(px + 0.95, 0.55 + ph - 0.18, nz - 1.2, 1.4, 0.36, 0.45, [0.9, 0.9, 0.86, 1]));
    if (themeId === 'hollow') g.material(MAT.moss, q => q.with(at(px + 0.1, 0.6 + ph, nz - 1.15, S(1, 0.35, 1)), r => r.sphere(0.24, 6, 3, W)));
  }
  g.material(th.wall, q => q.box(0, 1.0, nz - 1.65, w + 1.2, 1.9, 0.35, [0.75, 0.75, 0.72, 1]));
  for (const bx of [-2.6, 2.6]) {
    g.material(th.rock, q => q.with(at(bx, 0.55, nz + 0.1), r => r.cylinder(0.16, 0.22, 0.55, 7, [0.5, 0.45, 0.4, 1])));
    lights.push({ pos: [bx, 1.35, nz + 0.1], col: th.torch, radius: 4.2, intensity: 1.25, flicker: 0.35, prio: 3 });
    emitters.push({ kind: themeId === 'nexus' ? 'voidfire' : 'fire', pos: [bx, 1.12, nz + 0.1] });
  }
  // Side channel: stream (Hollow), lava river (Warrens), void chasm with floating shards (Nexus).
  const chan = themeId === 'warrens' ? MAT.lava : MAT.water;
  if (themeId !== 'nexus') {
    g.material(chan, q => q.quad([wx - 1.2, -0.62, R], [wx + 1.2, -0.62, R], [wx + 1.2, -0.62, -R], [wx - 1.2, -0.62, -R], themeId === 'warrens' ? [1, 1, 1, 1] : [0.45, 0.6, 0.66, 1]));
    g.material(MAT.dirt, q => q.quad([wx - 1.2, -0.9, R], [wx + 1.2, -0.9, R], [wx + 1.2, -0.9, -R], [wx - 1.2, -0.9, -R], [0.3, 0.3, 0.3, 1]));
    for (let k = -3; k <= 3; k++) g.material(th.rock, q => q.with(at(wx + (k % 2) * 0.4, -0.58, k * 1.3, S(1, 0.4, 1)), r => r.sphere(0.32, 6, 3, W)));
    for (const s of [-1, 1]) g.material(th.cliff, q => q.box(wx + s * 1.3, -0.62, 0, 0.2, 0.5, R * 2, [0.6, 0.6, 0.56, 1]));
    if (themeId === 'warrens') for (let k = -4; k <= 4; k += 2) { lights.push({ pos: [wx, -0.2, k * 1.5], col: [1, 0.4, 0.1], radius: 3, intensity: 0.8, flicker: 0.3, prio: 0 }); emitters.push({ kind: 'lava', pos: [wx, -0.6, k * 1.5] }); }
  } else {
    for (let k = 0; k < 14; k++) {
      const x = (rnd() - 0.5) * 22, z = (rnd() - 0.5) * 22; if (Math.abs(x) < w / 2 + 1.5 && Math.abs(z) < h / 2 + 1.5) continue;
      const y = 0.5 + rnd() * 2.5, s = 0.3 + rnd() * 0.6;
      g.material(MAT.crystal, q => q.with(at(x, y, z, RY(rnd() * 3), RX(rnd() - 0.5), S(s, s * 1.6, s)), r => r.cylinder(0, 0.6, 1, 5, W)));
      g.material(MAT.basalt, q => q.with(at(x, y, z, RY(rnd() * 3), S(s * 1.1, s * 0.6, s * 1.1)), r => r.cylinder(0.6, 0, -0.9, 5, W, null, 0)));
    }
  }
  g.material(th.wall, q => q.with(at(w / 2 + 1.6, -0.2, -1.5, RZ(Math.PI / 2), RY(0.3)), r => r.cylinder(0.3, 0.3, 2.2, 8, W)));
  g.material(th.floor[0], q => q.box(w / 2 + 1.8, -0.1, 2.2, 0.9, 0.6, 0.9, [0.8, 0.8, 0.76, 1]));
  for (let k = 0; k < 64; k++) {
    const a = rnd() * Math.PI * 2, r = 7.2 + rnd() * 5; const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x - wx) < 1.4 && themeId !== 'nexus') continue;
    if (z < nz - 1 && Math.abs(x) < w / 2 + 1) continue;
    if (themeId === 'nexus' && rnd() < 0.5) continue;
    foliage.push({ kind: th.trees[Math.floor(rnd() * th.trees.length)], x, z, y: hgt(x, z), s: 0.95 + rnd() * 0.6 });
  }
  for (let k = 0; k < 70; k++) {
    const a = rnd() * Math.PI * 2, r = w / 2 + 0.9 + rnd() * 4; const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if ((Math.abs(x - wx) < 1.3 && themeId !== 'nexus') || (z < nz + 0.8 && z > nz - 2 && Math.abs(x) < w / 2 + 0.7)) continue;
    const kind = th.small[Math.floor(rnd() * th.small.length)];
    foliage.push({ kind, x, z, y: hgt(x, z), s: 0.7 + rnd() * 0.4 });
    if (kind === 'mushroom' && lights.length < 12) lights.push({ pos: [x, hgt(x, z) + 0.25, z], col: [0.35, 0.95, 0.85], radius: 1.4, intensity: 0.6, flicker: 0.1, prio: 0 });
  }
  // Encounter identity: side-stage wardstones for elites; crown of rune obelisks for bosses.
  // They sit OUTSIDE the navigable grid and are decorative only, so pathing, saves and
  // score calculation stay deterministic and completely unchanged.
  if (battle.kind === 'elite' || battle.kind === 'boss') {
    const boss = battle.kind === 'boss';
    const accent = themeId === 'warrens' ? [1, 0.42, 0.13] : themeId === 'nexus' ? [0.69, 0.48, 1] : [0.48, 0.96, 0.65];
    const positions = [[-w / 2 - 1.45, -h / 3], [w / 2 + 1.45, -h / 3],
      ...boss ? [[-w / 2 - 1.45, h / 3], [w / 2 + 1.45, h / 3]] : []];
    for (const [x, z] of positions) {
      const hStone = boss ? 2.6 : 1.85;
      g.material(th.rock, q => q.with(at(x, 0.05, z, RY(Math.PI / 4)),
        r => r.box(0, 0.14, 0, 0.9, 0.32, 0.9, [0.61, 0.58, 0.53, 1])));
      g.material(th.wall, q => q.with(at(x, 0.3, z, RY(Math.PI / 4)),
        r => r.box(0, hStone / 2, 0, boss ? 0.65 : 0.5, hStone, boss ? 0.65 : 0.5, [0.88, 0.84, 0.79, 1])));
      g.material(themeId === 'nexus' ? MAT.crystal : MAT.rune,
        q => q.with(at(x, 0.32 + hStone, z, RY(Math.PI / 4)),
          r => r.cylinder(0, boss ? 0.36 : 0.23, boss ? 0.65 : 0.45, boss ? 6 : 5, [1, 1, 1, 1])));
      lights.push({ pos: [x, 0.7 + hStone, z], col: accent, radius: boss ? 2.7 : 2.0,
        intensity: boss ? 0.85 : 0.6, flicker: 0.13, prio: 1 });
      emitters.push({ kind: themeId === 'warrens' ? 'fire' : themeId === 'nexus' ? 'rift' : 'ley',
        pos: [x, 0.25 + hStone, z] });
    }
  }
  for (let k = 0; k < 4; k++) {
    const x = -3 + k * 2.2 + rnd(), z = -2 + rnd() * 4, wdt = 0.5 + rnd() * 0.5, tilt = 1.6;
    const top = [x - tilt, 6, z - tilt * 0.6], bot = [x, -0.2, z];
    const sc = themeId === 'warrens' ? [1, 0.55, 0.3] : themeId === 'nexus' ? [0.7, 0.6, 1] : [1, 0.9, 0.62];
    const c0 = [...sc, 0.0], c1 = [...sc, themeId === 'hollow' ? 0.1 : 0.06];
    fx.quadV([top[0] - wdt, top[1], top[2]], [top[0] + wdt, top[1], top[2]], [bot[0] + wdt * 1.6, bot[1], bot[2]], [bot[0] - wdt * 1.6, bot[1], bot[2]], c0, c0, c1, c1);
  }
  return { opaque: g.build(), shafts: fx.build(), foliage, lights, emitters, env: th.env, tint: th.tint, mote: th.mote };
}
