// HD-2D battle scene: perspective three-quarter camera, themed 3D environment, billboard pixel sprites with
// directional facing + animation state, dynamic lights, particles, procedural lightning/ring FX meshes,
// tweens, picking and screen projection. Consumes game state; never decides game outcomes.
import { createRenderer, SPR_FLOATS } from './gl.js';
import { makeShadowAtlas, SHADOW_CELL, makeBoneAtlas, BONE_CELL, makeToxicAtlas, TOXIC_CELL } from './shadow-magic.js';
import { anchorsOf, visualScale, measureBounds, FACES_RIGHT, mirrorFor } from './creature-scale.js';
import { mul, perspective, ortho, lookAt, xform, invert, I } from './math.js';
import { Geo } from './geometry.js';
import { buildEnvironment, swayFor, WIND } from './environment.js';
import { Particles } from './particles.js';
import { spriteAnimationFrame, defeatTiming } from './sprite-animation.js';
import { chooseSpriteDirection } from './hd2d-art-pack.js';
import { combatFacingTarget } from './combat-facing.js';

export const PX = 1 / 19;
const PITCH = 0.66;
/** v1.5.0 middle-mouse orbit: pitch limits keep the camera above the board and gameplay readable. */
/** v1.5.0 depth separation for props under a creature (world units, along camera forward). */
/** v1.6.0 presentation clocks (pure; exported for tests). */
/** v1.7.0: idle runs at a calm fixed tempo (a full 4-frame breath ≈ 2.7 s at the authored 5 fps), on real time,
 *  independent of Cinematic/Normal/Fast. Actions still follow the speed setting. */
export const IDLE_TEMPO = 0.3;
export const idleClockStep = (anim, dt, speed, reduced) => anim === 'idle' ? (reduced ? 0 : dt * IDLE_TEMPO) : dt * speed;
export const FOLIAGE_PUSH = 0.34;
export const PITCH_MIN = 0.42, PITCH_MAX = 0.98;
let HCOMP = 1 / Math.cos(PITCH);
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
    this.shadowTex = this.r.texture(makeShadowAtlas()); this.shadows = [];
    this.boneTex = this.r.texture(assets.images.skeletonBones || makeBoneAtlas()); this.toxicTex = this.r.texture(makeToxicAtlas());   // v1.8.0 poison smoke   // v1.7.0 skeleton bone pile   // v1.6.0 umbral spell sprites (alpha-tested pixel art)
    this.units = new Map(); this.tweens = []; this.time = 0; this.speed = 1; this.reduced = false;
    this.yaw = Math.PI / 4; this.yawTarget = this.yaw; this.pitch = PITCH; this.pitchTarget = PITCH; this.zoom = 1; this.focus = [0, 0, 0]; this.focusTarget = [0, 0, 0];
    this.shakeAmt = 0; this.fx = new Particles(3200); this.rockFx = new Particles(320); this.fxLights = []; this.static = null; this.w = 8; this.h = 8;
    this.overlay = null; this.danger = null; this.hazard = null; this.blobs = null; this.fxMesh = null; this.ambientT = 0; this.dof = 1;
    this.bolts = []; this.rings = []; this.arrows = []; this.theme = 'hollow'; this.mote = [0.8, 1, 0.55];
    this.r.env = { sunDir: norm([-0.55, 0.75, -0.38]), sunCol: [0.9, 0.76, 0.58], ambTop: [0.34, 0.42, 0.44], ambBot: [0.12, 0.13, 0.1], fog: [0.07, 0.11, 0.1], fogR: [7.5, 15] };
    this.sprBuf = new Float32Array(SPR_FLOATS * 6 * 500); this.ambientOn = true;
  }
  setQuality(name) { this.r.setQuality(name); this.fx.density = this.r.q.particles * (this.reduced ? 0.5 : 1); this.rockFx.density = this.fx.density; }
  world(x, y) { return [x - this.w / 2 + 0.5, 0, y - this.h / 2 + 0.5]; }
  loadArena(battle, seed, theme = 'hollow') {
    if (this.static) { this.r.free(this.static.mesh); this.r.free(this.static.shafts); }
    this.w = battle.w; this.h = battle.h; this.theme = theme;
    const env = buildEnvironment(battle, seed, theme);
    this.r.env = { ...env.env, sunDir: norm(env.env.sunDir) }; this.r.tint = env.tint; this.mote = env.mote;
    this.static = { mesh: this.r.upload(env.opaque), shafts: this.r.upload(env.shafts), foliage: env.foliage, lights: env.lights, emitters: env.emitters };
    for (const uid of this.units.keys()) this.removeUnit(uid);
    this.shadows = [];
    this.fx.clear(); this.rockFx.clear(); this.fxLights = []; this.bolts = []; this.rings = []; this.arrows = []; this.setOverlay([]); this.setDanger([]); this.setHazard([]);
  }
  /** Rebuild only the static environment (e.g. the Pyre Matron melts tiles into lava); units/FX are kept. */
  refreshTerrain(battle, seed) {
    if (this.static) { this.r.free(this.static.mesh); this.r.free(this.static.shafts); }
    const env = buildEnvironment(battle, seed, this.theme);
    this.static = { mesh: this.r.upload(env.opaque), shafts: this.r.upload(env.shafts), foliage: env.foliage, lights: env.lights, emitters: env.emitters };
  }
  addUnit(u, spriteKey, opts = {}) {
    // Replacing a view with the same UID must release its private composed texture.
    this.removeUnit(u.uid);
    const meta = this.man.sprites[spriteKey];
    // v1.7.0: feet + horizontal centre come from the MEASURED art bounds (creature-scale.js), not frame constants.
    const an = anchorsOf(meta, meta.bounds);
    const v = { uid: u.uid, side: u.side, key: spriteKey, tex: opts.tex || this.tex[spriteKey], fw: meta.w, fh: meta.h, pivot: an.pivot, cx: an.cx, topPx: (meta.boundsAll || meta.bounds)?.y0 ?? 0, hover: u.keywords?.flying && !u.statuses?.grounded ? (meta.hover ? 0.35 : 0.14) : 0,
      pixelScale: meta.pixelScale || 1, animSet: meta.anims || this.man.anims, views: meta.views || this.man.views,
      pos: this.world(u.x, u.y), dir: u.side === 'enemy' ? [0, 1] : [0, -1], anim: 'idle', animT: Math.random(), scale: opts.scale || 1, flash: 0, flashCold: 0, dissolve: 0, outline: 0,
      lunge: [0, 0, 0], recoil: [0, 0, 0], spawnK: 1, hidden: false, aura: null };
    if (!opts.scale) v.scale = visualScale(spriteKey, meta, meta.bounds);
    if (u.facing) v.dir = [u.facing[0], u.facing[1]];   // v1.7.0: saved last-move direction (engine field)
    this.units.set(u.uid, v); return v;
  }
  setUnitTexture(uid, canvas, scale) {
    const v = this.units.get(uid); if (!v) return;
    if (v.ownTex) this.r.updateTexture(v.ownTex, canvas); else { v.ownTex = this.r.texture(canvas); }
    v.tex = v.ownTex; if (scale) v.scale = scale;
    // v1.7.0: label/health-bar height from the COMPOSED model (wings, horns...) in front and back idle frames.
    const rows = Object.keys(v.animSet || this.man.anims).length, b = measureBounds(canvas, v.fw, v.fh, [[0, 0], [0, rows]]); if (b) v.topPx = Math.min(b.y0, v.pivot - 4);
  }
  removeUnit(uid, expected = null) {
    const v = this.units.get(uid);
    if (!v || (expected && expected !== v)) return false;
    if (v.ownTex) this.r.freeTexture(v.ownTex);
    return this.units.delete(uid);
  }
  /** v1.6.0: an alpha-tested shadow sprite (mist / spectral hand). frames: [[col,row],...] with fps, or seq [{at,frame}]. */
  addShadow(o) { this.shadows.push({ age: -(o.delay || 0), fps: 6, fadeIn: 0.15, fadeOut: 0.3, vel: [0, 0, 0], ...o, pos: o.pos.slice() }); if (this.shadows.length > 160) this.shadows.shift(); }
  play(uid, anim) { const v = this.units.get(uid); if (v) { v.anim = anim; v.animT = 0; } }
  /** v1.6.0 non-attack stances. Never touches the attack/cast rows: Guard braces low and wide, Channel rises and
   *  breathes in. Pure presentation (scale/offset tweens), so it cannot alter action timing or rules. */
  stance(uid, kind) {
    const v = this.units.get(uid); if (!v) return Promise.resolve();
    v.anim = 'idle'; v.animT = 0;
    if (kind === 'guard') return this.tween(0.42, k => { const e = Math.sin(Math.PI * Math.min(1, k * 1.6)) * (k < 0.62 ? 1 : 0.55); v.squash = e; });
    return this.tween(0.5, k => { v.castLift = Math.sin(Math.PI * k) * 0.09; v.squash = -Math.sin(Math.PI * k) * 0.5; }).then(() => { v.castLift = 0; v.squash = 0; });
  }
  heightOf(v) { return Math.max(0.1, (v.pivot - (v.topPx ?? 0)) * PX * HCOMP * v.scale * (v.pixelScale || 1)); }   // v1.7.0: true visible height
  headPos(uid) { const v = this.units.get(uid); if (!v) return [0, 0, 0]; return [v.pos[0] + v.lunge[0] + (v.recoil?.[0] || 0), v.pos[1] + v.hover + (v.castLift || 0) + this.heightOf(v) + 0.1, v.pos[2] + v.lunge[2] + (v.recoil?.[2] || 0)]; }   // v1.7.0: above the whole model
  centerPos(uid) { const v = this.units.get(uid); if (!v) return [0, 0, 0]; return [v.pos[0] + v.lunge[0] + (v.recoil?.[0] || 0), v.pos[1] + v.hover + (v.castLift || 0) + this.heightOf(v) * 0.45, v.pos[2] + v.lunge[2] + (v.recoil?.[2] || 0)]; }
  face(v, to) { if (!v) return; const dx = to[0] - v.pos[0], dz = to[2] - v.pos[2]; if (Math.abs(dx) + Math.abs(dz) > 0.01) v.dir = [dx, dz]; }
  /** Visual-only: turn the acting creature toward the real target or telegraphed tiles.
   * Do not mutate combat units, saved facing or deterministic replay data. */
  faceCombatEvent(event) {
    const actor = this.units.get(event?.uid); if (!actor) return false;
    const to = combatFacingTarget(event, uid => this.units.get(uid)?.pos || null, (x, y) => this.world(x, y));
    if (!to) return false;
    this.face(actor, to); return true;
  }
  tween(dur, fn) { if (this.speed >= 50) { fn(1); return Promise.resolve(); } dur = dur / this.speed; return new Promise(res => this.tweens.push({ t: 0, dur: Math.max(0.001, dur), fn, res })); }
  async movePath(uid, path, perTile = 0.17) {
    const v = this.units.get(uid); if (!v) return; v.anim = 'walk'; v.animT = 0;
    for (let i = 1; i < path.length; i++) {
      const a = this.world(path[i - 1].x, path[i - 1].y), b = this.world(path[i].x, path[i].y); this.face(v, b);
      await this.tween(perTile, k => { const e = easeIO(k); v.pos[0] = a[0] + (b[0] - a[0]) * e; v.pos[2] = a[2] + (b[2] - a[2]) * e; });
      if (this.units.get(uid) !== v) return;
      this.onStep && this.onStep(v);
    }
    v.anim = 'idle'; v.animT = 0;
  }
  async slide(uid, path) { const v = this.units.get(uid); if (!v || path.length < 2) return; const a = this.world(path[0].x, path[0].y), b = this.world(path.at(-1).x, path.at(-1).y); this.face(v, b); v.anim = 'hurt'; v.animT = 0; await this.tween(0.25, k => { const e = ease(k); v.pos[0] = a[0] + (b[0] - a[0]) * e; v.pos[2] = a[2] + (b[2] - a[2]) * e; }); }
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
    const motion = v.attackMotion = (v.attackMotion || 0) + 1;
    const current = () => this.units.get(uid) === v && v.attackMotion === motion;
    const origin = v.lunge.slice();
    const dx = t.pos[0] - v.pos[0], dz = t.pos[2] - v.pos[2], l = Math.hypot(dx, dz) || 1;
    // Attack silhouette follows evolved body mass: armored foes visibly plant, fliers dart.
    // Pure presentation; no attack timings or server/replay decisions depend on this.
    const heavy = !!v.style?.armored || (v.scale || 1) > 1.18;
    const flying = !!v.style?.flying;
    const reach = this.reduced ? 0.16 : heavy ? 0.3 : flying ? 0.54 : 0.42;
    const windup = this.reduced ? 0.045 : heavy ? 0.17 : flying ? 0.075 : 0.11;
    await this.tween(windup, k => { if (current()) v.lunge = [origin[0] * (1-k) - dx / l * 0.1 * k, 0, origin[2] * (1-k) - dz / l * 0.1 * k]; });
    if (!current()) return;
    if (heavy && !this.reduced) this.addRing({ pos: [v.pos[0], 0.035, v.pos[2]], r0: 0.1, r1: 0.35, life: 0.2, col: [0.75, 0.63, 0.42], width: 0.03 });
    await this.tween(this.reduced ? 0.05 : 0.08, k => { if (!current()) return; const e = ease(k); v.lunge = [dx / l * (reach * e - 0.1), 0, dz / l * (reach * e - 0.1)]; });
    if (!current()) return;
    const back = v.lunge.slice(); this.tween(this.reduced ? 0.07 : 0.2, k => { if (current()) v.lunge = back.map(c => c * (1 - k)); });
  }
  hit(uid, color = [1, 0.6, 0.3], big = false, cold = false) {
    const v = this.units.get(uid); if (!v) return;
    v.flash = 1; v.flashCold = cold ? 1 : 0; v.anim = 'hurt'; v.animT = 0; if (!this.reduced) this.shake(big ? 0.1 : 0.04);
    const c = this.centerPos(uid); this.fx.burst(c, color, big ? 36 : 18, { speed: big ? 2.6 : 1.8 }); this.light(c, color, big ? 3.2 : 2.2, 0.25, big ? 2.2 : 1.4);
    // Recoil is independent of attack motion: a counter-hit cannot preserve an old lunge offset.
    const motion = v.hitMotion = (v.hitMotion || 0) + 1;
    const d = norm([v.pos[0] - this.focus[0] + 0.001, 0, v.pos[2] - this.focus[2]]);
    this.tween(0.16, k => { if (this.units.get(uid) !== v || v.hitMotion !== motion) return; const s = k >= 1 ? 0 : Math.sin(k * Math.PI) * (big ? 0.12 : 0.06); v.recoil = [d[0] * s, 0, d[2] * s]; });
  }
  async death(uid, element = null) {
    const v = this.units.get(uid); if (!v) return;
    if (/Skeleton/i.test(v.key)) {   // v1.7.0: collapse into a bone pile, hold, then fade. The unit view is removed at once,
      const at = [v.pos[0], v.pos[1], v.pos[2]];   // so there is never an invisible blocker; the pile is a pure decal.
      await this.tween(0.22, k => { v.squash = k * 1.4; v.dissolve = k * 0.6; }); if (!this.removeUnit(uid, v)) return;
      this.addShadow({ tex: 'bones', seq: [{ at: 0, frame: [0, 0] }, { at: 0.18, frame: [1, 0] }], pos: at, size: 0.7, life: this.reduced ? 0.6 : 1.6, fadeIn: 0, fadeOut: 0.5 });
      return;
    }
    const timing = defeatTiming(v.animSet); v.anim = timing.authored ? 'defeat' : 'hurt'; v.animT = 0;
    const c = this.centerPos(uid); const colors={fire:[1,0.35,0.1],frost:[0.65,0.9,1],lightning:[0.5,0.7,1],void:[0.48,0.15,0.55],poison:[0.35,0.9,0.3],nature:[0.4,0.9,0.35],radiant:[1,0.9,0.5]}; const col=colors[element]||[0.95,0.85,0.55];this.fx.burst(c,col,44,{speed:2.2,up:element==='frost'?1:2});this.fx.burst(c,element==='void'?[0.16,0.06,0.18]:[0.3,0.2,0.15],18,{speed:1.2,up:0.5,size:18});if(element==='fire'||element==='frost'||element==='void')this.addRing({pos:[c[0],0.08,c[2]],r0:0.15,r1:0.85,life:0.5,col,width:0.07,spokes:element==='frost'?6:5});
    await this.tween(timing.seconds, k => { const t = timing.fadeStart ? Math.max(0, (k - timing.fadeStart) / (1 - timing.fadeStart)) : k; v.dissolve = t; v.flash = 0.3 * (1 - t); }); this.removeUnit(uid, v);
  }
  async spawn(uid) { const v = this.units.get(uid); if (!v) return; v.dissolve = 1; this.fx.burst(v.pos, [0.4, 0.9, 0.35], 28, { speed: 1.2, up: 2 }); await this.tween(0.45, k => { v.dissolve = 1 - k; }); v.dissolve = 0; }
  async projectile(from, to, color, dur = 0.28, arc = 0.5, { embers = false, size = 30, molten = false } = {}) {
    let last = 0; const L = this.light(from, color, 2.6, dur + 0.15, 1.6);
    await this.tween(dur, k => {
      const p = [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k + Math.sin(k * Math.PI) * arc, from[2] + (to[2] - from[2]) * k];
      L.pos = p;
      if (k - last > 0.025) { last = k;
        if (molten) {
          // Fireball is a LAVA METEOR, not a uniformly glowing dot: oversized
          // incandescent core, broken obsidian clasts and a ragged flaming wake.
          // Purely cosmetic; never reads or changes the battle RNG/state.
          const low = this.reduced || this.r.q.particles < 0.5;
          this.fx.emit({ pos: p, col: [0.98, 0.32, 0.055, 1], size, life: 0.30, drag: 3 }, true);
          this.fx.emit({ pos: [p[0]-0.03,p[1]+0.04,p[2]], col: [1, 0.72, 0.20, 1], size: size * 0.53, life: 0.22, drag: 4 }, true);
          const chunks = low ? 2 : 5;
          for (let i = 0; i < chunks; i++) {
            const a = k * 18 + i * 2.4;
            const r = 0.13 + (i % 3) * 0.065;
            this.rockFx.emit({ pos: [p[0]+Math.cos(a)*r, p[1]+Math.sin(a*0.7)*r*0.7, p[2]+Math.sin(a)*r],
              vel: [-0.15*(to[0]-from[0]), -0.12, -0.15*(to[2]-from[2])],
              col: i%2?[0.055,0.048,0.045,1]:[0.16,0.073,0.045,1], size: size*(0.26+(i%3)*0.05), life: 0.33, drag: 3.5 }, true);
          }
          if (!low) for (let i=0;i<3;i++) this.fx.emit({ pos:[p[0]+(Math.random()-.5)*0.28,p[1],p[2]+(Math.random()-.5)*0.28],
            vel:[(Math.random()-.5)*0.5,0.3+Math.random()*0.6,(Math.random()-.5)*0.5],
            col:[1,0.43+Math.random()*0.24,0.07,1], size:size*0.15,life:0.45,grav:-1.5 },true);
        } else {
          this.fx.emit({ pos: p, col: [...color, 1], size, life: 0.3, drag: 3 }, true);
          this.fx.emit({ pos: p, col: [1, 1, 1, 0.9], size: size * 0.4, life: 0.15 }, true);
        }
        if (embers && !molten) for (let i = 0; i < 2; i++) this.fx.emit({ pos: p, vel: [(Math.random() - 0.5) * 0.8, 0.4 + Math.random(), (Math.random() - 0.5) * 0.8], col: [1, 0.55 + Math.random() * 0.3, 0.15, 1], size: 7, life: 0.6, grav: -2 });
      }
    });
  }
  /** An actual visible flying shaft and pointed arrowhead, not a glowing orb.
   * Pure presentation: combat damage still resolves in the deterministic engine. */
  async arrowProjectile(from, to, duration = 0.32) {
    const dx=to[0]-from[0],dy=to[1]-from[1],dz=to[2]-from[2];
    const len=Math.hypot(dx,dy,dz)||1;
    const arrow={ pos:from.slice(), dir:[dx/len,dy/len,dz/len] };
    this.arrows.push(arrow);
    try {
      await this.tween(duration,k=>{
        arrow.pos=[from[0]+dx*k,from[1]+dy*k+Math.sin(k*Math.PI)*0.13,from[2]+dz*k];
      });
      this.fx.burst(to,[0.96,0.76,0.46],8,{speed:0.8,up:0.5,size:7});
    } finally { const i=this.arrows.indexOf(arrow);if(i>=0)this.arrows.splice(i,1); }
  }
  /** Procedural lightning: regenerated every few frames for flicker. `grow` (s) reveals it from a to b. */
  addBolt({ a, b, life = 0.3, width = 0.05, col = [0.6, 0.8, 1], branches = 0, segs = 9, grow = 0 }) { this.boltsMade = (this.boltsMade || 0) + 1; this.bolts.push({ a, b, life, maxLife: life, width, col, branches, segs, grow, pts: null, br: [], t: 0, regen: 0 }); }
  addRing({ pos, r0, r1, life = 0.4, col, width = 0.08, spokes = 0, spin = 0, seg = 28 }) { this.rings.push({ pos, r0, r1, life, maxLife: life, col, width, spokes, spin, seg }); }
  light(pos, col, radius, life, intensity = 1.2) { const l = { pos: pos.slice(), col, radius, life, maxLife: life, intensity, base: intensity, prio: 5 }; this.fxLights.push(l); return l; }
  screenFlash(col, amt = 0.35) { if (this.reduced) amt *= 0.4; this.r.flashCol = col; this.r.flash = amt; }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
  rotate(dir) { this.yawTarget += dir * Math.PI / 2; }
  /** v1.5.0: free orbit (middle mouse). dx/dy in CSS pixels. */
  orbit(dx, dy) { this.yawTarget -= dx * 0.0085; this.pitchTarget = Math.min(PITCH_MAX, Math.max(PITCH_MIN, (this.pitchTarget ?? PITCH) + dy * 0.004)); }
  resetPitch() { this.pitchTarget = PITCH; }
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
    const P = this.pitch ?? PITCH; HCOMP = 1 / Math.cos(P);
    const dir = [Math.sin(this.yaw) * Math.cos(P), Math.sin(P), Math.cos(this.yaw) * Math.cos(P)];
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
    // Reserve once before making batch views. Large fights/foliage/FX cannot overrun the old fixed 500-quad buffer.
    const needed = (this.units.size + this.static.foliage.length + this.shadows.length) * 6 * SPR_FLOATS;
    if (needed > this.sprBuf.length) this.sprBuf = new Float32Array(Math.max(needed, this.sprBuf.length * 2));
    const batches = [], man = this.man, cam = this.cam;
    const fwdH = [cam.fwd[0], cam.fwd[2]]; const rH = [cam.right[0], cam.right[2]];
    const byTex = new Map();
    for (const v of this.units.values()) { if (v.hidden) continue; if (!byTex.has(v.tex)) byTex.set(v.tex, []); byTex.get(v.tex).push(v); }
    let off = 0;
    for (const [tex, list] of byTex) {
      const start = off;
      for (const v of list) {
        // v1.6.0: two clocks. ACTION rows (walk/attack/cast/hurt/defeat) follow the animation-speed setting; the IDLE row
        // (breathing, sway) runs on steady real time so Cinematic/Normal/Fast never change breathing rate.
        // Reduced motion holds idle on its first frame.
        const anims = v.animSet || man.anims; v.animT += idleClockStep(v.anim, dt, this.speed, this.reduced);
        const pose = spriteAnimationFrame(v.anim, v.animT, anims);
        if (pose.reset) { v.anim = 'idle'; v.animT = 0; }
        const f = pose.frame;
        // The angular dead zone must not depend on how far away the target was.
        const length = Math.hypot(v.dir[0], v.dir[1]) || 1;
        const frontDot = (v.dir[0] * fwdH[0] + v.dir[1] * fwdH[1]) / length;
        const sideDot = (v.dir[0] * rH[0] + v.dir[1] * rH[1]) / length;
        const dirSel = chooseSpriteDirection(v.views || man.views, frontDot, sideDot), viewIndex = dirSel.index;
        // v1.7.0: native-facing aware mirroring with hysteresis (no idle flip-flopping)
        const hasSides = (v.views || man.views).includes('left'); const flip = hasSides ? dirSel.flip : (v.lastFlip = mirrorFor(man.sprites[v.key]?.facesRight ?? FACES_RIGHT.has(v.key), sideDot, v.lastFlip ?? false));
        const row = viewIndex * Object.keys(anims).length + anims[v.anim].row;
        const u0 = (f * v.fw) / tex.w, u1 = ((f + 1) * v.fw) / tex.w, v0 = (row * v.fh) / tex.h, v1 = ((row + 1) * v.fh) / tex.h;
        const s = v.scale * v.spawnK, pixelScale = v.pixelScale || 1;
        const sq = v.squash || 0;   // v1.6.0 stance squash: + braces (lower, wider), - stretches (channel)
        const wdt = v.fw * PX * s * pixelScale * (1 + sq * 0.06), hgt = v.fh * PX * HCOMP * s * pixelScale * (1 - sq * 0.07);
        const bob = v.hover ? Math.sin(this.time * 3 + v.uid) * 0.06 : 0;
        const ox = -(v.cx || 0) * (flip ? -1 : 1) * PX * s * pixelScale;   // v1.7.0 centre the ART (not the frame) on the tile
        const c = [v.pos[0] + v.lunge[0] + (v.recoil?.[0] || 0) + rH[0] * ox, v.pos[1] + v.hover + (v.castLift || 0) + bob - (v.fh - v.pivot) * PX * HCOMP * s * pixelScale, v.pos[2] + v.lunge[2] + (v.recoil?.[2] || 0) + rH[1] * ox];
        v.flash = Math.max(0, v.flash - dt * 4);
        off = this.pushQuad(this.sprBuf, off, c, wdt, hgt, flip ? [u1, v0, u0, v1] : [u0, v0, u1, v1], [v.flash, v.dissolve, v.outline, v.flashCold]);
      }
      batches.push({ tex, data: this.sprBuf.subarray(start * SPR_FLOATS), count: off - start });
    }
    const fs = man.foliage.frames, ft = this.foliageTex; const start = off;
    const fx0 = this.focus[0], fz0 = this.focus[2];
    // v1.5.0: a prop sharing a tile with a creature (crystal, shard, mushroom...) used to sit in the SAME camera-facing
    // plane as the creature and z-fight into a blended mess. Push it behind the occupant along the view direction.
    const occupied = [...this.units.values()].filter(v => !v.hidden && v.dissolve < 0.99).map(v => v.pos);
    const behind = (x, z) => occupied.some(q => Math.abs(q[0] - x) < 0.42 && Math.abs(q[2] - z) < 0.42) ? FOLIAGE_PUSH : 0;
    for (const p0 of this.static.foliage) {
      const push = behind(p0.x, p0.z); const p = push ? { ...p0, x: p0.x + fwdH[0] * push, z: p0.z + fwdH[1] * push } : p0;
      const fr = fs[p.kind]; if (!fr) continue; const s = p.s || 1;
      const along = (p.x - fx0) * fwdH[0] + (p.z - fz0) * fwdH[1], side = Math.abs((p.x - fx0) * rH[0] + (p.z - fz0) * rH[1]);
      const tall = fr.h * s > 40; const fade = tall && along < -2.5 && side < 7.5 ? Math.min(1, (-along - 2.5) * 0.9 + 0.55) : 0;
      off = this.pushQuad(this.sprBuf, off, [p.x, p.y || 0, p.z], fr.w * PX * s, fr.h * PX * HCOMP * s, [fr.x / ft.w, fr.y / ft.h, (fr.x + fr.w) / ft.w, (fr.y + fr.h) / ft.h], [0, fade, 0, 0], swayFor(p.kind, { reduced: this.reduced, enabled: this.ambientOn, quality: this.r.qName }));
    }
    batches.push({ tex: ft, data: this.sprBuf.subarray(start * SPR_FLOATS), count: off - start });
    if (this.shadows.length) {
     for (const texKey of ['shadow', 'bones', 'toxic']) {
      const st = texKey === 'bones' ? this.boneTex : texKey === 'toxic' ? this.toxicTex : this.shadowTex, sStart = off, C = texKey === 'bones' ? BONE_CELL : texKey === 'toxic' ? TOXIC_CELL : SHADOW_CELL;
      for (const e of this.shadows) {
        if (e.age < 0 || (e.tex || 'shadow') !== texKey) continue;
        const fr = e.seq ? e.seq.filter(k => k.at <= e.age).at(-1)?.frame || e.seq[0].frame : e.frames[Math.floor(e.age * e.fps) % e.frames.length];
        const u0 = fr[0] * C / st.w, u1 = (fr[0] + 1) * C / st.w; let v0 = fr[1] * C / st.h, v1 = (fr[1] + 1) * C / st.h; if (e.flipY) [v0, v1] = [v1, v0];
        const dis = Math.max(0, e.fadeIn ? 1 - e.age / e.fadeIn : 0, e.fadeOut ? (e.age - (e.life - e.fadeOut)) / e.fadeOut : 0);
        off = this.pushQuad(this.sprBuf, off, e.pos, e.size, e.size * HCOMP, [u0, v0, u1, v1], [0, Math.min(1, dis), 0, 0]);
      }
      if (off > sStart) batches.push({ tex: st, data: this.sprBuf.subarray(sStart * SPR_FLOATS), count: off - sStart });
     }
    }
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
    // Physical arrow: warm wood shaft, bright metal tip and two visible fletches.
    // Render inside the same FX geometry pass for camera-correct perspective.
    for (const shot of this.arrows) {
      const head=shot.pos, d=shot.dir;
      const along=(k)=>[head[0]+d[0]*k,head[1]+d[1]*k,head[2]+d[2]*k];
      const right=norm(cross(d,Math.abs(d[1])>0.9?[1,0,0]:[0,1,0]));
      const wing=(p,s)=>[p[0]+right[0]*s,p[1]+right[1]*s,p[2]+right[2]*s];
      ribbon([along(-0.43),head],0.030,[0.90,0.53,0.25],0.99);
      ribbon([along(-0.43),along(-0.14)],0.011,[1,0.89,0.54],0.95);
      ribbon([head,wing(along(-0.13),0.085)],0.033,[0.94,0.94,0.96],0.95);
      ribbon([head,wing(along(-0.13),-0.085)],0.033,[0.94,0.94,0.96],0.95);
      ribbon([along(-0.39),wing(along(-0.5),0.075)],0.032,[0.80,0.32,0.22],0.85);
      ribbon([along(-0.39),wing(along(-0.5),-0.075)],0.032,[0.80,0.32,0.22],0.85);
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
    for (const e of this.shadows) { const k = dt * this.speed; e.age += k; if (e.age > 0 && !(e.stopAt != null && e.age > e.stopAt)) for (let a = 0; a < 3; a++) e.pos[a] += e.vel[a] * k; }
    this.shadows = this.shadows.filter(e => e.age < e.life);
    for (const tw of this.tweens.slice()) { tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(k); if (k >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.res(); } }
    this.yaw += (this.yawTarget - this.yaw) * Math.min(1, dt * 8);
    this.pitchTarget = Math.min(PITCH_MAX, Math.max(PITCH_MIN, this.pitchTarget ?? PITCH)); this.pitch += (this.pitchTarget - this.pitch) * Math.min(1, dt * 10);
    for (let a = 0; a < 3; a++) this.focus[a] += (this.focusTarget[a] - this.focus[a]) * Math.min(1, dt * 4);
    this.shakeAmt *= Math.pow(0.002, dt); if (this.shakeAmt < 0.003) this.shakeAmt = 0;
    this.r.flash = Math.max(0, this.r.flash - dt * 1.6);
    if (!this.static) return;
    this.ambient(dt); this.fx.update(dt); this.rockFx.update(dt);
    this.fxLights = this.fxLights.filter(l => (l.life -= dt) > 0);
    for (const l of this.fxLights) { l.intensity = l.base * Math.min(1, l.life / l.maxLife * 2); if (l.follow) l.pos = l.follow(); }   // v0.7: cast glows follow the caster
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
      rockParticles: { data: this.rockFx.pack(), count: this.rockFx.n, scale: 0.012 },
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
      // v1.6.0: Inscribed Page lifts slow drifting glyph flecks; Conduit sparks run along its square channel.
      if (e.kind === 'page' && r() < 0.18) this.fx.emit({ pos: [e.pos[0] + (r() - 0.5) * 0.5, 0.06, e.pos[2] + (r() - 0.5) * 0.4], vel: [(r() - 0.5) * 0.25, 0.22 + r() * 0.15, (r() - 0.5) * 0.25], col: [1, 0.86, 0.5, 0.85], size: 5, life: 2.2, drag: 0.4 });
      if (e.kind === 'conduit' && r() < 0.4) { const side = Math.floor(r() * 4), u = r() * 0.64 - 0.32, p = [[u, -0.32], [0.32, u], [-u, 0.32], [-0.32, -u]][side], d = [[1, 0], [0, 1], [-1, 0], [0, -1]][side];
        this.fx.emit({ pos: [e.pos[0] + p[0], 0.05, e.pos[2] + p[1]], vel: [d[0] * 0.9, 0.05, d[1] * 0.9], col: [0.45, 0.95, 1, 0.95], size: 5, life: 0.35, drag: 0 }); }
      if (e.kind === 'rift' && r() < 0.5) this.fx.emit({ pos: [e.pos[0] + (r() - 0.5) * 0.7, 0.05, e.pos[2] + (r() - 0.5) * 0.7], vel: [(r() - 0.5) * 0.3, 0.7 + r() * 0.5, (r() - 0.5) * 0.3], col: [0.75, 0.4, 1, 0.9], size: 8, life: 1, drag: 0.3 });
      if (e.kind === 'lava' && r() < 0.3) this.fx.emit({ pos: [e.pos[0] + (r() - 0.5) * 0.6, e.pos[1] + 0.02, e.pos[2] + (r() - 0.5) * 0.6], vel: [(r() - 0.5) * 0.2, 0.6 + r() * 0.8, (r() - 0.5) * 0.2], col: [1, 0.5 + r() * 0.3, 0.12, 1], size: 6 + r() * 5, life: 0.9, grav: -0.6, drag: 0.4 });
      if (e.kind === 'fire' || e.kind === 'voidfire') for (let k = 0; k < 2; k++) this.fx.emit({ pos: [e.pos[0] + (r() - 0.5) * 0.15, e.pos[1], e.pos[2] + (r() - 0.5) * 0.15], vel: [(r() - 0.5) * 0.2, 0.9 + r() * 0.6, (r() - 0.5) * 0.2], col: e.kind === 'voidfire' ? (r() < 0.3 ? [0.9, 0.8, 1, 1] : [0.6, 0.3, 1, 1]) : (r() < 0.3 ? [1, 0.9, 0.5, 1] : [1, 0.45, 0.12, 1]), size: 10 + r() * 8, life: 0.5 + r() * 0.3, drag: 1 });
    }
    // v1.8.1: buffs/auras/statuses read ~2x stronger (presentation only; see statusVisuals in battle-ui.js).
    // Permanent auras: a steady column of rising motes (2x rate, ~1.6x size, brighter core).
    // Temporary statuses: a pulsing ground ring + motes; friendly effects RISE, hostile effects DRIP DOWN.
    const pulse = this.reduced ? 1.6 : 0.9, dens = Math.max(0.35, this.fx.density || 1);
    for (const v of this.units.values()) {
      if (v.hidden || v.dissolve > 0.5) continue;
      const h = this.heightOf(v), rad = 0.32 * Math.min(1.6, v.scale * 2);
      if (v.aura && r() < (this.reduced ? 0.5 : 1) * dens) for (let k = 0; k < 2; k++) { const a = r() * 6.28;
        this.fx.emit({ pos: [v.pos[0] + Math.cos(a) * rad, v.pos[1] + 0.1 + r() * h, v.pos[2] + Math.sin(a) * rad], vel: [0, 0.4, 0], col: [...v.aura, 1], size: k ? 11 : 7, life: 1.1, drag: 0.3 }); }
      // v1.8.1 Electrostatic Field graft: a tiny cool-blue arc crawls over the body every ~3 s (scene clock, no gameplay
      // events, no simulation RNG). Size follows the sprite; reduced motion shows a single faint flicker less often.
      if (v.electro) { v.electroT = (v.electroT ?? (v.uid % 7) * 0.4) + dt; const every = this.reduced ? 6 : 2.8;
        if (v.electroT >= every) { v.electroT = 0; const n = this.reduced ? 1 : 3;
          for (let k = 0; k < n; k++) { const a = (this.time * 1.7 + k * 2.1) % 6.283, y0 = v.pos[1] + h * (0.25 + 0.5 * ((k * 0.37 + this.time * 0.13) % 1));
            const p = [v.pos[0] + Math.cos(a) * rad * 0.8, y0, v.pos[2] + Math.sin(a) * rad * 0.8];
            this.addBolt({ a: p, b: [p[0] + Math.cos(a + 1.2) * 0.18, p[1] + 0.12, p[2] + Math.sin(a + 1.2) * 0.18], life: 0.12, width: 0.018, col: [0.55, 0.85, 1], segs: 4 }); }
          if (!this.reduced) this.light([v.pos[0], v.pos[1] + h * 0.5, v.pos[2]], [0.5, 0.8, 1], 1.0, 0.18, 0.7); } }
      for (const fx of v.statusFx || []) {
        fx.t = (fx.t || r() * pulse) + dt;
        if (fx.t >= pulse) { fx.t = 0; this.addRing({ pos: [v.pos[0], 0.035, v.pos[2]], r0: fx.hostile ? rad * 1.5 : rad * 0.6, r1: fx.hostile ? rad * 0.6 : rad * 1.5, life: 0.6, col: fx.col, width: 0.07, seg: 24 }); }
        if (!this.reduced && r() < 0.55 * dens) { const a = r() * 6.28;
          this.fx.emit({ pos: [v.pos[0] + Math.cos(a) * rad, v.pos[1] + (fx.hostile ? h * (0.6 + r() * 0.4) : 0.1 + r() * h * 0.5), v.pos[2] + Math.sin(a) * rad],
            vel: [0, fx.hostile ? -0.45 : 0.5, 0], col: [...fx.col, 1], size: 10, life: 0.9, drag: 0.2 }); }
      }
    }
  }
}