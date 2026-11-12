// v0.8 basic tactical actions. Single source of truth for rules, AI awareness and tooltips.
export const TACTICS = {
  guard: { base: 2, perToughness: 4, max: 6, moveCost: 1 },        // reduction per enemy hit = min(max, base + floor(toughness / 4)); telegraphed slams/arrows at least halved
  channel: { mana: 1, spellBonus: 1, moveCost: 1 },                // +1 mana now; next spell this turn +1 damage/heal/shield
};
