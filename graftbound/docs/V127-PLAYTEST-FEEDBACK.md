# GRAFTBOUND v1.2.7-beta — Playtest feedback fixes (Game Lab only)

**Scope:** `graftbound/**` in `Squackle/deep-cuts-game-lab-`. No modifications to other Game Lab titles, the Deep Cuts EDH main website, leaderboard/storage service, or save keys. No new borrowed card artwork. Old ranked/replay versions remain separate.

## Player-reported fixes

1. **All reward packs**: Reset the independent reward-screen scroll on each showing, including Pack 2 of 3 / Pack 3 of 3; center the card row on narrow screens when opened and whenever a card is selected. Avoid spilling out of the mobile viewport. Never scroll the entire page to center a card.
2. **Token models**: Original procedurally drawn, separately animated and distinctive Soldier (shield/spear/armor), Elemental (bright flame silhouette), Drake (beak/wings), and Cat Soldier (ears/weapon) models. Existing game and Scryfall artwork isn't copied into sprites. Summon models are selected from the token's actual name/trait, not a shared `sproutling` image.
3. **Black smoke**: Umbral spell casts now release short dark mist from the caster, with small matching feedback for Blood Artist, Vito, and Sheoldred graft triggers. Welcoming Vampire is a *white* Magic card and is not in this curated pool; it should not be assigned a false black keyword or ability.
4. **Pyroclasm**: Its GRAFTBOUND adaptation now deals damage to *all* living creatures, including the hero, summoned allies and enemies. Friendly-fire damage never inflates the enemy damage-dealt score; high card levels still increase damage.
5. **Auras**: All Aura casts now emit an explicit visual `auraCast` event from the hero to the chosen bearer, followed by the attachment effect. Gift of Immortality gets a stronger golden beam and light burst. The animation reads authoritative events, never mutates gameplay.
6. **Raise the Alarm levels**: Two separate friendly Soldiers stay on distinct empty tiles. The GRAFTBOUND level 1/2/3 adaptation now makes 1/1, 2/2 and 3/3 tokens, respectively (not affected by Arcane/Channel, retaining a clear distinction from original Magic's printed 1/1). Upgrade comparison uses live scaled spell text and updated adaptation.
7. **Graft abilities**: Trigger-bearing creatures display an ability chip and the actual reviewed GRAFTBOUND adaptation in the reward comparison and release-graft selection. Long ability descriptions wrap rather than overflow the dialog.
8. **Graveyard face-up**: Hide the otherwise visible mirrored 3D card-back face and force the latest actual graveyard card's play/front face; leave Library face-down and private.
9. **Leyline/terrain inspect**: Keep inspection text within a bounded, scrollable panel, prevent long lines and side overlap, especially on phones.
10. **Card-draw spells**: Healing Hands and Revitalize now each draw one real card from the encounter Library; Divination retains its draw-two implementation. Draws emit the same movement events and are deterministic in deck mode.
11. **No cyan card rectangle**: Remove the oversized rarity pseudo-element rectangle around selected booster cards; use contained rarity shadows instead.
12. **Toxrill**: Each of the player and enemy end steps adds a persistent slime counter and applies the matching -1/-1. Crucially, creatures reduced to 0 Toughness now die via the standard state-based death/Slug trigger *before* health is clamped to 0. Show live slime counts beside units, in hero status and inspection, with animation and tooltip.

## Rules and reproducibility

- **Rules:** `graftbound-rules-1.2.7-beta`, ranked challenge revision **14**, app package version `1.2.7-beta`. Card pool remains `real-pool-110-v6`; no new card metadata or printed stats.
- **Save migration:** Existing `RUN_VERSION` and battle saved-schema version remain unchanged. New action/VFX events and optional counters are backward-compatible. Persistent local storage keys are unchanged.
- **Production rollback:** Revert this GRAFTBOUND-only PR to prior Game Lab production `ae321906e879db4490411e07d939c7fccd52f2a5`. No promotion to `Squackle/deep-cuts-edh`.

## Automated verification

- `npm run assets` passes. `python3 tools/audit_sprite_bounds.py`: **21 original sprite sheets, zero warnings**.
- `node --check` on every `src/**/*.js` module passes.
- `npm test` after assets: **284 total; 283 passed; 0 failed; 1 offline-only live Scryfall test skipped**. New `tests/v127-feedback.test.mjs` covers each gameplay fix and UI invariants, and existing tests that previously assumed 1/1 at all levels were updated to the new owner-requested adaptation.
- Browser smoke test from local Python server is blocked by sandbox navigation policy (`net::ERR_BLOCKED_BY_ADMINISTRATOR`). No physical iPhone/Safari or end-to-end gameplay acceptance is claimed; owner should verify mobile pack and Layout after Game Lab deployment. Network-enabled GitHub CI must re-verify 132 curated Scryfall entries on the *exact* release head, Unified Game Lab checks and release coordination before any merge.
