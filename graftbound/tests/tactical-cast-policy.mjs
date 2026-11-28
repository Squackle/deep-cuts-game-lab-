// Diagnostic-only policy: evaluate legal casts on cloned battle states.
import { cast, castOptions } from '../src/engine/combat.js';
import { resolveCard } from '../src/cards/catalog.js';

function utility(s) {
  if (s.phase === 'lost') return -100000;
  if (s.phase === 'won') return 100000;
  let score = 0;
  for (const u of s.units) {
    if (!(u.hp > 0)) continue;
    const st = u.statuses || {};
    const sign = u.side === 'player' ? 1 : -1;
    const weight = u.hero ? 3 : 1;
    score += sign * weight * (u.hp + 2 + .4 * u.power + .25 * u.toughness +
      .5 * (st.shield || 0) + .35 * (st.damagePrevention || 0) +
      .5 * (st.empowered || 0) - .6 * (st.weakened || 0) -
      .7 * (st.poison || 0) - 2 * (st.stunned || 0));
  }
  if (s.deck) score += .6 * s.deck.hand.length;
  return score;
}
export function selectTacticalCast(s, id) {
  const c = resolveCard(id); if (!c || c.effect === 'blink_step') return null;
  // Only test explicit meaningful modes; target iteration order is engine order.
  const modes = id === 'mtg:healing-salve' ? ['heal', 'prevent'] : [null];
  const before = utility(s);
  let best = null;
  for (const mode of modes) for (const target of castOptions(s, id, mode)) {
    const candidate = structuredClone(s);
    cast(candidate, id, target.x, target.y, 1, mode);
    const value = utility(candidate) - before;
    if (value > 0 && (!best || value > best.value)) best = { ...target, mode, value };
  }
  return best;
}
