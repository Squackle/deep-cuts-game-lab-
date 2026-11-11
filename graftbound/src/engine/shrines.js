// Wayshrines (v0.5). Each shrine rolls up to 4 offerings from a pool, filtered by the run's state.
// One offering per shrine; the node is consumed when chosen. Every option has a distinct consequence and a cost
// or limit, so there is no free loop and no option that is best in every situation.
import { makeRng, shuffle } from '../core/rng.js';

export const MAX_SPARK_FONTS = 3, MAX_MANA_FONTS = 2;
export const SHRINES = {
  restoration: { name: 'Restoration', glyph: '✚', text: run => `Mend every wound (+${run.wounds} health now). Your next battle also begins with 3 shield.`,
    when: run => run.wounds > 0 },
  spark: { name: 'Spark Font', glyph: '✦', text: () => '+3 Spark: maximum health rises by 3 for the rest of the adventure.',
    when: run => (run.sparkFonts || 0) < MAX_SPARK_FONTS, note: run => `${MAX_SPARK_FONTS - (run.sparkFonts || 0)} left this adventure` },
  offering: { name: 'Offering Bowl', glyph: '❂', text: run => `Open an extra booster. The bowl drinks first: you take a wound of ${offeringCost(run)} (cannot drop you below 1).`,
    when: () => true },
  graftsmith: { name: 'The Graftsmith', glyph: '⚒', text: () => 'Sever one of your grafts (its power, toughness and abilities are removed), then choose a creature from a stronger creature-only pack to graft in its place.',
    when: run => run.evo.absorbed.length >= 2 },
  arcane: { name: 'Arcane Font', glyph: '◆', text: () => '+1 maximum mana and +1 mana at the start of every battle (permanent).',
    when: run => (run.manaBonus || 0) < MAX_MANA_FONTS, note: run => `${MAX_MANA_FONTS - (run.manaBonus || 0)} left this adventure` },
  inscribe: { name: 'Inscription Altar', glyph: '✎', text: () => 'Empower one spell in your spellbook by one level (max level 3).',
    when: run => run.spellbook.some(s => s.level < 3) },
};
export const offeringCost = run => Math.max(2, Math.ceil(run.maxHp * 0.2));
/** Deterministic offerings for a shrine node: up to 4 eligible options. */
export function rollShrine(run, seed) {
  const eligible = Object.keys(SHRINES).filter(k => SHRINES[k].when(run));
  return shuffle(makeRng((seed ^ 0x51e) >>> 0), eligible).slice(0, 4);
}
