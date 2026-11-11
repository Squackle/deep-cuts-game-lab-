// Enemy and ally AI. planEnemy() is pure: used for intent previews AND execution (what the UI shows is
// what happens). AI sees only the board, never the player's spellbook or rewards.
import { reachable, pathTo, distanceField, manhattan, unitAt, inBounds, tileAt, T, DIRS, lineOfSight } from '../core/grid.js';
import { ENEMIES } from '../data/enemies.js';
import { player, enemies, allies, alive, attackExchange, dealDamage, addShield, addStatus, enterTiles, strikePower, has } from './abilities.js';
import { TERRAIN_RULES } from '../data/terrain.js';

const cmpTile = (a, b) => a.y - b.y || a.x - b.x;
const hazard = (s, t) => { const k = tileAt(s, t.x, t.y); return (k === T.LAVA || k === T.RIFT ? 1 : 0) + (t.hz || 0); };
/** Hazard damage a ground unit would take walking a path (v0.6: enemies understand terrain). */
export function pathDamage(s, u, path) {
  if (has(u, 'flying')) return 0; let d = 0;
  for (let i = 1; i < path.length; i++) { const t = tileAt(s, path[i].x, path[i].y); d += t === T.BRAMBLE ? TERRAIN_RULES.bramble.enterDamage : t === T.LAVA ? TERRAIN_RULES.lava.enterDamage : 0; }
  return d;
}
function stops(s, e) {
  const map = reachable(s, e, e.statuses.rooted ? 0 : e.move);
  // Never choose a destination whose path would kill this unit outright; prefer cheaper-hazard routes on ties.
  const list = [...map.values()].filter(v => v.stop).map(v => { v.hz = pathDamage(s, e, pathTo(map, v.x, v.y)); return v; }).filter(v => v.cost === 0 || v.hz < e.hp);
  return { map, list };
}
const BOSS_PHASES = { thornmother: ['Rootbound', 'Barkskin Awakening', 'The Briar Crown'], matron: ['Smouldering', 'Rising Magma', 'Pyre Unbound'], unwritten: ['The Mirror', 'Redaction', 'The Blank Page'] };
export const bossPhaseOf = e => (e.hp > e.maxHp * 2 / 3 ? 1 : e.hp > e.maxHp / 3 ? 2 : 3);
export const bossPhaseName = (e, ph = bossPhaseOf(e)) => (BOSS_PHASES[ENEMIES[e.defId].ai] || [])[ph - 1] || '';
function approach(s, e, target, list) {
  const df = distanceField(s, target, has(e, 'flying'));
  return list.slice().sort((a, b) => (df[a.y * s.w + a.x] - df[b.y * s.w + b.x]) || (hazard(s, a) - hazard(s, b)) || (a.cost - b.cost) || cmpTile(a, b))[0];
}
function straightLine(s, from, dir, range) {
  const tiles = [];
  for (let i = 1; i <= range; i++) {
    const x = from.x + dir[0] * i, y = from.y + dir[1] * i;
    if (!inBounds(s, x, y) || tileAt(s, x, y) === T.ROCK) break;
    tiles.push({ x, y });
  }
  return tiles;
}
function meleeTarget(s, e) {
  const hero = player(s);
  return allies(s).sort((a, b) => manhattan(e, a) - manhattan(e, b) || (b.hero ? 1 : 0) - (a.hero ? 1 : 0) || a.uid - b.uid)[0] || hero;
}
/** Telegraphed "cross" (row + column through c), used by the Pyre Matron and the Unwritten. */
export function crossTiles(s, c, self) {
  const out = [];
  for (let x = 0; x < s.w; x++) if (!(self && x === self.x && c.y === self.y)) out.push({ x, y: c.y });
  for (let y = 0; y < s.h; y++) if (y !== c.y && !(self && c.x === self.x && y === self.y)) out.push({ x: c.x, y });
  return out.filter(t => tileAt(s, t.x, t.y) !== T.ROCK);
}
export function areaTiles(s, c, r = 1) {
  const out = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (inBounds(s, c.x + dx, c.y + dy) && tileAt(s, c.x + dx, c.y + dy) !== T.ROCK) out.push({ x: c.x + dx, y: c.y + dy });
  return out;
}
export const slamDamage = (def, hero) => Math.max(def.slamDamage || 4, Math.ceil(hero.maxHp * 0.22));
export const bossBlastDamage = hero => Math.max(5, Math.ceil(hero.maxHp * 0.3));
export function slamTiles(s, c, big) {
  const out = [];
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const inner = Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
    const arm = big && ((Math.abs(dx) === 2 && dy === 0) || (Math.abs(dy) === 2 && dx === 0));
    if ((inner || arm) && inBounds(s, c.x + dx, c.y + dy)) out.push({ x: c.x + dx, y: c.y + dy });
  }
  return out;
}
const MIRROR_ORDER = ['flying', 'firstStrike', 'lifelink', 'trample', 'doubleStrike', 'vigilance', 'haste'];

/** Returns { to:{x,y}|null, path, actions:[{type, ...}] } */
export function planEnemy(s, e) {
  const hero = player(s); const def = ENEMIES[e.defId];
  const plan = { to: null, path: [], actions: [] };
  if (!alive(hero)) return plan;
  if (e.statuses.stunned) { plan.actions.push({ type: 'stunned' }); return plan; }
  const { map, list } = stops(s, e);
  const go = t => { if (t && (t.x !== e.x || t.y !== e.y)) { plan.to = { x: t.x, y: t.y }; plan.path = pathTo(map, t.x, t.y); } };
  const posAfter = () => plan.to || { x: e.x, y: e.y };
  const meleeIfAdjacent = tgt => {
    if (tgt && manhattan(posAfter(), tgt) === 1) {
      const ghost = { ...e, ...posAfter() };
      plan.actions.push({ type: 'attack', target: tgt.uid, damage: strikePower({ ...s, units: s.units.map(u => (u === e ? ghost : u)) }, ghost, tgt) });
    }
  };
  const keepRange = (want, max, needLos) => list.filter(t => { const d = manhattan(t, hero); return d >= 2 && d <= max && (!needLos || lineOfSight(s, t, hero)); })
    .sort((a, b) => Math.abs(manhattan(a, hero) - want) - Math.abs(manhattan(b, hero) - want) || hazard(s, a) - hazard(s, b) || a.cost - b.cost || cmpTile(a, b));

  switch (def.ai) {
    case 'melee': {
      const tgt = meleeTarget(s, e);
      if (manhattan(e, tgt) !== 1) {
        const adj = list.filter(t => manhattan(t, tgt) === 1).sort((a, b) => hazard(s, a) - hazard(s, b) || a.cost - b.cost || cmpTile(a, b))[0];
        go(adj || approach(s, e, tgt, list));
      }
      meleeIfAdjacent(tgt); break;
    }
    case 'flanker': {
      const tgt = meleeTarget(s, e);
      const mates = enemies(s).filter(o => o !== e && manhattan(o, tgt) === 1);
      const adj = list.filter(t => manhattan(t, tgt) === 1).sort((a, b) => {
        const d2 = (o, t) => (o.x - t.x) ** 2 + (o.y - t.y) ** 2;
        const fa = mates.reduce((m, o) => m + d2(o, a), 0), fb = mates.reduce((m, o) => m + d2(o, b), 0);
        return fb - fa || hazard(s, a) - hazard(s, b) || a.cost - b.cost || cmpTile(a, b);
      });
      if (adj.length) go(adj[0]); else if (manhattan(e, tgt) !== 1) go(approach(s, e, tgt, list));
      meleeIfAdjacent(tgt); break;
    }
    case 'archer': {
      if (e.aim) break;
      const p = hero;
      const aligned = list.filter(t => (t.x === p.x || t.y === p.y)).map(t => {
        const d = manhattan(t, p); const dir = [Math.sign(p.x - t.x), Math.sign(p.y - t.y)];
        const line = straightLine(s, t, dir, def.aimRange);
        return { t, d, line, ok: d >= 2 && line.some(l => l.x === p.x && l.y === p.y) };
      }).filter(o => o.ok).sort((a, b) => Math.abs(a.d - 4) - Math.abs(b.d - 4) || a.t.cost - b.t.cost || cmpTile(a.t, b.t));
      if (aligned.length) { go(aligned[0].t); plan.actions.push({ type: 'aim', tiles: aligned[0].line, damage: def.aimDamage }); }
      else { const t = list.slice().sort((a, b) => Math.min(Math.abs(a.x - p.x), Math.abs(a.y - p.y)) - Math.min(Math.abs(b.x - p.x), Math.abs(b.y - p.y)) || a.cost - b.cost || cmpTile(a, b))[0]; go(t); meleeIfAdjacent(meleeTarget(s, { ...e, ...posAfter() })); }
      break;
    }
    case 'guardian': {
      const tgt = meleeTarget(s, e);
      const others = enemies(s).filter(a => a !== e);
      if (manhattan(e, tgt) === 1) { /* hold */ }
      else if (others.length) {
        const ward = others.slice().sort((a, b) => manhattan(a, hero) - manhattan(b, hero) || a.uid - b.uid)[0];
        const near = list.filter(t => manhattan(t, ward) === 1).sort((a, b) => manhattan(a, hero) - manhattan(b, hero) || a.cost - b.cost || cmpTile(a, b))[0];
        go(near || approach(s, e, ward, list));
      } else go(approach(s, e, tgt, list));
      plan.actions.push({ type: 'guard', amount: def.guard });
      meleeIfAdjacent(tgt); break;
    }
    case 'skirmisher': {
      const good = keepRange(3, def.spitRange, true);
      if (good.length) { go(good[0]); plan.actions.push({ type: 'spit', target: hero.uid, damage: e.power, poison: def.poison }); }
      else { const tgt = meleeTarget(s, e); go(approach(s, e, tgt, list)); meleeIfAdjacent(tgt); }
      break;
    }
    case 'hexer': {
      const good = keepRange(def.hexRange, def.hexRange, true);
      if (good.length) { go(good[0]); plan.actions.push({ type: 'hex', target: hero.uid, damage: 1, weaken: def.weaken }); }
      else { const tgt = meleeTarget(s, e); go(approach(s, e, tgt, list)); meleeIfAdjacent(tgt); }
      break;
    }
    case 'harpooner': {
      const good = keepRange(4, def.harpoonRange, true);
      const fly = has(hero, 'flying');
      if (good.length) { go(good[0]); plan.actions.push({ type: 'harpoon', target: hero.uid, damage: e.power * (fly ? 2 : 1), ground: fly }); }
      else { const tgt = meleeTarget(s, e); go(approach(s, e, tgt, list)); meleeIfAdjacent(tgt); }
      break;
    }
    case 'seer': {
      if (e.slam) break;
      const good = keepRange(3, 5, false); if (good.length) go(good[0]);
      plan.actions.push({ type: 'slam', tiles: areaTiles(s, hero, 1).filter(t => !(t.x === posAfter().x && t.y === posAfter().y)), damage: def.blastDamage, kind: 'fire' });
      break;
    }
    case 'stalker': {
      const spots = DIRS.map(([dx, dy]) => ({ x: hero.x + dx, y: hero.y + dy }))
        .filter(t => inBounds(s, t.x, t.y) && tileAt(s, t.x, t.y) !== T.ROCK && (!unitAt(s, t.x, t.y) || unitAt(s, t.x, t.y) === e))
        .sort((a, b) => hazard(s, a) - hazard(s, b) || (manhattan(b, e) - manhattan(a, e)) || cmpTile(a, b));
      if (manhattan(e, hero) !== 1 && spots.length) { plan.to = spots[0]; plan.path = [{ x: e.x, y: e.y }, spots[0]]; plan.blink = true; }
      meleeIfAdjacent(hero); break;
    }
    case 'thornmother': {
      if (e.slam) { meleeIfAdjacent(hero); break; }
      if (manhattan(e, hero) > 1) go(approach(s, e, hero, list));
      const phase = (e.cycle || 0) % 2, bp = bossPhaseOf(e);
      if (!e.barked && e.hp <= e.maxHp / 2) plan.actions.push({ type: 'bark', amount: 5 });
      // Counters the build: fliers draw Thornbow archers (arrows hit fliers); ground builds draw hounds.
      const kin = has(hero, 'flying') ? 'archer' : 'hound';
      if (phase === 1 && (e.summons || 0) < 3 && enemies(s).length < 4) plan.actions.push({ type: 'summon', defId: kin, n: 1 });
      else plan.actions.push({ type: 'slam', tiles: slamTiles(s, hero, e.barked || plan.actions.some(a => a.type === 'bark')), damage: slamDamage(def, hero), kind: 'root' });
      if (bp >= 2 && phase === 1 && !has(hero, 'flying')) plan.actions.push({ type: 'briars', n: 2 });   // every other turn from phase 2: briars around ground builds; fire burns them
      meleeIfAdjacent(hero); break;
    }
    case 'matron': {
      if (e.slam) { meleeIfAdjacent(hero); break; }
      if (manhattan(e, hero) > 1) go(approach(s, e, hero, list));
      const phase = (e.cycle || 0) % 2, bp = bossPhaseOf(e);
      if (phase === 0) { plan.actions.push({ type: 'slam', tiles: crossTiles(s, hero, posAfter()), damage: bossBlastDamage(hero), kind: 'fire' }); if (bp === 3) plan.actions.push({ type: 'lava', n: 1 }); }
      else {
        // Counters the build: spell-heavy heroes face a Harpooner (it closes distance); others face bursting Cinderlings.
        const spellHeavy = s.spellbook.length >= 3;
        if (spellHeavy && !enemies(s).some(x => x.defId === 'harpooner')) plan.actions.push({ type: 'summon', defId: 'harpooner', n: 1 });
        else if (enemies(s).filter(x => x.defId === 'cinderling').length < 3) plan.actions.push({ type: 'summon', defId: 'cinderling', n: 2 });
        plan.actions.push({ type: 'lava', n: bp >= 2 ? 3 : 2 });
      }
      meleeIfAdjacent(hero); break;
    }
    case 'unwritten': {
      const copy = MIRROR_ORDER.find(k => hero.keywords[k] && !e.keywords[k]);
      if (copy) plan.actions.push({ type: 'mirror', keyword: copy });
      if (e.slam) { if (manhattan(e, hero) > 1) go(approach(s, e, hero, list)); meleeIfAdjacent(hero); break; }
      if (manhattan(e, hero) > 1) go(approach(s, e, hero, list));
      const phase = (e.cycle || 0) % 2, bp = bossPhaseOf(e);
      if (phase === 0 || bp === 3) plan.actions.push({ type: 'slam', tiles: crossTiles(s, hero, posAfter()), damage: bossBlastDamage(hero), kind: 'void' });
      else if (enemies(s).filter(x => x.defId === 'riftstalker').length < 2) plan.actions.push({ type: 'summon', defId: 'riftstalker', n: 1 });
      // Redaction: from phase 2, TEMPORARILY suppresses one of your abilities during your next turn (never permanent).
      const red = bp >= 2 && phase === 1 && !hero.suppressed && MIRROR_ORDER.concat(['deathtouch']).find(k => hero.keywords[k]);
      if (red) plan.actions.push({ type: 'redact', keyword: red });
      meleeIfAdjacent(hero); break;
    }
  }
  return plan;
}

export function previewIntent(s, e) {
  if (e.aim) return { uid: e.uid, kind: 'fire', damage: e.aim.damage, tiles: e.aim.tiles };
  const plan = planEnemy(s, e); const a = plan.actions;
  if (e.slam) {
    const atk = a.find(x => x.type === 'attack');
    return { uid: e.uid, kind: 'slam', damage: e.slam.damage, tiles: e.slam.tiles, extra: atk ? atk.damage : 0, target: atk && atk.target };
  }
  const main = a.find(x => x.type === 'attack') || a.find(x => x.type === 'harpoon') || a.find(x => x.type === 'spit') || a.find(x => x.type === 'hex') || a.find(x => x.type === 'aim') || a.find(x => x.type === 'slam') || a.find(x => x.type === 'summon') || a.find(x => x.type === 'guard') || a.find(x => x.type === 'stunned');
  return { uid: e.uid, kind: main ? main.type : 'move', damage: (main && main.damage) || 0, poison: (main && main.poison) || 0, weaken: (main && main.weaken) || 0, ground: !!(main && main.ground),
    tiles: (main && main.type === 'aim') ? main.tiles : [], to: plan.to, target: main && main.target, mirror: (a.find(x => x.type === 'mirror') || {}).keyword,
    redact: (a.find(x => x.type === 'redact') || {}).keyword, briars: !!a.find(x => x.type === 'briars'), phase: e.boss ? bossPhaseOf(e) : 0 };
}

function resolvePending(s, ev, e) {
  if (e.aim) {
    const aim = e.aim; e.aim = null;
    ev.push({ t: 'fire', uid: e.uid, tiles: aim.tiles });
    const victim = aim.tiles.map(t => unitAt(s, t.x, t.y)).find(u => u && u !== e);
    if (victim) dealDamage(s, ev, e, victim, aim.damage, { kind: 'arrow' });
    return true;
  }
  if (e.slam) {
    const slam = e.slam; e.slam = null;
    ev.push({ t: 'slamHit', uid: e.uid, tiles: slam.tiles, kind: slam.kind });
    for (const t of slam.tiles) { const u = unitAt(s, t.x, t.y); if (u && u !== e) dealDamage(s, ev, e, u, slam.damage, { kind: 'slam' }); }
    return false;
  }
  return false;
}

export function actEnemy(s, ev, e) {
  if (!alive(e)) return;
  if (e.statuses.stunned) { e.statuses.stunned = 0; ev.push({ t: 'stunnedSkip', uid: e.uid }); return; }
  if (resolvePending(s, ev, e)) return;
  if (s.phase !== 'enemy') return;
  const plan = planEnemy(s, e);
  const hero = player(s);
  for (const a of plan.actions.filter(a => a.type === 'mirror')) { e.keywords[a.keyword] = 1; ev.push({ t: 'mirror', uid: e.uid, keyword: a.keyword }); }
  if (plan.to) {
    if (plan.blink) { const from = { x: e.x, y: e.y }; e.x = plan.to.x; e.y = plan.to.y; ev.push({ t: 'teleport', uid: e.uid, from, x: e.x, y: e.y, kind: 'rift' }); }
    else { ev.push({ t: 'move', uid: e.uid, path: plan.path }); e.x = plan.to.x; e.y = plan.to.y; enterTiles(s, ev, e, plan.path); }
    if (!alive(e)) return;
  }
  for (const a of plan.actions) {
    if (!alive(e) || s.phase !== 'enemy') break;
    switch (a.type) {
      case 'attack': { const t = s.units.find(u => u.uid === a.target); if (alive(t) && manhattan(e, t) === 1) attackExchange(s, ev, e, t); break; }
      case 'spit': ev.push({ t: 'spit', uid: e.uid, target: hero.uid }); dealDamage(s, ev, e, hero, a.damage, { kind: 'spit' }); addStatus(s, ev, hero, 'poison', a.poison); break;
      case 'hex': ev.push({ t: 'hex', uid: e.uid, target: hero.uid }); dealDamage(s, ev, e, hero, a.damage, { kind: 'hex' }); addStatus(s, ev, hero, 'weakened', a.weaken); break;
      case 'harpoon': ev.push({ t: 'harpoon', uid: e.uid, target: hero.uid }); dealDamage(s, ev, e, hero, a.damage, { kind: 'harpoon' }); if (a.ground && alive(hero)) addStatus(s, ev, hero, 'grounded', 1); break;
      case 'aim': e.aim = { tiles: a.tiles, damage: a.damage }; ev.push({ t: 'aim', uid: e.uid, tiles: a.tiles }); break;
      case 'guard': for (const al of enemies(s)) if (al !== e && manhattan(al, e) === 1) { const need = a.amount - (al.statuses.shield || 0); if (need > 0) addShield(s, ev, al, need, 'guard'); } break;
      case 'bark': e.barked = true; addShield(s, ev, e, a.amount, 'bark'); ev.push({ t: 'bossPhase', uid: e.uid, text: 'Bark hardens over her wounds' }); break;
      case 'slam': {
        const tiles = ENEMIES[e.defId].ai === 'thornmother' ? slamTiles(s, hero, e.barked) : ENEMIES[e.defId].ai === 'seer' ? areaTiles(s, hero, 1).filter(t => !(t.x === e.x && t.y === e.y)) : crossTiles(s, hero, e);
        e.slam = { tiles, damage: a.damage, kind: a.kind }; ev.push({ t: 'aim', uid: e.uid, tiles, slam: true, kind: a.kind }); break;
      }
      case 'briars': {
        const cand = areaTiles(s, hero, 1).filter(t => tileAt(s, t.x, t.y) === T.FLOOR && !unitAt(s, t.x, t.y)).sort(cmpTile).slice(0, a.n);
        for (const t of cand) s.terrain[t.y * s.w + t.x] = T.BRAMBLE;
        if (cand.length) ev.push({ t: 'terrain', tiles: cand, kind: 'bramble' });
        break;
      }
      case 'redact': if (hero.keywords[a.keyword]) { hero.suppressed = { [a.keyword]: hero.keywords[a.keyword] }; delete hero.keywords[a.keyword]; ev.push({ t: 'redact', uid: e.uid, keyword: a.keyword }); } break;
      case 'lava': {
        const cand = areaTiles(s, hero, 2).filter(t => tileAt(s, t.x, t.y) === T.FLOOR && !unitAt(s, t.x, t.y) && !(t.x === hero.x && t.y === hero.y))
          .sort((p, q) => manhattan(p, hero) - manhattan(q, hero) || cmpTile(p, q)).slice(0, a.n);
        for (const t of cand) s.terrain[t.y * s.w + t.x] = T.LAVA;
        if (cand.length) ev.push({ t: 'terrain', tiles: cand, kind: 'lava' });
        break;
      }
      case 'summon': {
        for (let k = 0; k < (a.n || 1); k++) {
          const spots = [];
          for (const [dx, dy] of [...DIRS, [1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
            const x = e.x + dx, y = e.y + dy;
            if (inBounds(s, x, y) && tileAt(s, x, y) !== T.ROCK && tileAt(s, x, y) !== T.LAVA && !unitAt(s, x, y)) spots.push({ x, y });
          }
          if (!spots.length) break;
          const u = spawnEnemy(s, a.defId, spots[0].x, spots[0].y); u.summoned = true; e.summons = (e.summons || 0) + 1;
          ev.push({ t: 'summon', uid: u.uid, defId: a.defId, x: u.x, y: u.y, by: e.uid });
        }
        break;
      }
    }
  }
  if (['thornmother', 'matron', 'unwritten'].includes(ENEMIES[e.defId].ai)) { e.cycle = (e.cycle || 0) + 1; announcePhase(ev, e); }
}

/** Phase transitions are announced once, deterministically, from health thresholds (66% / 33%). */
export function announcePhase(ev, e) {
  if (!alive(e) || !e.boss) return; const ph = bossPhaseOf(e);
  if ((e.phaseSeen || 1) < ph) { e.phaseSeen = ph; ev.push({ t: 'bossPhase', uid: e.uid, phase: ph, text: bossPhaseName(e, ph) }); }
}

export function actAlly(s, ev, a) {
  if (!alive(a) || s.phase !== 'enemy') return;
  const foes = enemies(s); if (!foes.length) return;
  const tgt = foes.slice().sort((x, y) => manhattan(a, x) - manhattan(a, y) || x.uid - y.uid)[0];
  if (manhattan(a, tgt) !== 1) {
    const { map, list } = stops(s, a);
    const t = list.filter(v => manhattan(v, tgt) === 1).sort((x, y) => x.cost - y.cost || cmpTile(x, y))[0] || approach(s, a, tgt, list);
    if (t && (t.x !== a.x || t.y !== a.y)) { const path = pathTo(map, t.x, t.y); ev.push({ t: 'move', uid: a.uid, path }); a.x = t.x; a.y = t.y; enterTiles(s, ev, a, path); }
  }
  if (alive(a) && alive(tgt) && manhattan(a, tgt) === 1) attackExchange(s, ev, a, tgt);
}

export function spawnEnemy(s, defId, x, y) {
  const d = ENEMIES[defId];
  const u = { uid: s.nextUid++, side: 'enemy', defId, name: d.name, x, y, hp: d.toughness, maxHp: d.toughness, power: d.power,
    toughness: d.toughness, move: d.move, keywords: { ...(d.keywords || {}) }, statuses: {}, legendary: !!d.legendary, boss: !!d.boss };
  s.units.push(u);
  return u;
}
