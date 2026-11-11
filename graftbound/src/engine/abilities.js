// Damage, healing, statuses and keyword-driven combat resolution. Functions mutate battle state `s`
// and append presentation events to `ev`. No rendering, no randomness.
import { unitAt, T, tileAt, manhattan, isFlying } from '../core/grid.js';
import { ENEMIES } from '../data/enemies.js';
import { TERRAIN_RULES } from '../data/terrain.js';

export const has = (u, kw) => kw === 'flying' ? isFlying(u) : !!(u.keywords && u.keywords[kw]);
export const kv = (u, kw) => (u.keywords && u.keywords[kw]) || 0;
export const alive = u => !!u && u.hp > 0;
export const player = s => s.units.find(u => u.hero);
export const allies = s => s.units.filter(u => u.side === 'player' && u.hp > 0);
export const enemies = s => s.units.filter(u => u.side === 'enemy' && u.hp > 0);
export const effectivePower = u => Math.max(0, u.power + (u.statuses.empowered || 0) - (u.statuses.weakened || 0));

/** Power used when `u` strikes `target`, including pack-flanking bonus. */
export function strikePower(s, u, target) {
  let p = effectivePower(u);
  const def = ENEMIES[u.defId];
  if (def && def.pack && target && s.units.some(o => o !== u && o.hp > 0 && o.side === u.side && manhattan(o, target) === 1)) p += 1;
  return p;
}
export function heal(s, ev, u, amount, kind = 'heal') {
  if (!alive(u) || amount <= 0) return 0;
  const h = Math.min(amount, u.maxHp - u.hp);
  if (h <= 0) return 0;
  u.hp += h; ev.push({ t: 'heal', uid: u.uid, amount: h, kind });
  return h;
}
export function addShield(s, ev, u, amount, kind = 'shield') {
  if (!alive(u) || amount <= 0) return;
  u.statuses.shield = (u.statuses.shield || 0) + amount;
  ev.push({ t: 'shield', uid: u.uid, amount, total: u.statuses.shield, kind });
}
export function addStatus(s, ev, u, status, value) {
  if (!alive(u)) return;
  u.statuses[status] = (u.statuses[status] || 0) + value;
  ev.push({ t: 'status', uid: u.uid, status, value, total: u.statuses[status] });
}
function kill(s, ev, u) {
  ev.push({ t: 'death', uid: u.uid });
  if (u.side === 'enemy') {
    s.stats.kills++;
    const def = ENEMIES[u.defId];
    if (def && def.burst) { // Cinderling: bursts on death, hitting everything adjacent (both sides)
      ev.push({ t: 'burst', uid: u.uid, x: u.x, y: u.y });
      for (const o of s.units.filter(o => o.hp > 0 && manhattan(o, u) === 1)) dealDamage(s, ev, null, o, def.burst, { kind: 'burst' });
    }
    if (s.units.every(e => e.side !== 'enemy' || e.hp <= 0) && s.phase !== 'lost') { s.phase = 'won'; ev.push({ t: 'victory' }); }
  } else if (u.hero && s.phase !== 'won') { s.phase = 'lost'; ev.push({ t: 'defeat' }); }
}
/** Damage pipeline: strike cap (bosses) -> armor (combat only) -> shield -> health.
 *  Only combat damage (strikes/counterblows) triggers Deathtouch and Lifelink; spells bypass armor. */
export function dealDamage(s, ev, src, tgt, amount, { combat = false, kind = 'hit' } = {}) {
  if (!alive(tgt) || amount <= 0) return 0;
  let a = amount;
  const cap = combat && ENEMIES[tgt.defId] && ENEMIES[tgt.defId].strikeCap;
  if (cap && a > cap) { ev.push({ t: 'capped', uid: tgt.uid, from: a, to: cap }); a = cap; }
  const armor = combat ? kv(tgt, 'armor') : 0;
  if (armor) { const cut = Math.min(armor, a); a -= cut; if (cut) ev.push({ t: 'armored', uid: tgt.uid, amount: cut }); }
  if (a <= 0) { ev.push({ t: 'damage', uid: tgt.uid, amount: 0, blocked: 0, kind }); return 0; }
  const sh = tgt.statuses.shield || 0;
  const blocked = Math.min(sh, a);
  if (blocked) { tgt.statuses.shield = sh - blocked; a -= blocked; }
  const hpBefore = tgt.hp;
  const dt = combat && src && has(src, 'deathtouch') && a > 0 && !tgt.legendary;
  tgt.hp = dt ? 0 : Math.max(0, tgt.hp - a);
  const lost = hpBefore - tgt.hp;
  ev.push({ t: 'damage', uid: tgt.uid, amount: a, blocked, deathtouch: dt, kind, src: src ? src.uid : null });
  if (src && src.side === 'player') s.stats.damageDealt += lost;
  if (tgt.hero) s.stats.damageTaken += lost;
  if (combat && src && has(src, 'lifelink') && lost > 0) heal(s, ev, src, lost, 'lifelink');
  if (tgt.hp <= 0) kill(s, ev, tgt);
  return lost;
}
/** One combat strike. dir = [dx,dy] of the attack (used by Trample). */
export function strike(s, ev, src, tgt, dir, kind = 'strike') {
  if (!alive(src) || !alive(tgt)) return;
  let amt = strikePower(s, src, tgt);
  if (has(src, 'deathtouch') && tgt.legendary && amt > 0) amt += 2;
  if (amt <= 0) { ev.push({ t: 'damage', uid: tgt.uid, amount: 0, blocked: 0, kind }); return; }
  const cap = ENEMIES[tgt.defId] && ENEMIES[tgt.defId].strikeCap;
  const shield = tgt.statuses.shield || 0, armor = kv(tgt, 'armor');
  const lethal = armor + shield + (has(src, 'deathtouch') && !tgt.legendary ? 1 : tgt.hp);
  const excess = Math.min(amt, cap || Infinity) - lethal;
  const tx = tgt.x, ty = tgt.y;
  dealDamage(s, ev, src, tgt, amt, { combat: true, kind });
  if (has(src, 'trample') && excess > 0 && tgt.hp <= 0 && dir && alive(src)) {
    const behind = unitAt(s, tx + dir[0], ty + dir[1]);
    if (behind && behind.side !== src.side) {
      ev.push({ t: 'trample', uid: src.uid, target: behind.uid, amount: excess });
      dealDamage(s, ev, src, behind, excess, { combat: true, kind: 'trample' });
    }
  }
}
/** Why a defender cannot strike back (null = it can). Used by rules AND by UI explanations. */
export function counterBlocked(atk, def, melee) {
  if (!melee) return 'ranged';
  if (!alive(def)) return 'dead';
  if (def.boss) return 'boss';
  if (def.statuses.stunned) return 'stunned';
  if (effectivePower(def) <= 0) return 'no power';
  if (has(atk, 'firstStrike')) return 'first strike';
  if (has(atk, 'flying') && !has(def, 'flying') && !has(def, 'reach')) return 'flying';
  return null;
}
/** Full exchange. Order: defender First-Strike counter -> attacker strike(s) -> Spines -> normal counterblow. */
export function attackExchange(s, ev, atk, def) {
  const dist = Math.abs(atk.x - def.x) + Math.abs(atk.y - def.y);
  const melee = dist === 1;
  const dir = [Math.sign(def.x - atk.x), Math.sign(def.y - atk.y)];
  ev.push({ t: 'attack', uid: atk.uid, target: def.uid, ranged: !melee });
  let countered = false;
  if (!counterBlocked(atk, def, melee) && has(def, 'firstStrike')) {
    ev.push({ t: 'counter', uid: def.uid, target: atk.uid, first: true });
    strike(s, ev, def, atk, [-dir[0], -dir[1]], 'counter');
    countered = true;
    if (!alive(atk)) return;
  }
  const hits = has(atk, 'doubleStrike') ? 2 : 1;
  for (let i = 0; i < hits && alive(def) && alive(atk); i++) strike(s, ev, atk, def, dir, i ? 'strike2' : 'strike');
  if (melee && alive(atk) && kv(def, 'spines') > 0) {
    ev.push({ t: 'spines', uid: def.uid, target: atk.uid });
    dealDamage(s, ev, def, atk, kv(def, 'spines'), { kind: 'spines' });
  }
  if (!countered && alive(atk)) {
    const why = counterBlocked(atk, def, melee);
    if (!why) { ev.push({ t: 'counter', uid: def.uid, target: atk.uid }); strike(s, ev, def, atk, [-dir[0], -dir[1]], 'counter'); }
    else if (alive(def) && why !== 'ranged' && why !== 'dead') ev.push({ t: 'noCounter', uid: def.uid, reason: why });
  }
}
/** Movement side effects for ground units: bramble and lava damage on each entered tile (see data/terrain.js). */
export function enterTiles(s, ev, u, path) {
  if (has(u, 'flying')) return;
  for (let i = 1; i < path.length && alive(u); i++) {
    const t = tileAt(s, path[i].x, path[i].y);
    if (t === T.BRAMBLE) dealDamage(s, ev, null, u, TERRAIN_RULES.bramble.enterDamage, { kind: 'bramble' });
    if (t === T.LAVA) dealDamage(s, ev, null, u, TERRAIN_RULES.lava.enterDamage, { kind: 'lava' });
  }
}
