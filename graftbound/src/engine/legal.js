// v0.6 centralized legal-action evaluator (v0.8: + tactical stances). Pure: reuses the combat engine's own rules,
// so "is anything left to do?" can never disagree with what the engine would accept.
import { moveOptions, attackTargets, castOptions, interactOptions, equipmentOptions, stanceBlockReason, intents, player } from './combat.js';
import { spellCost } from './spells.js';
import { resolveCard } from '../cards/catalog.js';

/** Guard is worth offering only when a foe actually threatens you; Channel only when +1 mana unlocks a cast. */
export function usefulStances(s) {
  const out = [];
  if (!stanceBlockReason(s, 'guard')) {
    const p = player(s); const its = intents(s);
    const threatened = its.some(i => (i.damage > 0 && i.target === p.uid) || ((i.kind === 'slam' || i.kind === 'fire') && (i.tiles || []).some(t => t.x === p.x && t.y === p.y)));
    if (threatened) out.push('guard');
  }
  if (!stanceBlockReason(s, 'channel')) {
    const unlock = s.spellbook.some(e => !s.p.cast[e.id] && s.p.mana < spellCost(s, e.id) && s.p.mana + 1 >= spellCost(s, e.id) && resolveCard(e.id).target !== 'empty');
    if (unlock) out.push('channel');
  }
  return out;
}

export function getLegalPlayerActions(s) {
  if (!s || s.phase !== 'player') return { move: [], attack: [], spells: [], interact: [], stances: [], any: false };
  const move = moveOptions(s), attack = attackTargets(s).map(u => u.uid), interact = interactOptions(s);
  const spells = s.spellbook.map(e => e.id).filter(id => castOptions(s, id).length > 0);
  const stances = usefulStances(s);
  const equipment=equipmentOptions(s);
  return { move, attack, spells, interact, stances, equipment, any: move.length + attack.length + spells.length + interact.length + stances.length + equipment.length > 0 };
}
export const hasLegalPlayerAction = s => getLegalPlayerActions(s).any;
/** Auto-end gate: only during an idle player phase (never mid-animation, mid-targeting or after victory). */
export function shouldAutoEnd(s, { busy = false, targeting = false, enabled = true } = {}) {
  return !!(enabled && s && s.phase === 'player' && !busy && !targeting && !hasLegalPlayerAction(s));
}
