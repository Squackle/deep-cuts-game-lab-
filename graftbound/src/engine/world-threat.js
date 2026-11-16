/** Global World Threat is a persistent, deterministic difficulty feedback loop.
 * It never changes printed card toughness or hit points, and never consumes combat RNG.
 * The saved {level,flawlessStreak} shape remains backward compatible.
 */
export const WORLD_THREAT_MAX = 12;
export const newWorldThreat = () => ({ level: 0, flawlessStreak: 0, strongStreak: 0 });
export function normalizedWorldThreat(state) {
  return { level: Math.max(0, Math.min(WORLD_THREAT_MAX, state?.level | 0)),
    flawlessStreak: Math.max(0, Math.min(1, state?.flawlessStreak | 0)),
    strongStreak: Math.max(0, Math.min(9, state?.strongStreak | 0)) };
}
/** v1.5.0 settlement. Returns the NEW state; pass `report` to receive {before, after, delta, reasons}.
 *  Rises faster for dominant play, falls for struggling play (enemy-caused health loss only):
 *   - flawless (0 lost): +1; quick flawless (<= 3 turns): +2
 *   - light (<= 10%): +1 every second consecutive light win (as before); quick light win: +1 immediately
 *   - strong streak: the 3rd+ consecutive win losing <= 15% adds another +1 (momentum)
 *   - moderate: holds and breaks streaks; serious (>= 20%): -1 (unchanged); near-death (>= 50%): -2
 *  Scale stays 0..12. */
export function settleWorldThreat(state, { victory, enemyDamage = 0, maxHealth = 1, tutorial = false, turns = 99 } = {}, report = null) {
  const n = normalizedWorldThreat(state); const before = n.level; const reasons = [];
  const out = () => { if (report) Object.assign(report, { before, after: n.level, delta: n.level - before, reasons: reasons.length ? reasons : ['Steady performance: threat holds.'], streak: n.strongStreak }); return n; };
  if (tutorial) { reasons.push('Tutorial battles never change threat.'); return out(); }
  if (!victory) { reasons.push('No victory: threat unchanged.'); return out(); }
  const hp = Math.max(1, Number(maxHealth) || 1), lost = Math.max(0, Number(enemyDamage) || 0), quick = Number(turns) <= 3;
  const up = (k, why) => { const b = n.level; n.level = Math.min(WORLD_THREAT_MAX, n.level + k); if (n.level > b) reasons.push(why); };
  const down = (k, why) => { const b = n.level; n.level = Math.max(0, n.level - k); if (n.level < b) reasons.push(why); };
  if (lost === 0) { up(quick ? 2 : 1, quick ? 'Flawless and fast: no damage taken in 3 turns or fewer.' : 'Flawless victory: no damage taken from foes.'); n.flawlessStreak = 0; }
  else if (lost <= Math.max(1, Math.floor(hp * 0.10))) {
    if (quick) { up(1, 'Efficient win: light damage in 3 turns or fewer.'); n.flawlessStreak = 0; }
    else { n.flawlessStreak++; if (n.flawlessStreak >= 2) { up(1, 'Two light-damage wins in a row.'); n.flawlessStreak = 0; } else reasons.push('Light damage: one more light win raises threat.'); }
  } else { n.flawlessStreak = 0; }
  if (lost <= Math.floor(hp * 0.15)) { n.strongStreak = Math.min(9, n.strongStreak + 1); if (n.strongStreak >= 3) up(1, `Dominant streak: ${n.strongStreak} strong wins in a row.`); }
  else n.strongStreak = 0;
  if (lost >= Math.ceil(hp * 0.5)) down(2, 'Near-death victory: the world eases off.');
  else if (lost >= Math.ceil(hp * 0.2)) down(1, 'Hard-fought victory: threat eases.');
  return out();
}
/** v1.5.0 deliberate reduction (skipped packs, Wayshrine Penance). Never below 0. Returns the amount actually removed. */
export function reduceWorldThreat(state, amount) {
  const n = normalizedWorldThreat(state); const b = n.level; n.level = Math.max(0, n.level - Math.max(0, amount | 0)); n.strongStreak = 0;
  return { state: n, removed: b - n.level };
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
export function threatModifiers(state, { boss = false, heroPower = 0 } = {}) {
  const n = normalizedWorldThreat(state).level;
  // HP-only percentage wards vanish in a single strike once the hero has many
  // grafts. Above Threat 4, add a bounded, encounter-only ward proportional to
  // the hero's ACTUAL attack. At Threat 10+, a strong build must spend another
  // hit on ordinary defenders; weak builds still face only the small HP ward.
  const power = Math.max(0, Number(heroPower) || 0);
  const counterWardRate = Math.min(1, Math.max(0, (n - 4) / 6));
  const wardFloor = Math.ceil(Math.min(56, power * counterWardRate * (boss ? 0.75 : 1)));
  return {
    level: n,
    wardFloor,
    shieldRate: boss ? Math.min(0.27, n * 0.0225) : Math.min(0.42, n * 0.035),
    reinforcement: boss ? 0 : n >= 10 ? 2 : n >= 5 ? 1 : 0,
    peakPower: n === WORLD_THREAT_MAX && !boss ? 1 : 0
  };
}
export function applyWorldThreat(battle, state) {
  if (!battle || battle.nodeType === 'tutorial') return battle;
  const boss = battle.nodeType === 'boss';
  const heroPower = battle.units.find(u => u.hero)?.power || 0;
  const mod = threatModifiers(state, { boss, heroPower });
  battle.worldThreat = mod.level;
  battle.worldThreatShieldRate = mod.shieldRate;
  for (const u of battle.units.filter(u => u.side === 'enemy')) {
    const bonus = Math.max(Math.ceil(u.maxHp * mod.shieldRate), mod.wardFloor);
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
