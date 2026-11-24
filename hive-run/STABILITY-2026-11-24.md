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
