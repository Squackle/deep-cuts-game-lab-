// GRAFTBOUND v1.6.0 — centralized creature-graft LEVELS.
//
// A graft's level is the number of absorbed copies of the same card that carry its reviewed trait, capped at the
// trait's `max` (never more than 3). Duplicates still add the card's printed power/toughness exactly as before;
// the trait itself is registered ONCE and its strength is read from this table (no stacked duplicate triggers).
//
// Every value scales something the printed card already does (token size, drain amount, draws, shields...).
// Traits whose effect does not scale sensibly are capped at level 1: duplicates then add printed P/T only.
// Pure and DOM-free: battle state stores only {traitId: level}, so saves and ranked replays stay deterministic.
import { resolveCard } from './catalog.js';
import { traitOf } from './trait-registry.js';

export const GRAFT_LEVEL_CAP = 3;
const L = (max, levels, text) => Object.freeze({ max, levels: Object.freeze(levels.map(Object.freeze)), text });
/** levels[i] = parameters at level i+1. `text(p)` renders those parameters for the UI. */
export const GRAFT_LEVELS = Object.freeze({
  ophiomancer: L(3, [{ token: [1, 1] }, { token: [2, 2] }, { token: [2, 3] }], p => `Snake ${p.token.join('/')} with Deathtouch`),
  rabblemaster: L(3, [{ token: [1, 1], bonus: 1 }, { token: [2, 1], bonus: 1 }, { token: [2, 2], bonus: 1 }], p => `Goblin ${p.token.join('/')} with Haste; attacking Goblins +${p.bonus} hero attack`),
  brimaz: L(3, [{ token: [1, 1] }, { token: [2, 2] }, { token: [2, 3] }], p => `Cat Soldier ${p.token.join('/')} on hero attack`),
  pyromancer: L(3, [{ token: [1, 1] }, { token: [2, 1] }, { token: [2, 2] }], p => `Elemental ${p.token.join('/')} per instant/sorcery`),
  talrand: L(3, [{ token: [2, 2] }, { token: [2, 3] }, { token: [3, 3] }], p => `Flying Drake ${p.token.join('/')} per instant/sorcery`),
  mystic: L(3, [{ token: [1, 1] }, { token: [1, 2] }, { token: [2, 2] }], p => `Flying Bird Illusion ${p.token.join('/')} per instant/sorcery`),
  skeleton: L(3, [{ token: [1, 1], cost: 2 }, { token: [2, 2], cost: 2 }, { token: [2, 2], cost: 1 }], p => `Skeleton ${p.token.join('/')}; reassemble for ${p.cost} mana`),
  hornetQueen: L(3, [{ count: 4, token: [1, 1] }, { count: 4, token: [1, 2] }, { count: 5, token: [1, 2] }], p => `${p.count} Flying Deathtouch Hornets ${p.token.join('/')} at battle start`),
  hermit: L(3, [{ count: 4, token: [2, 2] }, { count: 4, token: [2, 3] }, { count: 5, token: [2, 3] }], p => `${p.count} Squirrels ${p.token.join('/')} at battle start (+1/+1 bonus included)`),
  nadir: L(2, [{ token: [1, 1] }, { token: [2, 2] }], p => `Pay 1: +1/+1 and a ${p.token.join('/')} Tentacle`),
  bloodArtist: L(3, [{ drain: 1, heal: 1 }, { drain: 1, heal: 2 }, { drain: 2, heal: 2 }], p => `Each other death: drain ${p.drain}, heal ${p.heal}`),
  zulaport: L(3, [{ drain: 1 }, { drain: 1, heal: 2 }, { drain: 2, heal: 2 }], p => `Each ally death: drain ${p.drain}${p.heal ? `, heal ${p.heal}` : ''}`),
  ayara: L(3, [{ drain: 1 }, { drain: 1, heal: 2 }, { drain: 2, heal: 2 }], p => `Black ally enters: drain ${p.drain}${p.heal ? `, heal ${p.heal}` : ''}`),
  soulWarden: L(2, [{ heal: 1 }, { heal: 2 }], p => `Each creature entering heals ${p.heal}`),
  sheoldred: L(3, [{ heal: 2 }, { heal: 3 }, { heal: 4 }], p => `Each draw heals ${p.heal}`),
  guttersnipe: L(3, [{ damage: 2 }, { damage: 3 }, { damage: 3, splash: 1 }], p => `Each instant/sorcery deals ${p.damage} to the nearest foe${p.splash ? ` and ${p.splash} to the next nearest` : ''}`),
  electrofield: L(3, [{ damage: 1, shield: 2 }, { damage: 1, shield: 3 }, { damage: 2, shield: 4 }], p => `Spells ping ${p.damage}; starting shield ${p.shield}`),
  spitfire: L(3, [{ empower: 3 }, { empower: 4 }, { empower: 5 }], p => `Noncombat damage to a foe: +${p.empower} hero attack this turn`),
  stormkiln: L(3, [{ start: 0 }, { start: 1 }, { start: 2 }], p => `Treasure per spell; start with ${p.start} Treasure`),
  ascendant: L(3, [{ buff: 3 }, { buff: 4 }, { buff: 5 }], p => `At 30+ health: +${p.buff}/+${p.buff} and Flying`),
  visionary: L(2, [{ draw: 1 }, { draw: 2 }], p => `Draw ${p.draw} at battle start`),
  mulldrifter: L(2, [{ draw: 2 }, { draw: 3 }], p => `Draw ${p.draw} at battle start`),
  oracle: L(2, [{ look: 2 }, { look: 3 }], p => `Look at the top ${p.look}, take one`),
  geists: L(2, [{ stun: 2, bossStun: 1 }, { stun: 3, bossStun: 1 }], p => `Freeze a foe for ${p.stun} turns (bosses ${p.bossStun})`),
  archaeomancer: L(2, [{ uses: 1 }, { uses: 2 }], p => `First ${p.uses} spell${p.uses > 1 ? 's' : ''} each encounter recover a Graveyard card`),
  witness: L(2, [{ uses: 1 }, { uses: 2 }], p => `Return a Graveyard spell ${p.uses}× per battle`),
  pridemate: L(3, [{ start: 0 }, { start: 1 }, { start: 2 }], p => `Life gain: +1/+1 counter; start with ${p.start}`),
  vito: L(2, [{ bonus: 0 }, { bonus: 1 }], p => `Life gain makes the nearest foe lose that much${p.bonus ? ` +${p.bonus}` : ''} life (not damage)`),
  // Capped at level 1: the printed effect is a single switch or would scale unsafely. Duplicates add printed P/T only.
  archmage: L(1, [{}], () => 'Spells draw a card'), morbid: L(1, [{}], () => 'First death each phase draws'),
  mentor: L(1, [{}], () => 'Small ally enters: pay 1 to draw'), ivy: L(1, [{}], () => 'Green ally: +1/+1 counter'),
  lambholt: L(1, [{}], () => 'Ally arrivals: hero +1/+1'), wurmcoil: L(1, [{}], () => 'Splits into two Wurms'),
});
const DEFAULT_DEF = L(1, [{}], () => '');
export const levelDef = id => GRAFT_LEVELS[id] || DEFAULT_DEF;
export const clampLevel = (id, n) => Math.max(1, Math.min(levelDef(id).max, GRAFT_LEVEL_CAP, n | 0));
/** Parameters for a trait at a level (1-based). */
export const traitParams = (id, level = 1) => levelDef(id).levels[clampLevel(id, level) - 1];
export const levelText = (id, level = 1) => levelDef(id).text(traitParams(id, level));

/** {traitId: level} from the absorbed list, in absorption order (deterministic). */
export function traitLevelsOf(absorbed = []) {
  const counts = {};
  for (const a of absorbed) { const c = resolveCard(a.cardId); const id = c?.trait || traitOf(c)?.id; if (id) counts[id] = (counts[id] || 0) + 1; }
  return Object.fromEntries(Object.entries(counts).map(([id, n]) => [id, clampLevel(id, n)]));
}
/** Battle-time lookup: params for the hero's current level of a trait (level 1 if absent from older saves). */
export const lv = (s, id) => traitParams(id, s?.traitLevels?.[id] || 1);

/** What absorbing ANOTHER copy of `cardId` would do, for reward previews and the post-absorb banner. */
export function duplicatePreview(absorbed, cardId) {
  const c = resolveCard(cardId); const id = c?.trait || traitOf(c)?.id; if (!id) return null;
  const now = traitLevelsOf(absorbed)[id] || 0; if (!now) return null;
  const next = clampLevel(id, now + 1);
  return { traitId: id, name: c.name, from: now, to: next, maxed: next === now, before: levelText(id, now), after: levelText(id, next) };
}
