// HD-2D battle scene: perspective three-quarter camera, themed 3D environment, billboard pixel sprites with
// directional facing + animation state, dynamic lights, particles, procedural lightning/ring FX meshes,
// tweens, picking and screen projection. Consumes game state; never decides game outcomes.
import { createRenderer, SPR_FLOATS } from './gl.js';
import { mul, perspective, ortho, lookAt, xform, invert, I } from './math.js';
import { Geo } from './geometry.js';
import { buildEnvironment, swayFor, WIND } from './environment.js';
import { Particles } from './particles.js';

export const PX = 1 / 19;
const PITCH = 0.66;
const HCOMP = 1 / Math.cos(PITCH);
const ease = k => 1 - Math.pow(1 - k, 3);
const easeIO = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const norm = v => { const l = Math.hypot(...v) || 1; return v.map(c => c / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export class Scene {
  constructor(canvas, assets) {
    this.r = createRenderer(canvas); this.canvas = canvas; this.assets = assets; this.man = assets.manifest;
    this.r.atlas = this.r.texture(assets.images.terrain, { nearest: true, repeat: true });
    this.r.atlasBlur = this.r.texture(assets.images.terrainBlur || assets.images.terrain, { nearest: true, repeat: true });
    this.tex = {}; for (const k of Object.keys(this.man.sprites)) this.tex[k] = this.r.texture(assets.images[k]);
    this.foliageTex = this.r.texture(assets.images.foliage);
    this.units = new Map(); this.tweens = []; this.time = 0; this.speed = 1; this.reduced = false;
    this.yaw = Math.PI / 4; this.yawTarget = this.yaw; this.zoom = 1; this.focus = [0, 0, 0]; this.focusTarget = [0, 0, 0];
    this.shakeAmt = 0; this.fx = new Particles(3200); this.fxLights = []; this.static = null; this.w = 8; this.h = 8;
    this.overlay = null; this.danger = null; this.hazard = null; this.blobs = null; this.fxMesh = null; this.ambientT = 0; this.dof = 1;
    this.bolts = []; this.rings = []; this.theme = 'hollow'; this.mote = [0.8, 1, 0.55];
    this.r.env = { sunDir: norm([-0.55, 0.75, -0.38]), sunCol: [0.9, 0.76, 0.58], ambTop: [0.34, 0.42, 0.44], ambBot: [0.12, 0.13, 0.1], fog: [0.07, 0.11, 0.1], fogR: [7.5, 15] };
    this.sprBuf = new Float32Array(SPR_FLOATS * 6 * 500); this.ambientOn = true;
  }
  setQuality(name) { this.r.setQuality(name); this.fx.density = this.r.q.particles * (this.reduced ? 0.5 : 1); }
  world(x, y) { return [x - this.w / 2 + 0.5, 0, y - this.h / 2 + 0.5]; }
  loadArena(battle, seed, theme = 'hollow') {
    if (this.static) { this.r.free(this.static.mesh); this.r.free(this.static.shafts); }
    this.w = battle.w; this.h = battle.h; this.theme = theme;
    const env = buildEnvironment(battle, seed, theme);
    this.r.env = { ...env.env, sunDir: norm(env.env.sunDir) }; this.r.tint = env.tint; this.mote = env.mote;
    this.static = { mesh: this.r.upload(env.opaque), shafts: this.r.upload(env.shafts), foliage: env.foliage, lights: env.lights, emitters: env.emitters };
    for (const uid of [...this.units.keys()]) this.units.delete(uid);
    this.fx.clear(); this.fxLights = []; this.bolts = []; this.rings = []; this.setOverlay([]); this.setDanger([]); this.setHazard([]);
  }
  /** Rebuild only the static environment (e.g. the Pyre Matron melts tiles into lava); units/FX are kept. */
  refreshTerrain(battle, seed) {
    if (this.static) { this.r.free(this.static.mesh); this.r.free(this.static.shafts); }
    const env = buildEnvironment(battle, seed, this.theme);
    this.static = { mesh: this.r.upload(env.opaque), shafts: this.r.upload(env.shafts), foliage: env.foliage, lights: env.lights, emitters: env.emitters };
  }
  addUnit(u, spriteKey, opts = {}) {
    const meta = this.man.sprites[spriteKey];
    const v = { uid: u.uid, side: u.side, key: spriteKey, tex: opts.tex || this.tex[spriteKey], fw: meta.w, fh: meta.h, pivot: meta.pivotY, hover: meta.hover ? 0.35 : 0,
      pos: this.world(u.x, u.y), dir: u.side === 'enemy' ? [0, 1] : [0, -1], anim: 'idle', animT: Math.random(), scale: opts.scale || 1, flash: 0, flashCold: 0, dissolve: 0, outline: 0,
      lunge: [0, 0, 0], spawnK: 1, hidden: false, aura: null };
    this.units.set(u.uid, v); return v;
  }
  setUnitTexture(uid, canvas, scale) {
    const v = this.units.get(uid); if (!v) return;
    if (v.ownTex) this.r.updateTexture(v.ownTex, canvas); else { v.ownTex = this.r.texture(canvas); }
    v.tex = v.ownTex; if (scale) v.scale = scale;
  }
  removeUnit(uid) { this.units.delete(uid); }
  play(uid, anim) { const v = this.units.get(uid); if (v) { v.anim = anim; v.animT = 0; } }
  heightOf(v) { return v.fh * PX * HCOMP * v.scale * 0.62; }
  headPos(uid) { const v = this.units.get(uid); if (!v) return [0, 0, 0]; return [v.pos[0], v.pos[1] + v.hover + this.heightOf(v) * 0.95 + 0.05, v.pos[2]]; }
  centerPos(uid) { const v = this.units.get(uid); if (!v) return [0, 0, 0]; return [v.pos[0] + v.lunge[0], v.pos[1] + v.hover + this.heightOf(v) * 0.45, v.pos[2] + v.lunge[2]]; }
  face(v, to) { if (!v) return; const dx = to[0] - v.pos[0], dz = to[2] - v.pos[2]; if (Math.abs(dx) + Math.abs(dz) > 0.01) v.dir = [dx, dz]; }
  tween(dur, fn) { if (this.speed >= 50) { fn(1); return Promise.resolve(); } dur = dur / this.speed; return new Promise(res => this.tweens.push({ t: 0, dur: Math.max(0.001, dur), fn, res })); }
  async movePath(uid, path, perTile = 0.17) {
    const v = this.units.get(uid); if (!v) return; v.anim = 'walk';
    for (let i = 1; i < path.length; i++) {
      const a = this.world(path[i - 1].x, path[i - 1].y), b = this.world(path[i].x, path[i].y); this.face(v, b);
      await this.tween(perTile, k => { const e = easeIO(k); v.pos[0] = a[0] + (b[0] - a[0]) * e; v.pos[2] = a[2] + (b[2] - a[2]) * e; });
      this.onStep && this.onStep(v);
    }
    v.anim = 'idle';
  }
  async slide(uid, path) { const v = this.units.get(uid); if (!v || path.length < 2) return; const a = this.world(path[0].x, path[0].y), b = this.world(path.at(-1).x, path.at(-1).y); v.anim = 'hurt'; v.animT = 0; await this.tween(0.25, k => { const e = ease(k); v.pos[0] = a[0] + (b[0] - a[0]) * e; v.pos[2] = a[2] + (b[2] - a[2]) * e; }); }
  async teleport(uid, x, y, col = [0.5, 0.8, 1]) {
    const v = this.units.get(uid); if (!v) return;
    this.fx.burst(this.centerPos(uid), col, 26, { speed: 1.2, up: 1 }); this.light(this.centerPos(uid), col, 3, 0.4);
    this.addRing({ pos: [v.pos[0], 0.03, v.pos[2]], r0: 0.5, r1: 0.05, life: 0.3, col, width: 0.06 });
    await this.tween(0.15, k => { v.dissolve = k; }); v.pos = this.world(x, y);
    this.addRing({ pos: [v.pos[0], 0.03, v.pos[2]], r0: 0.05, r1: 0.6, life: 0.3, col, width: 0.06 });
    this.fx.burst(this.centerPos(uid), col, 26, { speed: 1.2, up: 1 }); await this.tween(0.15, k => { v.dissolve = 1 - k; }); v.dissolve = 0;
  }
  async lunge(uid, targetUid) {
    const v = this.units.get(uid), t = this.units.get(targetUid); if (!v || !t) return;
    this.face(v, t.pos); v.anim = 'attack'; v.animT = 0;
    const dx = t.pos[0] - v.pos[0], dz = t.pos[2] - v.pos[2], l = Math.hypot(dx, dz) || 1;
    await this.tween(0.11, k => { v.lunge = [-dx / l * 0.1 * k, 0, -dz / l * 0.1 * k]; });
    await this.tween(0.08, k => { const e = ease(k); v.lunge = [dx / l * (0.42 * e - 0.1), 0, dz / l * (0.42 * e - 0.1)]; });
    const back = v.lunge.slice(); this.tween(0.2, k => { v.lunge = back.map(c => c * (1 - k)); });
  }
  hit(uid, color = [1, 0.6, 0.3], big = false, cold = false) {
    const v = this.units.get(uid); if (!v) return;
    v.flash = 1; v.flashCold = cold ? 1 : 0; v.anim = 'hurt'; v.animT = 0; if (!this.reduced) this.shake(big ? 0.1 : 0.04);
    const c = this.centerPos(uid); this.fx.burst(c, color, big ? 36 : 18, { speed: big ? 2.6 : 1.8 }); this.light(c, color, big ? 3.2 : 2.2, 0.25, big ? 2.2 : 1.4);
    const back = v.lunge.slice(); const d = norm([v.pos[0] - this.focus[0] + 0.001, 0, v.pos[2] - this.focus[2]]);
    this.tween(0.16, k => { const s = Math.sin(k * Math.PI) * (big ? 0.12 : 0.06); v.lunge = [back[0] + d[0] * s, 0, back[2] + d[2] * s]; });
  }
  async death(uid) {
    const v = this.units.get(uid); if (!v) return; v.anim = 'hurt';
    const c = this.centerPos(uid); this.fx.burst(c, [0.95, 0.85, 0.55], 44, { speed: 2.2, up: 2 }); this.fx.burst(c, [0.3, 0.2, 0.15], 18, { speed: 1.2, up: 0.5, size: 18 });
    await this.tween(0.55, k => { v.dissolve = k; v.flash = 0.3 * (1 - k); }); this.removeUnit(uid);
  }
  async spawn(uid) { const v = this.units.get(uid); if (!v) return; v.dissolve = 1; this.fx.burst(v.pos, [0.4, 0.9, 0.35], 28, { speed: 1.2, up: 2 }); await this.tween(0.45, k => { v.dissolve = 1 - k; }); v.dissolve = 0; }
  async projectile(from, to, color, dur = 0.28, arc = 0.5, { embers = false, size = 30 } = {}) {
    let last = 0; const L = this.light(from, color, 2.6, dur + 0.15, 1.6);
    await this.tween(dur, k => {
      const p = [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k + Math.sin(k * Math.PI) * arc, from[2] + (to[2] - from[2]) * k];
      L.pos = p;
      if (k - last > 0.025) { last = k;
        this.fx.emit({ pos: p, col: [...color, 1], size, life: 0.3, drag: 3 }, true); this.fx.emit({ pos: p, col: [1, 1, 1, 0.9], size: size * 0.4, life: 0.15 }, true);
        if (embers) for (let i = 0; i < 2; i++) this.fx.emit({ pos: p, vel: [(Math.random() - 0.5) * 0.8, 0.4 + Math.random(), (Math.random() - 0.5) * 0.8], col: [1, 0.55 + Math.random() * 0.3, 0.15, 1], size: 7, life: 0.6, grav: -2 });
      }
    });
  }
  /** Procedural lightning: regenerated every few frames for flicker. `grow` (s) reveals it from a to b. */
  addBolt({ a, b, life = 0.3, width = 0.05, col = [0.6, 0.8, 1], branches = 0, segs = 9, grow = 0 }) { this.boltsMade = (this.boltsMade || 0) + 1; this.bolts.push({ a, b, life, maxLife: life, width, col, branches, segs, grow, pts: null, br: [], t: 0, regen: 0 }); }
  addRing({ pos, r0, r1, life = 0.4, col, width = 0.08, spokes = 0, spin = 0, seg = 28 }) { this.rings.push({ pos, r0, r1, life, maxLife: life, col, width, spokes, spin, seg }); }
  light(pos, col, radius, life, intensity = 1.2) { const l = { pos: pos.slice(), col, radius, life, maxLife: life, intensity, base: intensity, prio: 5 }; this.fxLights.push(l); return l; }
  screenFlash(col, amt = 0.35) { if (this.reduced) amt *= 0.4; this.r.flashCol = col; this.r.flash = amt; }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
  rotate(dir) { this.yawTarget += dir * Math.PI / 2; }
  tileQuads(tiles, y, colFn) {
    const g = new Geo();
    for (const t of tiles) {
      const [cx, , cz] = this.world(t.x, t.y); const s = 0.46 - (t.inset || 0); const col = colFn(t);
      if (t.ring) { const o = s, i = s - 0.07;
        g.quad([cx - o, y, cz + o], [cx + o, y, cz + o], [cx + o, y, cz + i], [cx - o, y, cz + i], col); g.quad([cx - o, y, cz - i], [cx + o, y, cz - i], [cx + o, y, cz - o], [cx - o, y, cz - o], col);
        g.quad([cx - o, y, cz + i], [cx - i, y, cz + i], [cx - i, y, cz - i], [cx - o, y, cz - i], col); g.quad([cx + i, y, cz + i], [cx + o, y, cz + i], [cx + o, y, cz - i], [cx + i, y, cz - i], col);
      } else g.quad([cx - s, y, cz + s], [cx + s, y, cz + s], [cx + s, y, cz - s], [cx - s, y, cz - s], col);
    }
    return g.build();
  }
  setOverlay(tiles) { this.overlay = this.r.dynamic(this.overlay, this.tileQuads(tiles, 0.014, t => t.col)); }
  setDanger(tiles) { this.danger = this.r.dynamic(this.danger, this.tileQuads(tiles.map(t => ({ ...t, inset: 0.01 })), 0.02, () => [1, 0.18, 0.1, 0.45])); }
  setHazard(tiles) { this.hazard = this.r.dynamic(this.hazard, this.tileQuads(tiles.map(t => ({ ...t, inset: 0.01 })), 0.026, () => [0.7, 0.25, 1, 0.5])); }
  computeCamera() {
    const cw = this.canvas.clientWidth || 1, ch = this.canvas.clientHeight || 1, aspect = cw / ch;
    const fov = 0.42; const span = (this.w + this.h) * 0.5 * 0.9;
    const need = Math.max(span / Math.tan(fov / 2), span / (Math.tan(fov / 2) * aspect));
    const dist = need * 0.9 / this.zoom;
    const sh = this.shakeAmt ? [(Math.random() - 0.5) * this.shakeAmt, (Math.random() - 0.5) * this.shakeAmt] : [0, 0];
    const f = [this.focus[0] + sh[0], this.focus[1] + sh[1], this.focus[2]];
    const dir = [Math.sin(this.yaw) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(this.yaw) * Math.cos(PITCH)];
    const eye = [f[0] + dir[0] * dist, f[1] + dir[1] * dist, f[2] + dir[2] * dist];
    const view = lookAt(eye, f, [0, 1, 0]);
    const vp = mul(perspective(fov, aspect, 0.5, dist * 3), view);
    const right = [view[0], view[4], view[8]];
    const sd = this.r.env.sunDir, le = [sd[0] * 20, sd[1] * 20, sd[2] * 20];
    const lightVP = mul(ortho(-11, 11, -11, 11, 1, 45), lookAt(le, [0, 0, 0], [0, 1, 0]));
    this.cam = { vp, ivp: invert(vp), eye, right, fwd: [-dir[0], -dir[1], -dir[2]], lightVP, lightRight: right, dist };
    return this.cam;
  }
  project(p) { const c = xform(this.cam.vp, p[0], p[1], p[2]); return { x: (c[0] / c[3] * 0.5 + 0.5) * this.canvas.clientWidth, y: (1 - (c[1] / c[3] * 0.5 + 0.5)) * this.canvas.clientHeight }; }
  pick(px, py) {
    if (!this.cam) return null;
    const nx = px / this.canvas.clientWidth * 2 - 1, ny = 1 - py / this.canvas.clientHeight * 2;
    const a = xform(this.cam.ivp, nx, ny, -1), b = xform(this.cam.ivp, nx, ny, 1);
    const A = a.slice(0, 3).map(v => v / a[3]), B = b.slice(0, 3).map(v => v / b[3]);
    const t = (0 - A[1]) / (B[1] - A[1]); const x = A[0] + (B[0] - A[0]) * t, z = A[2] + (B[2] - A[2]) * t;
    const tx = Math.floor(x + this.w / 2), ty = Math.floor(z + this.h / 2);
    return tx < 0 || ty < 0 || tx >= this.w || ty >= this.h ? null : { x: tx, y: ty };
  }
  pushQuad(buf, n, center, wdt, hgt, uv, fx, sway = 0) {
    for (const [cx, cy] of [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]) { buf.set([center[0], center[1], center[2], cx, cy, wdt, hgt, uv[0], uv[1], uv[2], uv[3], fx[0], fx[1], fx[2], fx[3], sway], n * SPR_FLOATS); n++; }
    return n;
  }
  buildSprites(dt) {
    const batches = [], man = this.man, cam = this.cam;
    const fwdH = [cam.fwd[0], cam.fwd[2]]; const rH = [cam.right[0], cam.right[2]];
    const byTex = new Map();
    for (const v of this.units.values()) { if (v.hidden) continue; if (!byTex.has(v.tex)) byTex.set(v.tex, []); byTex.get(v.tex).push(v); }
    let off = 0;
    for (const [tex, list] of byTex) {
      const start = off;
      for (const v of list) {
        const A = man.anims[v.anim] || man.anims.idle; v.animT += dt * this.speed;
        let f = Math.floor(v.animT * A.fps); if (f >= A.frames) { if (A.loop) f %= A.frames; else { v.anim = 'idle'; v.animT = 0; f = 0; } }
        const away = v.dir[0] * fwdH[0] + v.dir[1] * fwdH[1] > 0.05;
        const flip = v.dir[0] * rH[0] + v.dir[1] * rH[1] > 0.05;
        const row = (away ? 1 : 0) * Object.keys(man.anims).length + (man.anims[v.anim] || A).row;
        const u0 = (f * v.fw) / tex.w, u1 = ((f + 1) * v.fw) / tex.w, v0 = (row * v.fh) / tex.h, v1 = ((row + 1) * v.fh) / tex.h;
        const s = v.scale * v.spawnK; const wdt = v.fw * PX * s, hgt = v.fh * PX * HCOMP * s;
        const bob = v.hover ? Math.sin(this.time * 3 + v.uid) * 0.06 : 0;
        const c = [v.pos[0] + v.lunge[0], v.pos[1] + v.hover + bob - (v.fh - v.pivot) * PX * HCOMP * s, v.pos[2] + v.lunge[2]];
        v.flash = Math.max(0, v.flash - dt * 4);
        off = this.pushQuad(this.sprBuf, off, c, wdt, hgt, flip ? [u1, v0, u0, v1] : [u0, v0, u1, v1], [v.flash, v.dissolve, v.outline, v.flashCold]);
      }
      batches.push({ tex, data: this.sprBuf.subarray(start * SPR_FLOATS), count: off - start });
    }
    const fs = man.foliage.frames, ft = this.foliageTex; const start = off;
    const fx0 = this.focus[0], fz0 = this.focus[2];
    for (const p of this.static.foliage) {
      const fr = fs[p.kind]; if (!fr) continue; const s = p.s || 1;
      const along = (p.x - fx0) * fwdH[0] + (p.z - fz0) * fwdH[1], side = Math.abs((p.x - fx0) * rH[0] + (p.z - fz0) * rH[1]);
      const tall = fr.h * s > 40; const fade = tall && along < -2.5 && side < 7.5 ? Math.min(1, (-along - 2.5) * 0.9 + 0.55) : 0;
      off = this.pushQuad(this.sprBuf, off, [p.x, p.y || 0, p.z], fr.w * PX * s, fr.h * PX * HCOMP * s, [fr.x / ft.w, fr.y / ft.h, (fr.x + fr.w) / ft.w, (fr.y + fr.h) / ft.h], [0, fade, 0, 0], swayFor(p.kind, { reduced: this.reduced, enabled: this.ambientOn, quality: this.r.qName }));
    }
    batches.push({ tex: ft, data: this.sprBuf.subarray(start * SPR_FLOATS), count: off - start });
    return batches;
  }
  /** Builds the additive FX mesh: lightning ribbons (glow + white core) and ground rings/glyphs. */
  buildFx(dt) {
    const g = new Geo(); const fwd = this.cam.fwd;
    const ribbon = (pts, w, col, alpha) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i], p1 = pts[i + 1]; const d = norm([p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]);
        const s = norm(cross(d, fwd)).map(c => c * w);
        const c0 = [...col, alpha], c1 = [...col, alpha];
        g.quadV([p0[0] - s[0], p0[1] - s[1], p0[2] - s[2]], [p0[0] + s[0], p0[1] + s[1], p0[2] + s[2]], [p1[0] + s[0], p1[1] + s[1], p1[2] + s[2]], [p1[0] - s[0], p1[1] - s[1], p1[2] - s[2]], c0, c0, c1, c1);
      }
    };
    const jag = (a, b, segs, amp) => {
      const pts = [a]; const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      for (let i = 1; i < segs; i++) { const k = i / segs; const env = Math.sin(k * Math.PI); pts.push([a[0] + (b[0] - a[0]) * k + (Math.random() - 0.5) * amp * len * env, a[1] + (b[1] - a[1]) * k + (Math.random() - 0.5) * amp * len * env * 0.7, a[2] + (b[2] - a[2]) * k + (Math.random() - 0.5) * amp * len * env]); }
      pts.push(b); return pts;
    };
    this.bolts = this.bolts.filter(b => (b.life -= dt) > 0);
    for (const b of this.bolts) {
      b.t += dt; b.regen -= dt;
      if (!b.pts || b.regen <= 0) {
        b.regen = 0.045; b.pts = jag(b.a, b.b, b.segs, 0.34); b.br = [];
        for (let k = 0; k < b.branches; k++) { const i = 1 + Math.floor(Math.random() * (b.pts.length - 2)); const p = b.pts[i]; const d = [b.b[0] - b.a[0], b.b[1] - b.a[1], b.b[2] - b.a[2]]; const L = Math.hypot(...d) * (0.15 + Math.random() * 0.2); const e = [p[0] + (Math.random() - 0.5) * L * 2 + d[0] * 0.1, p[1] + (Math.random() - 0.2) * L, p[2] + (Math.random() - 0.5) * L * 2 + d[2] * 0.1]; b.br.push({ from: i, pts: jag(p, e, 4, 0.3) }); }
      }
      const reveal = b.grow ? Math.min(1, b.t / b.grow) : 1; const n = Math.max(2, Math.ceil(b.pts.length * reveal));
      const pts = b.pts.slice(0, n); const fade = Math.min(1, b.life / b.maxLife * 2.2);
      ribbon(pts, b.width * 1.9, b.col, 0.3 * fade); ribbon(pts, b.width * 0.5, [1, 1, 1], 0.95 * fade);
      for (const br of b.br) if (br.from < n) { ribbon(br.pts, b.width * 1.4, b.col, 0.25 * fade); ribbon(br.pts, b.width * 0.35, [1, 1, 1], 0.8 * fade); }
    }
    this.rings = this.rings.filter(r => (r.life -= dt) > 0);
    for (const r of this.rings) {
      const k = 1 - r.life / r.maxLife; const rad = r.r0 + (r.r1 - r.r0) * ease(k); const a = Math.min(1, (1 - k) * 2.2); const rot = r.spin * k;
      for (let i = 0; i < r.seg; i++) {
        const a0 = (i / r.seg) * Math.PI * 2 + rot, a1 = ((i + 1) / r.seg) * Math.PI * 2 + rot; const ri = Math.max(0, rad - r.width);
        const P = (ang, rr) => [r.pos[0] + Math.cos(ang) * rr, r.pos[1], r.pos[2] + Math.sin(ang) * rr];
        g.quad(P(a0, ri), P(a1, ri), P(a1, rad), P(a0, rad), [...r.col, 0.75 * a]);
      }
      for (let s = 0; s < r.spokes; s++) { const ang = (s / r.spokes) * Math.PI * 2 + rot; const p0 = [r.pos[0] + Math.cos(ang) * rad * 0.25, r.pos[1], r.pos[2] + Math.sin(ang) * rad * 0.25], p1 = [r.pos[0] + Math.cos(ang) * rad, r.pos[1], r.pos[2] + Math.sin(ang) * rad]; const sd = [-Math.sin(ang) * r.width * 0.4, 0, Math.cos(ang) * r.width * 0.4];
        g.quad([p0[0] - sd[0], p0[1], p0[2] - sd[2]], [p0[0] + sd[0], p0[1], p0[2] + sd[2]], [p1[0] + sd[0], p1[1], p1[2] + sd[2]], [p1[0] - sd[0], p1[1], p1[2] - sd[2]], [...r.col, 0.55 * a]); }
    }
    this.fxMesh = this.r.dynamic(this.fxMesh, g.build());
  }
  frame(dtReal) {
    const dt = Math.max(0, Math.min(0.05, dtReal || 0)); this.time += dt;
    for (const tw of this.tweens.slice()) { tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(k); if (k >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.res(); } }
    this.yaw += (this.yawTarget - this.yaw) * Math.min(1, dt * 8);
    for (let a = 0; a < 3; a++) this.focus[a] += (this.focusTarget[a] - this.focus[a]) * Math.min(1, dt * 4);
    this.shakeAmt *= Math.pow(0.002, dt); if (this.shakeAmt < 0.003) this.shakeAmt = 0;
    this.r.flash = Math.max(0, this.r.flash - dt * 1.6);
    if (!this.static) return;
    this.ambient(dt); this.fx.update(dt);
    this.fxLights = this.fxLights.filter(l => (l.life -= dt) > 0);
    for (const l of this.fxLights) l.intensity = l.base * Math.min(1, l.life / l.maxLife * 2);
    const st = this.static.lights.map(l => ({ ...l, intensity: l.intensity * (1 - (l.flicker || 0) * (0.5 + 0.5 * Math.sin(this.time * 13 + l.pos[0] * 7) * Math.sin(this.time * 7.3 + l.pos[2]))) }));
    this.r.lights = [...this.fxLights, ...st]; this.r.time = this.time; this.r.windT = this.time;
    const cam = this.computeCamera();
    const bg = new Geo();
    for (const v of this.units.values()) { if (v.hidden) continue; const r = 0.26 * v.scale * v.spawnK * (['thornmother', 'matron', 'unwritten'].includes(v.key) ? 1.8 : 1) * (1 - v.dissolve); for (let k = 0; k < 12; k++) { const a0 = k / 12 * 6.283, a1 = (k + 1) / 12 * 6.283; bg.tri([v.pos[0], 0.011, v.pos[2]], [v.pos[0] + Math.cos(a1) * r, 0.011, v.pos[2] + Math.sin(a1) * r * 0.8], [v.pos[0] + Math.cos(a0) * r, 0.011, v.pos[2] + Math.sin(a0) * r * 0.8], [[0, 0, 0, 0.42], [0, 0, 0, 0], [0, 0, 0, 0]]); } }
    this.blobs = this.r.dynamic(this.blobs, bg.build());
    this.buildFx(dt);
    const pulse = 0.65 + 0.35 * Math.sin(this.time * 6);
    this.r.render({
      cam, dof: this.dof,
      opaque: [{ mesh: this.static.mesh, model: I() }],
      sprites: this.buildSprites(dt),
      overlays: [
        { mesh: this.blobs, model: I(), blend: true, unlit: true, noShadow: true },
        { mesh: this.overlay, model: I(), blend: true, unlit: true, emissive: [0.08, 0.07, 0.03] },
        { mesh: this.danger, model: I(), blend: true, unlit: true, alpha: pulse },
        { mesh: this.hazard, model: I(), blend: true, unlit: true, alpha: pulse },
        { mesh: this.static.shafts, model: I(), blend: true, additive: true, unlit: true, alpha: 0.8 + 0.2 * Math.sin(this.time * 0.7) },
        { mesh: this.fxMesh, model: I(), blend: true, additive: true, unlit: true },
      ],
      particles: { data: this.fx.pack(), count: this.fx.n, scale: 0.012 },
    });
  }
  ambient(dt) {
    this.ambientT -= dt; if (this.ambientT > 0) return; this.ambientT = 0.05;
    const r = Math.random, m = this.mote, W = WIND[this.theme] || WIND.hollow;
    // v0.6: a sparse, consistent breeze. Total ambient rate is capped (WIND.rate) and halved for reduced motion.
    const rate = W.rate * (this.reduced ? 0.4 : 1) * (this.ambientOn ? 1 : 0.4);
    if (r() < rate) { const leaf = r() < W.leafChance; this.fx.emit({ pos: [-9 + r() * 6, -0.2 + r() * 2.4, (r() - 0.5) * 16],
      vel: [W.dir[0] * (0.25 + r() * 0.15), W.rise + (leaf ? -0.05 : 0), W.dir[1] * (0.25 + r() * 0.15)], col: leaf ? [...W.leaf, 0.85] : [...m, 0.7], size: leaf ? 9 + r() * 4 : 4 + r() * 4, life: 5 + r() * 3, drag: 0, grav: leaf ? -0.04 : 0 }); }
    for (const e of this.static.emitters) {
      if (e.kind === 'ley' && r() < 0.35) this.fx.emit({ pos: [e.pos[0] + (r() - 0.5) * 0.6, 0.05, e.pos[2] + (r() - 0.5) * 0.6], vel: [0, 0.5 + r() * 0.4, 0], col: [1, 0.8, 0.35, 0.9], size: 7, life: 1.2, drag: 0.2 });
      if (e.kind === 'rift' && r() < 0.5) this.fx.emit({ pos: [e.pos[0] + (r() - 0.5) * 0.7, 0.05, e.pos[2] + (r() - 0.5) * 0.7], vel: [(r() - 0.5) * 0.3, 0.7 + r() * 0.5, (r() - 0.5) * 0.3], col: [0.75, 0.4, 1, 0.9], size: 8, life: 1, drag: 0.3 });
      if (e.kind === 'lava' && r() < 0.3) this.fx.emit({ pos: [e.pos[0] + (r() - 0.5) * 0.6, e.pos[1] + 0.02, e.pos[2] + (r() - 0.5) * 0.6], vel: [(r() - 0.5) * 0.2, 0.6 + r() * 0.8, (r() - 0.5) * 0.2], col: [1, 0.5 + r() * 0.3, 0.12, 1], size: 6 + r() * 5, life: 0.9, grav: -0.6, drag: 0.4 });
      if (e.kind === 'fire' || e.kind === 'voidfire') for (let k = 0; k < 2; k++) this.fx.emit({ pos: [e.pos[0] + (r() - 0.5) * 0.15, e.pos[1], e.pos[2] + (r() - 0.5) * 0.15], vel: [(r() - 0.5) * 0.2, 0.9 + r() * 0.6, (r() - 0.5) * 0.2], col: e.kind === 'voidfire' ? (r() < 0.3 ? [0.9, 0.8, 1, 1] : [0.6, 0.3, 1, 1]) : (r() < 0.3 ? [1, 0.9, 0.5, 1] : [1, 0.45, 0.12, 1]), size: 10 + r() * 8, life: 0.5 + r() * 0.3, drag: 1 });
    }
    for (const v of this.units.values()) if (v.aura && r() < 0.6) {
      const a = r() * 6.28; const h = this.heightOf(v);
      this.fx.emit({ pos: [v.pos[0] + Math.cos(a) * 0.3 * v.scale, v.pos[1] + 0.1 + r() * h, v.pos[2] + Math.sin(a) * 0.3 * v.scale], vel: [0, 0.35, 0], col: [...v.aura, 0.9], size: 7, life: 1, drag: 0.3 });
    }
  }
}
