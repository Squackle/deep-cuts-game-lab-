// Arena + surroundings for the Forgotten Hollow. Pure geometry/data from (battle terrain, seed); no game rules.
import { Geo, jitter } from './geometry.js';
import { T as M, S, RY, RZ, chain } from './math.js';
import { T as TILE } from '../core/grid.js';

export const MAT = { flag: 1, flagmoss: 2, grass: 3, dirt: 4, brick: 5, rock: 6, bark: 7, leaves: 8, cliff: 9, rune: 10, water: 11, moss: 12 };
const at = (x, y, z, ...r) => chain(M(x, y, z), ...r);
const W = [1, 1, 1, 1];

export function buildEnvironment(battle, seed = 1) {
  const g = new Geo(), fx = new Geo();
  const { w, h } = battle;
  const ox = -w / 2 + 0.5, oz = -h / 2 + 0.5;
  let st = seed >>> 0 || 1; const rnd = () => { st = (st * 1664525 + 1013904223) >>> 0; return st / 4294967296; };
  const terr = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : battle.terrain[y * w + x]);
  const foliage = [], lights = [], emitters = [];

  g.material(MAT.cliff, q => q.box(0, -0.55, 0, w + 0.7, 1.1, h + 0.7, [0.62, 0.62, 0.58, 1], [0.7, 0.7, 0.64, 1]));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = terr(x, y), cx = ox + x, cz = oz + y;
    let ao = 1; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (terr(x + dx, y + dy) === TILE.ROCK) ao -= 0.08;
    const tint = jitter([ao, ao, ao * 0.98, 1], 0.12, x * 31 + y * 17 + seed);
    const mat = t === TILE.BRAMBLE ? MAT.dirt : t === TILE.LEYLINE ? MAT.rune : (rnd() < 0.22 ? MAT.flagmoss : MAT.flag);
    g.material(mat, q => q.slab(cx, cz, 0.97, 0.97, -0.25, 0, 0.045, [0.55, 0.55, 0.52, 1], tint));
    if (t === TILE.ROCK) {
      const s = 0.85 + rnd() * 0.35;
      g.material(MAT.rock, q => q.with(at(cx, 0.1, cz, RY(rnd() * 3), S(s, 0.75 + rnd() * 0.45, s)), r => r.sphere(0.4, 7, 5, [1, 1, 1, 1], (i, j) => jitter([0.95, 0.95, 0.92, 1], 0.2, i * 3 + j * 7 + x))));
      g.material(MAT.moss, q => q.with(at(cx + 0.08, 0.38, cz - 0.05, S(1, 0.45, 1)), r => r.sphere(0.2, 6, 3, W)));
    }
    if (t === TILE.BRAMBLE) { foliage.push({ kind: 'bramble', x: cx - 0.18, z: cz + 0.12, s: 0.75 }); foliage.push({ kind: 'bramble', x: cx + 0.2, z: cz - 0.14, s: 0.6 }); }
    if (t === TILE.LEYLINE) { lights.push({ pos: [cx, 0.35, cz], col: [1, 0.78, 0.35], radius: 1.8, intensity: 0.9, flicker: 0.15, prio: 1 }); emitters.push({ kind: 'ley', pos: [cx, 0.02, cz] }); }
  }
  const R = 13, N = 26;
  const hgt = (x, z) => { const d = Math.max(Math.abs(x) - w / 2 - 0.4, Math.abs(z) - h / 2 - 0.4); return d < 0 ? -0.4 : -0.42 + Math.sin(x * 0.7 + seed) * 0.12 + Math.cos(z * 0.6) * 0.1 - Math.min(1.2, d * 0.04); };
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x0 = -R + (i / N) * 2 * R, x1 = -R + ((i + 1) / N) * 2 * R, z0 = -R + (j / N) * 2 * R, z1 = -R + ((j + 1) / N) * 2 * R;
    if (Math.abs((x0 + x1) / 2 - (-w / 2 - 2.0)) < 1.2) continue;
    const near = Math.abs((x0 + x1) / 2) < w / 2 + 2 && Math.abs((z0 + z1) / 2) < h / 2 + 2;
    g.material(near ? MAT.dirt : MAT.grass, q => q.quad([x0, hgt(x0, z1), z1], [x1, hgt(x1, z1), z1], [x1, hgt(x1, z0), z0], [x0, hgt(x0, z0), z0], near ? [0.62, 0.6, 0.56, 1] : [0.5, 0.56, 0.48, 1]));
  }
  const nz = -h / 2 - 1.6;
  g.material(MAT.flag, q => q.box(0, 0.05, nz - 0.6, w + 1.2, 1.0, 2.2, [0.8, 0.8, 0.76, 1], [0.95, 0.95, 0.9, 1]));
  for (let k = 0; k < 3; k++) g.material(MAT.flag, q => q.box(0, -0.3 + k * 0.15, nz + 0.65 - k * 0.22, 2.4, 0.15 + k * 0.15, 0.24, [0.85, 0.85, 0.8, 1]));
  for (let k = -2; k <= 2; k++) {
    const px = k * 1.9, broken = (k + seed) % 3 === 0, ph = broken ? 1.1 + rnd() * 0.5 : 2.6;
    g.material(MAT.brick, q => q.box(px, 0.55 + ph / 2, nz - 1.2, 0.5, ph, 0.5, [0.9, 0.9, 0.86, 1]));
    if (!broken && k < 2 && (k + 1 + seed) % 3 !== 0) g.material(MAT.brick, q => q.box(px + 0.95, 0.55 + ph - 0.18, nz - 1.2, 1.4, 0.36, 0.45, [0.9, 0.9, 0.86, 1]));
    g.material(MAT.moss, q => q.with(at(px + 0.1, 0.6 + ph, nz - 1.15, S(1, 0.35, 1)), r => r.sphere(0.24, 6, 3, W)));
  }
  g.material(MAT.brick, q => q.box(0, 1.0, nz - 1.65, w + 1.2, 1.9, 0.35, [0.75, 0.75, 0.72, 1]));
  for (const bx of [-2.6, 2.6]) {
    g.material(MAT.rock, q => q.with(at(bx, 0.55, nz + 0.1), r => r.cylinder(0.16, 0.22, 0.55, 7, [0.5, 0.45, 0.4, 1])));
    lights.push({ pos: [bx, 1.35, nz + 0.1], col: [1, 0.55, 0.22], radius: 4.2, intensity: 1.25, flicker: 0.35, prio: 3 });
    emitters.push({ kind: 'fire', pos: [bx, 1.12, nz + 0.1] });
  }
  const wx = -w / 2 - 2.0;
  g.material(MAT.water, q => q.quad([wx - 1.2, -0.62, R], [wx + 1.2, -0.62, R], [wx + 1.2, -0.62, -R], [wx - 1.2, -0.62, -R], [0.45, 0.6, 0.66, 1]));
  g.material(MAT.dirt, q => q.quad([wx - 1.2, -0.9, R], [wx + 1.2, -0.9, R], [wx + 1.2, -0.9, -R], [wx - 1.2, -0.9, -R], [0.3, 0.3, 0.3, 1]));
  for (let k = -3; k <= 3; k++) g.material(MAT.rock, q => q.with(at(wx + (k % 2) * 0.4, -0.58, k * 1.3, S(1, 0.4, 1)), r => r.sphere(0.32, 6, 3, W)));
  for (const s of [-1, 1]) g.material(MAT.cliff, q => q.box(wx + s * 1.3, -0.62, 0, 0.2, 0.5, R * 2, [0.6, 0.6, 0.56, 1]));
  g.material(MAT.brick, q => q.with(at(w / 2 + 1.6, -0.2, -1.5, RZ(Math.PI / 2), RY(0.3)), r => r.cylinder(0.3, 0.3, 2.2, 8, W)));
  g.material(MAT.flag, q => q.box(w / 2 + 1.8, -0.1, 2.2, 0.9, 0.6, 0.9, [0.8, 0.8, 0.76, 1]));
  for (let k = 0; k < 64; k++) {
    const a = rnd() * Math.PI * 2, r = 7.2 + rnd() * 5; const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x - wx) < 1.4) continue;
    if (z < nz - 1 && Math.abs(x) < w / 2 + 1) continue;
    foliage.push({ kind: rnd() < 0.55 ? 'pine' : 'oak', x, z, y: hgt(x, z), s: 0.95 + rnd() * 0.6 });
  }
  for (let k = 0; k < 70; k++) {
    const a = rnd() * Math.PI * 2, r = w / 2 + 0.9 + rnd() * 4; const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x - wx) < 1.3 || (z < nz + 0.8 && z > nz - 2 && Math.abs(x) < w / 2 + 0.7)) continue;
    const kinds = ['grass', 'grass', 'fern', 'bush', 'mushroom']; const kind = kinds[Math.floor(rnd() * kinds.length)];
    foliage.push({ kind, x, z, y: hgt(x, z), s: 0.7 + rnd() * 0.4 });
    if (kind === 'mushroom' && lights.length < 12) lights.push({ pos: [x, hgt(x, z) + 0.25, z], col: [0.35, 0.95, 0.85], radius: 1.4, intensity: 0.6, flicker: 0.1, prio: 0 });
  }
  for (let k = 0; k < 4; k++) {
    const x = -3 + k * 2.2 + rnd(), z = -2 + rnd() * 4, wdt = 0.5 + rnd() * 0.5, tilt = 1.6;
    const top = [x - tilt, 6, z - tilt * 0.6], bot = [x, -0.2, z];
    const c0 = [1, 0.9, 0.62, 0.0], c1 = [1, 0.9, 0.62, 0.1];
    fx.quadV([top[0] - wdt, top[1], top[2]], [top[0] + wdt, top[1], top[2]], [bot[0] + wdt * 1.6, bot[1], bot[2]], [bot[0] - wdt * 1.6, bot[1], bot[2]], c0, c0, c1, c1);
  }
  return { opaque: g.build(), shafts: fx.build(), foliage, lights, emitters };
}
