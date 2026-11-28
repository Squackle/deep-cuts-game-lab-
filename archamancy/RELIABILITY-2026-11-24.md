# ARCHEMANCY 13.53 — source ownership, regression and release-readiness

Updated 2026-11-24. Applies to the Game Lab only, not the public DeepCutsEDH Arcade. This is a maintenance handoff and test plan, **not** a claim that human balance, live browser QA, IP clearance or production deployment has passed.

## Code map

- `archamancy/engine.mjs`: fixed-step deterministic rules, five maps, commands, 25-wave Gauntlet, Endless and sandbox, boss effects, tower/flight targeting, serialized run state. `SAVE_FORMAT=1`; ordinary updates must not invalidate a legitimate existing save.
- `archamancy/campaign.mjs` and `pool.mjs`: deck, boosters, draft, Treasury/shop inventory, relics and seeded selection; campaign metadata is embedded in the profile. Upgrade economy here, **not** in UI click handlers.
- `archamancy/progress.mjs`, `daily.mjs`, `game-reset.mjs`: progression, region unlocks, daily records, and explicit per-game reset. Never clear the origin's entire storage; sound and artwork caches are not progression.
- `archamancy/main.mjs`, `styles.css`, `art.mjs`, `terrain.mjs`, `fx.mjs`, `sfx.mjs`, `packfx.mjs`: rendering, input, original battlefield assets and feedback. The canonical browser entry is `archemancy/index.html`; `archamancy/index.html` is a legacy redirect.
- `archamancy/cardart.mjs`: disposable, browser-local Scryfall art-crop cache, using strict HTTPS host validation and artist text. It is separate from real progress.
- `archamancy/tools/relic-balance.mjs`, `verify-cards.mjs`: deterministic bot analysis and offline card verification; use actual measured outputs rather than guessed win rates.
- `archamancy/tests/`: Node unit/regression tests. Unified Lab and coordination CI must also pass on the exact reviewed head.

## Compatibility and reliability invariants

1. Existing `archemancy.progress.v1`, `archemancy.run.v1`, `archemancy.daily.v1` and `archemancy.tips.v1` are unchanged. No account, public score, or other-game storage may be touched.
2. A restored run must pass top-level shape checks **before** mutating the simulation. Reject malformed resources, clocks or collection types; reject partial resume rather than producing an unreportable state. Historical omitted optional fields remain allowed. Do not treat a locally edited run as a verified score.
3. A saved campaign's valid deck, upgrades, earnings and shop offers persist. Bound inspection of malformed, oversized lists and reject mismatched/invalid shop items so a damaged local store does not lock the tab or invent free offers.
4. Artwork must be untrusted and optional: card and token assets are fetched lazily, credited, bounded, same-origin-to-CDN validated and allowed to fall back on failure. An oversized/malformed art cache must not erase progression or make gameplay depend on Scryfall availability.
5. Seed and game commands, not wall-clock rendering, determine outcomes. Regression compares uninterrupted and checkpoint-resumed outcomes across all five maps and both additional unranked modes; campaign wave, boss and card interactions remain covered by their existing dedicated suites.
6. Retain owner-approved Confluence wave 3/13/24 Troll changes, wave 4 flyer guidance, final bosses and other maps. Balance proposals require deterministic sample matrices plus human playtesting before changing known difficulty or reward contracts.

## Balance and device acceptance still required

- Collect reproducible multi-seed results for each campaign map/difficulty, early-call and Onslaught configurations, commander, tower-school specialization and booster strategy. Report sample size, map, seed and deterministic policy for any win rate; distinguish script skill from player difficulty. Check farm compounding, crowd control, ranged/flight counters, health-sustain loops and late-wave boss counterplay.
- Review real landscape phones (short Safari viewports), touch placement/rally/drag and cancel, card/pack visibility, HUD collision, boss tells, on-screen feedback, keyboard focus, reduced-motion behavior and network-unavailable artwork.
- Test every campaign unlock, daily seed/date rollover, Endless continuation, reset confirmation and return from a saved battle. Do not wipe a legitimate profile in smoke testing.
- Audit approved artwork list, attribution and rights before any public promotion. Real Magic cards in this fan prototype are not blanket permission for a standalone commercial release.

## Release coordination

Base for this reliability patch: Lab `e7a7a4f8ac1508613136eb7f0f16824410273b83` (ARCHEMANCY 13.53). File ownership is confined to `archamancy/**`; no catalog, infrastructure, website, GRAFTBOUND, Hive Run, Mana Heist or Stackbreaker edits. Record the new branch and PR in Development Control Room #14. The security coordinator's #164 is the source for CodeQL issue ownership; passing CI is not proof all alerts are closed. Release Manager approval, full exact-head CI, actual Lab deployment and browser verification are distinct gates. Public promotion remains separately owner-authorized.
