// Geometry builder: interleaved [pos3 nor3 col4 mat1] (11 floats). `mat` = terrain-atlas material id (0 = vertex color only).
import { xform, I, chain } from './math.js';
export const STRIDE = 11;
export class Geo {
  constructor() { this.v = []; this.m = I(); this.mat = 0; }
  with(m, fn) { const prev = this.m; this.m = chain(prev, m); fn(this); this.m = prev; return this; }
  material(id, fn) { const p = this.mat; this.mat = id; fn(this); this.mat = p; return this; }
  tri(a, b, c, col) {
    const A = xform(this.m, ...a), B = xform(this.m, ...b), C = xform(this.m, ...c);
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const cs = Array.isArray(col[0]) ? col : [col, col, col];
    [A, B, C].forEach((P, i) => { const c = cs[i]; this.v.push(P[0], P[1], P[2], nx, ny, nz, c[0], c[1], c[2], c.length > 3 ? c[3] : 1, this.mat); });
  }
  quadV(a, b, c, d, ca, cb, cc, cd) { this.tri(a, b, c, [ca, cb, cc]); this.tri(a, c, d, [ca, cc, cd]); }
  quad(a, b, c, d, col, col2) { this.tri(a, b, c, col); this.tri(a, c, d, col2 || col); }
  box(cx, cy, cz, sx, sy, sz, col, colTop) {
    const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2; const top = colTop || col;
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], top);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], col);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], col);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], col);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], col);
    return this;
  }
  slab(cx, cz, w, h, y0, y1, bevel, col, colTop) {
    const a = w / 2, b = h / 2, i = bevel, yb = y1 - i;
    this.box(cx, (y0 + yb) / 2, cz, w, yb - y0, h, col);
    const P = (x, y, z) => [cx + x, y, cz + z]; const bev = colTop.map((c, k) => (k < 3 ? c * 0.86 : c));
    this.quad(P(-a + i, y1, b - i), P(a - i, y1, b - i), P(a - i, y1, -b + i), P(-a + i, y1, -b + i), colTop);
    this.quad(P(-a, yb, b), P(a, yb, b), P(a - i, y1, b - i), P(-a + i, y1, b - i), bev);
    this.quad(P(a, yb, -b), P(-a, yb, -b), P(-a + i, y1, -b + i), P(a - i, y1, -b + i), bev);
    this.quad(P(a, yb, b), P(a, yb, -b), P(a - i, y1, -b + i), P(a - i, y1, b - i), bev);
    this.quad(P(-a, yb, -b), P(-a, yb, b), P(-a + i, y1, b - i), P(-a + i, y1, -b + i), bev);
    return this;
  }
  cylinder(rTop, rBot, h, seg, col, colTop, y0 = 0) {
    for (let k = 0; k < seg; k++) {
      const a0 = (k / seg) * Math.PI * 2, a1 = ((k + 1) / seg) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const b0 = [c0 * rBot, y0, s0 * rBot], b1 = [c1 * rBot, y0, s1 * rBot], t0 = [c0 * rTop, y0 + h, s0 * rTop], t1 = [c1 * rTop, y0 + h, s1 * rTop];
      if (rTop > 0) this.quad(b1, b0, t0, t1, col); else this.tri(b1, b0, t0, col);
      if (rTop > 0) this.tri([0, y0 + h, 0], t1, t0, colTop || col);
    }
    return this;
  }
  sphere(r, segW, segH, col, colFn) {
    const pt = (i, j) => { const th = (j / segH) * Math.PI, ph = (i / segW) * Math.PI * 2; return [Math.sin(th) * Math.cos(ph) * r, Math.cos(th) * r, Math.sin(th) * Math.sin(ph) * r]; };
    for (let j = 0; j < segH; j++) for (let i = 0; i < segW; i++) {
      const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1); const cc = colFn ? colFn(i, j) : col;
      if (j === 0) this.tri(a, c, d, cc); else if (j === segH - 1) this.tri(a, b, c, cc); else this.quad(a, b, c, d, cc);
    }
    return this;
  }
  build() { return new Float32Array(this.v); }
}
export function jitter(col, amt, seed) { const r = Math.sin(seed * 12.9898) * 43758.5453; const f = (r - Math.floor(r) - 0.5) * amt; return [col[0] * (1 + f), col[1] * (1 + f), col[2] * (1 + f), col[3] == null ? 1 : col[3]]; }
