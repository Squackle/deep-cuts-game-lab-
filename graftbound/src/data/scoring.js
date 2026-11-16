// Versioned competitive scoring model (v0.6 starting model — transparent, tune with playtests).
// parActions and damageBudget are derived ONLY from the encounter definition (tier, act, starting foe count),
// never from how the player is doing. Calibrated from tests/sim (naive bot: ~1.8–2.3 accepted actions per foe;
// par ≈ its 25th percentile; damage budgets ≈ its 75th percentile). See docs/SCORING-v0.6.md.
export const SCORING_VERSION = 'gb-score-2';   // v1.7.0: + bounded Global Threat bonus
/** v1.7.0 threat bonus: +2.5% of the encounter score per level of EFFECTIVE threat at encounter start, max +30% (Threat 12).
 *  Victory only; rounded to the nearest point; read from the immutable battle snapshot, never from post-fight threat. */
export const THREAT_BONUS = { perLevel: 0.025, cap: 0.30 };
export const SCORE = { victory: 1000, efficiencyMax: 600, avoidanceMax: 400, expeditionBonus: 2500 };
export const MULTIPLIER = { tutorial: 1, battle: 1, elite: 1.25, boss: 1.5 };
export const PAR_PER_FOE = { tutorial: 1.5, battle: 1.5, elite: 1.75, boss: 2.5 };
export const DAMAGE_BUDGET = { tutorial: [6, 6, 6], battle: [8, 10, 10], elite: [14, 18, 18], boss: [20, 36, 48] };
