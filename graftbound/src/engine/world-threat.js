/** Global World Threat is a persistent, deterministic difficulty feedback loop.
 * It never changes printed card toughness or hit points, and never consumes combat RNG.
 * The saved {level,flawlessStreak} shape remains backward compatible.
 */
export const WORLD_THREAT_MAX = 12;
export const newWorldThreat = () => ({ level: 0, flawlessStreak: 0 });
export function normalizedWorldThreat(state) {
  return { level: Math.max(0, Math.min(WORLD_THREAT_MAX, state?.level | 0)),
    flawlessStreak: Math.max(0, Math.min(1, state?.flawlessStreak | 0)) };
}
/** A clean win raises pressure immediately. Two light-hit wins do the same;
 * ordinary damage holds, while a truly dangerous win eases pressure.
 * Enemy-caused health loss, not terrain or temporary shield absorption, counts. */
export function settleWorldThreat(state, { victory, enemyDamage = 0, maxHealth = 1, tutorial = false } = {}) {
  const n = normalizedWorldThreat(state);
  if (tutorial || !victory) return n;
  const hp = Math.max(1, Number(maxHealth) || 1);
  const lost = Math.max(0, Number(enemyDamage) || 0);
  if (lost === 0) {
    n.level = Math.min(WORLD_THREAT_MAX, n.level + 1);
    n.flawlessStreak = 0;
  } else if (lost <= Math.max(1, Math.floor(hp * 0.10))) {
    n.flawlessStreak++;
    if (n.flawlessStreak >= 2) {
      n.level = Math.min(WORLD_THREAT_MAX, n.level + 1);
      n.flawlessStreak = 0;
    }
  } else {
    n.flawlessStreak = 0;
    if (lost >= Math.ceil(hp * 0.2)) n.level = Math.max(0, n.level - 1);
  }
  return n;
}
/** Strong-than-expected builds cannot keep threat dormant simply by taking
 * a single point of damage each fight. Existing weak builds are NOT raised to
 * this floor. Encounter-specific pressure never overwrites the saved level. */
export function effectiveThreatLevel(state, { strength = 0, expected = 0 } = {}) {
  const persistent = normalizedWorldThreat(state).level;
  const over = Number(strength) - Number(expected);
  const adaptive = Number.isFinite(over) ? Math.min(WORLD_THREAT_MAX, Math.floor(Math.max(0, over) / 3)) : 0;
  return Math.max(persistent, adaptive);
}
/** Wards are explicit temporary encounter shields (not printed Magic stats).
 * At higher pressure, extra enemies are selected by existing build counters,
 * and the total reinforcement pool still obeys each act's hard cap. */
export function threatModifiers(state, { boss = false } = {}) {
  const n = normalizedWorldThreat(state).level;
  return {
    level: n,
    shieldRate: boss ? Math.min(0.27, n * 0.0225) : Math.min(0.42, n * 0.035),
    reinforcement: boss ? 0 : n >= 10 ? 2 : n >= 5 ? 1 : 0,
    peakPower: n === WORLD_THREAT_MAX && !boss ? 1 : 0
  };
}
export function applyWorldThreat(battle, state) {
  if (!battle || battle.nodeType === 'tutorial') return battle;
  const boss = battle.nodeType === 'boss';
  const mod = threatModifiers(state, { boss });
  battle.worldThreat = mod.level;
  battle.worldThreatShieldRate = mod.shieldRate;
  for (const u of battle.units.filter(u => u.side === 'enemy')) {
    const bonus = Math.ceil(u.maxHp * mod.shieldRate);
    if (bonus) {
      u.statuses.shield = (u.statuses.shield || 0) + bonus;
      u.worldShield = bonus;
    }
  }
  // Retain the existing peak-level battle adaptation for compatibility.
  if (mod.peakPower) {
    const e = battle.units.filter(u => u.side === 'enemy' && !u.boss)
      .sort((a,b)=>b.maxHp-a.maxHp||a.uid-b.uid)[0];
    if (e) { e.power += 1; e.worldPower = 1; }
  }
  return battle;
}
