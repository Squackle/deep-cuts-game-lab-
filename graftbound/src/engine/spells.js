// Spellbook. v0.5 targeting: offensive and area spells reach ANY legal target on the battlefield, with no
// caster-distance or line-of-sight limit. Only 'empty'-target spells (movement, summon placement) keep a range.
// Numbers scale with spell level, the caster's Arcane, and the real card's adaptation bonus.
import { resolveCard } from '../cards/catalog.js';
import { inBounds, unitAt, tileAt, T, manhattan } from '../core/grid.js';
import { dealDamage, heal, addShield, addStatus, enemies, alive, player, enterTiles } from './abilities.js';
import { ENEMIES } from '../data/enemies.js';
import { TERRAIN_RULES } from '../data/terrain.js';
const getCard = id => resolveCard(id);
export const effectOf = id => { const c = resolveCard(id); return (c && c.effect) || id; };

const BASE = {
  ember_dart: [2], barkskin: [3], sap_surge: [3], gale_push: [2], blink_step: [3], rootsnare: [1],
  venom_mist: [2], mending_rain: [4], soul_siphon: [2], chain_lightning: [3, 2], starfall: [4, 2], call_sproutling: [2, 2],
};
const NO_ARCANE = new Set(['sap_surge', 'blink_step', 'call_sproutling']);
export function spellNumbers(id, level = 1, arcane = 0) {
  const e = effectOf(id); const c = resolveCard(id); const bonus = (c && c.bonus) || 0;
  const add = (level - 1) + bonus + (NO_ARCANE.has(e) ? 0 : arcane);
  return (BASE[e] || []).map(n => Math.max(1, n + add));
}
export function formatSpellText(id, level = 1, arcane = 0) {
  const nums = spellNumbers(id, level, arcane); let i = 0;
  return getCard(id).text.replace(/\{(\d+)\}/g, () => String(nums[i++]));
}
/** Range only exists for 'empty' targets; everything else reaches the whole battlefield (Infinity). */
export function spellRange(id, level = 1) {
  const c = getCard(id);
  if (c.target !== 'empty') return Infinity;
  return effectOf(id) === 'blink_step' ? spellNumbers(id, level)[0] : (c.range || 2);
}
export const rangeLabel = (id, level = 1) => { const c = getCard(id); if (c.target === 'self') return 'self'; const r = spellRange(id, level); return r === Infinity ? 'anywhere' : `range ${r}`; };
/** Mana cost including enemy spell taxes (Null Warden). */
export function spellCost(s, id) {
  const tax = s ? enemies(s).reduce((a, e) => a + ((ENEMIES[e.defId] && ENEMIES[e.defId].spellTax) || 0), 0) : 0;
  return getCard(id).cost + tax;
}
export function spellTargets(s, id, level = 1) {
  const c = getCard(id), p = player(s), out = [];
  if (c.target === 'self') return [{ x: p.x, y: p.y }];
  if (c.target === 'enemy') return enemies(s).map(e => ({ x: e.x, y: e.y }));
  const range = spellRange(id, level);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    const d = Math.abs(x - p.x) + Math.abs(y - p.y);
    if (c.target === 'tile') { if (tileAt(s, x, y) !== T.ROCK) out.push({ x, y }); continue; }
    if (d === 0 || d > range) continue;
    if (unitAt(s, x, y) || tileAt(s, x, y) === T.ROCK || tileAt(s, x, y) === T.LAVA) continue;
    out.push({ x, y });
  }
  return out;
}
export function castBlockReason(s, id) {
  const entry = s.spellbook.find(x => x.id === id);
  if (!entry) return 'Not in your spellbook';
  if (s.phase !== 'player') return 'Not your turn';
  if (s.p.cast[id]) return 'Already cast this turn';
  const cost = spellCost(s, id);
  if (s.p.mana < cost) return `Needs ${cost} mana (you have ${s.p.mana})${cost > getCard(id).cost ? ' — a Null Warden taxes your spells' : ''}`;
  if (!spellTargets(s, id, entry.level).length) return getCard(id).target === 'enemy' ? 'No foe on the battlefield' : 'No valid target';
  return null;
}
export function castSpellEffect(s, ev, id, level, tx, ty) {
  const p = player(s); const n = spellNumbers(id, level, s.p.arcane);
  const target = unitAt(s, tx, ty);
  const c = getCard(id);
  ev.push({ t: 'spell', id, uid: p.uid, x: tx, y: ty, target: target ? target.uid : null, vfx: c.vfx || effectOf(id) });
  switch (effectOf(id)) {
    case 'ember_dart': dealDamage(s, ev, p, target, n[0], { kind: 'spell' }); break;
    case 'barkskin': addShield(s, ev, p, n[0], 'barkskin'); break;
    case 'sap_surge': addStatus(s, ev, p, 'empowered', n[0]); break;
    case 'mending_rain': heal(s, ev, p, n[0]);
      for (const st of ['poison', 'weakened']) if (p.statuses[st]) { p.statuses[st] = 0; ev.push({ t: 'status', uid: p.uid, status: st, value: 0, total: 0 }); }
      break;
    case 'soul_siphon': { const d = dealDamage(s, ev, p, target, n[0], { kind: 'spell' }); heal(s, ev, p, d, 'siphon'); break; }
    case 'rootsnare': dealDamage(s, ev, p, target, n[0], { kind: 'spell' }); if (alive(target)) addStatus(s, ev, target, 'stunned', 1); break;
    case 'blink_step': { const from = { x: p.x, y: p.y }; p.x = tx; p.y = ty; ev.push({ t: 'teleport', uid: p.uid, from, x: tx, y: ty }); break; }
    case 'call_sproutling': {
      const u = { uid: s.nextUid++, side: 'player', hero: false, defId: 'sproutling', name: c.reference ? 'Soldier' : 'Sproutling', x: tx, y: ty, hp: n[1], maxHp: n[1],
        power: n[0], toughness: n[1], move: 2, keywords: {}, statuses: {} };
      s.units.push(u); ev.push({ t: 'summon', uid: u.uid, defId: 'sproutling', x: tx, y: ty, by: p.uid, ally: true });
      break;
    }
    case 'venom_mist': ev.push({ t: 'area', x: tx, y: ty, r: 1, kind: 'mist' }); for (const e of enemies(s)) if (Math.abs(e.x - tx) <= 1 && Math.abs(e.y - ty) <= 1) addStatus(s, ev, e, 'poison', n[0]); break;
    case 'starfall': {
      ev.push({ t: 'area', x: tx, y: ty, r: 1, kind: 'star' });
      for (const e of enemies(s).filter(e => manhattan(e, { x: tx, y: ty }) <= 1)) dealDamage(s, ev, p, e, e.x === tx && e.y === ty ? n[0] : n[1], { kind: 'spell' });
      break;
    }
    case 'chain_lightning': {
      const chain = [target]; dealDamage(s, ev, p, target, n[0], { kind: 'spell' });
      let last = { x: tx, y: ty };
      for (let i = 0; i < 2; i++) {
        const nxt = enemies(s).filter(e => !chain.includes(e) && manhattan(e, last) <= 2).sort((a, b) => manhattan(a, last) - manhattan(b, last) || a.uid - b.uid)[0];
        if (!nxt) break;
        ev.push({ t: 'chain', from: last, x: nxt.x, y: nxt.y, target: nxt.uid });
        chain.push(nxt); dealDamage(s, ev, p, nxt, n[1], { kind: 'spell' }); last = { x: nxt.x, y: nxt.y };
      }
      break;
    }
    case 'gale_push': {
      const dx = Math.sign(tx - p.x), dy = Math.sign(ty - p.y);
      const dir = Math.abs(tx - p.x) >= Math.abs(ty - p.y) ? [dx || 1, 0] : [0, dy || 1];
      const path = [{ x: target.x, y: target.y }]; let collided = null;
      for (let i = 0; i < 2; i++) {
        const nx = target.x + dir[0], ny = target.y + dir[1];
        if (!inBounds(s, nx, ny) || tileAt(s, nx, ny) === T.ROCK) { collided = 'wall'; break; }
        const blocker = unitAt(s, nx, ny);
        if (blocker) { collided = blocker; break; }
        target.x = nx; target.y = ny; path.push({ x: nx, y: ny });
      }
      ev.push({ t: 'push', uid: target.uid, path });
      enterTiles(s, ev, target, path);
      if (collided && alive(target)) { dealDamage(s, ev, p, target, n[0], { kind: 'collide' }); if (collided !== 'wall') dealDamage(s, ev, p, collided, n[0], { kind: 'collide' }); }
      break;
    }
    default: throw new Error('Unknown spell ' + id);
  }
  elementalInteraction(s, ev, id, tx, ty);
}

/** v0.6: a deliberately small set of spell–terrain interactions. Element comes from the card's VFX identity. */
const ELEMENT_BY_VFX = { fire: 'fire', fireball: 'fire', flameSlash: 'fire', lightningBolt: 'lightning', spark: 'lightning', chain: 'lightning', frost: 'frost' };
const ELEMENT_BY_EFFECT = { ember_dart: 'fire', starfall: 'fire', chain_lightning: 'lightning', rootsnare: 'frost' };
export function spellElement(id) { const c = getCard(id); return (c && ELEMENT_BY_VFX[c.vfx]) || ELEMENT_BY_EFFECT[effectOf(id)] || null; }
const near = (a, b, r) => Math.abs(a.x - b.x) <= r && Math.abs(a.y - b.y) <= r;
function elementalInteraction(s, ev, id, tx, ty) {
  const el = spellElement(id); if (!el || s.phase === 'lost') return;
  if (el === 'fire') {   // fire burns brambles away (target tile; Fireball/Starfall: the whole blast)
    const r = effectOf(id) === 'starfall' ? 1 : 0; const burned = [];
    for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) if (inBounds(s, x, y) && tileAt(s, x, y) === T.BRAMBLE && (r === 0 || manhattan({ x, y }, { x: tx, y: ty }) <= 1)) { s.terrain[y * s.w + x] = T.FLOOR; burned.push({ x, y }); }
    if (burned.length) ev.push({ t: 'terrain', tiles: burned, kind: 'burn' });
  }
  if (el === 'frost' && inBounds(s, tx, ty) && tileAt(s, tx, ty) === T.LAVA) {   // frost hardens lava for a while
    const i = ty * s.w + tx; s.terrain[i] = T.FLOOR; (s.cooled = s.cooled || []).push({ i, until: s.turn + TERRAIN_RULES.frost.coolRounds - 1 });   // solid this round and the next
    ev.push({ t: 'terrain', tiles: [{ x: tx, y: ty }], kind: 'cool' });
  }
  if (el === 'lightning') {   // lightning near a charged crystal makes it discharge once
    const c = (s.crystals || []).find(k => k.charged && near(k, { x: tx, y: ty }, 1)); if (!c) return;
    c.charged = false; ev.push({ t: 'crystal', x: c.x, y: c.y, kind: 'discharge' });
    for (const e of enemies(s).filter(e => near(e, c, TERRAIN_RULES.crystal.dischargeRadius))) dealDamage(s, ev, player(s), e, TERRAIN_RULES.crystal.dischargeDamage, { kind: 'spell' });
  }
}
