// Enemy and ally AI. planEnemy() is pure: used both for intent previews and execution, so what the
// UI shows is what happens. AI sees only the board (no hidden information about the player's hand).
import { reachable, pathTo, distanceField, manhattan, unitAt, inBounds, tileAt, T, DIRS, lineOfSight } from '../core/grid.js';
import { ENEMIES } from '../data/enemies.js';
import { player, enemies, allies, alive, attackExchange, dealDamage, addShield, addStatus, enterTiles, strikePower, has } from './abilities.js';

const cmpTile = (a, b) => a.y - b.y || a.x - b.x;

function stops(s, e) {
  const map = reachable(s, e, e.statuses.rooted ? 0 : e.move);
  return { map, list: [...map.values()].filter(v => v.stop) };
}
function approach(s, e, target, list) {
  const df = distanceField(s, target, has(e, 'flying'));
  return list.slice().sort((a, b) => (df[a.y * s.w + a.x] - df[b.y * s.w + b.x]) || (a.cost - b.cost) || cmpTile(a, b))[0];
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
/** Melee target: nearest player-side unit (hero wins ties). */
function meleeTarget(s, e) {
  const hero = player(s);
  return allies(s).sort((a, b) => manhattan(e, a) - manhattan(e, b) || (b.hero ? 1 : 0) - (a.hero ? 1 : 0) || a.uid - b.uid)[0] || hero;
}

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

  switch (def.ai) {
    case 'melee': {
      const tgt = meleeTarget(s, e);
      if (manhattan(e, tgt) !== 1) {
        const adj = list.filter(t => manhattan(t, tgt) === 1).sort((a, b) => a.cost - b.cost || cmpTile(a, b))[0];
        go(adj || approach(s, e, tgt, list));
      }
      meleeIfAdjacent(tgt);
      break;
    }
    case 'flanker': {
      const tgt = meleeTarget(s, e);
      const mates = enemies(s).filter(o => o !== e && manhattan(o, tgt) === 1);
      const adj = list.filter(t => manhattan(t, tgt) === 1).sort((a, b) => {
        const d2 = (o, t) => (o.x - t.x) ** 2 + (o.y - t.y) ** 2; // Euclidean: 'opposite' beats 'beside'
        const fa = mates.reduce((m, o) => m + d2(o, a), 0), fb = mates.reduce((m, o) => m + d2(o, b), 0);
        return fb - fa || a.cost - b.cost || cmpTile(a, b);
      });
      if (adj.length) go(adj[0]);
      else if (manhattan(e, tgt) !== 1) go(approach(s, e, tgt, list));
      meleeIfAdjacent(tgt);
      break;
    }
    case 'archer': {
      if (e.aim) break;
      const p = hero;
      const aligned = list.filter(t => (t.x === p.x || t.y === p.y)).map(t => {
        const d = manhattan(t, p);
        const dir = [Math.sign(p.x - t.x), Math.sign(p.y - t.y)];
        const line = straightLine(s, t, dir, def.aimRange);
        return { t, d, line, ok: d >= 2 && line.some(l => l.x === p.x && l.y === p.y) };
      }).filter(o => o.ok).sort((a, b) => Math.abs(a.d - 4) - Math.abs(b.d - 4) || a.t.cost - b.t.cost || cmpTile(a.t, b.t));
      if (aligned.length) { go(aligned[0].t); plan.actions.push({ type: 'aim', tiles: aligned[0].line, damage: def.aimDamage }); }
      else {
        const t = list.slice().sort((a, b) => Math.min(Math.abs(a.x - p.x), Math.abs(a.y - p.y)) - Math.min(Math.abs(b.x - p.x), Math.abs(b.y - p.y)) || a.cost - b.cost || cmpTile(a, b))[0];
        go(t); meleeIfAdjacent(meleeTarget(s, { ...e, ...posAfter() }));
      }
      break;
    }
    case 'guardian': {
      const tgt = meleeTarget(s, e);
      const others = enemies(s).filter(a => a !== e);
      if (manhattan(e, tgt) === 1) { /* hold and bite */ }
      else if (others.length) {
        const ward = others.slice().sort((a, b) => manhattan(a, hero) - manhattan(b, hero) || a.uid - b.uid)[0];
        const near = list.filter(t => manhattan(t, ward) === 1).sort((a, b) => manhattan(a, hero) - manhattan(b, hero) || a.cost - b.cost || cmpTile(a, b))[0];
        go(near || approach(s, e, ward, list));
      } else go(approach(s, e, tgt, list));
      plan.actions.push({ type: 'guard', amount: def.guard });
      meleeIfAdjacent(tgt);
      break;
    }
    case 'skirmisher': {
      const p = hero;
      const good = list.filter(t => { const d = manhattan(t, p); return d >= 2 && d <= def.spitRange && lineOfSight(s, t, p); })
        .sort((a, b) => Math.abs(manhattan(a, p) - 3) - Math.abs(manhattan(b, p) - 3) || a.cost - b.cost || cmpTile(a, b));
      if (good.length) { go(good[0]); plan.actions.push({ type: 'spit', target: p.uid, damage: e.power, poison: def.poison }); }
      else { const tgt = meleeTarget(s, e); go(approach(s, e, tgt, list)); meleeIfAdjacent(tgt); }
      break;
    }
    case 'hexer': {
      const p = hero;
      const good = list.filter(t => { const d = manhattan(t, p); return d >= 2 && d <= def.hexRange && lineOfSight(s, t, p); })
        .sort((a, b) => Math.abs(manhattan(a, p) - def.hexRange) - Math.abs(manhattan(b, p) - def.hexRange) || a.cost - b.cost || cmpTile(a, b));
      if (good.length) { go(good[0]); plan.actions.push({ type: 'hex', target: p.uid, damage: 1, weaken: def.weaken }); }
      else { const tgt = meleeTarget(s, e); go(approach(s, e, tgt, list)); meleeIfAdjacent(tgt); }
      break;
    }
    case 'thornmother': {
      if (e.slam) break; // a telegraphed slam resolves first
      if (manhattan(e, hero) > 1) go(approach(s, e, hero, list));
      const phase = (e.cycle || 0) % 2;
      if (!e.barked && e.hp <= e.maxHp / 2) plan.actions.push({ type: 'bark', amount: 5 });
      if (phase === 1 && (e.summons || 0) < 3 && enemies(s).length < 4) plan.actions.push({ type: 'summon', defId: 'hound' });
      else plan.actions.push({ type: 'slam', tiles: slamTiles(s, hero, e.barked || plan.actions.some(a => a.type === 'bark')), damage: slamDamage(def, hero) });
      break; // never makes basic attacks
    }
  }
  return plan;
}

/** Root Slam: 25% of the target's max health (min = base). Telegraphed a full turn ahead, so it is dodgeable. */
export const slamDamage = (def, hero) => Math.max(def.slamDamage, Math.ceil(hero.maxHp * 0.25));
export function slamTiles(s, c, big) {
  const out = [];
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const inner = Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
    const arm = big && ((Math.abs(dx) === 2 && dy === 0) || (Math.abs(dy) === 2 && dx === 0));
    if ((inner || arm) && inBounds(s, c.x + dx, c.y + dy)) out.push({ x: c.x + dx, y: c.y + dy });
  }
  return out;
}

/** Intent summary for UI. */
export function previewIntent(s, e) {
  if (e.aim) return { uid: e.uid, kind: 'fire', damage: e.aim.damage, tiles: e.aim.tiles };
  if (e.slam) return { uid: e.uid, kind: 'slam', damage: e.slam.damage, tiles: e.slam.tiles };
  const plan = planEnemy(s, e); const a = plan.actions;
  const main = a.find(x => x.type === 'attack') || a.find(x => x.type === 'spit') || a.find(x => x.type === 'hex') || a.find(x => x.type === 'aim') || a.find(x => x.type === 'slam') || a.find(x => x.type === 'summon') || a.find(x => x.type === 'guard') || a.find(x => x.type === 'stunned');
  return { uid: e.uid, kind: main ? main.type : 'move', damage: (main && main.damage) || 0, poison: (main && main.poison) || 0, weaken: (main && main.weaken) || 0, tiles: (main && main.tiles) || [], to: plan.to, target: main && main.target };
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
    ev.push({ t: 'slamHit', uid: e.uid, tiles: slam.tiles });
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
  if (plan.to) {
    ev.push({ t: 'move', uid: e.uid, path: plan.path });
    e.x = plan.to.x; e.y = plan.to.y;
    enterTiles(s, ev, e, plan.path);
    if (!alive(e)) return;
  }
  const hero = player(s);
  for (const a of plan.actions) {
    if (!alive(e) || s.phase !== 'enemy') break;
    switch (a.type) {
      case 'attack': { const t = s.units.find(u => u.uid === a.target); if (alive(t) && manhattan(e, t) === 1) attackExchange(s, ev, e, t); break; }
      case 'spit': ev.push({ t: 'spit', uid: e.uid, target: hero.uid }); dealDamage(s, ev, e, hero, a.damage, { kind: 'spit' }); addStatus(s, ev, hero, 'poison', a.poison); break;
      case 'hex': ev.push({ t: 'hex', uid: e.uid, target: hero.uid }); dealDamage(s, ev, e, hero, a.damage, { kind: 'hex' }); addStatus(s, ev, hero, 'weakened', a.weaken); break;
      case 'aim': e.aim = { tiles: a.tiles, damage: a.damage }; ev.push({ t: 'aim', uid: e.uid, tiles: a.tiles }); break;
      case 'guard': for (const al of enemies(s)) if (al !== e && manhattan(al, e) === 1) { const need = a.amount - (al.statuses.shield || 0); if (need > 0) addShield(s, ev, al, need, 'guard'); } break;
      case 'bark': e.barked = true; addShield(s, ev, e, a.amount, 'bark'); ev.push({ t: 'bossPhase', uid: e.uid }); break;
      case 'slam': e.slam = { tiles: slamTiles(s, hero, e.barked), damage: a.damage }; ev.push({ t: 'aim', uid: e.uid, tiles: e.slam.tiles, slam: true }); break;
      case 'summon': {
        const spots = [];
        for (const [dx, dy] of [...DIRS, [1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [-2, 0], [0, 2]]) {
          const x = e.x + dx, y = e.y + dy;
          if (inBounds(s, x, y) && tileAt(s, x, y) !== T.ROCK && !unitAt(s, x, y)) spots.push({ x, y });
        }
        if (spots.length) { const u = spawnEnemy(s, a.defId, spots[0].x, spots[0].y); e.summons = (e.summons || 0) + 1; ev.push({ t: 'summon', uid: u.uid, defId: a.defId, x: u.x, y: u.y, by: e.uid }); }
        break;
      }
    }
  }
  if (ENEMIES[e.defId].ai === 'thornmother') e.cycle = (e.cycle || 0) + 1;
}

/** Summoned allies: walk to the nearest foe and strike it. Acts after the hero's turn, before enemies. */
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
