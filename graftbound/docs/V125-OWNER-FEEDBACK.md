# GRAFTBOUND v1.2.5-beta — Owner playtest feedback

Scope: **Game Lab only**, all changes within `graftbound/**`. Continues v1.2.4-beta. No production Deep Cuts EDH website, shared Lab catalog, D1, public account, score, or save-key changes.

## Gameplay and card collection
- Curated real-card pool expands to **68 creatures and 21 spells**, all with bundled printed facts and documented tactical adaptations. The larger pool remains subject to live Scryfall checks in CI; adding cards does not guarantee any specific draw.
- Magic printing rarity is explicitly labeled **Common / Uncommon / Rare / Mythic Rare** on card faces. A visual glint for Rare/Mythic is a rarity indicator, **not a claim that the printing is physically foil or shiny**.
- Bosses remain **deterministically seed-selected**, one of two per act (six total). The same act/seed gives the same result; varied node seeds can select the other boss.
- Every non-tutorial generated map has a single **Inscribed Page** rune tile. End your turn on it to draw one extra card, before the opponent acts. Deck zones and graveyard reshuffle remain deterministic.
- Arc Lightning may jump to its next two other enemies at any distance (the initial hit plus two bounces); tie-breaking is deterministic by distance/UID. Printed-card adaptation is explicitly stated.
- **Drain Life X** asks for a whole-number X from 1 to the affordable amount (cap 99), previews mana and damage, then uses an explicit replay-validated `xValue`. Game cost is 2 + X before enemy taxes; healing is actual health damage dealt. The printed black-mana-only restriction is not modeled. Original free-cast behavior still charges chosen X.
- **Krenko** counts all friendly Goblin creature types, including initially placed printed Goblin creatures and itself, rather than just Goblin tokens. Existing bosses' seeded abilities and end-step triggers retain prior regression coverage.
- Printed creature types display in enemy inspection where defined. Achievement text replaces stale boss names; historical achievement ID keys are kept to protect existing saves.

## Presentation
- Rare/Mythic badges remain visible beyond the booster reveal. Armory slots and collection entries display actual card faces (live card images when available, deterministic fallback frames offline).
- Raise the Alarm's two summon events each emit a separate visible projectile from the caster to its own spawn tile.
- Drain Life uses an original shadow-hand / heart-pull visual; elemental deaths display fire/frost/void/lightning/poison-themed particles and reactions instead of one universal effect.
- Tactical battlefield hero scaling is capped at 1.22 and bosses reduced to 0.8 to preserve map readability; this only changes presentation, not stats.
- The Mask of Memory is now anchored on the face within each 48-pixel character animation cell rather than at the top of the cell; the collar also moves down to the neck, addressing stray floating gold pixels.

## Testing and release caveats
- `npm run assets` and `npm test` must pass locally and on GitHub, including new deterministic tests for boss seeds, Krenko counting, Arc Lightning range, chosen Drain Life X, Inscribed Page draw, and rarity UI.
- GitHub CI's network-enabled Scryfall audit is required to certify all expanded card facts.
- Full physical iPhone/Android visual playthrough, many-gear mask/rig screenshots, and high-health 3D camera composition have not been independently certified; keep **beta** label.
- Only merge into the Game Lab `main` after required CI checks. The Game Lab release is not permission to promote to the separate Deep Cuts EDH main site.
