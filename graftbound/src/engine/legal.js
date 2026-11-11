// v0.6 centralized legal-action evaluator. Pure: reuses the combat engine's own movement, attack, spell and
// interaction rules, so "is anything left to do?" can never disagree with what the engine would accept.
import { moveOptions, attackTargets, castOptions, interactOptions } from './combat.js';

export function getLegalPlayerActions(s) {
  if (!s || s.phase !== 'player') return { move: [], attack: [], spells: [], interact: [], any: false };
  const move = moveOptions(s), attack = attackTargets(s).map(u => u.uid), interact = interactOptions(s);
  const spells = s.spellbook.map(e => e.id).filter(id => castOptions(s, id).length > 0);
  return { move, attack, spells, interact, any: move.length + attack.length + spells.length + interact.length > 0 };
}
export const hasLegalPlayerAction = s => getLegalPlayerActions(s).any;

/** Auto-end gate: only during an idle player phase (never mid-animation, mid-targeting or after victory). */
export function shouldAutoEnd(s, { busy = false, targeting = false, enabled = true } = {}) {
  return !!(enabled && s && s.phase === 'player' && !busy && !targeting && !hasLegalPlayerAction(s));
}
