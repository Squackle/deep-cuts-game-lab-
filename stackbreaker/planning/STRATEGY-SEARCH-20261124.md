# Stackbreaker unranked strategy search — 2026-11-24

Partial implementation of issue [#130](https://github.com/Squackle/deep-cuts-game-lab-/issues/130), PR [#337](https://github.com/Squackle/deep-cuts-game-lab-/pull/337). Classic engine version remains unchanged. The existing five exercises are adaptations, not new authored lessons.

## Why

A published reference line or winning subset cannot show all possible strategic alternatives. The offline diagnostic enumerates supported legal land taps, legal land plays, explicit target/payment combinations, activated responses, and passes with the existing authoritative reducer. It preserves the stack, battlefield, step count, and other gameplay state; only the log and ordering of used IDs are normalized. A complete graph counts distinct immediate successors that can or cannot win and reports a shortest action witness. It does not equate actions or branching with empirical human difficulty.

## Reproduce

From repository root, using Node 24:

```sh
node --test stackbreaker/tests/strategy-search.test.mjs
node --input-type=module -e 'import {STRATEGY_TRIALS} from "./stackbreaker/src/strategy-trials.js"; import {searchStrategy} from "./stackbreaker/src/strategy-search.js"; for (const s of STRATEGY_TRIALS) {const a=searchStrategy(s,{maxStates:3000,maxEdges:20000}); console.log(JSON.stringify({id:s.id,...a}));}'
```

- `complete`: fully explored represented engine action space, with a winning replay and metrics.
- `unsolvable`: completed search of that limited engine with no winning state.
- `inconclusive`: exhausted state/edge/payment budget or encountered unsupported transition; metrics are null. A found witness may still replay, but does not prove completeness or optimality.

Tests compare reversed action enumeration, verify witness replay and losing choices, enforce explicit budgets, and sample all five existing unranked trials without mutation. The tool is deliberately not called in player-facing rendering or the ranked bridge. Canonicalization is conservative; equivalent gameplay histories may remain separate. The existing payment enumerator has a cap; hitting it prevents exhaustive claims. The results do not cover full Magic, advanced practice engines, all shortest-path strategic classes, human difficulty, or all campaign levels. Browser and physical-device acceptance remain separate.

The accompanying UI improvement exposes actual legal generic payments and remaining mana without modifying the engine. No campaign/daily manifests, IDs, scores, save keys, card assets, other games, or main-site code change. Final-head CI and preview evidence belong on the PR. Rollback: close the unmerged PR, or revert only its scoped changes after release review.
