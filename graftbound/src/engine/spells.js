// Spellbook. v0.5 targeting: offensive and area spells reach ANY legal target on the battlefield, with no
// caster-distance or line-of-sight limit. Only 'empty'-target spells (movement, summon placement) keep a range.
// Numbers scale with spell level, the caster's Arcane, and the real card's adaptation bonus.
import { resolveCard } from '../cards/catalog.js';
import { inBounds, unitAt, tileAt, T, manhattan } from '../core/grid.js';
import { dealDamage, heal, addShield, addStatus, enemies, alive, player, enterTiles } from './abilities.js';
import { ENEMIES } from '../data/enemies.js';
import { TERRAIN_RULES } from '../data/terrain.js';
import { drawCards, refillFromGraveyard } from './deck.js';
const getCard = id => resolveCard(id);
export const effectOf = id => { const c = resolveCard(id); return (c && c.effect) || id; };

const BASE = {
  ember_dart: [2], barkskin: [3], sap_surge: [3], gale_push: [2], blink_step: [3], rootsnare: [1],
  venom_mist: [2], mending_rain: [4], wither: [1, 2], firestorm: [2], soul_siphon: [2], chain_lightning: [3, 2], starfall: [4, 2], call_sproutling: [2, 2],
};
const NO_ARCANE = new Set(['sap_surge', 'blink_step', 'call_sproutling']);
export function spellNumbers(id, level = 1, arcane = 0) {
  const e = effectOf(id); const c = resolveCard(id); const bonus = (c && c.bonus) || 0;
  // Printed 1/1 Soldier tokens never scale with level or Arcane.
  if (e === 'call_sproutling' && c?.reference) return [1, 1];
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
export const isDrainLife = id => id === 'mtg:drain-life';
export function spellCost(s, id, xValue = 1) {
  const tax = s ? enemies(s).reduce((a, e) => a + ((ENEMIES[e.defId] && ENEMIES[e.defId].spellTax) || 0), 0) : 0;
  return (s?.p?.freeCast ? 0 : getCard(id).cost + tax) + (isDrainLife(id) ? xValue : 0); // X itself always requires mana.
}
export function spellTargets(s, id, level = 1) {
  const c = getCard(id), p = player(s), out = [];
  if (c.target === 'self') return [{ x: p.x, y: p.y }];
  if(c.target==='creature') return s.units.filter(u=>u.hp>0&&(u.side==='player'||!u.keywords?.hexproof)).map(u=>({x:u.x,y:u.y}));
  if (c.target === 'ally') return s.units.filter(u => u.side === 'player' && u.hp > 0).map(u => ({ x: u.x, y: u.y }));
  if (c.target === 'enemy') return enemies(s).map(e => ({ x: e.x, y: e.y }));
  const range = spellRange(id, level);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    const d = Math.abs(x - p.x) + Math.abs(y - p.y);
    if (c.target === 'tile') { if (tileAt(s, x, y) !== T.ROCK) out.push({ x, y }); continue; }
    if (d === 0 || d > range) continue;
    if (unitAt(s, x, y) || tileAt(s, x, y) === T.ROCK || tileAt(s, x, y) === T.LAVA) continue;
    out.push({ x, y });
  }
  // Two distinct Soldiers require two available summoning tiles.
  if (effectOf(id) === 'call_sproutling' && out.length < 2) return [];
  return out;
}
export function castBlockReason(s, id, xValue = 1) {
  const entry = s.spellbook.find(x => x.id === id);
  if (!entry) return 'Not in your spellbook';
  if (s.phase !== 'player') return 'Not your turn';
  if (s.pendingChoices && s.pendingChoices.length) return 'Resolve Combustible Gearhulk first';
  if (s.p.cast[id]) return 'Already cast this turn';
  if(s.deck?.pendingDiscards>0)return 'Discard a card first';
  if (s.p.silenced === id) return 'Silenced by the Unwritten for this turn';
  if (isDrainLife(id) && (!Number.isSafeInteger(xValue) || xValue < 1 || xValue > 99)) return 'Choose a whole-number X from 1 to 99';
  const cost = spellCost(s, id, xValue);
  if (s.p.mana < cost) return `Needs ${cost} mana (you have ${s.p.mana})${cost > getCard(id).cost ? ' — a Null Warden taxes your spells' : ''}`;
  if (!spellTargets(s, id, entry.level).length) return getCard(id).target === 'enemy' ? 'No foe on the battlefield' : 'No valid target';
  return null;
}
export function castSpellEffect(s, ev, id, level, tx, ty, xValue = 1) {
  const p = player(s); const n = spellNumbers(id, level, s.p.arcane);
  const target = unitAt(s, tx, ty);
  const c = getCard(id);
  const evAt = ev.length; const channel = s.p.channel || 0; const boost = channel + (s.p.conduit || 0);
  if (boost) { for (let i = 0; i < n.length; i++) if (!NO_ARCANE.has(effectOf(id))) n[i] += boost; s.p.channel = 0; s.p.conduit = 0; }   // Channel: this spell +1
  ev.push({ t: 'spell', id, uid: p.uid, x: tx, y: ty, target: target ? target.uid : null, vfx: c.vfx || effectOf(id), channeled: !!channel });
  const spellDamage = { kind: 'spell', element: spellElement(id) };
  if (isDrainLife(id)) n[0] = xValue; // Player-selected paid mana, not a fixed template number.
  switch (effectOf(id)) {
    case 'ember_dart': dealDamage(s, ev, p, target, n[0], spellDamage); break;
    case 'barkskin': addShield(s, ev, target, n[0], 'barkskin'); break;
    case 'sap_surge':
      addStatus(s, ev, target, 'empowered', n[0]);
      target.maxHp+=n[0];target.hp+=n[0];target.toughness+=n[0];target.statuses.temporaryToughness=(target.statuses.temporaryToughness||0)+n[0];
      ev.push({t:'status',uid:target.uid,status:'toughness',value:n[0],total:target.statuses.temporaryToughness});break;
    case 'page_draw': { if (s.deck) { const back = refillFromGraveyard(s.deck); if (back) ev.push({ t: 'deckReshuffle', count: back, uid: p.uid }); for (const card of drawCards(s.deck, 2)) ev.push({ t: 'cardDraw', id: card.id, uid: p.uid }); } break; }
    case 'mending_rain': heal(s, ev, p, n[0]);
      for (const st of ['poison', 'weakened']) if (p.statuses[st]) { p.statuses[st] = 0; ev.push({ t: 'status', uid: p.uid, status: st, value: 0, total: 0 }); }
      break;
    case 'soul_siphon': { const d = dealDamage(s, ev, p, target, n[0], spellDamage); heal(s, ev, p, d, 'siphon'); break; }
    case 'rootsnare': dealDamage(s, ev, p, target, n[0], spellDamage); if (alive(target)) addStatus(s, ev, target, 'stunned', 1); break;
    case 'blink_step': { const from = { x: p.x, y: p.y }; p.x = tx; p.y = ty; ev.push({ t: 'teleport', uid: p.uid, from, x: tx, y: ty }); break; }
    case 'call_sproutling': {
      const second = spellTargets(s, id, level).filter(t => t.x !== tx || t.y !== ty)
        .sort((a, b) => Math.abs(a.x - tx) + Math.abs(a.y - ty) - Math.abs(b.x - tx) - Math.abs(b.y - ty) || a.y - b.y || a.x - b.x)[0];
      if (!second) throw new Error('Raise the Alarm needs two free summoning tiles');
      for (const pos of [{ x: tx, y: ty }, second]) {
        const u = { uid: s.nextUid++, side: 'player', hero: false, defId: 'sproutling', name: c.reference ? 'Soldier' : 'Sproutling', x: pos.x, y: pos.y, hp: n[1], maxHp: n[1],
          power: n[0], toughness: n[1], move: 2, keywords: {}, statuses: {}, token: !!c.reference };
        s.units.push(u); ev.push({ t: 'summon', uid: u.uid, defId: 'sproutling', x: pos.x, y: pos.y, by: p.uid, ally: true });
      }
      break;
    }
    case 'wither': dealDamage(s, ev, p, target, n[0], spellDamage); if (alive(target)) addStatus(s, ev, target, 'weakened', n[1]); break;
    case 'firestorm': ev.push({ t: 'area', x: p.x, y: p.y, r: 99, kind: 'firestorm' }); for (const e of enemies(s)) dealDamage(s, ev, p, e, n[0], spellDamage); break;
    case 'venom_mist': ev.push({ t: 'area', x: tx, y: ty, r: 1, kind: 'mist' }); for (const e of enemies(s)) if (Math.abs(e.x - tx) <= 1 && Math.abs(e.y - ty) <= 1) addStatus(s, ev, e, 'poison', n[0]); break;
    case 'starfall': {
      ev.push({ t: 'area', x: tx, y: ty, r: 1, kind: 'star' });
      for (const e of enemies(s).filter(e => manhattan(e, { x: tx, y: ty }) <= 1)) dealDamage(s, ev, p, e, e.x === tx && e.y === ty ? n[0] : n[1], spellDamage);
      break;
    }
    case 'chain_lightning': {
      const chain = [target]; dealDamage(s, ev, p, target, n[0], spellDamage);
      let last = { x: tx, y: ty };
      for (let i = 0; i < 2; i++) {
        const nxt = enemies(s).filter(e => !chain.includes(e)).sort((a, b) => manhattan(a, last) - manhattan(b, last) || a.uid - b.uid)[0];
        if (!nxt) break;
        ev.push({ t: 'chain', from: last, x: nxt.x, y: nxt.y, target: nxt.uid });
        chain.push(nxt); dealDamage(s, ev, p, nxt, n[1], spellDamage); last = { x: nxt.x, y: nxt.y };
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
  ev[evAt].magnitude = spellMagnitude(ev.slice(evAt + 1), effectOf(id), n);
}

/** v0.8 PRESENTATION metadata: how strong the RESOLVED effect actually was (after armor, shields and kills), so
 *  the renderer can scale the spectacle. The renderer never computes damage; this number is attached to the event
 *  only after the rules resolved it, and nothing in the rules reads it back. Area effects count the biggest hit
 *  fully and the rest at a quarter, so hitting many foes never makes an absurdly large effect. */
export function spellMagnitude(after, effect, nums = []) {
  const hits = after.filter(e => e.t === 'damage' && e.kind === 'spell').map(e => e.amount + (e.blocked || 0)).sort((a, b) => b - a);
  const heal = after.filter(e => e.t === 'heal').reduce((a, e) => a + e.amount, 0);
  const shield = after.filter(e => e.t === 'shield').reduce((a, e) => a + e.amount, 0);
  const status = after.filter(e => e.t === 'status' && e.value > 0).reduce((a, e) => Math.max(a, e.value), 0);
  if (hits.length) return hits[0] + hits.slice(1).reduce((a, x) => a + x * 0.25, 0) + heal * 0.5;
  if (heal || shield) return heal + shield;
  if (effect === 'sap_surge' || effect === 'call_sproutling') return nums[0] || 1;
  return status || nums[0] || 1;
}

/** v0.6: a deliberately small set of spell–terrain interactions. Element comes from the card's VFX identity. */
const ELEMENT_BY_VFX = { drain: 'void', murder:'void', strikeBolt:'lightning', revitalize:'radiant', divination:'tide', disfigure: 'void', poison: 'poison', heal: 'radiant', growth: 'nature', summon: 'radiant', shock: 'lightning', fire: 'fire', fireball: 'fire', flameSlash: 'fire', lightningBolt: 'lightning', spark: 'lightning', chain: 'lightning', frost: 'frost', pyroclasm: 'fire' };
const ELEMENT_BY_EFFECT = { ember_dart: 'fire', starfall: 'fire', chain_lightning: 'lightning', rootsnare: 'frost' };
export function spellElement(id) { const c = getCard(id); return (c && ELEMENT_BY_VFX[c.vfx]) || ELEMENT_BY_EFFECT[effectOf(id)] || null; }
const near = (a, b, r) => Math.abs(a.x - b.x) <= r && Math.abs(a.y - b.y) <= r;
function elementalInteraction(s, ev, id, tx, ty) {
  const el = spellElement(id); if (!el || s.phase === 'lost') return;
  if (el === 'fire') {   // fire burns brambles away (target tile; Fireball/Starfall: the whole blast)
    const r = effectOf(id) === 'starfall' ? 1 : 0; const burned = [];
    for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) if (inBounds(s, x, y) && (tileAt(s, x, y) === T.BRAMBLE || tileAt(s, x, y) === T.SPORES) && (r === 0 || manhattan({ x, y }, { x: tx, y: ty }) <= 1)) { s.terrain[y * s.w + x] = T.FLOOR; burned.push({ x, y }); }
    if (burned.length) ev.push({ t: 'terrain', tiles: burned, kind: 'burn' });
  }
  if (el === 'frost' && inBounds(s, tx, ty) && tileAt(s, tx, ty) === T.LAVA) {   // frost hardens lava for a while
    const i = ty * s.w + tx; s.terrain[i] = T.FLOOR; (s.cooled = s.cooled || []).push({ i, until: s.turn + TERRAIN_RULES.frost.coolRounds - 1 });   // solid this round and the next
    ev.push({ t: 'terrain', tiles: [{ x: tx, y: ty }], kind: 'cool' });
  }
  if (el === 'lightning') {   // lightning near a charged crystal makes it discharge once
    const c = (s.crystals || []).find(k => k.charged && near(k, { x: tx, y: ty }, 1)); if (!c) return;
    c.charged = false; ev.push({ t: 'crystal', x: c.x, y: c.y, kind: 'discharge' });
    for (const e of enemies(s).filter(e => near(e, c, TERRAIN_RULES.crystal.dischargeRadius))) dealDamage(s, ev, player(s), e, TERRAIN_RULES.crystal.dischargeDamage, { kind: 'spell', element: 'lightning' });
  }
}
