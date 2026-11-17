/** Global World Threat is a persistent, deterministic difficulty feedback loop.
 * It never changes printed card toughness or hit points, and never consumes combat RNG.
 * The saved {level,flawlessStreak} shape remains backward compatible.
 */
/** v1.8.0: the scale is 0..24. Levels 0..12 keep EXACTLY their v1.7 effects (LEGACY_MAX); 13..24 add a second band of
 *  telegraphed, coordinated pressure (see threatTactics) instead of inflating health. */
export const WORLD_THREAT_MAX = 24, LEGACY_MAX = 12;
const L12 = n => Math.min(LEGACY_MAX, n);
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
export const MAX_RISE_PER_BATTLE = 3, UPPER_RISE_PER_BATTLE = 2;   // v1.8.0: above 12 threat must be earned slowly
export function settleWorldThreat(state, { victory, enemyDamage = 0, maxHealth = 1, tutorial = false, turns = 99, boss = false } = {}, report = null) {
  const n = normalizedWorldThreat(state); const before = n.level; const reasons = [];
  const hp = Math.max(1, Number(maxHealth) || 1), lost = Math.max(0, Number(enemyDamage) || 0), quick = Number(turns) <= 3;
  const pct = Math.round(100 * lost / hp);
  const out = () => {
    if (report) {
      if (!reasons.length) reasons.push(n.level >= WORLD_THREAT_MAX && before >= WORLD_THREAT_MAX ? `Threat is already at its maximum (${WORLD_THREAT_MAX}).`
        : lost > 0 ? `Foes took ${lost} of ${hp} health (${pct}%): enough to stop the climb, not enough to ease it, so threat holds.` : 'Steady performance: threat holds.');
      Object.assign(report, { before, after: n.level, delta: n.level - before, reasons, streak: n.strongStreak,
        factors: { enemyDamage: lost, maxHealth: hp, damagePct: pct, turns: Number.isFinite(+turns) && turns < 99 ? +turns : null, quick, boss: !!boss, strongStreak: n.strongStreak } });
    }
    return n;
  };
  if (tutorial) { reasons.push('Tutorial battles never change threat.'); return out(); }
  if (!victory) { reasons.push('No victory: threat unchanged.'); return out(); }
  const capped = () => n.level >= WORLD_THREAT_MAX;
  const up = (k, why) => { const b = n.level; n.level = Math.min(WORLD_THREAT_MAX, n.level + k); if (n.level > b) reasons.push(why); else if (capped() && !reasons.some(r => r.includes('maximum'))) reasons.push(`${why} Threat is already at its maximum (${WORLD_THREAT_MAX}).`); };
  const down = (k, why) => { const b = n.level; n.level = Math.max(0, n.level - k); if (n.level < b) reasons.push(why); };
  if (lost === 0) { up(quick && n.level < LEGACY_MAX ? 2 : 1, quick ? `Flawless and fast: no damage from foes in ${turns} turn${turns === 1 ? '' : 's'}.` : 'Flawless victory: foes never wounded you.'); n.flawlessStreak = 0; }
  else if (lost <= Math.max(1, Math.floor(hp * 0.10))) {
    if (quick) { up(1, `Efficient win: only ${lost} damage (${pct}%) in ${turns} turns.`); n.flawlessStreak = 0; }
    else { n.flawlessStreak++; if (n.flawlessStreak >= 2) { up(1, 'Two light-damage wins in a row.'); n.flawlessStreak = 0; } else reasons.push(`Light damage (${lost}, ${pct}%): one more light win raises threat.`); }
  } else { n.flawlessStreak = 0; }
  if (lost <= Math.floor(hp * 0.15)) { n.strongStreak = Math.min(9, n.strongStreak + 1); if (n.strongStreak >= 3) up(1, `Winning streak: ${n.strongStreak} dominant victories in a row increased enemy pressure.`); }
  else n.strongStreak = 0;
  // v1.6.0: a boss that never wounds you is the clearest sign the world is under-matched (owner run: Toxrill, 0 damage).
  if (boss && lost === 0) up(1, 'A boss fell without wounding you.');
  const cap = before >= LEGACY_MAX ? UPPER_RISE_PER_BATTLE : MAX_RISE_PER_BATTLE;
  if (n.level - before > cap) { n.level = before + cap; reasons.push(`Threat rises at most +${cap} per battle${before >= LEGACY_MAX ? ' above 12' : ''}.`); }
  if (lost >= Math.ceil(hp * 0.5)) down(2, `Heavy damage sustained (${pct}% of your health): the world eases its pressure.`);
  else if (lost >= Math.ceil(hp * 0.2)) down(1, `Hard-fought victory (${pct}% of your health lost): threat eases.`);
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
  // The strength-based floor only reaches the legacy band; 13..24 must be EARNED by results.
  const adaptive = Number.isFinite(over) ? Math.min(LEGACY_MAX, Math.floor(Math.max(0, over) / 3)) : 0;
  return Math.max(persistent, adaptive);
}
/** Wards are explicit temporary encounter shields (not printed Magic stats).
 * At higher pressure, extra enemies are selected by existing build counters,
 * and the total reinforcement pool still obeys each act's hard cap. */
export function threatModifiers(state, { boss = false, heroPower = 0 } = {}) {
  const full = normalizedWorldThreat(state).level, n = L12(full), up = Math.max(0, full - LEGACY_MAX);
  // HP-only percentage wards vanish in a single strike once the hero has many
  // grafts. Above Threat 4, add a bounded, encounter-only ward proportional to
  // the hero's ACTUAL attack. At Threat 10+, a strong build must spend another
  // hit on ordinary defenders; weak builds still face only the small HP ward.
  const power = Math.max(0, Number(heroPower) || 0);
  // v1.6.0: reaches 1.0 only at Threat 12 (was Threat 10) — high threat now also presses with telegraphed Threat Surges.
  const counterWardRate = Math.min(1, Math.max(0, (n - 4) / 8));
  const wardFloor = Math.ceil(Math.min(56, power * counterWardRate * (boss ? 0.75 : 1)));
  return {
    level: full,
    wardFloor,
    // 13..24: wards grow only slightly (max +0.06) — the upper band is tactical, not health inflation
    shieldRate: boss ? Math.min(0.27, n * 0.0225) + Math.min(0.04, up * 0.0035) : Math.min(0.42, n * 0.035) + Math.min(0.06, up * 0.005),
    reinforcement: boss ? 0 : (n >= 10 ? 2 : n >= 5 ? 1 : 0) + (full >= 18 ? 1 : 0),
    peakPower: n === LEGACY_MAX && !boss ? 1 : 0
  };
}
/** v1.6.0 tactical threat (bounded, telegraphed, deterministic). Returns what an encounter at `level` adds:
 *  - surge: the strongest foe telegraphs a cross around the hero, resolved on the NEXT enemy turn (one step or Guard
 *    avoids it). Elites/bosses from Threat 6, every encounter from Threat 9. Damage = pct of hero maximum health.
 *  - bossEscorts: extra counter-picked foes for bosses (Threat 8: 1, Threat 11: 2). Bosses previously had none.
 *  - ambush: foes that start on the hero's flanks after a dominant streak (no health is ever multiplied). */
/** v1.8.0 upper band (13..24), all telegraphed and bounded. */
export const UPPER_TIERS = Object.freeze([
  { at: 13, name: 'Coordinated strikes', text: 'surges every 2 turns in every fight' },
  { at: 15, name: 'Wide surges', text: 'surges cover a 3×3 area' },
  { at: 16, name: 'Second caller', text: 'two foes take turns calling surges' },
  { at: 18, name: 'Reinforced lines', text: '+1 reinforcement in ordinary fights' },
  { at: 19, name: 'Pack tactics', text: 'foes next to another foe strike for +1' },
  { at: 21, name: 'Royal guard', text: 'bosses bring 3 escorts' },
  { at: 23, name: 'Crushing surges', text: 'surges deal up to 24% of your health' },
]);
export function threatTactics(level, { nodeType = 'battle', streak = 0 } = {}) {
  const full = Math.max(0, Math.min(WORLD_THREAT_MAX, level | 0)), n = L12(full), big = nodeType === 'elite' || nodeType === 'boss';
  if (nodeType === 'tutorial') return { level: full, surge: null, bossEscorts: 0, ambush: 0, flank: 0 };
  const surgeOn = (big && n >= 6) || n >= 9 || full >= 13;
  const pct = Math.min(0.2, 0.1 + 0.02 * (n - 6)) + (full >= 23 ? 0.04 : full >= 20 ? 0.02 : 0);
  return { level: full,
    surge: surgeOn ? { every: n >= 10 || full >= 13 ? 2 : 3, pct: Math.min(0.24, pct), wide: full >= 15, callers: full >= 16 ? 2 : 1 } : null,
    bossEscorts: nodeType === 'boss' ? (full >= 21 ? 3 : n >= 11 ? 2 : n >= 8 ? 1 : 0) : 0,
    ambush: nodeType === 'boss' ? 0 : (streak >= 5 || n >= 10) && n >= 5 ? 2 : streak >= 3 && n >= 5 ? 1 : 0,
    flank: full >= 19 ? 1 : 0 };
}
export function applyWorldThreat(battle, state) {
  if (!battle || battle.nodeType === 'tutorial') return battle;
  const boss = battle.nodeType === 'boss';
  const heroPower = battle.units.find(u => u.hero)?.power || 0;
  const mod = threatModifiers(state, { boss, heroPower });
  battle.worldThreat = mod.level;
  battle.worldThreatShieldRate = mod.shieldRate;
  const tac = threatTactics(mod.level, { nodeType: battle.nodeType });
  battle.threatSurge = tac.surge; battle.threatFlank = tac.flank || 0;   // read by surgeAfterAct (ai.js); serialized with the battle
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
