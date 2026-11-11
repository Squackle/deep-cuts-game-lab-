// GRAFTBOUND gameplay power rating (v0.5). Transparent and independent from Magic rarity.
// rating = power + toughness + Σ keyword weights + combo bonuses. Double Strike is worth the card's power again.
// Packs only offer creatures whose rating fits the current BUDGET (campaign step + reward tier), measured
// against what the graft would ADD to the current build (an ability you already have adds nothing new).
export const KW_WEIGHT = { flying: 2.5, deathtouch: 3, trample: 1, firstStrike: 1.5, lifelink: 1.5, vigilance: 0.5, haste: 0.5 };
export const COMBOS = [
  [['flying', 'deathtouch'], 2], [['firstStrike', 'deathtouch'], 2], [['doubleStrike', 'trample'], 2],
  [['doubleStrike', 'deathtouch'], 3], [['doubleStrike', 'lifelink'], 1.5], [['flying', 'lifelink'], 1],
];
function kwValue(kws, power) {
  let v = 0;
  for (const k of Object.keys(kws)) v += k === 'doubleStrike' ? Math.max(1.5, power) : (KW_WEIGHT[k] || 1);
  return v;
}
function comboValue(kws) { return COMBOS.reduce((a, [ks, b]) => a + (ks.every(k => kws[k]) ? b : 0), 0); }
/** Printed card rating (used for display and coarse gating). */
export function powerRating(card) {
  if (card.kind !== 'creature') return 0;
  return +(card.power + card.toughness + kwValue(card.keywords, card.power) + comboValue(card.keywords)).toFixed(2);
}
/** Marginal rating of grafting `card` onto `evo` (new abilities + new combos with existing abilities). */
export function graftRating(card, evo) {
  if (card.kind !== 'creature') return 0;
  const fresh = Object.fromEntries(Object.keys(card.keywords).filter(k => !(evo.keywords || {})[k]).map(k => [k, 1]));
  const before = comboValue(evo.keywords || {});
  const after = comboValue({ ...(evo.keywords || {}), ...card.keywords });
  const ds = card.keywords.doubleStrike && !(evo.keywords || {}).doubleStrike ? Math.max(1.5, (evo.power || 0) + card.power) - Math.max(1.5, card.power) : 0;
  return +(card.power + card.toughness + kwValue(fresh, card.power) + ds + (after - before)).toFixed(2);
}
/** Global campaign step: act*8 + layer depth (0..23). */
export const stepOf = (act, depth) => act * 8 + depth;
/** Budget for a single creature in a pack. Early ~4 (2/2 vanilla, 2/1, 1/1 flier), late act III ~ 17. */
export function creatureBudget(step, tier = 'battle') {
  return 4 + step * 0.5 + (tier === 'elite' ? 2.5 : tier === 'boss' ? 4 : tier === 'shrine' ? 1 : 0);
}
/** Spell gating by gem cost: costly spells arrive later. */
export const spellMaxCost = (step, tier = 'battle') => Math.min(4, 1 + Math.floor(step / 4) + (tier === 'elite' || tier === 'boss' ? 1 : 0));
