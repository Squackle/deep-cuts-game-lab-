// v0.8 transparent effective-strength estimate (encounter tuning only; never secretly changes your stats).
// Offense and defense are estimated separately and combined with a GEOMETRIC mean, so a build cannot score high
// by stacking one side, and synergies are counted once (e.g. Double Strike doubles power once; Deathtouch is a
// flat "kills a non-legendary foe per strike" bonus rather than being multiplied by Double Strike again).
import { spellNumbers } from './spells.js';
import { resolveCard } from '../cards/catalog.js';

const DAMAGE_EFFECTS = new Set(['ember_dart', 'chain_lightning', 'starfall', 'soul_siphon', 'firestorm', 'wither', 'rootsnare']);
const DEFENSE_EFFECTS = new Set(['barkskin', 'mending_rain']);

/** Spell burst: damage from the two strongest damage spells you can afford in one battle's opening mana pool. */
export function spellBurst(spellbook = [], stats = {}) {
  const dmg = spellbook.map(e => { const c = resolveCard(e.id); return c && DAMAGE_EFFECTS.has(c.effect) ? { cost: c.cost, d: spellNumbers(e.id, e.level, stats.arcane || 0).reduce((a, x) => a + x, 0) } : null; })
    .filter(Boolean).sort((a, b) => b.d / b.cost - a.d / a.cost);
  let mana = (stats.maxMana || 3) + (stats.manaRegen || 1), out = 0;
  for (const x of dmg.slice(0, 3)) if (x.cost <= mana) { mana -= x.cost; out += x.d; }
  return out;
}
export function strengthOf(evo, { spellbook = [], stats = {} } = {}) {
  const k = evo.keywords || {}; const hp = stats.maxHealth || (6 + evo.toughness);
  let offense = evo.power * (k.doubleStrike ? 2 : 1) * (k.firstStrike ? 1.1 : 1) + (k.deathtouch ? 4 : 0) + (k.trample ? evo.power * 0.15 : 0) + (k.haste ? 0.5 : 0);
  offense += spellBurst(spellbook, stats) * 0.6;
  let defense = hp * (1 + (k.lifelink ? 0.25 : 0) + (k.firstStrike ? 0.1 : 0)) + (k.flying ? 3 : 0) + (k.vigilance ? 1 : 0);
  defense += spellbook.filter(e => { const c = resolveCard(e.id); return c && DEFENSE_EFFECTS.has(c.effect); }).reduce((a, e) => a + spellNumbers(e.id, e.level, stats.arcane || 0)[0], 0) * 0.5;
  const score = 2 * Math.sqrt(Math.max(0.5, offense) * Math.max(1, defense) / 3);
  const profile = { flying: !!k.flying, spells: spellbook.length, melee: evo.power >= 6 || !!k.deathtouch || !!k.doubleStrike, tank: hp >= 24 || !!k.lifelink };
  return { score: +score.toFixed(2), offense: +offense.toFixed(2), defense: +defense.toFixed(2), profile };
}
/** Expected strength along the campaign (calibrated from the greedy bot: its median build at each step). */
export const expectedStrength = step => 3 + 2 * step;
