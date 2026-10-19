# Mana Heist — two scored bonus vaults, separate from 500

**Date:** October 19, 2026 · **Workstream:** Game Lab only · **Scope:** additive optional post-lesson challenges.

## Owner authorization and safety

The owner said "next step" after requesting the next mana expansion, building on PR #100's Fellwar Stone / Talisman of Dominance lessons. This scoped release adds **two optional scored side-vaults** after the 28 unscored lessons. It neither changes any of the **500 main campaign** boards and IDs nor requires players to replay previously cleared scored vaults. The new score namespace is **`dc-mana-heist-bonus-trials-v1`**, separate from `dc-mana-heist-landfall-v2`, `dc-mana-heist-capstones-v1`, `dc-mana-heist-variety-v1`, and `dc-mana-heist-learn-v1`.

## Design

**T1 — The Borrowed Gate (one turn, two wards)**. Fellwar Stone sees only white/black in the fictional opposing lands and must choose white for ward 1. Island provides blue. Talisman of Dominance must later provide black (costing one damage) and Wastes produces true colorless for ward 2. Starting life 2. Requires choosing different artifacts for different costs and keeping a life point.

**T2 — The Talisman's Two Turns (two turns, two wards)**. Opponent's land-color snapshot offers red/green, never black. On turn 1 Fellwar Stone produces red while Talisman safely produces colorless; on turn 2, after untapping, the Talisman provides black and deals one damage while Island provides blue. The main campaign's simplified end-turn mana clearing remains clearly specified.

Both puzzles use exactly the existing modeled abilities and the pure shared rules kernel. No new MTG rules are claimed, no live opponent is added, and no official leaderboard/profile integration occurs. This is a local, optional side activity, **not a 501st or 502nd campaign vault**.

## UI and scoring

- Learn Mana map displays a distinct **Bonus Mana Trials** section and local-medal-only notice. Selecting a trial reuses the familiar tabletop, controls, card art references, automatic/manual Cast Spell and cauldron. The main 28 lessons remain non-scored.
- Bonus trials have permanent IDs `mh-bonus-01` and `mh-bonus-02`; score bests are stored only under the dedicated versioned bonus key. Each record tracks turn, life spent, actions and medal count. Malformed records and stray IDs are discarded on read.
- Medal comparisons use the existing engine's scorer with a solver-certified reference route, not a claim of empirical difficulty or unique optimal solutions.
- On return to the lessons map, the trial flag clears. Trial restarts don't mark normal lessons complete, do not change the previous heist progress index or change any of the existing score stores.
- The user sees explicit Talisman damage in the action choice. The experiment still approximates unprevented damage as life deduction, and cannot model prevention/replacement. All real MTG cards/images are still subject to the existing blocked P01 rights-review gate.

## QA

Required before a Game Lab release:

```sh
node --test mana-heist/tests/*.test.mjs
node --check mana-heist/src/engine.js
node --check mana-heist/src/levels.js
node --check mana-heist/src/solver.js
node --check mana-heist/src/main.js
```

The added `bonus-trials.test.mjs` verifies deterministic solver and replay for both puzzles, hand-reviewed action routes (including mana reset between turns), automatic Cast Spell compatibility, exact isolation from 500 existing IDs and guest records, and score normalization. Cloudflare preview and live branch verification are required. Actual physical iOS/Android gesture QA remains separate; do not claim it without running it.

## Rollback

Revert the isolated PR and redeploy the prior Lab commit. The new `dc-mana-heist-bonus-trials-v1` may remain inert in localStorage for reinstatement; other guest records and all 500 campaign puzzles are unchanged. No backend, D1 migration, public website promotion or changes to other game lanes.
