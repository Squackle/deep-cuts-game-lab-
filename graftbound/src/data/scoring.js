// Versioned competitive scoring model (v0.6 starting model — transparent, tune with playtests).
// parActions and damageBudget are derived ONLY from the encounter definition (tier, act, starting foe count),
// never from how the player is doing. Calibrated from tests/sim (naive bot: ~1.8–2.3 accepted actions per foe;
// par ≈ its 25th percentile; damage budgets ≈ its 75th percentile). See docs/SCORING-v0.6.md.
export const SCORING_VERSION = 'gb-score-1';
export const SCORE = { victory: 1000, efficiencyMax: 600, avoidanceMax: 400, expeditionBonus: 2500 };
export const MULTIPLIER = { tutorial: 1, battle: 1, elite: 1.25, boss: 1.5 };
export const PAR_PER_FOE = { tutorial: 1.5, battle: 1.5, elite: 1.75, boss: 2.5 };
export const DAMAGE_BUDGET = { tutorial: [6, 6, 6], battle: [8, 10, 10], elite: [14, 18, 18], boss: [20, 36, 48] };
