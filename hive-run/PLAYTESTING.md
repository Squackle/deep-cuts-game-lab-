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

### Powered-encounter and step-limit witnesses

Exact source `325c3734010761f9ac36093fc32e1a13eda79799`, [CI run 45461813755](https://github.com/Squackle/deep-cuts-game-lab-/actions/runs/45461813755), passed 314/314. All five bosses activated a real power before legal capture victories (Stalker tick 77, Warden 83, Weaver 40, Guardian 43, Broodmother hatch 60). Four visible-state cycle runs survived 6,000 ticks without rescue, reaching 169, 153, 151 and 170 segments. The best run (seed 31676, 106 orbs, 21 evolutions, 10,600 score) is a fixed step-limit witness, not a victory. The fixture now includes 16 independent witnesses, including five powered bosses and this terminal run.

### Deployment blocker

Cloudflare Pages project `deep-cuts-game-lab` reports GitHub preview deployment setting `none`. Exact branch-head deployments remain queued/idle; the canonical Lab deployment of main `e7a7a4f8ac1508613136eb7f0f16824410273b83` is successful. Browser Rendering returned HTTP 429 on the attempted mobile inspection. Shared preview configuration requires the responsible infrastructure developer/owner; do not change it from the Hive lane or bypass the release gate. No production promotion.

## Round 3: player acceptance and diagnostic interpretation (2026-11-24)

The 24-seed-per-mode smoke suite now emits one `SEED` JSON line for each deterministic seed, rather than just aggregate scores; each includes a simple policy identifier, survival ticks, orbs/captures, mutations drafted, status and outcome. Five `LAIR_SEED` lines report the corresponding fixed-boss smoke attempts. Treat these bots as *invariant/stability probes*, not human-grade players. Some deaths or stalled evolutions may be due to their simplistic safe-next-cell heuristics rather than unfair game design. Use exact seed and policy to reproduce anomalies and compare with a human recording before changing balance.

### Short human acceptance script

1. **Beginner desktop (both modes, two fresh runs each):** read only in-game instructions, use WASD then arrows; record time to first orb/capture, first mutation, first death, unclear instructions, and whether any collision felt untelegraphed. Do not add debug widgets to the public HUD.
2. **Expert desktop:** complete at least one Hunt boss sequence and a long Brood Trail run; assess whether trapping is skill-based, whether late biomes produce sudden unavoidable situations, and whether mutation choice/recovery feels meaningful. Record seeds, chosen mutations, survival ticks and final outcomes.
3. **Physical mobile (iPhone Safari and Android Chrome):** swipe repeatedly at edges and during rapid turns; verify no page scroll, phantom reverse turns, accidental multi-turns, touch loss, covered controls or clipped safe areas. Test rotate/background/return, Game Only entry/exit, fullscreen Escape/fallback, and restore original page scroll position. Simulated viewport checks are not hardware signoff.
4. **Bosses:** enter all five Lair encounters; allow each power to activate; check telegraph readability, pause/dossier, three-second resume, defeat/victory messages, retry and whether traps remain fair. Rate ability icons/rings without adding additional HUD controls.
5. **Presentation/performance:** toggle music and sound, test muted autoplay restrictions, listen for overlapping cues on pause/background and victory, test reduced-motion, monitor sustained long-body playback and verify visibility on low-end phones. Test keyboard focus and Tab cycling in mutation dialog, plus screen-reader labels where available.

For each observation capture device/browser, seed/mode, steps or approximate run time, reproduction sequence, expected versus observed behavior, and whether an actual player independently reproduced it. Escalate confirmed unfair deaths, input loss, unresolvable overlays, frame degradation, and incorrect replay/score outcomes. Do not escalate a bounded search failure alone.

### Release-candidate decision

- **Verified at prior exact head `a3dda675620034765cb00d35ad8ac06df70ddfa4`:** dedicated Hive CI 320/320, unified Lab checks and release coordination passed; all fixed replay witnesses included. New changes must receive fresh SHA-specific CI before release.
- **Not proved:** a full 18×22 perfect clear; a one-off extra solver attempt is not a standing release requirement. The documented bounded beam and visible-state cycle attempts already provide realistic upper-body stress evidence (170 segments maximum reported) without an algorithmic proof of impossibility.
- **Outstanding gates:** Cloudflare branch previews disabled by shared configuration; exact-head deployed browser inspection and physical device/audio/artwork acceptance not complete. Request configuration repair from the shared infrastructure coordinator and independent QA review; do not bypass preview controls or promote to production.
- **Compatibility:** Keep rules `hive-1.5.4`, replay input semantics and historic ranked records unchanged; any future rules rebalance requires separate approval and versioned replay migration.

### Round 3 single additional full-size search attempt

The final bounded attempt is implemented as `Brood Trail Round 3: one additional bounded full-arena search, no solver victory requirement` in `tests/hive-lair-search.test.mjs`: full 18×22 arena, seed 31676, cautious safe-space scoring, width 20, at most 1,600 search actions. It forks RNG only for speculative test branches, then replays the selected legal input path from a fresh run and verifies the eventual unforced terminal score via `replayScore`, including a tamper rejection check. The test emits `ROUND3_BOUNDED_SEARCH` and `ROUND3_BOUNDED_TERMINAL` lines. A search-budget failure is reported as evidence, not as an assertion failure or game defect; no subsequent solver tuning is authorized in this round. Record the actual CI diagnostic before claiming a victory or final body length.


### Final acceptance regression: real Chromium

Run `node --test tests/hive-browser-acceptance.test.mjs` using a system Chromium/Chrome (or `HIVE_CHROME` executable). CI requires an available browser. The local-only test exercises desktop keyboard and 390px emulated touch, fullscreen and fallback, audio switches, reduced-motion media preference, all five practice dossiers, countdown/focus, Classic start/pause/restart and overflow. It does not establish physical device, audio quality or hosted artwork approval. The initial Lair focus defect was caused by `begin()` focusing the canvas after `showBossBriefing()` focused its Begin button; the modal now owns focus until the countdown completes. Apply the same small fix to the website's separate main.js during authorized integration. No rules changes.
