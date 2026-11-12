# GRAFTBOUND v1.1 — Living World Release

Source scope: `graftbound/**` only. The DeepCutsEDH production site, profiles, D1, ranked services and other games are untouched.

## Rules and save safety
- Seven equipped spell slots by default. All learned real cards remain stored in the two-page Spellbook; equip or unequip only outside combat. New spell rewards auto-equip if there is capacity, otherwise persist as stored inscriptions. Mystery events can raise capacity to 10 (one slot per offer). No discard.
- Save RUN_VERSION=6. Existing v5 runs migrate additively, selecting their first seven learned spells as active while preserving the entire spell collection; already-running encounters keep their established spellbook snapshot.
- `graftbound-rules-1.1.0`, Expedition challenge revision 5. No old ranked score/replay is mixed with updated rules. Card pool stays `real-pool-67-v2` as no Magic cards are added.
- Five authored terrain types: glass ice (movement chill), spore beds (deferred poison), unstable stone (telegraphed pulse), arcane conduits (+1 next spell at turn start), and crumbling tiles (one-time injury and collapse). Maps stay connected, initial units never spawn on hazards, and enemy AI avoids lethal paths.
- New deterministic enemy hazard lays and boss-phase terrain patterns. Enemy-specific spell-element resistances and weaknesses remain narrow, never blanket color immunities.
- Two Mystery events: Mnemonic Shrine offers +1 active hand capacity or Spark; Echoing Cauldron exchanges health for max mana or offers a ward, with visible costs and decline paths.

## Presentation
- Original authored cast signatures and persistent element-specific cosmetic aftermath layered onto 17 curated spell identities. Full existing charge/travel/impact pipeline retained with Instant/Fast/reduced-motion and graphics-density limits.
- Physical, original SVG Field/Elite/Boss/Folio pack wrappers with separate audio cues, rarity shines, a "Skip opening animation" option which does not forfeit a reward, and an independent "Leave the pack" option that is not activated by skipping animation.
- Five new floor materials and telegraphs, themed Elite/Boss exterior shrines and stage lights. These are original generated scenery, not imported Magic card artwork.
- Evolved creature attack staging distinguishes armored/large versus flying bodies. All original sprite sheets must pass strict clipping audit before release. This is procedural animation polish, **not** a hand-painted art replacement.
- Responsive spell hand, focus-visible card controls, keyboard arrow navigation inside the hand, two-page equipable tome and consistent HUD hazard descriptions.
- Original synthesized pack, terrain and boss-phase sounds; all respect mute and independent music/SFX controls.
- Particle bursts and swirls now have a hard 96-event limit and never exceed pool capacity. Cast motes follow low-graphics density; reduced-motion skips redundant signatures.

## Release gates and known limits
- Run `cd graftbound && npm test`, `python3 tools/audit_sprite_bounds.py --strict`, syntax checks and deterministic simulation.
- On GitHub Actions, `tests/scryfall-live-ci.test.mjs` runs `node tools/verify-real-pool.mjs` against live Scryfall for every curated card; it is **skipped offline** and needs review of its actual CI output.
- Attempt browser suites in isolation: `python3 tests/e2e_v08.py`, then `e2e_v06.py`, then `e2e.py`. Browser tests inaccessible because Chromium is blocked from navigating localhost in the build environment: do not claim passes without log evidence. No physical hardware QA.
- Full bespoke painted enemy artwork and physical-device frame pacing remain separate specialist/acceptance tasks. This release retains the original hand-built sprites and offers animation polish, not a commissioned redraw.
- Site-side PR #133 uses an older ranked rules verifier and must **not** be merged unchanged; no site promotion is authorized.

Rollback: revert this Game Lab-only PR to the previous published Game Lab main commit. No database/schema change and no deletion of local save keys.
