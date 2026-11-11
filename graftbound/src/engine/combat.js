// Battle state machine. A battle is a plain JSON object (saveable mid-fight). Player actions validate,
// mutate state and return an ordered list of events consumed by the presentation layer.
import { reachable, pathTo, manhattan, lineOfSight, tileAt, T, key } from '../core/grid.js';
import { makeRng } from '../core/rng.js';
import { resolveCard as getCard } from '../cards/catalog.js';
import { player, enemies, allies, alive, has, kv, heal, attackExchange, enterTiles, dealDamage } from './abilities.js';
import { spellTargets, castSpellEffect, castBlockReason, spellCost } from './spells.js';
import { actEnemy, actAlly, spawnEnemy, previewIntent, announcePhase } from './ai.js';
import { STARTING_NAME } from './evolution.js';
import { TERRAIN_RULES } from '../data/terrain.js';

export const BATTLE_VERSION = 4;
export const RIFT_DAMAGE = TERRAIN_RULES.rift.pulseDamage, LAVA_DAMAGE = TERRAIN_RULES.lava.endTurnDamage;

export function createBattle({ evo, stats, spellbook, encounter, seed = 1, heroName = STARTING_NAME, startHp = null, act = 0 }) {
  const s = {
    v: BATTLE_VERSION, w: encounter.w, h: encounter.h, terrain: encounter.terrain.slice(), act,
    name: encounter.name, kind: encounter.kind || 'battle', units: [], nextUid: 1, turn: 0, phase: 'player',
    rng: makeRng(seed), spellbook: spellbook.map(x => ({ ...x })),
    p: { mana: 0, maxMana: stats.maxMana, regen: stats.manaRegen, startMana: stats.startMana, arcane: stats.arcane, moveLeft: 0, attacksLeft: 0, cast: {} },
    // v0.6 scoring counters: only actions ACCEPTED by this engine increment them (rejected input throws first).
    stats: { damageDealt: 0, damageTaken: 0, kills: 0, spellsCast: 0, turns: 0, attacks: 0, actions: 0, moves: 0, tilesMoved: 0, interactions: 0 },
    crystals: (encounter.crystals || []).map(c => ({ x: c.x, y: c.y, charged: true })), cooled: [],
  };
  const hp = startHp == null ? stats.maxHealth : Math.max(1, Math.min(stats.maxHealth, startHp));
  s.units.push({ uid: s.nextUid++, side: 'player', hero: true, defId: 'player', name: heroName, x: encounter.playerStart.x, y: encounter.playerStart.y,
    hp, maxHp: stats.maxHealth, power: stats.power, toughness: stats.toughness, move: stats.move, keywords: { ...evo.keywords }, statuses: {} });
  for (const en of encounter.enemies) spawnEnemy(s, en.defId, en.x, en.y);
  s.openingEvents = startPlayerTurn(s);
  return s;
}
/** Rifts pulse at the end of every even round (telegraphed during that round's player phase). */
export const riftsPulseThisRound = s => s.turn % 2 === 0;
export function hazardPreview(s) {
  if (!riftsPulseThisRound(s)) return [];
  const out = []; for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (tileAt(s, x, y) === T.RIFT) out.push({ x, y });
  return out;
}
export function startPlayerTurn(s) {
  const ev = []; const p = player(s);
  s.turn++; s.phase = 'player'; s.stats.turns = s.turn;
  if (p.suppressed && p.suppressedTurn == null) p.suppressedTurn = s.turn;   // Redaction lasts for exactly this turn
  ev.push({ t: 'turn', phase: 'player', turn: s.turn });
  p.statuses.empowered = 0;
  if (p.statuses.poison > 0) { dealDamage(s, ev, null, p, p.statuses.poison, { kind: 'poison' }); p.statuses.poison--; if (!alive(p)) return ev; }
  if (kv(p, 'regenerate')) heal(s, ev, p, kv(p, 'regenerate'), 'regenerate');
  if (kv(p, 'ward') && (p.statuses.shield || 0) < kv(p, 'ward')) {
    const add = kv(p, 'ward') - (p.statuses.shield || 0); p.statuses.shield = kv(p, 'ward'); ev.push({ t: 'shield', uid: p.uid, amount: add, total: p.statuses.shield, kind: 'ward' });
  }
  const before = s.p.mana;
  s.p.mana = s.turn === 1 ? s.p.startMana : Math.min(s.p.maxMana, s.p.mana + s.p.regen);
  if (tileAt(s, p.x, p.y) === T.LEYLINE) s.p.mana = Math.min(s.p.maxMana + 1, s.p.mana + 1);
  ev.push({ t: 'mana', from: before, to: s.p.mana });
  s.p.moveLeft = p.statuses.stunned ? 0 : p.move - (p.keywords.flying && p.statuses.grounded ? 1 : 0);
  s.p.attacksLeft = s.turn === 1 && has(p, 'haste') ? 2 : 1;
  s.p.cast = {};
  return ev;
}
const ensurePlayerPhase = s => { if (s.phase !== 'player') throw new Error('Not your turn'); };
export function moveOptions(s) {
  if (s.phase !== 'player') return [];
  const p = player(s);
  return [...reachable(s, p, s.p.moveLeft).values()].filter(v => v.stop && v.cost > 0);
}
export function movePlayer(s, x, y) {
  ensurePlayerPhase(s);
  const p = player(s); const map = reachable(s, p, s.p.moveLeft); const n = map.get(key(x, y));
  if (!n || !n.stop || n.cost === 0) throw new Error(s.p.moveLeft ? 'Out of reach' : 'No movement left');
  const path = pathTo(map, x, y); const ev = [{ t: 'move', uid: p.uid, path }];
  p.x = x; p.y = y; s.p.moveLeft -= n.cost;
  s.stats.actions++; s.stats.moves++; s.stats.tilesMoved += n.cost;
  enterTiles(s, ev, p, path);
  return ev;
}
export function canAttack(s, attacker, target) {
  const d = manhattan(attacker, target);
  if (d === 1) return true;
  if (d === 2 && has(attacker, 'reach') && (attacker.x === target.x || attacker.y === target.y)) return lineOfSight(s, attacker, target);
  return false;
}
export function attackTargets(s) {
  if (s.phase !== 'player' || s.p.attacksLeft <= 0) return [];
  const p = player(s);
  return enemies(s).filter(e => canAttack(s, p, e));
}
export function attack(s, targetUid) {
  ensurePlayerPhase(s);
  const p = player(s); const t = s.units.find(u => u.uid === targetUid);
  if (!t || !alive(t) || t.side !== 'enemy') throw new Error('Not a valid target');
  if (s.p.attacksLeft <= 0) throw new Error('You already attacked this turn');
  if (!canAttack(s, p, t)) throw new Error('Out of attack range');
  const ev = []; s.stats.attacks++; s.stats.actions++; attackExchange(s, ev, p, t);
  s.p.attacksLeft--;
  if (!has(p, 'vigilance')) s.p.moveLeft = 0;
  return ev;
}
export function castOptions(s, spellId) {
  if (castBlockReason(s, spellId)) return [];
  const entry = s.spellbook.find(x => x.id === spellId);
  return spellTargets(s, spellId, entry.level);
}
export function cast(s, spellId, x, y) {
  ensurePlayerPhase(s);
  const why = castBlockReason(s, spellId); if (why) throw new Error(why);
  const entry = s.spellbook.find(e => e.id === spellId);
  if (!castOptions(s, spellId).some(t => t.x === x && t.y === y)) throw new Error('Not a valid target for ' + getCard(spellId).name);
  const ev = []; const cost = spellCost(s, spellId);
  s.p.mana -= cost; s.p.cast[spellId] = true; s.stats.spellsCast++; s.stats.actions++;
  ev.push({ t: 'mana', from: s.p.mana + cost, to: s.p.mana });
  castSpellEffect(s, ev, spellId, entry.level, x, y);
  return ev;
}
export function endTurn(s) {
  ensurePlayerPhase(s);
  const ev = []; const p = player(s);
  if (tileAt(s, p.x, p.y) === T.LAVA && !has(p, 'flying')) dealDamage(s, ev, null, p, LAVA_DAMAGE, { kind: 'lava' });
  if (s.phase !== 'player') return ev;
  p.statuses.empowered = 0; p.statuses.weakened = 0; p.statuses.grounded = 0; if (p.statuses.stunned) p.statuses.stunned = 0;
  if (p.suppressed && p.suppressedTurn != null && p.suppressedTurn <= s.turn) { Object.assign(p.keywords, p.suppressed); ev.push({ t: 'restored', uid: p.uid, keyword: Object.keys(p.suppressed)[0] }); p.suppressed = null; p.suppressedTurn = null; }
  s.phase = 'enemy'; ev.push({ t: 'turn', phase: 'enemy', turn: s.turn });
  for (const a of allies(s).filter(u => !u.hero)) { if (s.phase !== 'enemy') break; ev.push({ t: 'enemyTurn', uid: a.uid }); actAlly(s, ev, a); }
  for (const e of s.units.filter(u => u.side === 'enemy' && u.boss)) announcePhase(ev, e);
  for (const e of s.units.filter(u => u.side === 'enemy')) {
    if (!alive(e) || s.phase !== 'enemy') continue;
    if (e.statuses.poison > 0) { dealDamage(s, ev, null, e, e.statuses.poison, { kind: 'poison' }); e.statuses.poison--; if (!alive(e)) continue; }
    ev.push({ t: 'enemyTurn', uid: e.uid });
    actEnemy(s, ev, e);
  }
  if (s.phase === 'enemy' && riftsPulseThisRound(s)) {
    const tiles = hazardPreview({ ...s, turn: s.turn });
    if (tiles.length) { ev.push({ t: 'riftPulse', tiles }); for (const t of tiles) { const u = s.units.find(u => u.hp > 0 && u.x === t.x && u.y === t.y); if (u) dealDamage(s, ev, null, u, RIFT_DAMAGE, { kind: 'rift' }); } }
  }
  if (s.phase === 'enemy') restoreCooled(s, ev);
  if (s.phase === 'enemy') ev.push(...startPlayerTurn(s));
  return ev;
}

/** Frost-cooled lava hardens into walkable floor for a few rounds, then melts back (see data/terrain.js). */
function restoreCooled(s, ev) {
  const back = [];
  s.cooled = (s.cooled || []).filter(c => { if (c.until > s.turn) return true; s.terrain[c.i] = T.LAVA; back.push({ x: c.i % s.w, y: Math.floor(c.i / s.w) }); return false; });
  if (back.length) ev.push({ t: 'terrain', tiles: back, kind: 'lava' });
}

// ── v0.6 battlefield objects: magical crystals ───────────────────────────
export const crystalAt = (s, x, y) => (s.crystals || []).find(c => c.x === x && c.y === y) || null;
/** Charged crystals on or next to the hero can be attuned (one interaction action, once per crystal). */
export function interactOptions(s) {
  if (s.phase !== 'player') return [];
  const p = player(s);
  return (s.crystals || []).filter(c => c.charged && manhattan(p, c) <= 1).map(c => ({ x: c.x, y: c.y, kind: 'crystal' }));
}
export function interact(s, x, y) {
  ensurePlayerPhase(s);
  if (!interactOptions(s).some(o => o.x === x && o.y === y)) throw new Error('Nothing to use there');
  const c = crystalAt(s, x, y); const ev = [];
  c.charged = false; s.stats.actions++; s.stats.interactions++;
  const before = s.p.mana; s.p.mana = Math.min(s.p.maxMana + TERRAIN_RULES.crystal.manaGain, s.p.mana + TERRAIN_RULES.crystal.manaGain);
  ev.push({ t: 'crystal', x, y, kind: 'attune' }, { t: 'mana', from: before, to: s.p.mana });
  return ev;
}
export function intents(s) { return enemies(s).map(e => previewIntent(s, e)); }
export { player, enemies };
