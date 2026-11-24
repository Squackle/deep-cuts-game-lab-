# Dominion stability pass — November 24, 2026

Baseline: Game Lab main `0867b8d1aa7591a169e8b56b5b711a278a863423`; rules `hive-1.5.4` unchanged.

- Native fullscreen requests may settle after CSS Game Only is closed. Dismiss any late fullscreen owned by the arcade; cover the race with a deferred-request regression.
- Clear stale swipes on lost pointer capture, ignore secondary pointers/non-primary buttons and reject gestures during boss briefing/countdown. Preserve the one-turn-per-swipe policy.
- Ignore browser modifier shortcuts and IME composition. Keep Tab and Shift+Tab inside the mutation choice dialog.
- Correct stale Matriarch badge and four-game header text. No new HUD, artwork, audio, score storage or gameplay rules.
- Add deterministic smoke simulations across 24 seeds per Arcade mode and the five fixed Lair seeds, checking repeatability and basic state invariants. These bots are not a proof of winnability or human difficulty. The suite logs score, captures, orbs and evolutions for comparison.

Run: `npm test`, `npm run check`; review unified Lab CI as well. Real mobile/browser validation remains a release gate. Do not promote to the public Arcade or modify historical scores. If gameplay rules need balancing changes, establish a new rules version and a separately approved replay migration/promotion.

Rollback: revert this isolated PR. No data migration.
