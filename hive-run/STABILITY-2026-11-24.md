# Dominion stability pass — November 24, 2026

Baseline: Game Lab main `0867b8d1aa7591a169e8b56b5b711a278a863423`; rules `hive-1.5.4` unchanged.

- Native fullscreen requests may settle after CSS Game Only is closed. Dismiss any late fullscreen owned by the arcade; cover the race with a deferred-request regression.
- Clear stale swipes on lost pointer capture, ignore secondary pointers/non-primary buttons and reject gestures during boss briefing/countdown. Preserve the one-turn-per-swipe policy.
- Ignore browser modifier shortcuts and IME composition. Keep Tab and Shift+Tab inside the mutation choice dialog.
- Correct stale Matriarch badge and four-game header text. No new HUD, artwork, audio, score storage or gameplay rules.
- Add deterministic smoke simulations across 24 seeds per Arcade mode and the five fixed Lair seeds, checking repeatability and basic state invariants. These bots are not a proof of winnability or human difficulty. The suite logs score, captures, orbs and evolutions for comparison.

Run: `npm test`, `npm run check`; review unified Lab CI as well. Real mobile/browser validation remains a release gate. Do not promote to the public Arcade or modify historical scores. If gameplay rules need balancing changes, establish a new rules version and a separately approved replay migration/promotion.

Rollback: revert this isolated PR. No data migration.

## Follow-up — full-screen victory and authentic replay search

After rechecking open PRs, integrated ARCHEMANCY-only main commit `e7a7a4f8ac1508613136eb7f0f16824410273b83` without altering its files. The victory dialog now belongs to the native fullscreen root; its Escape action takes priority over the Game Only handler. The covered arena no longer paints every frame during the victory cinematic. Added a bounded Lair search that forks RNG streams in test code only and replays the chosen legal inputs from a fresh boss seed. Diagnostic results distinguish wins from exhausted search budgets, not impossible encounters. Also record real Arcade movement/mutation inputs and validate terminal scores via the existing replay verifier, including rejection of altered scores. No gameplay engine or ranking version change. Physical-device testing remains a separate acceptance gate.

## Brood Trail growth search and presentation efficiency

The legal-action search also supports Classic's changing body length, reachable free-space evaluation and tail access. Compact-board and default-arena search diagnostics report actual body size, collected orbs, evolutions and terminal outcome. These are bounded algorithms, not proofs that every seed can be cleared. A compact board is an engine test fixture, not a new public mode. The mutation HUD reuses identical badges instead of recreating them for every UI sync, and the reduced-motion media query is reused while remaining live. No simulation constants or shared infrastructure changed.

### Verified evidence (2026-11-24)

- Authentic compact-board seed 7919 reached `perfect_clear` from the initial seven segments with 62 distinct body cells and two permanent rock tiles covering all 64 tiles; 36 orbs, seven evolutions, 3,600 points and 208 legal search actions. Independent clean replay matched the complete game state. This known victory is now mandatory in CI.
- Full 18×22 seed 7919 reached 154 segments, 97 orbs, 19 evolutions and 9,700 points; the natural terminal run ended in death at tick 1770. The replay verifier accepted the complete recorded input trace and rejected an altered score. This is a long-body stress regression, **not** a full-size victory or a balance sign-off.
- Exact preceding commit `02b658f0ff608b0c64dd3ae73d08515468256abc`: 291/291 Hive tests passed ([Actions run](https://github.com/Squackle/deep-cuts-game-lab-/actions/runs/45453279155)). The final mandatory assertions require their own CI pass. Physical mobile/desktop acceptance and a successful exact-head deployment remain required before merge.

## Release-candidate continuation

Starting exact commit `a410e11c9666f7e51934999a89b5b978d720c21a` passed 291/291 Hive tests and all five GitHub checks. Preview deployment was still queued/idle. Added an alternative, safety-aware Brood Trail policy (bounded 3,000 actions, width 28) and independent second Hunt seed; all complete or terminal action traces use the unchanged engine. Diagnostic WITNESS lines encode legal actions for independent fast replay; lowercase u/r/d/l are turns then step, dot is step only, uppercase W/U/B/R/G is a draft choice without a step. Lair uses its fixed practice seed and completes only after the real boss defeat. Focus loss clears stale swipes even while awaiting a mutation-resume gesture; local replay validation rejects absent/non-integer seeds and invalid modes instead of invoking nondeterministic RNG or throwing. Existing integer seed semantics and legacy outcome-optional fixtures remain supported. No simulation engine change.

### Witness package and accessibility

Captured ten actual legal action sequences from CI: five Lair wins, two full Hunt wins, one compact Classic win, two full-size Classic terminal runs. Added fixed-fixture tests, plus an independent fast replay procedure in [PLAYTESTING.md](PLAYTESTING.md). The original search passed on commit `5594126d2cce4980796c9042c4d3ce1396ddc469`; two static audio assertions failed due to changed statement order, not the simulations. The audio-stop ordering is restored. Shared frame timestamps avoid repeated clock/preference reads; reduced-motion now freezes pickup, hatchling and Red effect decorative motion while preserving real time for transient feedback and all gameplay timing. Exact-head re-verification required.

### Additional gameplay verification

At `325c3734010761f9ac36093fc32e1a13eda79799`, 314/314 Hive tests passed. Two complete Hunt campaigns, all five normal and powered Lair wins, a genuine 8×8 Classic perfect clear, multiple 18×22 terminal traces and a legal 6,000-tick run are now covered by fixed replay witnesses. The visible-state cycle planner reached 170 segments, not a full-size clear. All four cycle seeds reached the step limit without a rescue. No rule changes or balance conclusions based solely on solver choices. Cloudflare preview setting is `none`; exact-head preview verification is blocked by shared configuration, and browser rendering returned HTTP 429.
