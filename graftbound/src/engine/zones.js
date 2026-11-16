// v1.5.0 card zones read model (pure, DOM-free; used by the battle HUD and tests).
/** v1.5.0 Exile zone (real state): your exiled library cards (s.deck.exile) and defeated foes exiled by effects
 * (units flagged exiled, e.g. The Scarab God's reanimation). A foe returned to its owner's hand is not in exile. */
export function exileZone(s) {
  const yours = (s?.deck?.exile || []).map(e => ({ id: e.id || e }));
  const gone = side => (s?.units || []).filter(u => u.exiled && !u.inHand && !u.hero && u.side === side).map(u => ({ uid: u.uid, name: u.name, why: u.exiledBy || 'Exiled by an effect' }));
  const foes = [...gone('enemy'), ...gone('player').map(f => ({ ...f, name: f.name + ' (your ally)' }))];
  return { yours, foes };
}
