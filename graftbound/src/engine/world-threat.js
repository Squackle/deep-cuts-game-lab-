/** World Threat is a capped, transparent encounter modifier. Never changes a printed card's P/T.
 * Its only inputs are accepted combat damage and completed non-tutorial victories.
 * All functions are deterministic, serializable, and DOM-free. */
export const WORLD_THREAT_MAX = 12;
export const newWorldThreat = () => ({ level: 0, flawlessStreak: 0 });
export function normalizedWorldThreat(state) {
  return { level: Math.max(0, Math.min(WORLD_THREAT_MAX, state?.level | 0)), flawlessStreak: Math.max(0, Math.min(1, state?.flawlessStreak | 0)) };
}
/** Pure: called once per concluded non-tutorial encounter. Damage must be genuinely enemy-caused HP loss. */
export function settleWorldThreat(state, { victory, enemyDamage = 0, maxHealth = 1, tutorial = false } = {}) {
  const n = normalizedWorldThreat(state);
  if (tutorial || !victory) return n;
  if (enemyDamage === 0) {
    n.flawlessStreak += 1;
    if (n.flawlessStreak >= 2) { n.level = Math.min(WORLD_THREAT_MAX, n.level + 1); n.flawlessStreak = 0; }
  } else {
    n.flawlessStreak = 0;
    if (enemyDamage >= Math.ceil(Math.max(1,maxHealth) * 0.2)) n.level = Math.max(0, n.level - 1);
  }
  return n;
}
/** Visible encounter pressure without silently falsifying Magic's printed Toughness. */
export function threatModifiers(state, { boss = false } = {}) {
  const n = normalizedWorldThreat(state).level;
  return { level: n, shieldRate: boss ? Math.min(0.10, n / 120) : n * 0.02, reinforcement: n >= 6 && !boss ? 1 : 0,
    peakPower: n === WORLD_THREAT_MAX && !boss ? 1 : 0 };
}
export function applyWorldThreat(battle, state) {
  if (!battle || battle.nodeType === 'tutorial') return battle;
  const boss = battle.nodeType === 'boss'; const mod = threatModifiers(state, { boss });
  battle.worldThreat = mod.level;
  // Shields are separate explicit encounter bonuses. They never alter printed P/T or max HP.
  for (const u of battle.units.filter(u => u.side === 'enemy')) {
    const bonus = Math.ceil(u.maxHp * mod.shieldRate);
    if (bonus) { u.statuses.shield = (u.statuses.shield || 0) + bonus; u.worldShield = bonus; }
  }
  if (mod.peakPower) {
    const e = battle.units.filter(u => u.side === 'enemy' && !u.boss).sort((a,b)=>b.maxHp-a.maxHp||a.uid-b.uid)[0];
    if (e) { e.power += 1; e.worldPower = 1; }
  }
  return battle;
}
