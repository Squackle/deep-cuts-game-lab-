// Enemy and ally AI. planEnemy() is pure: used for intent previews AND execution (what the UI shows is
// what happens). AI sees only the board, never the player's spellbook or rewards.
import { reachable, pathTo, manhattan, unitAt, inBounds, tileAt, T, DIRS, lineOfSight } from '../core/grid.js';
import { ENEMIES } from '../data/enemies.js';
import { BOSS_BY_ID } from '../data/legendary.js';
import { player, enemies, allies, alive, attackExchange, dealDamage, declareVictory, damageBatch, addShield, addStatus, enterTiles, strikePower, has } from './abilities.js';
import { TERRAIN_RULES } from '../data/terrain.js';
import { resolveCard } from '../cards/catalog.js';
const spellCostOf = id => (resolveCard(id) || { cost: 0 }).cost;
import { refreshTribalBonuses, checkStateBasedDeath, smashRock } from './abilities.js';
import { attachAura,detachAura,detachEquipment } from './attachments.js';
import { registerSpawn, scarabUpkeep, scarabTargets, scarabReanimate } from './printed-triggers.js';

const cmpTile = (a, b) => a.y - b.y || a.x - b.x;
const hazard = (s, t) => { const k = tileAt(s, t.x, t.y); return ([T.LAVA, T.RIFT, T.UNSTABLE, T.SPORES, T.CRUMBLE].includes(k) ? 1 : 0) + (t.hz || 0); };
/** Hazard damage a ground unit would take walking a path (v0.6: enemies understand terrain). */
export function pathDamage(s, u, path) {
  if (has(u, 'flying')) return 0; let d = 0;
  for (let i = 1; i < path.length; i++) { const t = tileAt(s, path[i].x, path[i].y); d += t === T.BRAMBLE ? TERRAIN_RULES.bramble.enterDamage : t === T.LAVA ? TERRAIN_RULES.lava.enterDamage : t === T.CRUMBLE ? TERRAIN_RULES.crumble.enterDamage : t === T.SPORES ? TERRAIN_RULES.spores.poisonOnEnter : 0; }
  return d;
}
function stops(s, e) {
  const map = reachable(s, e, e.statuses.rooted ? 0 : Math.max(0, e.move - (e.statuses.chilled ? TERRAIN_RULES.ice.slowNextMovement : 0)));
  // Never choose a destination whose path would kill this unit outright; prefer cheaper-hazard routes on ties.
  const list = [...map.values()].filter(v => v.stop).map(v => { v.hz = pathDamage(s, e, pathTo(map, v.x, v.y)); return v; }).filter(v => v.cost === 0 || v.hz < e.hp);
  // Do NOT discard dangerous but survivable endpoints. That can leave only the origin
  // in "safe" candidates, so melee foes appear to skip their turn beside a hazard.
  // A hazard-weighted route field below selects detours over risky shortcuts.
  return { map, list };
}
const BOSS_PHASES = { legendary: ['Awakening', 'Reckoning', 'Last Stand'], thornmother: ['Rootbound', 'Barkskin Awakening', 'The Briar Crown'], matron: ['Smouldering', 'Rising Magma', 'Pyre Unbound'], unwritten: ['The Mirror', 'Redaction', 'The Blank Page'] };
export const bossPhaseOf = e => (e.hp > e.maxHp * 2 / 3 ? 1 : e.hp > e.maxHp / 3 ? 2 : 3);
export const bossPhaseName = (e, ph = bossPhaseOf(e)) => (BOSS_PHASES[ENEMIES[e.defId].ai] || [])[ph - 1] || '';
/** Weighted cost of entering a tile for tactical routing, not damage application.
 *  A survivable hazard is expensive but never treated as an impassable wall.
 *  Pending pulse hazards still count even for flying enemies. */
export function routeRisk(s, unit, t) {
  const ground = !has(unit, 'flying');
  switch (tileAt(s, t.x, t.y)) {
    case T.LAVA: return ground ? 12 : 0;
    case T.RIFT: return 9;
    case T.UNSTABLE: return 8;
    case T.SPORES: return ground ? 7 : 0;
    case T.BRAMBLE: return ground ? 5 : 0;
    case T.CRUMBLE: return ground ? 5 : 0;
    default: return 0;
  }
}
/** Reverse Dijkstra: path cost remaining from a tile to the target. Ignores temporary
 *  unit occupancy (as the old distance field did), but evaluates terrain risks.
 *  Loop bounds are fixed by the authored board size, with deterministic ties. */
export function hazardDistanceField(s, target, unit) {
  const n = s.w * s.h, dist = new Array(n).fill(Infinity), seen = new Uint8Array(n);
  if (!inBounds(s, target.x, target.y)) return dist;
  dist[target.y * s.w + target.x] = 0;
  for (let visit = 0; visit < n; visit++) {
    let idx = -1;
    for (let i = 0; i < n; i++) if (!seen[i] && (idx < 0 || dist[i] < dist[idx])) idx = i;
    if (idx < 0 || !Number.isFinite(dist[idx])) break;
    seen[idx] = 1;
    const x = idx % s.w, y = Math.floor(idx / s.w);
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(s, nx, ny) || (!has(unit, 'flying') && tileAt(s, nx, ny) === T.ROCK)) continue;
      const ni = ny * s.w + nx;
      const candidate = dist[idx] + 1 + routeRisk(s, unit, { x, y });
      if (candidate < dist[ni]) dist[ni] = candidate;
    }
  }
  return dist;
}
/** v1.5.0: should this ground unit smash an adjacent rock to reach target? Only when every route is blocked or is at
 * least 4 steps (or a lethal hazard detour) longer than the straight route through rock, and only a rock that lies on
 * that straight route. Never targets irrelevant rocks; never chosen when an open route of similar length exists. */
export function smashChoice(s, u, target) {
  if (!target || !alive(u) || has(u, 'flying') || manhattan(u, target) <= 1) return null;
  const adj = DIRS.map(([dx, dy]) => ({ x: u.x + dx, y: u.y + dy })).filter(t => inBounds(s, t.x, t.y) && tileAt(s, t.x, t.y) === T.ROCK);
  if (!adj.length) return null;
  const n = s.w * s.h, free = new Array(n).fill(Infinity), q = [target]; free[target.y * s.w + target.x] = 0;
  while (q.length) { const c = q.shift(); const d = free[c.y * s.w + c.x]; for (const [dx, dy] of DIRS) { const x = c.x + dx, y = c.y + dy; if (!inBounds(s, x, y)) continue; const i = y * s.w + x; if (free[i] > d + 1) { free[i] = d + 1; q.push({ x, y }); } } }
  const here = free[u.y * s.w + u.x];
  const blocked = hazardDistanceField(s, target, u)[u.y * s.w + u.x];
  if (Number.isFinite(blocked) && blocked < here + 4) return null;
  return adj.filter(r => free[r.y * s.w + r.x] === here - 1).sort(cmpTile)[0] || null;
}
function approach(s, e, target, list, map = null) {
  if (!list.length) return null;
  const df = hazardDistanceField(s, target, e);
  const origin = df[e.y * s.w + e.x];
  const score = t => df[t.y * s.w + t.x] + (map ? pathTo(map, t.x, t.y).slice(1).reduce((risk, p) => risk + routeRisk(s, e, p), 0) : routeRisk(s, e, t));
  // The origin is a legal fallback when the unit is truly trapped or all routes are
  // lethal. Otherwise, taking a safe detour (even one away from the hero initially)
  // should beat idling, and a nonlethal hazard crossing should remain possible.
  const options = list.slice().sort((a, b) => score(a) - score(b) || (hazard(s, a) - hazard(s, b)) || (b.cost - a.cost) || cmpTile(a, b));
  const best = options[0];
  // Traversing unavoidable lava can leave the total weighted cost unchanged:
  // we have paid the hazard cost but are now closer to the target. Treat that
  // tie as progress instead of idling forever on the near side of the lava.
  const progresses = best && df[best.y * s.w + best.x] < origin;
  return best && (score(best) < origin || (score(best) <= origin && progresses) || !Number.isFinite(origin))
    ? best : list.find(t => t.x === e.x && t.y === e.y) || best;
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
/** Visible-board tactical threat. Nearby creatures that can kill the archer on
 * their next turn outrank the hero, but targets still obey range/line of sight. */
export function rangedPriority(s,e,range=Infinity,from=e,los=false) {
  const candidates=allies(s).filter(alive).filter(u=>manhattan(from,u)<=range&&(!los||lineOfSight(s,from,u)));
  candidates.sort((a,b)=>{
    const score=u=>{const d=manhattan(e,u);const canReach=d<=Math.max(1,(u.move||0)+1);
      const fatal=(u.power+(u.statuses?.empowered||0)-(u.statuses?.weakened||0))>=e.hp;
      return canReach&&fatal?0:canReach?1:2;};
    return score(a)-score(b)||manhattan(from,a)-manhattan(from,b)||Number(a.hero)-Number(b.hero)||a.uid-b.uid;
  });
  return candidates[0]||null;
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
/** Toxrill's actual static -1/-1 per slime counter triggers at the beginning of
 * EVERY player's end step. Never count this as a once-per-AI-turn attack. */
export function resolveToxrillEndStep(s, ev) {
  const boss=enemies(s).find(e=>e.defId==='toxrill');
  if(!boss)return 0;
  let affected=0;
  for(const u of allies(s).filter(alive)) {
    u.slime=(u.slime||0)+1;
    u.power=Math.max(0,u.power-1);u.toughness=Math.max(0,u.toughness-1);
    ev.push({t:'slimeCounter',uid:u.uid,by:boss.uid,total:u.slime,phase:s.phase});
    affected++;
    // Apply toughness-based death BEFORE clamping life to zero, otherwise
    // checkStateBasedDeath's alive guard silently skips defeat and Slug triggers.
    if(u.toughness<=0){checkStateBasedDeath(s,ev,u);continue;}
    u.maxHp=Math.max(0,u.maxHp-1);u.hp=Math.min(u.hp,u.maxHp);
  }
  return affected;
}
export function planEnemy(s, e) {
  const hero = player(s); const def = ENEMIES[e.defId];
  const plan = { to: null, path: [], actions: [] };
  if (!alive(hero)) return plan;
  if (e.statuses.stunned) { plan.actions.push({ type: 'stunned' }); return plan; }
  const { map, list } = stops(s, e);
  const go = t => { if (t && (t.x !== e.x || t.y !== e.y)) { plan.to = { x: t.x, y: t.y }; plan.path = pathTo(map, t.x, t.y); } };
  if (!BOSS_BY_ID[e.defId] && !e.boss && !['archer', 'harpooner', 'seer', 'hexer', 'skirmisher', 'stalker', 'thornmother', 'matron', 'unwritten', 'legendary'].includes(def?.ai)) { const r = smashChoice(s, e, meleeTarget(s, e)); if (r) { plan.actions.push({ type: 'smash', x: r.x, y: r.y }); return plan; } }
  const posAfter = () => plan.to || { x: e.x, y: e.y };
  const meleeIfAdjacent = tgt => {
    if (tgt && manhattan(posAfter(), tgt) === 1) {
      const ghost = { ...e, ...posAfter() };
      plan.actions.push({ type: 'attack', target: tgt.uid, damage: strikePower({ ...s, units: s.units.map(u => (u === e ? ghost : u)) }, ghost, tgt) });
    }
  };
  const keepRange = (want, max, needLos, target=hero) => list.filter(t => { const d = manhattan(t, target); return d >= 2 && d <= max && (!needLos || lineOfSight(s, t, target)); })
    .sort((a, b) => Math.abs(manhattan(a, target) - want) - Math.abs(manhattan(b, target) - want) || hazard(s, a) - hazard(s, b) || a.cost - b.cost || cmpTile(a, b));

  if (BOSS_BY_ID[e.defId]) {
    // All six legendary creatures participate in tactical combat. Their
    // printed activated/triggered abilities are ADDITIONAL actions, not a
    // replacement for movement and basic attacks (unless they tap to activate).
    // Prefer the closest live player-side unit, including summoned Soldiers.
    const target = meleeTarget(s, e);
    if (target && manhattan(e, target) !== 1) {
      // When within reach, occupy a free adjacent tile to attack this turn.
      // Otherwise advance along the same deterministic hazard-aware route as
      // other melee foes. Never move onto a unit or an unsafe lethal tile.
      const attackStops = list.filter(t => manhattan(t, target) === 1)
        .sort((a,b)=>a.hz-b.hz || a.cost-b.cost || cmpTile(a,b));
      go(attackStops[0] || approach(s,e,target,list,map));
    }
    const adjacent = !!target && manhattan(posAfter(), target) === 1;
    const attackTarget = () => { if (adjacent) meleeIfAdjacent(target); };
    switch (e.defId) {
      case 'nemata': {
        const mana = Math.min(8, (e.bossMana ?? 3) + 1);
        const sap = enemies(s).filter(u=>u.defId==='saproling');
        if (mana >= 3) plan.actions.push({ type:'legendarySummon', defId:'saproling', n:1, mana:3 });
        if (sap.length >= 2 && e.cycle % 3 === 2) plan.actions.push({ type:'nemataPump' });
        attackTarget(); // Nemata's Saproling activation does not tap Nemata.
        break;
      }
      case 'arasta': { attackTarget(); break; }
      case 'drakuseth': {
        // Flame trigger occurs on an actual attack, never as a free ranged spell.
        if (adjacent) { plan.actions.push({ type:'drakusethFlames' }); attackTarget(); }
        break;
      }
      case 'krenko': {
        // Krenko's printed token ability TAPS it. Keep the signature Goblin
        // summons, but alternate with an untapped melee turn so Krenko can
        // actually fight rather than remaining a stationary token factory.
        if ((e.cycle || 0) % 2 === 0) {
          const count = enemies(s).filter(u => (u.creatureTypes || ENEMIES[u.defId]?.tribe || (u.defId === 'goblin' ? 'Goblin' : '')).split(/\s+/).includes('Goblin')).length;
          plan.actions.push({ type:'legendarySummon', defId:'goblin', n:count });
        } else attackTarget();
        break;
      }
      case 'scarab': {
        // {2}{U}{B}: reanimate from either graveyard; this is not a tap ability.
        const pool = scarabTargets(s, e).sort((a,b)=>(ENEMIES[b.defId].power-ENEMIES[a.defId].power)||((a.uid||0)-(b.uid||0))||(a.defId<b.defId?-1:1));
        if (pool.length && (e.bossMana ?? 3) + 1 >= 4) plan.actions.push({ type:'scarabReanimate', target:pool[0], mana:4 });
        attackTarget(); break;
      }
      case 'toxrill': { attackTarget(); break; }
    }
    return plan;
  }
  switch (def.ai) {
    case 'caterpillar': {
      // {1}{G}, sacrifice: destroy an artifact or enchantment. The enemy may
      // target the hero's Equipment separately from Hexproof on the bearer.
      const hero=player(s);
      if(hero.equipment?.length || hero.auras?.length)
        plan.actions.push({type:'realCaterpillar',id:hero.equipment?.[0]||hero.auras[0]});
      else {if(manhattan(e,hero)!==1)go(approach(s,e,hero,list,map));meleeIfAdjacent(hero);}
      break;
    }
    case 'spikeshot': {
      // {R},{T}: deal damage equal to its power to any target. No anti-flying bonus.
      if(!e.tapped)plan.actions.push({type:'realPing',target:(rangedPriority(s,e)||hero).uid,damage:Math.max(0,e.power),name:'Spikeshot Goblin'});
      break;
    }
    case 'alchemist': {
      // Defender; {T}: 1 damage to each opponent. With one opponent this means the hero.
      if(!e.tapped)plan.actions.push({type:'realPing',target:hero.uid,damage:1,name:'Thermo-Alchemist'});
      break;
    }
    case 'blightcaster': {
      // The enemy actually casts One with the Wind, triggering Blightcaster's -2/-2.
      const ally=enemies(s).find(u=>u!==e&&!u.auras?.includes('mtg:one-with-the-wind'));
      if(ally && !(e.spellUsed||false))plan.actions.push({type:'realBlightcaster',uid:ally.uid});
      if(manhattan(e,hero)!==1)go(approach(s,e,hero,list,map));
      meleeIfAdjacent(hero);
      break;
    }
    case 'escort': {
      const friends=enemies(s).filter(u=>u!==e);
      const ally=friends.slice().sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.uid-b.uid)[0];
      if(ally && manhattan(e,ally)>1)go(approach(s,e,ally,list,map));
      meleeIfAdjacent(hero);
      break;
    }
    case 'alpha': {
      if(manhattan(e,hero)!==1)go(approach(s,e,hero,list,map));
      meleeIfAdjacent(hero);break;
    }
    case 'melee': {
      const tgt = meleeTarget(s, e);
      if (manhattan(e, tgt) !== 1) {
        const adj = list.filter(t => manhattan(t, tgt) === 1).sort((a, b) => hazard(s, a) - hazard(s, b) || a.cost - b.cost || cmpTile(a, b))[0];
        go(adj || approach(s, e, tgt, list, map));
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
      if (adj.length) go(adj[0]); else if (manhattan(e, tgt) !== 1) go(approach(s, e, tgt, list, map));
      meleeIfAdjacent(tgt); break;
    }
    case 'archer': {
      if(e.aim)break;
      // Evaluate all legal victims; immediate lethal retaliation is the highest
      // priority, not the hero's identity. Plan and intent share this routine.
      const victims=allies(s).filter(alive).sort((a,b)=>{
        const priority=u=>manhattan(e,u)<=Math.max(1,(u.move||0)+1)&&u.power>=e.hp?0:1;
        return priority(a)-priority(b)||manhattan(e,a)-manhattan(e,b)||Number(a.hero)-Number(b.hero)||a.uid-b.uid;
      });
      let choice=null;
      for(const target of victims){
        const aligned=list.filter(t=>t.x===target.x||t.y===target.y).map(t=>{
          const d=manhattan(t,target),dir=[Math.sign(target.x-t.x),Math.sign(target.y-t.y)];
          const line=straightLine(s,t,dir,def.aimRange);
          return {t,d,line,ok:d>=2&&line.some(l=>l.x===target.x&&l.y===target.y)};
        }).filter(o=>o.ok).sort((a,b)=>Math.abs(a.d-3)-Math.abs(b.d-3)||a.t.cost-b.t.cost||cmpTile(a.t,b.t));
        if(aligned.length){choice=aligned[0];break;}
      }
      if(choice){go(choice.t);plan.actions.push({type:'aim',tiles:choice.line,damage:def.aimDamage});}
      else{const p=victims[0]||hero;const t=list.slice().sort((a,b)=>manhattan(a,p)-manhattan(b,p)||a.cost-b.cost||cmpTile(a,b))[0];go(t);meleeIfAdjacent(meleeTarget(s,{...e,...posAfter()}));}
      break;
    }
    case 'guardian': {
      const tgt = meleeTarget(s, e);
      const others = enemies(s).filter(a => a !== e);
      if (manhattan(e, tgt) === 1) { /* hold */ }
      else if (others.length) {
        const ward = others.slice().sort((a, b) => manhattan(a, hero) - manhattan(b, hero) || a.uid - b.uid)[0];
        const near = list.filter(t => manhattan(t, ward) === 1).sort((a, b) => manhattan(a, hero) - manhattan(b, hero) || a.cost - b.cost || cmpTile(a, b))[0];
        go(near || approach(s, e, ward, list, map));
      } else go(approach(s, e, tgt, list, map));
      plan.actions.push({ type: 'guard', amount: def.guard });
      meleeIfAdjacent(tgt); break;
    }
    case 'skirmisher': {
      const target=rangedPriority(s,e,def.spitRange)||hero;
      const good = keepRange(3, def.spitRange, true,target);
      if (good.length) { go(good[0]); plan.actions.push({ type: 'spit', target: target.uid, damage: e.power, poison: def.poison }); }
      else { const tgt = meleeTarget(s, e); go(approach(s, e, tgt, list, map)); meleeIfAdjacent(tgt); }
      break;
    }
    case 'hexer': {
      const target=rangedPriority(s,e,def.hexRange)||hero;
      const good = keepRange(def.hexRange, def.hexRange, true,target);
      if (good.length) { go(good[0]); plan.actions.push({ type: 'hex', target: target.uid, damage: 1, weaken: def.weaken });
        // Periodic territory control has visible terrain that players can avoid next turn.
        if ((e.cycle || 0) % 3 === 2) plan.actions.push({ type: e.defId === 'shardling' ? 'fracture' : 'sporefield', n: 1 });
      }
      else { const tgt = meleeTarget(s, e); go(approach(s, e, tgt, list, map)); meleeIfAdjacent(tgt); }
      break;
    }
    case 'harpooner': {
      const target=rangedPriority(s,e,def.harpoonRange)||hero;
      const good = keepRange(4, def.harpoonRange, true,target);
      const fly = has(target, 'flying');
      if (good.length) { go(good[0]); plan.actions.push({ type: 'harpoon', target: target.uid, damage: e.power * (fly ? 2 : 1), ground: fly }); }
      else { const tgt = meleeTarget(s, e); go(approach(s, e, tgt, list, map)); meleeIfAdjacent(tgt); }
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
      if (manhattan(e, hero) > 1) go(approach(s, e, hero, list, map));
      const phase = (e.cycle || 0) % 2, bp = bossPhaseOf(e);
      const ad = s.adapt || {};   // v0.8: against a build far above the curve she hardens earlier and calls more kin
      if (!e.barked && e.hp <= e.maxHp * (ad.surge ? 2 / 3 : 1 / 2)) plan.actions.push({ type: 'bark', amount: ad.surge ? 7 : 5 });
      // Counters the build: fliers draw Thornbow archers (arrows hit fliers); ground builds draw hounds.
      const kin = has(hero, 'flying') ? 'archer' : 'hound';
      if (phase === 1 && (e.summons || 0) < (ad.surge ? 4 : 3) && enemies(s).length < 4) plan.actions.push({ type: 'summon', defId: kin, n: 1 });
      else plan.actions.push({ type: 'slam', tiles: slamTiles(s, hero, e.barked || plan.actions.some(a => a.type === 'bark')), damage: slamDamage(def, hero), kind: 'root' });
      if (bp >= 2 && phase === 1 && !has(hero, 'flying')) plan.actions.push({ type: 'briars', n: 2 });
      if (bp === 3 && (e.cycle || 0) % 3 === 2) plan.actions.push({ type: 'sporefield', n: 2 });   // every other turn from phase 2: briars around ground builds; fire burns them
      meleeIfAdjacent(hero); break;
    }
    case 'matron': {
      if (e.slam) { meleeIfAdjacent(hero); break; }
      if (manhattan(e, hero) > 1) go(approach(s, e, hero, list, map));
      const phase = (e.cycle || 0) % 2, bp = bossPhaseOf(e);
      if (phase === 0) { plan.actions.push({ type: 'slam', tiles: crossTiles(s, hero, posAfter()), damage: bossBlastDamage(hero), kind: 'fire' }); if (bp === 3) plan.actions.push({ type: 'lava', n: 1 }); }
      else {
        // Counters the build: spell-heavy heroes face a Harpooner (it closes distance); others face bursting Cinderlings.
        const spellHeavy = s.spellbook.length >= 3, ad = s.adapt || {};
        if ((spellHeavy || has(hero, 'flying')) && !enemies(s).some(x => x.defId === 'harpooner')) plan.actions.push({ type: 'summon', defId: 'harpooner', n: 1 });
        else if (enemies(s).filter(x => x.defId === 'cinderling').length < 3) plan.actions.push({ type: 'summon', defId: 'cinderling', n: 2 });
        plan.actions.push({ type: 'lava', n: (bp >= 2 ? 3 : 2) + (ad.surge ? 1 : 0) });
        if (bp === 3) plan.actions.push({ type: 'fissure', n: 2 });
      }
      meleeIfAdjacent(hero); break;
    }
    case 'unwritten': {
      const copy = MIRROR_ORDER.find(k => hero.keywords[k] && !e.keywords[k]);
      if (copy) plan.actions.push({ type: 'mirror', keyword: copy });
      if (e.slam) { if (manhattan(e, hero) > 1) go(approach(s, e, hero, list, map)); meleeIfAdjacent(hero); break; }
      if (manhattan(e, hero) > 1) go(approach(s, e, hero, list, map));
      const phase = (e.cycle || 0) % 2, bp = bossPhaseOf(e);
      if (phase === 0 || bp === 3) plan.actions.push({ type: 'slam', tiles: crossTiles(s, hero, posAfter()), damage: bossBlastDamage(hero), kind: 'void' });
      else if (enemies(s).filter(x => x.defId === 'riftstalker').length < 2) plan.actions.push({ type: 'summon', defId: 'riftstalker', n: 1 });
      // Redaction: from phase 2, TEMPORARILY suppresses one of your abilities during your next turn (never permanent).
      // Redaction (v0.8): spell-heavy builds lose their costliest spell for one turn instead of an ability.
      const silence = bp >= 2 && phase === 1 && s.spellbook.length >= 3 && !s.p.silenced && s.spellbook.slice().sort((a, b) => spellCostOf(b.id) - spellCostOf(a.id) || (a.id < b.id ? -1 : 1))[0];
      const red = !silence && bp >= 2 && phase === 1 && !hero.suppressed && MIRROR_ORDER.concat(['deathtouch']).find(k => hero.keywords[k]);
      if (silence) plan.actions.push({ type: 'silence', spell: silence.id });
      if (red) plan.actions.push({ type: 'redact', keyword: red });
      if (bp === 3 && (e.cycle || 0) % 3 === 2) plan.actions.push({ type: 'fracture', n: 2 });
      meleeIfAdjacent(hero); break;
    }
  }
  return plan;
}

export function previewIntent(s, e) {
  const hero = player(s);
  const g0 = (hero && hero.statuses.guard) || 0;
  const brace = d => g0 ? Math.min(d, Math.max(g0, Math.floor(d / 2))) : 0;
  if (e.aim) return { uid: e.uid, kind: 'fire', damage: e.aim.damage - brace(e.aim.damage), guarded: brace(e.aim.damage), tiles: e.aim.tiles };
  const plan = planEnemy(s, e); const a = plan.actions;
  const sm = a.find(x => x.type === 'smash'); if (sm) return { uid: e.uid, kind: 'smash', damage: 0, guarded: 0, poison: 0, weaken: 0, tiles: [{ x: sm.x, y: sm.y }], to: null, target: null };
  if (e.slam) {
    const atk = a.find(x => x.type === 'attack');
    return { uid: e.uid, kind: 'slam', damage: e.slam.damage - brace(e.slam.damage), guarded: brace(e.slam.damage), tiles: e.slam.tiles, extra: atk ? atk.damage : 0, target: atk && atk.target };
  }
  const main = a.find(x => x.type === 'attack') || a.find(x => x.type === 'drakusethFlames') || a.find(x => x.type === 'realPing') || a.find(x => x.type === 'harpoon') || a.find(x => x.type === 'spit') || a.find(x => x.type === 'hex') || a.find(x => x.type === 'aim') || a.find(x => x.type === 'slam') || a.find(x => x.type === 'legendarySummon') || a.find(x => x.type === 'scarabReanimate') || a.find(x => x.type === 'nemataPump') || a.find(x => x.type === 'summon') || a.find(x => x.type === 'guard') || a.find(x => x.type === 'stunned');
  const g = (hero && hero.statuses.guard) || 0;   // v0.8: intents show what you will ACTUALLY take while guarding
  const dmg = (main && main.damage) || 0; const vsHero = main && (main.target === hero.uid || main.type === 'slam' || main.type === 'aim');
  const kind = main?.type === 'legendarySummon' || main?.type === 'scarabReanimate' ? 'summon' : main?.type === 'nemataPump' ? 'support' : main?.type === 'drakusethFlames' ? 'attack' : main?.type || 'move';
  return { uid: e.uid, kind, damage: vsHero && g ? Math.max(0, dmg - g) : dmg, guarded: vsHero && g ? Math.min(g, dmg) : 0, /* pending slams use the braced rule */ poison: (main && main.poison) || 0, weaken: (main && main.weaken) || 0, ground: !!(main && main.ground),
    tiles: (main && main.type === 'aim') ? main.tiles : [], to: plan.to, target: main && main.target, mirror: (a.find(x => x.type === 'mirror') || {}).keyword,
    redact: (a.find(x => x.type === 'redact') || {}).keyword, silence: (a.find(x => x.type === 'silence') || {}).spell, briars: !!a.find(x => x.type === 'briars'), terrainThreat: a.find(x => ['sporefield','fissure','fracture'].includes(x.type))?.type || null, phase: e.boss ? bossPhaseOf(e) : 0 };
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
    damageBatch(s, ev, e, slam.tiles.map(t => unitAt(s, t.x, t.y)).filter(u => u && u !== e).map(u => [u, slam.damage]), { kind: 'slam' });
    return false;
  }
  return false;
}

export function actEnemy(s, ev, e) {
  if (!alive(e)) return;
  if (e.statuses.stunned) { e.statuses.stunned = Math.max(0,e.statuses.stunned-1); e.statuses.chilled = 0; e.statuses.weakened = 0; ev.push({ t: 'stunnedSkip', uid: e.uid }); return; }
  if (resolvePending(s, ev, e)) { e.statuses.weakened = 0; return; }
  if (s.phase !== 'enemy') return;
  const plan = planEnemy(s, e);
  const hero = player(s);
  const sm = plan.actions.find(a => a.type === 'smash'); if (sm) { smashRock(s, ev, e, sm.x, sm.y); return; }
  for (const a of plan.actions.filter(a => a.type === 'mirror')) { e.keywords[a.keyword] = 1; ev.push({ t: 'mirror', uid: e.uid, keyword: a.keyword }); }
  if (plan.to) {
    if (plan.blink) { const from = { x: e.x, y: e.y }; e.x = plan.to.x; e.y = plan.to.y; ev.push({ t: 'teleport', uid: e.uid, from, x: e.x, y: e.y, kind: 'rift' }); }
    else { ev.push({ t: 'move', uid: e.uid, path: plan.path }); e.x = plan.to.x; e.y = plan.to.y; enterTiles(s, ev, e, plan.path); }
    if (!alive(e)) return;
  }
  if (e.boss && BOSS_BY_ID[e.defId]) {
    e.bossMana = Math.min(8,(e.bossMana ?? 3)+1);
    if(e.pendingSummons>0) { const pending=e.pendingSummons; e.pendingSummons=0;spawnTokensAround(s,ev,e,{nemata:'saproling',krenko:'goblin'}[e.defId]||'zombie',pending); }
    if (e.defId==='scarab') {
      scarabUpkeep(s,ev,e);
      if (s.phase !== 'enemy') return;
    }
  }
  for (const a of plan.actions) {
    if (!alive(e) || s.phase !== 'enemy') break;
    switch (a.type) {
      case 'legendarySummon': {
        if(e.bossMana < (a.mana||0)) break;
        e.bossMana-=(a.mana||0);
        spawnTokensAround(s,ev,e,a.defId,a.n);
        ev.push({t:'legendaryAbility',uid:e.uid,name:ENEMIES[e.defId].name+' summons'});
        if(e.defId==='krenko')e.tapped = true; break;
      }
      case 'nemataPump': {
        const sap=enemies(s).filter(u=>u.defId==='saproling');
        if(!sap.length) break;
        const sacrifice=sap[0];sacrifice.hp=0;sacrifice.sacrificed=true;
        ev.push({t:'death',uid:sacrifice.uid,kind:'sacrifice'});
        for(const u of sap.slice(1)) {u.power++;u.toughness++;u.hp++;u.maxHp++;u.pumpExpires=(u.pumpExpires||0)+1;}
        ev.push({t:'legendaryAbility',uid:e.uid,name:'Saprolings +1/+1'});break;
      }
      case 'drakusethFlames': {
        const victims=allies(s).filter(alive).sort((x,y)=> (y.hero?1:0)-(x.hero?1:0)||x.uid-y.uid).slice(0,3);
        for(let i=0;i<victims.length;i++) {
          const v=victims[i];ev.push({t:'legendaryFlame',uid:e.uid,target:v.uid,amount:i?3:4});
          dealDamage(s,ev,e,v,i?3:4,{kind:'drakusethFlame'});
        }
        break;
      }
      case 'scarabReanimate': {
        if(e.bossMana<4) break;
        const still=scarabTargets(s,e).find(t=>t.defId===a.target.defId&&t.from===a.target.from&&(t.uid||0)===(a.target.uid||0));if(!still)break;
        if(scarabReanimate(s,ev,e,still)) e.bossMana-=4;
        break;
      }
      case 'realCaterpillar': {
        const u=player(s);if(!alive(u))break;
        const equip=u.equipment?.includes(a.id),aura=u.auras?.includes(a.id);
        if(!equip&&!aura)break;
        if(equip){detachEquipment(u,a.id);(s.destroyedEquipment ||= []).push(a.id);}
        else detachAura(u,a.id);
        e.hp=0;ev.push({t:'realAbility',uid:e.uid,name:'Caustic Caterpillar · destroy artifact or enchantment',target:u.uid,id:a.id});
        ev.push({t:'death',uid:e.uid,kind:'sacrifice'});refreshTribalBonuses(s,ev);
        if(!enemies(s).length)declareVictory(s,ev);
        break;
      }
      case 'realPing': {
        const victim=s.units.find(u=>u.uid===a.target&&alive(u));
        if(e.tapped||!victim||(e.defId==='harpooner'&&victim.keywords?.hexproof))break;
        e.tapped=true;
        ev.push({t:'realAbility',uid:e.uid,name:a.name,target:victim.uid});
        ev.push({t:'rangedShot',uid:e.uid,target:victim.uid,kind:e.defId==='harpooner'?'spikeshot':'alchemist'});
        if(a.damage>0)dealDamage(s,ev,e,victim,a.damage,{kind:'spelllike'});
        break;
      }
      case 'realBlightcaster': {
        if(e.spellUsed)break;const ally=s.units.find(u=>u.uid===a.uid&&alive(u));if(!ally)break;
        e.spellUsed=true;s.enemySpellsCastThisTurn=(s.enemySpellsCastThisTurn||0)+1;attachAura(ally,'mtg:one-with-the-wind');
        ev.push({t:'auraAttach',uid:ally.uid,id:'mtg:one-with-the-wind',name:'One with the Wind',x:ally.x,y:ally.y,src:e.uid});
        // Enchantment CAST triggers -2/-2 until end of turn on target hero.
        if(alive(hero) && !hero.keywords?.hexproof){hero.power=Math.max(0,hero.power-2);hero.toughness=Math.max(0,hero.toughness-2);
          hero.maxHp=Math.max(0,hero.maxHp-2);hero.hp=Math.min(hero.hp,hero.maxHp);
          hero.statuses.blightcasterDebuff=(hero.statuses.blightcasterDebuff||0)+2;
          ev.push({t:'realAbility',uid:e.uid,name:'Blightcaster · -2/-2',target:hero.uid});
          if(hero.hp<=0){s.phase='lost';ev.push({t:'defeat'});}}
        break;
      }
      case 'attack': { if(e.auras?.includes('mtg:pacifism')||e.tapped)break; const t = s.units.find(u => u.uid === a.target); if (alive(t) && manhattan(e, t) === 1){attackExchange(s, ev, e, t);if(!has(e,'vigilance'))e.tapped=true;} break; }
      case 'spit': {const tgt=s.units.find(u=>u.uid===a.target&&alive(u));if(!tgt)break;ev.push({t:'spit',uid:e.uid,target:tgt.uid});dealDamage(s,ev,e,tgt,a.damage,{kind:'spit'});if(alive(tgt))addStatus(s,ev,tgt,'poison',a.poison);break;}
      case 'hex': {const tgt=s.units.find(u=>u.uid===a.target&&alive(u));if(!tgt)break;ev.push({t:'hex',uid:e.uid,target:tgt.uid});dealDamage(s,ev,e,tgt,a.damage,{kind:'hex'});if(alive(tgt))addStatus(s,ev,tgt,'weakened',a.weaken);break;}
      case 'harpoon': {const tgt=s.units.find(u=>u.uid===a.target&&alive(u));if(!tgt)break;ev.push({t:'harpoon',uid:e.uid,target:tgt.uid});dealDamage(s,ev,e,tgt,a.damage,{kind:'harpoon'});if(a.ground&&alive(tgt))addStatus(s,ev,tgt,'grounded',1);break;}
      case 'aim': e.aim = { tiles: a.tiles, damage: a.damage }; ev.push({ t: 'aim', uid: e.uid, tiles: a.tiles }); break;
      case 'sporefield':
    case 'fissure':
    case 'fracture': {
      const type = a.type === 'sporefield' ? T.SPORES : a.type === 'fissure' ? T.UNSTABLE : T.RIFT;
      const close = areaTiles(s, hero, 2).filter(t => tileAt(s, t.x, t.y) === T.FLOOR && !unitAt(s, t.x, t.y));
      const cand = close.sort((x, y) => manhattan(x, hero) - manhattan(y, hero) || cmpTile(x, y)).slice(0, a.n || 1);
      for (const t of cand) s.terrain[t.y * s.w + t.x] = type;
      if (cand.length) ev.push({ t: 'terrain', tiles: cand, kind: a.type });
      break;
    }
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
      case 'silence': s.p.silenced = a.spell; ev.push({ t: 'silence', uid: e.uid, spell: a.spell }); break;
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
  // Nemata's pump expires at the END of the enemy turn, after all Saprolings have acted.

  if (e.statuses.chilled) e.statuses.chilled = 0; // ice slows this action, then expires
  if (e.statuses.weakened) e.statuses.weakened = 0;   // v0.8: an enemy Weaken lasts for exactly its next action
  if (e.statuses.empowered) e.statuses.empowered = 0; // and a Rally lasts for exactly its next action
  const rally = ENEMIES[e.defId].rally;               // v0.8 Act II coordination: Brutes rally the foes beside them
  if (rally && alive(e)) for (const al of enemies(s)) if (al !== e && manhattan(al, e) === 1 && !(al.statuses.empowered >= rally)) { al.statuses.empowered = rally; ev.push({ t: 'status', uid: al.uid, status: 'empowered', value: rally, total: rally }); }
  e.cycle = (e.cycle || 0) + 1; // deterministic per-enemy tactical cadence
  if (['thornmother', 'matron', 'unwritten'].includes(ENEMIES[e.defId].ai)) announcePhase(ev, e);
}

/** Phase transitions are announced once, deterministically, from health thresholds (66% / 33%). */
export function announcePhase(ev, e) {
  if (!alive(e) || !e.boss) return; const ph = bossPhaseOf(e);
  if ((e.phaseSeen || 1) < ph) { e.phaseSeen = ph; ev.push({ t: 'bossPhase', uid: e.uid, phase: ph, text: bossPhaseName(e, ph) }); }
}

/** v1.6.0 Threat Surge: after the designated caller (strongest living elite/boss, else strongest foe) acts on a cadence
 *  turn, it telegraphs a cross on the hero's CURRENT tile. Resolution is the existing pending-slam path at the caller's
 *  next action, so it is shown in intents and can be dodged by moving or reduced by Guard. Never on turn 1. */
export function surgeAfterAct(s, ev, e) {
  const sg = s.threatSurge; if (!sg || !alive(e) || e.slam || e.aim || s.phase !== 'enemy' || s.turn < 2 || s.turn % sg.every) return;
  const foes = enemies(s).filter(alive); const pick = (foes.filter(u => u.boss || ENEMIES[u.defId]?.elite).length ? foes.filter(u => u.boss || ENEMIES[u.defId]?.elite) : foes)
    .sort((a, b) => b.maxHp - a.maxHp || a.uid - b.uid)[0];
  if (pick !== e || e.statuses.stunned) return;
  const hero = player(s); if (!alive(hero)) return;
  const tiles = [{ x: hero.x, y: hero.y }, ...DIRS.map(([dx, dy]) => ({ x: hero.x + dx, y: hero.y + dy }))].filter(t => inBounds(s, t.x, t.y) && tileAt(s, t.x, t.y) !== T.ROCK);
  e.slam = { tiles, damage: Math.max(2, Math.ceil(hero.maxHp * sg.pct)), kind: 'surge' };
  ev.push({ t: 'aim', uid: e.uid, tiles, slam: true, kind: 'surge' }, { t: 'realAbility', uid: e.uid, name: 'Threat Surge · telegraphed' });
}
export function actAlly(s, ev, a) {
  if (!alive(a) || s.phase !== 'enemy') return;
  // Reassembled Skeletons return exhausted: their first allied AI action must
  // be skipped. Clear the flag so they can act on subsequent turns.
  if (a.tapped) { a.tapped = false; ev.push({ t: 'stunnedSkip', uid: a.uid, kind: 'reassembly' }); return; }
  const foes = enemies(s); if (!foes.length) return;
  const tgt = foes.slice().sort((x, y) => manhattan(a, x) - manhattan(a, y) || x.uid - y.uid)[0];
  { const r = smashChoice(s, a, tgt); if (r) { smashRock(s, ev, a, r.x, r.y); return; } }   // v1.5.0 same legal mechanic as foes
  if (manhattan(a, tgt) !== 1) {
    const { map, list } = stops(s, a);
    const t = list.filter(v => manhattan(v, tgt) === 1).sort((x, y) => x.cost - y.cost || cmpTile(x, y))[0] || approach(s, a, tgt, list, map);
    if (t && (t.x !== a.x || t.y !== a.y)) { const path = pathTo(map, t.x, t.y); ev.push({ t: 'move', uid: a.uid, path }); a.x = t.x; a.y = t.y; enterTiles(s, ev, a, path); }
  }
  if (alive(a) && alive(tgt) && manhattan(a, tgt) === 1) attackExchange(s, ev, a, tgt);
}

/** Deterministic spaces for tokens, never placed on lethal starting tiles or occupied tiles.
 * If full, pending summons are queued and spawned at the next legal opportunity. */
export function spawnTokensAround(s, ev, owner, defId, n=1) {
  if (!Number.isInteger(n) || n<0) return 0;
  const offsets = [...DIRS,[1,1],[-1,1],[1,-1],[-1,-1]];
  const candidates = [];
  for (let r=1; r<=Math.max(s.w,s.h); r++) for (const [dx,dy] of offsets) {
    const x=owner.x+dx*r,y=owner.y+dy*r;
    if (inBounds(s,x,y) && tileAt(s,x,y)!==T.ROCK && tileAt(s,x,y)!==T.LAVA && !unitAt(s,x,y) && !candidates.some(t=>t.x===x&&t.y===y)) candidates.push({x,y});
  }
  let made=0;
  for(const loc of candidates.slice(0,n)) {
    const u=spawnEnemy(s,defId,loc.x,loc.y);u.token=true;u.summoned=true;
    ev.push({t:'summon',uid:u.uid,defId,x:u.x,y:u.y,by:owner.uid});made++;
  }
  if (made < n) { owner.pendingSummons=(owner.pendingSummons||0)+(n-made); ev.push({t:'summonPending',uid:owner.uid,defId,count:n-made}); }
  return made;
}
export function spawnEnemy(s, defId, x, y) {
  const d = ENEMIES[defId];
  const hp = d.encounterHealth || d.toughness;
  const u = { uid: s.nextUid++, side: 'enemy', defId, name: d.name, creatureTypes: d.tribe || (defId === 'goblin' ? 'Goblin' : ''), x, y, hp, maxHp: hp, power: d.power,
    toughness: d.toughness, move: d.move || 2, legendaryVitality: d.encounterHealth ? hp - d.toughness : 0, keywords: { ...(d.keywords || {}) }, statuses: {}, legendary: !!d.legendary, boss: !!d.boss };
  s.units.push(u);
  // Faerie Duelist's printed enter-the-battlefield -2/-0 trigger is real,
  // not a recurring spell. During encounter setup it lasts through turn one.
  if(defId==='shardling'){
    const h=player(s);
    if(h && alive(h) && !has(h,'hexproof')){
      h.statuses.weakened=(h.statuses.weakened||0)+2;
      (s.entryEvents||=[]).push({t:'status',uid:h.uid,status:'weakened',value:2,total:h.statuses.weakened,by:u.uid,kind:'Faerie Duelist ETB'});
    }
  }
  // Wurmcoil has no enter-the-battlefield choice. Its printed ability triggers only on death.
  refreshTribalBonuses(s,[]);
  return u;
}
registerSpawn(spawnEnemy);
