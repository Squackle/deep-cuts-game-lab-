import { shadowMurder, shadowDisfigure, shadowDrain, shadowInfest } from './shadow-magic.js';
// Spell VFX library (v0.5). Each spell IDENTITY maps to its own effect (Lightning Bolt ≠ Shock ≠ Flame Slash even
// when they share a rules template). Effects are pure presentation: they never read or change game state and
// only use time for animation, so frame rate cannot change outcomes. Every play* returns a promise that resolves
// at the IMPACT moment (so damage numbers appear on hit); dissipation continues afterwards.
const sleep = (sc, ms) => new Promise(r => setTimeout(r, ms / sc.speed));
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const R = () => Math.random() - 0.5;
const ELECTRIC = [0.62, 0.82, 1], ELECTRIC_CORE = [0.95, 0.98, 1];
/** Transient creature-surface elemental envelope. All states are visual only. */
export async function impactEnvelope(sc, target, kind, duration=840) {
  if(target==null || !sc.units?.has(target))return;
  const v=sc.units.get(target);
  // Remember the hit location: a dying unit can dissolve while the flames,
  // electricity or ice still fades at its last battlefield position.
  let lastCenter=sc.centerPos(target),lastPos=[...v.pos];
  const lightning=kind==='shock'||kind==='lightning';
  const cold=kind==='frost', burning=kind==='flame'||kind==='fire';
  const color=cold?[0.57,0.89,1]:burning?[1,0.46,0.13]:lightning?[0.82,0.94,1]:[0.56,0.92,0.36];
  const initialCold=v.flashCold||0;
  const reduced=sc.reduced||sc.speed>=50;
  const total=reduced?1:Math.max(4,Math.round(duration/120));
  try {
    for(let k=0;k<total;k++){
      const present=sc.units?.get(target)===v&&!v.hidden;
      if(present){lastCenter=sc.centerPos(target);lastPos=[...v.pos];}
      const p=lastCenter,height=Math.max(.42,sc.heightOf(v)*.9),radius=Math.min(.42,.18+v.scale*.34);
      const feet=[lastPos[0],.035,lastPos[2]];
      if(cold){if(present)v.flashCold=Math.max(v.flashCold||0,.8);sc.addRing({pos:feet,r0:radius*.35,r1:radius*1.8,life:.32,col:color,width:.055,spokes:6,seg:12});}
      if(burning){v.flash=Math.max(v.flash||0,.32);sc.fx.burst([p[0],Math.max(.13,p[1]-height*.25),p[2]],color,reduced?5:11,{speed:.35,up:1.6,grav:0,size:9,life:.32});}
      if(lightning){
        const a=k*1.7, y=.2+height*((k%3)/3);
        const x=Math.cos(a)*radius,z=Math.sin(a)*radius;
        sc.addBolt({a:[p[0]+x,y,p[2]+z],b:[p[0]-x,y+height*.35,p[2]-z],life:.19,width:.025,col:color,branches:2,segs:6});
        if(k%2===0)sc.fx.burst([p[0],y,p[2]],color,reduced?3:6,{speed:.4,up:.3,size:8,life:.22});
      }
      if(cold)sc.fx.burst([p[0],p[1],p[2]],color,reduced?3:7,{speed:.22,up:.25,grav:-.2,size:8,life:.36});
      if(k%2===0){sc.light(p,color,cold?1.6:1.2,.22,.8);if(burning)sc.addRing({pos:feet,r0:radius*.2,r1:radius*1.5,life:.24,col:color,width:.04,seg:12});}
      if(!reduced)await sleep(sc,duration/total);
    }
  } finally {if(cold && sc.units?.get(target)===v)v.flashCold=initialCold;}
}

/** The impact frame immediately releases the battle's damage/status events.
 * A short, tracked presentation-only aftermath continues independently. */
export function lingerOnImpact(sc,target,kind,duration=900){
  if(target==null||!sc.units?.has(target))return;
  const task=impactEnvelope(sc,target,kind,duration);
  const active=sc.lingeringSpellEffects||(sc.lingeringSpellEffects=new Set());
  active.add(task);
  void task.catch(err=>{
    // Navigation may dispose a scene mid-effect; never let a presentation
    // failure prevent damage from resolving or cause an unhandled rejection.
    if(!sc.disposed)console.warn('GRAFTBOUND lingering spell effect:',err);
  }).finally(()=>active.delete(task));
}

/** Lightning Bolt — flagship: charge → intensify → branching release → impact → dissipation (~1 s at normal speed). */
export async function lightningBolt(sc, { from, to, target, big = true, charged = false, power = 1 }) {
  const fast = sc.speed >= 50; const hand = charged ? from : add(from, [0, 0.25, 0]);
  if (fast) { sc.addBolt({ a: hand, b: to, life: 0.25, width: 0.07, col: ELECTRIC, branches: 3 }); if (target != null) sc.hit(target, ELECTRIC, big, true); return; }
  if (!charged) {
  // Phase 1 — charge: particles converge on the casting point, small arcs flicker over the body.
  const charge = sc.light(hand, ELECTRIC, 1.6, 0.9, 0.6);
  sc.fx.swirl(hand, () => hand, ELECTRIC, big ? 70 : 30, 0.45);
  const arcs = setInterval(() => { for (let i = 0; i < 2; i++) { const p = add(from, [R() * 0.5, Math.random() * 0.7, R() * 0.5]); sc.addBolt({ a: p, b: add(p, [R() * 0.5, R() * 0.5, R() * 0.5]), life: 0.07, width: 0.018, col: ELECTRIC, segs: 4 }); } }, 55 / sc.speed);
  await sleep(sc, big ? 260 : 120);
  // Phase 2 — intensify: brighter pulse, branching arcs leap from the charge point.
  charge.radius = 2.6; charge.base = 1.8;
  for (let i = 0; i < 4; i++) sc.addBolt({ a: hand, b: add(hand, [R() * 1.1, Math.random() * 0.6, R() * 1.1]), life: 0.1, width: 0.025, col: ELECTRIC, segs: 5 });
  sc.fx.burst(hand, ELECTRIC_CORE, 18, { speed: 0.8, up: 0.4, size: 9, grav: 0, life: 0.3 });
  if (!sc.reduced) sc.shake(0.03);
  await sleep(sc, big ? 160 : 60);
  clearInterval(arcs);
  }
  // v0.7 release: a body discharge flash at the caster, then the bolt leaves the casting point.
  sc.fx.burst(hand, ELECTRIC_CORE, big ? 20 : 8, { speed: 1.4, up: 0.4, size: 9, grav: 0, life: 0.2 });
  // Phase 3 — release: a jagged, branching bolt grows from caster to target.
  sc.addBolt({ a: hand, b: to, life: (big ? 0.38 : 0.22) * (0.8 + 0.25 * power), width: (big ? 0.07 : 0.045) * (0.6 + 0.4 * power), col: ELECTRIC, branches: Math.round((big ? 5 : 1) * Math.min(1.6, power)), segs: big ? 16 : 10, grow: big ? 0.12 : 0.06 });
  if (big) sc.addBolt({ a: hand, b: to, life: 0.3, width: 0.03, col: ELECTRIC, branches: 2, segs: 12, grow: 0.11 });
  sc.screenFlash([0.78, 0.88, 1], big ? 0.38 : 0.18);
  sc.light(lerp(hand, to, 0.5), ELECTRIC, 5, 0.35, 2.4);
  await sleep(sc, big ? 90 : 60);
  // Phase 4 — impact: flash, radiating arcs, sparks, shake, hit reaction, environment lit.
  sc.light(to, ELECTRIC_CORE, big ? 4.5 : 2.6, 0.45, 3);
  for (let i = 0; i < (big ? 5 : 2); i++) { const a = (i / 5) * Math.PI * 2 + Math.random(); sc.addBolt({ a: to, b: add(to, [Math.cos(a) * 0.9, -0.3 + Math.random() * 0.6, Math.sin(a) * 0.9]), life: 0.16, width: 0.03, col: ELECTRIC, segs: 5 }); }
  sc.fx.burst(to, ELECTRIC_CORE, big ? 46 : 18, { speed: big ? 3.2 : 2, up: 1.6, size: 9, life: 0.4 });
  sc.addRing({ pos: [to[0], 0.03, to[2]], r0: 0.1, r1: big ? 1.3 : 0.7, life: 0.35, col: ELECTRIC, width: 0.08 });
  if (target != null) sc.hit(target, ELECTRIC, big, true);
  if (!sc.reduced) sc.shake(big ? 0.18 : 0.07);
  lingerOnImpact(sc,target,'lightning',920);
  // Phase 5 — dissipation (async).
  (async () => { for (let i = 0; i < 4; i++) { await sleep(sc, 60); const p = add(to, [R() * 0.6, Math.random() * 0.4, R() * 0.6]); sc.addBolt({ a: p, b: add(p, [R() * 0.4, R() * 0.3, R() * 0.4]), life: 0.06, width: 0.015, col: ELECTRIC, segs: 3 }); } })();
}
export const spark = (sc, o) => lightningBolt(sc, { ...o, big: false });
/** Shock — quick, sharp, satisfying electrical strike; each spell LEVEL adds forks and a brighter impact.
 * Distinct from Lightning Bolt: no long channel, no giant storm bolt and no dramatic camera shake. */
export async function shock(sc, { from, to, target, charged = false, power = 1, level = 1 }) {
  const hand = charged ? from : add(from,[0,.25,0]), Y=[1,.93,.48], WHITE=[1,.99,.85];
  const lv=Math.max(1,Math.min(3,level|0));
  const mobile=sc.reduced||sc.fx?.density<.6;
  if (sc.speed>=50) {sc.addBolt({a:hand,b:to,life:.16,width:.035,col:Y,branches:lv+1,segs:11,grow:.02});if(target!=null)sc.hit(target,Y,false,true);return;}
  // Small electrical switch-on at the fingers, then a quick guided double-fork discharge.
  sc.light(hand,Y,1.4+lv*.3,.2,1.4);
  sc.fx.burst(hand,WHITE,Math.round((6+lv*4)*(mobile?.6:1)),{speed:.8,up:.2,size:6,grav:0,life:.2});
  const mid=lerp(hand,to,.48);
  // Main lightning filament travels from the caster all the way to the impact (testing and readability).
  sc.addBolt({a:hand,b:to,life:.22,width:.025+lv*.005,col:Y,branches:1+lv,segs:12,grow:.035});
  sc.addBolt({a:hand,b:mid,life:.17,width:.026+lv*.005,col:Y,branches:1+lv,segs:9,grow:.03});
  sc.addBolt({a:mid,b:to,life:.22,width:.035+lv*.006,col:WHITE,branches:lv+1,segs:10,grow:.025});
  if(lv>=2)sc.addBolt({a:hand,b:to,life:.16,width:.017,col:Y,branches:lv-1,segs:11,grow:.04});
  await sleep(sc,45);
  // A single, readable impact corona with staggered forks; no excessive bloom or screen flash.
  sc.addRing({pos:[to[0],.06,to[2]],r0:.03,r1:.42+lv*.14,life:.3,col:Y,width:.055,spokes:4+lv*2,seg:12});
  for(let i=0;i<2+lv;i++){
    const a=(i/(2+lv))*Math.PI*2+(lv*.1),radius=.33+lv*.13;
    sc.addBolt({a:to,b:add(to,[Math.cos(a)*radius,Math.sin(a)*.18,Math.sin(a)*radius]),life:.14+lv*.025,width:.016,col:WHITE,segs:4});
  }
  sc.fx.burst(to,Y,Math.round((13+lv*7)*(mobile?.55:1)),{speed:1.5+lv*.22,up:1,size:7+lv*2,life:.35,grav:-5});
  sc.light(to,WHITE,2.2+lv*.55,.32,1.8+lv*.28);
  if(target!=null)sc.hit(target,Y,false,true);
  if(!sc.reduced && lv>=3)sc.shake(.038);
  lingerOnImpact(sc,target,'shock',920);
}
/** Flame Slash — a curved crescent blade of fire sweeps across the target, leaving a burning arc. */
export async function flameSlash(sc, { from, to, target, charged = false }) {
  const O = [1, 0.48, 0.12], hand = charged ? from : add(from, [0, 0.25, 0]);
  sc.light(hand, O, 1.8, 0.35, 1.4); sc.fx.burst(hand, [1, 0.7, 0.3], 10, { speed: 0.8, up: 0.6, size: 9, grav: 0, life: 0.25 });
  if (!charged) await sleep(sc, 120);
  const dx = to[0] - hand[0], dz = to[2] - hand[2], L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L;
  sc.addBolt({ a: hand, b: to, life: 0.18, width: 0.022, col: O, segs: 3, grow: 0.2 });   // v0.7: the blade's searing path leaves the caster's arm
  const steps = 14;
  await sc.tween(0.26, k => { const i = Math.floor(k * steps); for (let j = 0; j < 2; j++) { const t = (i + j * 0.5) / steps, sw = Math.sin(t * Math.PI) * 0.9;
    const p = [hand[0] + dx * t + nx * sw, hand[1] + (to[1] - hand[1]) * t + 0.15 * Math.sin(t * Math.PI), hand[2] + dz * t + nz * sw];
    sc.fx.emit({ pos: p, vel: [nx * 0.4, 0.3, nz * 0.4], col: [1, 0.55 + Math.random() * 0.3, 0.15, 1], size: 26, life: 0.35, drag: 3 }, true); } });
  const arc = []; for (let k = 0; k <= 10; k++) { const a = -1 + k / 5; arc.push(add(to, [nx * a * 0.6 - dx / L * (1 - a * a) * 0.3, 0.2 + (1 - a * a) * 0.35, nz * a * 0.6 - dz / L * (1 - a * a) * 0.3])); }
  for (let k = 0; k < arc.length - 1; k++) sc.addBolt({ a: arc[k], b: arc[k + 1], life: 0.3, width: 0.06, col: O, segs: 2 });
  sc.fx.burst(to, [1, 0.75, 0.3], 30, { speed: 2.2, up: 1.6, size: 12 }); sc.light(to, O, 3, 0.4, 2.4);
  if (target != null) sc.hit(target, O, true); if (!sc.reduced) sc.shake(0.08);
  lingerOnImpact(sc,target,'flame',920);
}
/** Healing Salve — a small, quick restorative pulse: glowing droplets fall and one gentle protective ring. */
export async function salve(sc, { from }) {
  const W = [0.75, 1, 0.8]; from = [from[0], 0, from[2]];   // self-release: a pulse around the caster's feet and body
  for (let i = 0; i < 14; i++) sc.fx.emit({ pos: [from[0] + (Math.random() - 0.5) * 0.5, 1.2 + Math.random() * 0.3, from[2] + (Math.random() - 0.5) * 0.5], vel: [0, -2.4, 0], col: [0.8, 1, 0.85, 1], size: 9, life: 0.45, drag: 0.2 }, true);
  sc.addRing({ pos: [from[0], 0.03, from[2]], r0: 0.15, r1: 0.55, life: 0.35, col: W, width: 0.05 });
  sc.light(add(from, [0, 0.5, 0]), W, 1.8, 0.4, 1.2); await sleep(sc, 140);
}
export async function chain(sc, o) { return lightningBolt(sc, { ...o, big: false }); }
export async function chainHop(sc, a, b, target) {
  sc.addBolt({ a, b, life: 0.2, width: 0.04, col: ELECTRIC, branches: 1, grow: 0.05 });
  await sleep(sc, 70); sc.fx.burst(b, ELECTRIC_CORE, 14, { speed: 1.6, up: 1 }); sc.light(b, ELECTRIC, 2.2, 0.3, 2); if (target != null) sc.hit(target, ELECTRIC, false, true);
}
/** Fire: flame buildup → glowing projectile with ember trail → explosive impact. */
export async function fire(sc, { from, to, target, charged = false }) {
  const hand = charged ? from : add(from, [0, 0.2, 0]); const ORANGE = [1, 0.5, 0.15];
  if (!charged) { sc.fx.swirl(hand, () => hand, [1, 0.6, 0.2], 40, 0.4); sc.light(hand, ORANGE, 2, 0.5, 1.4); await sleep(sc, 220); }
  await sc.projectile(hand, to, ORANGE, 0.32, 0.6, { embers: true, size: 40 });
  sc.fx.burst(to, [1, 0.75, 0.3], 44, { speed: 2.6, up: 2.2, size: 15 }); sc.fx.burst(to, [0.3, 0.12, 0.05], 16, { speed: 1, up: 1.5, size: 22, grav: 1 });
  sc.addRing({ pos: [to[0], 0.03, to[2]], r0: 0.1, r1: 1.1, life: 0.4, col: ORANGE, width: 0.12 });
  sc.light(to, ORANGE, 3.6, 0.5, 2.6); if (!sc.reduced) sc.shake(0.12); if (target != null) sc.hit(target, ORANGE, true);
  lingerOnImpact(sc,target,'fire',920);
}
/** Fireball: a meteor falls on the area, telegraph ring, big blast. */
export async function fireball(sc, { from, to, tiles = [], charged = false, power = 1 }) {
  const ORANGE = [1, 0.5, 0.15]; const hand = charged ? from : add(from, [0, 0.3, 0]);
  if (!charged) { sc.fx.swirl(hand, () => hand, ORANGE, 50, 0.45); await sleep(sc, 240); }
  sc.addRing({ pos: [to[0], 0.03, to[2]], r0: 1.3, r1: 1.2, life: 0.6, col: [1, 0.35, 0.1], width: 0.06 });   // target telegraph
  sc.fx.burst(hand, [1, 0.8, 0.4], 18, { speed: 1.6, up: 0.6, size: 12, life: 0.25 });                       // launch flare at the caster
  await sc.projectile(hand, to, ORANGE, 0.55, 0.9, { embers: true, size: 44 + 22 * power });   // v0.8: slower, visible flight; sphere size scales
  sc.screenFlash([1, 0.7, 0.4], 0.32); if (!sc.reduced) sc.shake(0.24);
  for (const t of tiles) sc.fx.burst([t[0], 0.2, t[2]], [1, 0.7, 0.25], 16, { speed: 1.8, up: 2.4, size: 14 });
  sc.addRing({ pos: [to[0], 0.03, to[2]], r0: 0.2, r1: Math.min(2.6, 1.2 + 0.6 * power), life: 0.55, col: ORANGE, width: 0.12 + 0.08 * power });
  sc.light(to, ORANGE, 5, 0.6, 3);
}
/** Frost: cold gathers, a crystal lance flies straight, impact shatters into shards and rime. */
export async function frost(sc, { from, to, target, charged = false, power = 1 }) {
  const ICE = [0.6, 0.9, 1], hand = charged ? from : add(from, [0, 0.2, 0]);
  if (!charged) { sc.fx.swirl(hand, () => hand, ICE, 34, 0.4); sc.light(hand, ICE, 1.8, 0.5, 1.2); await sleep(sc, 200); }
  for (let i = 0; i < Math.round(20 + 14 * power); i++) { const k = Math.random(); sc.fx.emit({ pos: lerp(hand, to, k * 0.15), vel: [(to[0] - hand[0]) * (2.4 + Math.random()) + R() * 0.6, (to[1] - hand[1]) * 2 + R() * 0.5, (to[2] - hand[2]) * (2.4 + Math.random()) + R() * 0.6], col: [0.8, 0.95, 1, 0.9], size: 10 + Math.random() * 10, life: 0.35, drag: 1.2 }, true); }
  await sc.projectile(hand, to, [0.8, 0.95, 1], 0.2, 0.05, { size: 26 });
  for (let i = 0; i < 26; i++) sc.fx.emit({ pos: add(to, [R() * 0.3, 0, R() * 0.3]), vel: [R() * 2.4, 1 + Math.random() * 2.6, R() * 2.4], col: [0.85, 0.97, 1, 1], size: 8 + Math.random() * 6, life: 0.6, grav: -7, drag: 0.6 }, true);
  sc.addRing({ pos: [to[0], 0.03, to[2]], r0: 0.1, r1: 0.9, life: 0.5, col: ICE, width: 0.1, spokes: 6 });
  sc.light(to, ICE, 3, 0.45, 2.2); if (target != null) sc.hit(target, ICE, false, true); if (!sc.reduced) sc.shake(0.06);
  lingerOnImpact(sc,target,'frost',920);
}
/** Poison: a lobbed glob bursts into a lingering, drifting toxic cloud over the area. */
export async function poison(sc, { from, to, tiles = [], charged = false }) {
  const TOX = [0.55, 1, 0.3]; const hand = charged ? from : add(from, [0, 0.2, 0]);
  for (let i = 0; i < 10; i++) sc.fx.emit({ pos: hand, vel: [R() * 0.6, 0.3 + Math.random() * 0.3, R() * 0.6], col: [0.55, 0.8, 0.35, 0.7], size: 16, life: 0.5, drag: 1 }, true);   // expelled spores
  await sc.projectile(hand, to, TOX, 0.4, 1.4, { size: 28 });
  sc.addRing({ pos: [to[0], 0.03, to[2]], r0: 0.2, r1: 1.5, life: 0.7, col: TOX, width: 0.08, spokes: 3 });
  for (const t of tiles.length ? tiles : [to]) for (let i = 0; i < 9; i++) sc.fx.emit({ pos: [t[0] + R() * 0.8, 0.1 + Math.random() * 0.3, t[2] + R() * 0.8], vel: [R() * 0.3, 0.25 + Math.random() * 0.3, R() * 0.3], col: [0.45 + Math.random() * 0.2, 0.9, 0.25, 0.75], size: 26 + Math.random() * 22, life: 1.6, drag: 0.4 }, true);
  sc.light(to, TOX, 2.8, 0.8, 1.4);
}
/** Healing: warm light rises from expanding rings at the caster's feet. */
export async function heal(sc, { from, charged = false }) {
  const GOLD = [1, 0.9, 0.55];
  if (charged) { for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.3; sc.addBolt({ a: [from[0] + Math.cos(a) * 0.5, 1.6, from[2] + Math.sin(a) * 0.5], b: [from[0], from[1], from[2]], life: 0.45, width: 0.05, col: GOLD, segs: 2, grow: 0.12 }); } from = [from[0], 0, from[2]]; }   // golden beams converge, then the blessing spreads from the feet
  sc.addRing({ pos: [from[0], 0.03, from[2]], r0: 0.1, r1: 1.0, life: 0.6, col: GOLD, width: 0.07 });
  setTimeout(() => sc.addRing({ pos: [from[0], 0.03, from[2]], r0: 0.1, r1: 0.7, life: 0.5, col: [0.7, 1, 0.6], width: 0.05 }), 140 / sc.speed);
  for (let i = 0; i < 40; i++) sc.fx.emit({ pos: [from[0] + R() * 0.7, 0.05 + Math.random() * 0.2, from[2] + R() * 0.7], vel: [0, 1 + Math.random() * 1.3, 0], col: [1, 0.9 + R() * 0.1, 0.55, 1], size: 9 + Math.random() * 6, life: 0.9, drag: 0.3 }, true);
  sc.light(add(from, [0, 0.6, 0]), GOLD, 2.6, 0.8, 1.6); await sleep(sc, 260);
}
/** Protection: a shimmering hexagonal ward forms around the caster. */
export async function shield(sc, { from, to, uid, target, charged = false }) {
  if (target != null && to) from = to;
  if (target != null) uid = target;
  const BLUE = [0.55, 0.8, 1];
  if (charged) { sc.addRing({ pos: [from[0], from[1], from[2]], r0: 0.05, r1: 0.7, life: 0.35, col: BLUE, width: 0.05, spokes: 6, seg: 6 }); from = [from[0], 0, from[2]]; }   // the ward expands outward from inside the body
  sc.addRing({ pos: [from[0], 0.03, from[2]], r0: 0.75, r1: 0.6, life: 0.7, col: BLUE, width: 0.08, spokes: 6, seg: 6 });
  for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; sc.fx.emit({ pos: [from[0] + Math.cos(a) * 0.55, 0.1 + Math.random() * 0.9, from[2] + Math.sin(a) * 0.55], vel: [0, 0.4, 0], col: [0.7, 0.9, 1, 1], size: 7, life: 0.8, drag: 0.5 }, true); }
  if (uid != null) { const v = sc.units.get(uid); if (v) { v.flash = 0.7; v.flashCold = 1; } }
  sc.light(add(from, [0, 0.6, 0]), BLUE, 2.4, 0.7, 1.4); await sleep(sc, 220);
}
/** Growth: verdant spiral and a muscle-pulse of the sprite. */
export async function growth(sc, { from, to, target, uid, charged = false }) {
  if (target != null && to) { from = to; uid = target; }
  const G = [0.5, 1, 0.4];
  if (!charged) sc.fx.swirl(add(from, [0, 0.3, 0]), () => add(from, [0, 0.4, 0]), G, 50, 0.6);
  else sc.fx.burst(from, G, 30, { speed: 1.8, up: 1.2, size: 10, grav: 0, life: 0.4 });   // the gathered energy surges through the body
  sc.light(add(from, [0, 0.3, 0]), G, 2.4, 0.6, 1.5); from = [from[0], 0, from[2]];
  for (let v = 0; v < 4; v++) { const a = v * Math.PI / 2 + 0.4; const base = [from[0] + Math.cos(a) * 0.45, 0.02, from[2] + Math.sin(a) * 0.45]; sc.addBolt({ a: base, b: add(base, [-Math.cos(a) * 0.3, 0.9, -Math.sin(a) * 0.3]), life: 0.5, width: 0.03, col: [0.35, 0.85, 0.3], segs: 5, grow: 0.25 }); }
  const v = sc.units.get(uid); if (v) { const s0 = v.scale; await sc.tween(0.35, k => { v.scale = s0 * (1 + Math.sin(k * Math.PI) * 0.18); }); v.scale = s0; }
}
/** Drain: a dark bolt strikes, then motes of life stream back into the caster. */
export async function drain(sc, { from, to, target, uidFrom, charged = false, power = 1 }) {
  const SHADE=[0.35,0.12,0.42], HEART=[0.95,0.12,0.22], hand=charged?from:add(from,[0,0.2,0]);
  // A five-fingered silhouette extends from the caster, closes over the foe, then tears a crimson soul back.
  await sc.projectile(hand,to,SHADE,0.25,0.18,{size:30});
  for(let finger=0;finger<5;finger++){
    const a=(finger-2)*0.35, tip=[to[0]+Math.sin(a)*0.26,to[1]+0.22+Math.cos(a)*0.18,to[2]+Math.cos(a)*0.18];
    sc.addBolt({a:hand,b:tip,life:0.52,width:0.025,col:SHADE,segs:3,grow:0.08});
    sc.addBolt({a:tip,b:to,life:0.5,width:0.038,col:[0.18,0.07,0.2],segs:2,grow:0.12});
  }
  if(target!=null)sc.hit(target,HEART,false);
  sc.fx.burst(to,HEART,Math.round(14+12*power),{speed:0.7,up:0.3,size:13});
  await sc.projectile(to,hand,HEART,0.42,0.38,{size:30+power*8});
  sc.fx.swirl(hand,()=>sc.centerPos(uidFrom),HEART,Math.round(20+12*power),0.65);
  sc.light(hand,HEART,2.8,0.42,1.5);
}
/** Summoning: a rotating ground glyph and a rising column precede materialization. */
export async function summon(sc, { from, to, charged = false }) {
  const G = [1, 0.9, 0.55];
  if (from) { await sc.projectile(from, [to[0], 0.4, to[2]], G, 0.27, 0.5, { size: 20 }); sc.fx.burst([to[0], 0.2, to[2]], G, 16, { speed: 1, up: 1.5 }); if (charged) return; }   // magic travels to the spot; the circle forms when the Soldier materializes
  sc.addRing({ pos: [to[0], 0.03, to[2]], r0: 0.55, r1: 0.5, life: 0.9, col: G, width: 0.06, spokes: 8, spin: 3 });
  for (let i = 0; i < 30; i++) sc.fx.emit({ pos: [to[0] + R() * 0.5, 0.05, to[2] + R() * 0.5], vel: [0, 1.8 + Math.random(), 0], col: [1, 0.95, 0.7, 1], size: 9, life: 0.6, drag: 0.2 }, true);
  sc.light(add(to, [0, 0.5, 0]), G, 2.4, 0.8, 1.6); await sleep(sc, 300);
}
export async function wind(sc, { from, to, target, charged = false }) { await sc.projectile(charged ? from : add(from, [0, 0.2, 0]), to, [0.85, 0.95, 1], 0.25, 0.1, { size: 22 }); if (target != null) sc.hit(target, [0.85, 0.95, 1], false); }

/** v0.8 Disfigure — a withering curse: a thin violet hex leaves the hand, then the foe's outline darkens and droops. */
export async function disfigure(sc, { from, to, target, power = 1 }) {
  const V = [0.6, 0.3, 0.8];
  sc.addBolt({ a: from, b: to, life: 0.35, width: 0.02 + 0.01 * power, col: V, segs: 6, grow: 0.12 });
  await sleep(sc, 120);
  for (let i = 0; i < 16; i++) sc.fx.emit({ pos: [to[0] + R() * 0.4, to[1] + 0.3 + Math.random() * 0.3, to[2] + R() * 0.4], vel: [R() * 0.2, -0.9, R() * 0.2], col: [0.45, 0.2, 0.6, 0.9], size: 10, life: 0.6, drag: 0.6 }, true);
  sc.addRing({ pos: [to[0], 0.03, to[2]], r0: 0.6, r1: 0.15, life: 0.45, col: V, width: 0.05 });
  if (target != null) { sc.hit(target, V, false); const v = sc.units.get(target); if (v) v.flashCold = 0; }
}
/** v0.8 Titanic Growth — Giant Growth's bigger sibling: vines erupt in a ring and the body swells hard. */
export async function titanic(sc, { from, to, target, uid, power = 1 }) {
  if (target != null && to) { from = to; uid = target; }
  const G = [0.45, 1, 0.35]; const base0 = [from[0], 0, from[2]];
  for (let v = 0; v < 7; v++) { const a = v / 7 * Math.PI * 2; const b = [base0[0] + Math.cos(a) * 0.6, 0.02, base0[2] + Math.sin(a) * 0.6]; sc.addBolt({ a: b, b: add(b, [-Math.cos(a) * 0.35, 1.3, -Math.sin(a) * 0.35]), life: 0.7, width: 0.04, col: [0.3, 0.8, 0.25], segs: 6, grow: 0.3 }); }
  sc.addRing({ pos: [base0[0], 0.03, base0[2]], r0: 0.2, r1: 1.2, life: 0.6, col: G, width: 0.1, spokes: 7 });
  sc.light(add(base0, [0, 0.8, 0]), G, 3.4, 0.8, 2.2); if (!sc.reduced) sc.shake(0.08);
  const v = sc.units.get(uid); if (v) { const s0 = v.scale; await sc.tween(0.5, k => { v.scale = s0 * (1 + Math.sin(k * Math.PI) * (0.22 + 0.06 * power)); }); v.scale = s0; }
}
/** v0.8 Pyroclasm — fire gathers in the caster, then a burning shockwave rolls out across the whole battlefield. */
export async function pyroclasm(sc, { from, tiles = [], power = 1 }) {
  const O = [1, 0.45, 0.12]; const c = [from[0], 0.03, from[2]];
  sc.screenFlash([1, 0.6, 0.3], 0.22); sc.light(add(c, [0, 0.6, 0]), O, 6, 0.8, 2.6);
  sc.addRing({ pos: c, r0: 0.2, r1: 6.5, life: 0.75, col: O, width: 0.22 }); sc.addRing({ pos: c, r0: 0.1, r1: 5, life: 0.6, col: [1, 0.8, 0.4], width: 0.08 });
  for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * 4.5; sc.fx.emit({ pos: [c[0] + Math.cos(a) * r, 0.1, c[2] + Math.sin(a) * r], vel: [Math.cos(a) * 0.8, 0.8 + Math.random(), Math.sin(a) * 0.8], col: [1, 0.55 + Math.random() * 0.3, 0.15, 1], size: 12 + Math.random() * 10, life: 0.7, grav: -1, drag: 0.6 }, true); }
  if (!sc.reduced) sc.shake(Math.min(0.3, 0.12 + 0.05 * power));
  await sleep(sc, 260);
}
/** Snakeskin Veil: a separate verdant lattice contracts around the chosen friendly unit. */
export async function snakeskin(sc, { from, to, target, charged = false }) {
  const at = to || from, GREEN = [0.52, 0.97, 0.45];
  if (charged) sc.addBolt({ a: from, b: at, life: 0.3, width: 0.022, col: GREEN, segs: 6, grow: 0.16 });
  for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7; const b = [at[0] + Math.cos(a) * 0.66, 0.02, at[2] + Math.sin(a) * 0.66];
    sc.addBolt({ a: b, b: [at[0] + Math.cos(a + 0.4) * 0.46, 0.95, at[2] + Math.sin(a + 0.4) * 0.46], life: 0.55, width: 0.034, col: GREEN, segs: 4 }); }
  sc.addRing({ pos: [at[0], 0.03, at[2]], r0: 0.65, r1: 0.48, life: 0.6, col: GREEN, width: 0.09, spokes: 7 });
  sc.light([at[0], 0.7, at[2]], GREEN, 2.6, 0.6, 1.4);
  if (target != null) { const v = sc.units.get(target); if (v) { v.flash = 0.6; v.flashCold = 1; } }
  await sleep(sc, 210);
}
/** Distinct hand-authored cast identities for the expanded real-card spellbook. */
export async function strikeBolt(sc, args) { await lightningBolt(sc, args); }
export async function murder(sc, args) { await shadowMurder(sc, args); }   // v1.6.0 umbral: grasping shadow hand
export async function revitalize(sc, args) { await heal(sc, args); }
export async function divination(sc, { from }) {
  const A = [0.45, 0.65, 1];
  for (let i = 0; i < 2; i++) {
    sc.addRing({pos:[from[0], 0.3+i*0.25, from[2]],r0:0.2,r1:0.55,life:0.45,col:A,width:0.06,spokes:4,spin:2});
    sc.fx.burst([from[0],0.5,from[2]],A,10,{speed:0.7,up:1.2,size:12});
  }
  sc.light(from,A,2,0.5,1.3);await sleep(sc,180);
}
/** v1.6.0 black-spell identities (spectral hands in mist). The old violet-bolt versions stay exported for reference. */
const disfigureShadow = args => shadowDisfigure(args.sc, args), drainShadow = null;
/** v1.7.0 POISON spells: a green orb thrown by the caster bursts into toxic vapour that spreads from the centre over the
 *  ACTUAL affected tiles (centre → edges → corners) and fades. Low, translucent vapour keeps silhouettes and markers
 *  readable. Logical damage/status was already applied simultaneously by the engine; this resolves at the burst. */
/** v1.8.0: the cloud is fully opaque for TOXIC_HOLD over the WHOLE footprint, then dissolves over TOXIC_FADE with an
 *  ordered-dither pixel dissolve. Rolls outward from the impact by distance. Presentation only. */
export const TOXIC_SPREAD = 0.22, TOXIC_HOLD = 1.0, TOXIC_FADE = 0.75;
export async function toxicOrb(sc, { from, to, tiles = [], target }) {
  const G = [0.45, 1, 0.3], c = [to[0], 0.32, to[2]];
  await sc.projectile(from || add(to, [0, 1, 0]), c, G, 0.34, 0.55, { size: 34 });
  sc.light(c, G, 3.2, 0.7, 1.8); sc.addRing({ pos: [to[0], 0.04, to[2]], r0: 0.1, r1: 1.5, life: 0.45, col: G, width: 0.1 });
  sc.fx.burst(c, G, sc.reduced ? 8 : 22, { speed: 1.6, up: 0.9, size: 12 });
  if (target != null) sc.hit(target, G, false);
  const area = (tiles.length ? tiles : [to]).map(t => ({ t, d: Math.hypot(t[0] - to[0], t[2] - to[2]) })).sort((a, b) => a.d - b.d);
  const maxD = Math.max(0.001, ...area.map(a => a.d)), per = sc.reduced ? 2 : 4;
  area.forEach(({ t, d }, ti) => {
    const delay = (d / maxD) * TOXIC_SPREAD, life = TOXIC_SPREAD - delay + TOXIC_HOLD + TOXIC_FADE;
    for (let k = 0; k < per; k++) {
      const a = ti * 2.4 + k * 1.57, r = k ? 0.26 : 0.05;
      sc.addShadow?.({ tex: 'toxic', frames: [[(ti + k) % 6, 0]], pos: [t[0] + Math.cos(a) * r, -0.05 + k * 0.1, t[2] + Math.sin(a) * r], size: k ? 0.95 : 1.25,
        life, delay, fadeIn: 0.12, fadeOut: TOXIC_FADE, vel: sc.reduced ? [0, 0, 0] : [Math.cos(a) * 0.05, 0.05, Math.sin(a) * 0.05] });
    }
  });
  await sleep(sc, 120);
}
export const VFX = { infest: toxicOrb, toxicOrb, strikeBolt, murder, revitalize, divination, snakeskin, disfigure: (sc, a) => shadowDisfigure(sc, a), titanic, pyroclasm, lightningBolt, spark, shock, chain, fire, flameSlash, fireball, frost, poison, heal, salve, shield, growth, drain: (sc, a) => shadowDrain(sc, a), summon, wind };
/** The 13 curated real spells and their unique VFX identities (dev/vfx.html gallery + tests). */
export const SPELL_VFX = { 'Shock': 'shock', 'Lightning Bolt': 'lightningBolt', 'Flame Slash': 'flameSlash', 'Arc Lightning': 'chain', 'Fireball': 'fireball', 'Giant Growth': 'growth',
  'Drain Life': 'drain', 'Infest': 'infest', 'Raise the Alarm': 'summon', 'Healing Hands': 'heal', 'Healing Salve': 'salve', 'Feat of Resistance': 'shield', 'Frost Breath': 'frost',
  'Snakeskin Veil': 'snakeskin', 'Disfigure': 'disfigure', 'Titanic Growth': 'titanic', 'Pyroclasm': 'pyroclasm',
  'Lightning Strike': 'strikeBolt', 'Murder': 'murder', 'Revitalize': 'revitalize', 'Divination': 'divination' };
/** Template/legacy effect -> default visual family (used when a card has no explicit vfx). */
export const DEFAULT_VFX = { ember_dart: 'fire', chain_lightning: 'chain', starfall: 'fireball', venom_mist: 'poison', mending_rain: 'heal', barkskin: 'shield', sap_surge: 'growth', soul_siphon: 'drain', call_sproutling: 'summon', rootsnare: 'frost', gale_push: 'wind', blink_step: 'teleport' };
