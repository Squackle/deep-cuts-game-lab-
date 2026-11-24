# Hive Run Dominion: reproducible playtesting and maintenance

Rules: `hive-1.5.4`. This is a standalone Lab release candidate, not a public score authority. Preserve seven-segment Hunt, Brood Trail growth, all five WUBRG mutation families, four biomes, five bosses, the 6,000-step limit and distinct terminal outcomes. See [Dominion plan](../docs/HIVE-RUN-DOMINION-IMPLEMENTATION-PLAN.md) and [release gate](../docs/DOMINION-2.0-QA-SIGNOFF.md).

## Reproduce

Use Node 24 (same as CI). From repository root:

- `node --test tests/hive-replay-witnesses.test.mjs`: fast, fixed legal-input fixtures; does not search or modify engine state.
- `node --test tests/hive-lair-search.test.mjs`: bounded deterministic beam search; generates new WITNESS JSON diagnostic lines with exact action paths. A budget-limited outcome is not evidence of impossibility.
- `node --test tests/hive-seeded-simulation.test.mjs`: varied seeds, invariant checks and ordinary terminal score replays.
- `npm test` and `npm run check`: full Hive suite, then verify unified Lab CI.

Fixtures live under `tests/fixtures/hive-run-witnesses.json`. A witness starts from fresh seed and dimensions, or the fixed Lair factory. Dot = one simulation step, lowercase u/r/d/l = legal turn followed by step, uppercase W/U/B/R/G = mutation choice without a step. Lair's public completion function runs after movement. No forced state, hidden information injected, or Director cheats. Search forks RNG streams for exploration, and each selected action sequence must independently replay through the normal engine.

Full-size Arcade witnesses must additionally pass `replayScore` with exact score, kills, evolutions, ticks and outcome. The compact board and Lair are test/practice fixtures and are not eligible for the normal 18×22 Arcade verifier. Do not interpret an exploratory solver's score as a player skill measurement. The fixtures preserve the accepted terminal contract separately from future changes to the search heuristic.

## Evidence

| Witness | Seed | Outcome | Score | Ticks |
| --- | --- | --- | ---: | ---: |
| lair-stalker | 401821 | lair_practice | 750 | 48 |
| lair-warden | 401822 | lair_practice | 1500 | 70 |
| lair-weaver | 401823 | lair_practice | 750 | 44 |
| lair-guardian | 401824 | lair_practice | 1500 | 62 |
| lair-broodmother | 401825 | lair_practice | 1500 | 67 |
| hunt-campaign | 7919 | broodmother_defeated | 9650 | 634 |
| classic-compact | 7919 | perfect_clear | 3600 | 201 |
| classic-full-terminal | 7919 | death | 9700 | 1770 |
| classic-safe-terminal | 7919 | death | 8400 | 1861 |
| hunt-second-seed | 15838 | broodmother_defeated | 9750 | 587 |

The full-size Classic search found long-body terminal runs, not an 18×22 perfect clear. Seed 7919's compact 8×8 witness covers every tile (62 body + 2 permanent rocks). Both Hunt witnesses defeat the actual final Broodmother; the fixed Lair witnesses defeat all five practice bosses. These are specific deterministic examples, not a proof of winnability for every seed or human difficulty calibration. The source fixture was captured from Actions run 45460990481 (the search tests succeeded; two presentation source assertions failed before their ordering fix). The fast fixture test must independently validate all ten.

## Balance and release boundaries

Retain the approved balance unless a reproducible defect warrants a separately versioned simulation change. Do not copy Lab-only Director or test code into production. Use fixed witness logs to compare any proposed rules revision and retain old rules/history; a changed replay result is a migration concern, not permission to overwrite a score. No Lab leaderboard writes or authenticated player identity. Human skill/difficulty, audio, device-specific controls, artwork framing and physical safe-area acceptance remain manual checks. Confirm exact-head CI and Cloudflare deployment before presenting a playtest URL as verified. Public promotion requires separate authorization.

## Additional encounter coverage

The powered-Lair search requires observing the real boss ability in play (executed Burrow Dash, active Brood Seal, Weaver web, active Rift Pulse or hatched Broodmother spider) before accepting a win. It keeps the normal search's capture strategy after satisfying that condition. No cooldowns, spawn locations or enemy positions are prepared.

The separate `node --test tests/hive-classic-cycle.test.mjs` experiment uses a visible-state-only cyclic route planner with safe shortcuts and a free-space fallback for dynamic terrain. It attempts full-size clears on four seeds; it verifies actual terminal replays and reports outcomes and maximum length. Unlike beam search, it does not inspect speculative future seeded randomness. These are algorithm comparisons, not estimates of human difficulty. 
