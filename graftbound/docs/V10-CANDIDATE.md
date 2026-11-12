# GRAFTBOUND — v1.0 Game Lab Release Notes

**Base:** Game Lab `Squackle/deep-cuts-game-lab-` main `2b4600611751df2f63df82419064ce3f188aaf11` (v0.9). Game Lab lane only; no main DeepCutsEDH production promotion. This document records implementation and release limitations.

## Gameplay and rules delivered

- **Guard is a full defensive commitment**: requires the *entire original movement budget* remaining, consumes **all** of that movement plus the attack. Guard is unavailable after moving. The displayed cost scales naturally with movement grafts and grounded status. Existing Channel remains 1 movement point + attack.
- **Explicit elemental affinities**, not blanket Magic color immunity: Cinderling resists fire and is weak to frost; Shardling resists lightning and is weak to fire. Spell damage only. Floating text and inspection show the adjustments. Shock has lightning identity for crystal and affinity interactions.
- **Deterministic rules isolation**: rules version `graftbound-rules-1.0.0`, challenge revision 4. No ranked replay from previous rules versions can mix. No save schema or key migration.

## Presentation delivered

- The existing 17 spell VFX identities now have lightweight distinct **aftermath rune shapes**: sparks, storm, embers, inferno, roots, snowflake, void, spores, sunburst, ward, wind. Reduced motion and Instant suppress additional afterimages; effects are transient, cosmetic, and do not alter terrain state.
- Guard erects a readable six-sided blue ward with a secondary rising ring; Channel keeps its distinct purple animation.
- The missing v0.7 `src/ui/pack-opening.js` concept is now reimplemented as original SVG engravings for four wrappers: Field, Elite, Boss, and Folio (plus compatible shrine/graftsmith categories). This changes only presentation, not loot odds or card legality. Boss and Elite still retain their actual reward-generator constraints.
- Rewards display a rank and omen, hover/hand behavior retains the horizontal scroll position for spellbooks exceeding seven cards. **No mandatory seven-card limit or discard was added**; these require separate gameplay/balance approval and save/replay handling.
- Hero portrait shows interactive, keyboard-accessible glow markers for **only the visible evolved graft slots and effects**, with a textual description. The existing two-page upgraded spellbook remains.
- Each Elite encounter gains two exterior ritual monuments and each Boss encounter gains four. Decorative only, located beyond navigable grid; three biomes use different stone and glow materials.
- The Grub sprite generator widened its frames 32→44 pixels, preserving the full tail. Every other enemy sheet now uses individually minimized, deterministic horizontal bleed in the generator, preserving its authored proportions and vertical foot pivot, to avoid cropping attacking limbs and casting gestures; the manifest records each physical width.
- A reusable `tools/audit_sprite_bounds.py` checks all generated sprite sheets and reports frame-edge contacts / empty frames; Pillow required. Results are in the release bundle.

## Verification performed

- Local `cd graftbound && npm test`: all tests passed, including targeted Guard, affinity, pack, aftermath, arena geometry, and grub sheet tests.
- Local deterministic `python3 tools/build_assets.py`: generated original sprite sheets and textures (21 sprite sheets, 19 graft parts, 16 materials, 11 foliage entries). Non-Grub output was regenerated, not manually repainted.
- Local `python3 tools/audit_sprite_bounds.py --strict`: **0 edge contacts, 0 missing, 0 empty, 0 dimension-invalid frames** across all 21 sprite sheets. Per-sprite padding minimizes invisible overdraw. Rendering on actual devices is not certified.
- Static JS syntax checks and `git diff --check` pass.

## Incomplete release gates / deferred scope (do not misrepresent as finished)

1. **Art direction:** a fully commissioned or hand-painted custom treatment of every foe/biome is not accomplished by procedural ornamentation. All mechanical edge contacts have been fixed, but animation artistry still needs a human visual review.
2. **Browser + device checks:** no successful desktop/mobile E2E or screenshot acceptance on this candidate in the available environment; run the v0.8/v0.6/general browser suites on a served, full checkout, one at a time. Physical-device tests also remain.
3. **Scryfall:** the live verifier could not be completed in the isolated build environment. A verified discrepancy was corrected: Drain Life printed cost is `{X}{1}{B}` (its GRAFTBOUND fixed-mana adaptation is still labeled). Run `node tools/verify-real-pool.mjs` from a network-enabled environment to certify every entry.
4. **Balance:** seven-card maximum/Mystery +1 capacity and extensive resistances are **not enabled**. Design separately with playtest evidence. Existing victory balance could change from the selective enemy affinities; simulate before release.
5. **Performance:** confirm particle budgets and background animation performance on lower-end devices; cosmetic rings are cheap but unmeasured on real hardware.
6. **Production ranked site:** separately open `Squackle/deep-cuts-edh` PR #133 still pins much older rules; don't promote GRAFTBOUND scoring without separately coordinating the updated verifier/challenge revision. Do not touch D1, production site, profiles or leaderboard.

## Release safety

- No writes outside `graftbound/**` in this candidate. Preserve existing `living-card/` redirect, local save keys, Magic card pool and Scryfall artwork references.
- Review full source diff, run fresh CI and browser screenshots, verify ranked replays, then follow the owner-approved Game Lab deployment sequence; main-site promotion still needs separate authorization.
- Rollback target: previous Game Lab `main` SHA `2b4600611751df2f63df82419064ce3f188aaf11` (not the production DeepCutsEDH site).
