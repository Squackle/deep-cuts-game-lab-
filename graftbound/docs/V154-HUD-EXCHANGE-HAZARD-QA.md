# GRAFTBOUND v1.3.9-beta — HUD, Graft Exchange and lava pathing

Owner feedback on November 15, 2026: unit inspection was blocked by Library/Graveyard, Ground and Inscribed Page details were clipped, Graft Exchange gave no card-effect detail, and movement/attack counts exceeded the hero card. An additional combat report found enemies refusing survivable mandatory lava crossings.

## Implemented

- Both creature and terrain inspectors share an obstacle-aware HUD dock. Available space excludes hero plate, standalone action counts, Library/Graveyard, spell hand, End Turn and top buttons. Unit information scrolls if constrained instead of appearing beneath the Library.
- Tile descriptions use a taller 148-pixel preferred dock (108-pixel minimum), readable wrapped text and the full Details modal. The previous two-line clamp is removed.
- Movement and attack counts are outside the hero card in an independent HUD badge; mana, Bank and Treasure wrap within the hero card.
- Every Graft Exchange choice displays its effective GRAFTBOUND ability summary and exactly what it releases. A separate Details button opens the existing full card viewer, returning safely to the choice; Release requires explicit confirmation.
- When a mandatory route across nonlethal lava ties the cost of staying still, enemy AI recognizes forward progress. Safe detours are preferred, and lethal paths still cannot be selected. No printed card characteristics or replay randomness are changed.
- Updated gameplay rules fingerprint: graftbound-rules-1.3.9-beta, ranked challenge revision 22. Previously recorded ranked decisions are not silently replayed against changed AI.

## Validation and rollback

Deterministic cases for portrait/desktop inspector placement, exchange UI, separated counters, survivable and lethal lava movement, and ranked versioning. Full repository and Cloudflare deployment checks are required for the actual release SHA. Real-device behavior remains to be verified with playtesting.

Scope is exclusively GRAFTBOUND. No production DeepCutsEDH site, public scores, profiles, billing, or database changes. To roll back, revert the Game Lab-only PR; existing saves are preserved.
