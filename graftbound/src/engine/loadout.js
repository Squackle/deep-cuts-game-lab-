// v1.1 tactical spell loadout. An expedition keeps every learned real card;
// only equipped inscriptions occupy active combat slots. No discards, no randomness.
export const BASE_HAND_CAPACITY = 7;
export const MAX_HAND_CAPACITY = 10;
export const handCapacity = run => Math.max(BASE_HAND_CAPACITY, Math.min(MAX_HAND_CAPACITY, run.handCapacity || BASE_HAND_CAPACITY));
export function normalizedEquipped(run) {
  const learned = new Set((run.spellbook || []).map(e => e.id));
  const ordered = [];
  for (const id of run.equippedSpellIds || []) if (learned.has(id) && !ordered.includes(id) && ordered.length < handCapacity(run)) ordered.push(id);
  // Only synthesize a default for legacy saves, never silently re-equip a spell the player removed.
  if (!Array.isArray(run.equippedSpellIds)) for (const e of run.spellbook || []) if (ordered.length < handCapacity(run) && !ordered.includes(e.id)) ordered.push(e.id);
  return ordered;
}
export function combatSpellbook(run) {
  const active = new Set(normalizedEquipped(run));
  return run.spellbook.filter(e => active.has(e.id)).map(e => ({ ...e }));
}
export function refreshLoadout(run) { run.equippedSpellIds = normalizedEquipped(run); return run.equippedSpellIds; }
export function setSpellEquipped(run, id, equipped) {
  if (run.phase === 'battle') throw new Error('Cannot change spells during combat');
  if (!run.spellbook.some(e => e.id === id)) throw new Error('Spell is not learned');
  // A deliberate empty loadout is allowed; newly learned cards auto-equip only if a slot remains.
  const current = (run.equippedSpellIds || []).filter(x => run.spellbook.some(e => e.id === x));
  if (!equipped) run.equippedSpellIds = current.filter(x => x !== id);
  else if (!current.includes(id)) {
    if (current.length >= handCapacity(run)) throw new Error('All active spell slots are full; unequip an inscription first');
    run.equippedSpellIds = [...current, id];
  }
  return run.equippedSpellIds;
}
export function grantHandSlot(run) {
  if (handCapacity(run) >= MAX_HAND_CAPACITY) throw new Error('Spell hand is already at maximum capacity');
  run.handCapacity = handCapacity(run) + 1;
  return run.handCapacity;
}
