// Pooled additive particles (pixel-core + soft halo). Density scales with graphics quality / reduced motion.
export class Particles {
  constructor(max = 3000) {
    this.max = max; this.n = 0; this.density = 1;
    this.p = new Float32Array(max * 3); this.vel = new Float32Array(max * 3); this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max); this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max); this.target = new Array(max).fill(null);
    this.out = new Float32Array(max * 8);
  }
  emit(o, force = false) {
    if (this.n >= this.max || (!force && this.density < 1 && Math.random() > this.density)) return;
    const i = this.n++;
    this.p.set(o.pos, i * 3); this.vel.set(o.vel || [0, 0, 0], i * 3); this.col.set(o.col, i * 4);
    this.size[i] = o.size || 10; this.life[i] = this.maxLife[i] = o.life || 1; this.grav[i] = o.grav || 0; this.drag[i] = o.drag == null ? 1.5 : o.drag;
    this.target[i] = o.target || null;
  }
  burst(pos, col, n = 20, { speed = 2, up = 1.5, life = 0.7, size = 12, grav = -4, spread = 0.15 } = {}) {
    n = Math.round(n * Math.max(0.35, this.density));
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.6);
      this.emit({ pos: [pos[0] + (Math.random() - 0.5) * spread, pos[1] + (Math.random() - 0.5) * spread, pos[2] + (Math.random() - 0.5) * spread],
        vel: [Math.cos(a) * s, up * (0.5 + Math.random()), Math.sin(a) * s], col: [col[0], col[1], col[2], 1], life: life * (0.6 + Math.random() * 0.6), size: size * (0.6 + Math.random() * 0.7), grav }, true);
    }
  }
  swirl(from, target, col, n = 60, life = 1.2) {
    n = Math.round(n * Math.max(0.35, this.density));
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, r = 0.6 + Math.random() * 1.2;
      this.emit({ pos: [from[0] + Math.cos(a) * r, from[1] + Math.random() * 1.2, from[2] + Math.sin(a) * r], vel: [-Math.sin(a) * 2, 0.5, Math.cos(a) * 2],
        col: [col[0], col[1], col[2], 1], life: life * (0.7 + Math.random() * 0.5), size: 9 + Math.random() * 10, drag: 0.5, target }, true);
    }
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.n--; this.copy(this.n, i); i--; continue; }
      const t = this.target[i];
      if (t) { const tp = t(); const k = 1 - this.life[i] / this.maxLife[i]; for (let a = 0; a < 3; a++) this.vel[i * 3 + a] += (tp[a] - this.p[i * 3 + a]) * dt * (6 + 30 * k); }
      this.vel[i * 3 + 1] += this.grav[i] * dt;
      const d = Math.max(0, 1 - this.drag[i] * dt);
      for (let a = 0; a < 3; a++) { this.vel[i * 3 + a] *= d; this.p[i * 3 + a] += this.vel[i * 3 + a] * dt; }
    }
  }
  copy(from, to) {
    if (from === to) return;
    for (let a = 0; a < 3; a++) { this.p[to * 3 + a] = this.p[from * 3 + a]; this.vel[to * 3 + a] = this.vel[from * 3 + a]; }
    for (let a = 0; a < 4; a++) this.col[to * 4 + a] = this.col[from * 4 + a];
    this.size[to] = this.size[from]; this.life[to] = this.life[from]; this.maxLife[to] = this.maxLife[from];
    this.grav[to] = this.grav[from]; this.drag[to] = this.drag[from]; this.target[to] = this.target[from];
  }
  pack() {
    const o = this.out;
    for (let i = 0; i < this.n; i++) {
      const k = this.life[i] / this.maxLife[i]; const fade = Math.min(1, k * 3) * Math.min(1, (1 - k) * 8 + 0.2);
      o.set([this.p[i * 3], this.p[i * 3 + 1], this.p[i * 3 + 2], this.col[i * 4], this.col[i * 4 + 1], this.col[i * 4 + 2], this.col[i * 4 + 3] * fade, this.size[i] * (0.5 + 0.5 * k)], i * 8);
    }
    return o;
  }
  clear() { this.n = 0; }
}
