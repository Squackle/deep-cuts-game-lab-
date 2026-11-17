// v1.5.0 card zones read model (pure, DOM-free; used by the battle HUD and tests).
/** v1.5.0 Exile zone (real state): your exiled library cards (s.deck.exile) and defeated foes exiled by effects
 * (units flagged exiled, e.g. The Scarab God's reanimation). A foe returned to its owner's hand is not in exile. */
/** v1.6.0 mandatory discards. `now` = cards that must be discarded before acting further (e.g. Mask of Memory);
 *  `limit` = hand-limit overflow that must be cleared before End Turn. `need` is what the player must still do. */
export function discardRequirement(s) {
  const d = s?.deck; if (!d || s.phase !== 'player') return { need: 0, now: 0, limit: 0, blocking: false };
  const now = Math.max(0, d.pendingDiscards || 0), limit = Math.max(0, (d.hand?.length || 0) - (d.capacity ?? Infinity));
  const need = Math.max(now, limit);
  return { need, now, limit, blocking: now > 0, text: need ? `Discard ${need} card${need > 1 ? 's' : ''} to continue` : '',
    detail: now > 0 ? 'A card effect requires it before you can cast.' : need ? `Hand limit ${d.capacity}: discard before ending your turn.` : '' };
}
export function exileZone(s) {
  const yours = (s?.deck?.exile || []).map(e => ({ id: e.id || e }));
  const gone = side => (s?.units || []).filter(u => u.exiled && !u.inHand && !u.hero && u.side === side).map(u => ({ uid: u.uid, name: u.name, why: u.exiledBy || 'Exiled by an effect' }));
  const foes = [...gone('enemy'), ...gone('player').map(f => ({ ...f, name: f.name + ' (your ally)' }))];
  return { yours, foes };
}
