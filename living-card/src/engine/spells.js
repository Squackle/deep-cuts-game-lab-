// Spellbook spells. Numbers scale with spell level (duplicates), the caster's Arcane, and any card bonus
// (reference cards can adapt a modeled effect with a fixed bonus, e.g. Lightning Bolt = Ember Dart +1).
import { resolveCard } from '../cards/catalog.js';
import { inBounds, unitAt, lineOfSight, tileAt, T, manhattan } from '../core/grid.js';
import { dealDamage, heal, addShield, addStatus, enemies, alive, player, enterTiles } from './abilities.js';
const getCard = id => resolveCard(id);
/** Reference spells reuse a modeled effect of the original set. */
export const effectOf = id => { const c = resolveCard(id); return (c && c.effect) || id; };

const BASE = {
  ember_dart: [2], barkskin: [3], sap_surge: [3], gale_push: [2], blink_step: [3], rootsnare: [1],
  venom_mist: [3], mending_rain: [5], soul_siphon: [3], chain_lightning: [3, 2], starfall: [5, 3], call_sproutling: [2, 2],
};
const NO_ARCANE = new Set(['sap_surge', 'blink_step', 'call_sproutling']);
/** Numbers shown in card text, in order of {placeholders}. */
export function spellNumbers(id, level = 1, arcane = 0) {
  const e = effectOf(id); const c = resolveCard(id); const bonus = (c && c.bonus) || 0;
  const add = (level - 1) + bonus + (NO_ARCANE.has(e) ? 0 : arcane);
  return (BASE[e] || []).map(n => n + add);
}
export function formatSpellText(id, level = 1, arcane = 0) {
  const nums = spellNumbers(id, level, arcane); let i = 0;
  return getCard(id).text.replace(/\{(\d+)\}/g, () => String(nums[i++]));
}
export function spellRange(id, level = 1) { return effectOf(id) === 'blink_step' ? spellNumbers(id, level)[0] : getCard(id).range; }

/** Valid target tiles for a spell given the current battle state. */
export function spellTargets(s, id, level = 1) {
  const c = getCard(id), p = player(s), out = [];
  if (c.target === 'self') return [{ x: p.x, y: p.y }];
  const range = spellRange(id, level);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    const d = Math.abs(x - p.x) + Math.abs(y - p.y);
    if (d === 0 || d > range) continue;
    if (c.los && !lineOfSight(s, p, { x, y })) continue;
    const u = unitAt(s, x, y);
    if (c.target === 'enemy' && !(u && u.side === 'enemy')) continue;
    if (c.target === 'empty' && (u || tileAt(s, x, y) === T.ROCK)) continue;
    if (c.target === 'tile' && tileAt(s, x, y) === T.ROCK) continue;
    out.push({ x, y });
  }
  return out;
}
/** Human-readable reason a spell cannot be cast right now (null = castable). */
export function castBlockReason(s, id) {
  const entry = s.spellbook.find(x => x.id === id);
  if (!entry) return 'Not in your spellbook';
  if (s.phase !== 'player') return 'Not your turn';
  if (s.p.cast[id]) return 'Already cast this turn';
  const c = getCard(id);
  if (s.p.mana < c.cost) return `Needs ${c.cost} mana (you have ${s.p.mana})`;
  if (!spellTargets(s, id, entry.level).length) return c.target === 'enemy' ? 'No foe in range and sight' : 'No valid target';
  return null;
}

export function castSpellEffect(s, ev, id, level, tx, ty) {
  const p = player(s); const n = spellNumbers(id, level, s.p.arcane);
  const target = unitAt(s, tx, ty);
  ev.push({ t: 'spell', id, uid: p.uid, x: tx, y: ty });
  switch (effectOf(id)) {
    case 'ember_dart': dealDamage(s, ev, p, target, n[0], { kind: 'spell' }); break;
    case 'barkskin': addShield(s, ev, p, n[0], 'barkskin'); break;
    case 'sap_surge': addStatus(s, ev, p, 'empowered', n[0]); break;
    case 'mending_rain': heal(s, ev, p, n[0]); if (p.statuses.poison) { p.statuses.poison = 0; ev.push({ t: 'status', uid: p.uid, status: 'poison', value: 0, total: 0 }); } break;
    case 'soul_siphon': { const d = dealDamage(s, ev, p, target, n[0], { kind: 'spell' }); heal(s, ev, p, d, 'siphon'); break; }
    case 'rootsnare': dealDamage(s, ev, p, target, n[0], { kind: 'spell' }); if (alive(target)) addStatus(s, ev, target, 'stunned', 1); break;
    case 'blink_step': { const from = { x: p.x, y: p.y }; p.x = tx; p.y = ty; ev.push({ t: 'teleport', uid: p.uid, from, x: tx, y: ty }); break; }
    case 'call_sproutling': {
      const u = { uid: s.nextUid++, side: 'player', hero: false, defId: 'sproutling', name: 'Sproutling', x: tx, y: ty, hp: n[1], maxHp: n[1],
        power: n[0], toughness: n[1], move: 2, keywords: {}, statuses: {} };
      s.units.push(u); ev.push({ t: 'summon', uid: u.uid, defId: 'sproutling', x: tx, y: ty, by: p.uid, ally: true });
      break;
    }
    case 'venom_mist': for (const e of enemies(s)) if (Math.abs(e.x - tx) <= 1 && Math.abs(e.y - ty) <= 1) addStatus(s, ev, e, 'poison', n[0]); ev.push({ t: 'area', x: tx, y: ty, r: 1, kind: 'mist' }); break;
    case 'starfall': {
      ev.push({ t: 'area', x: tx, y: ty, r: 1, kind: 'star' });
      const hit = enemies(s).filter(e => manhattan(e, { x: tx, y: ty }) <= 1);
      for (const e of hit) dealDamage(s, ev, p, e, e.x === tx && e.y === ty ? n[0] : n[1], { kind: 'spell' });
      break;
    }
    case 'chain_lightning': {
      const chain = [target]; dealDamage(s, ev, p, target, n[0], { kind: 'spell' });
      let last = { x: tx, y: ty };
      for (let i = 0; i < 2; i++) {
        const nxt = enemies(s).filter(e => !chain.includes(e) && manhattan(e, last) <= 2)
          .sort((a, b) => manhattan(a, last) - manhattan(b, last) || a.uid - b.uid)[0];
        if (!nxt) break;
        ev.push({ t: 'chain', from: last, x: nxt.x, y: nxt.y });
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
      if (collided && alive(target)) {
        dealDamage(s, ev, p, target, n[0], { kind: 'collide' });
        if (collided !== 'wall') dealDamage(s, ev, p, collided, n[0], { kind: 'collide' });
      }
      break;
    }
    default: throw new Error('Unknown spell ' + id);
  }
}
