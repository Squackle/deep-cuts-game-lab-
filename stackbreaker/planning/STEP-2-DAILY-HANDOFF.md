# Stackbreaker Daily — Step 2 implementation and handoff

**Status:** IMPLEMENTED ON FEATURE BRANCH; **NOT RELEASED until Github CI passes and exact Game Lab production SHA verified**. This is *not* Step 3 or a public website integration.  
**Owner authorization:** "next" after the completed roadmap Step 1 on 2026-10-19.  
**PR:** [#101](https://github.com/Squackle/deep-cuts-game-lab-/pull/101).  
**Branch:** `game/stackbreaker-daily-puzzle-step2-20261019`.  
**Canonical roadmap:** [#96](https://github.com/Squackle/deep-cuts-game-lab-/issues/96) — do not mark Step 2 checked until final verification and merge.

## Implementation

- `data/daily-manifest.json`: **365 explicit immutable UTC dates**, from 2026-10-19 through 2027-10-18. First 90 dates use **90 different preselected Classic puzzle IDs** via a fixed permutation. Pool: 30 prior approved/core scenarios + 60 previously generated validated scenarios. **The 60 generated entries still need human editorial review prior to any authoritative/competitive launch.** Do not claim all 90 manually reviewed. No AI daily scheduling or cron; published puzzle date is fixed to UTC 00:00.
- `src/daily.js`: pure UTC date, countdown, deterministic fixed-entry lookup, **local-only noncryptographic FNV content fingerprint** (not SHA-256 proof), **one local scored start/device/date**, snapshot-based refresh resume, accepted state-changing move counters, spoiler-free result. `DAILY_STORAGE_KEY=dc-stackbreaker-daily-local-v1` kept separate from Classic stars.
- `src/ui.js`: `?daily=1` enables dedicated challenge mode while reusing the **unchanged** rules engine and all cards. Player must explicitly choose practice or local scored. Practice can retry, show hints and undo. Local scored disables hints, undo, reset, level selection and world map; once started, restoring it loads its prior state and cannot reset via normal UI. It records successes and failures as **LOCAL / UNVERIFIED**, no public score or account achievement. UTC midnight prevents further scored decisions, even when the timer is paused.
- `template.html` / `observatory.css`: accessible responsive daily status, countdown, controls and selectable spoiler-free share text. `daily/index.html` redirects to `../?daily=1` so route `/stackbreaker/daily/` is navigable. A link from the existing Classic training notes surfaces Daily. Main Classic at `/stackbreaker/` remains standard.
- `build.py` loads the dated JSON as inline `dailyManifest` before embedding `src/daily.js`. Generated standalone `index.html` committed to PR. `tests/daily.test.mjs` exercises date, DST, leap day, 90 distinct entries, 365 fixed dates, deterministic scenario IDs/content checksum, accepted pass/score, local saved refresh, unverified share, hint/undo/Classic isolation, compiled bundle and discoverable route.

## Boundaries and QA limitations

1. This is **not** authenticated competitive scoring. Browser localStorage is forgeable and clearing it allows another local scored start. True one-attempt-per-account with verified replay, account rewards and D1 are deferred to **Step 9** and require independent owner authorization and website-developer approval. Never label these local results officially verified.
2. Date mapping covers 365 days only. A further explicit content manifest must be curated/published before expiry. Do not silently repeat, change historical dates or claim infinitely updating content. Puzzle *source* was already public in Classic; no guaranteed secrecy of future solutions.
3. `scenarioDigest` is a local FNV fingerprint over the actual scenario at runtime, **not cryptographically pinned server proof**. Before Step 9, authoritative website needs pinned SHA-256 scenario digests, signed/verified results, server UTC authority and replay.
4. Do not change `src/engine.js`, `src/cards.js`, `data/scenarios.json`, `data/campaign-expansion.json`, the 250 approved/generated Classic case IDs, existing stars/localStorage keys, public site or other games.
5. **QA required:** unified GitHub CI and release coordination on final PR head (report totals), plus Cloudflare preview if accessible; Browser Rendering sometimes returns 429/2001 and should be reported honestly, not described as a successful mobile click test. Verify exact merged SHA on successful Game Lab production deployment. **Do not merge while checks remain queued**.

## Resume sequence

Verify PR #101 head, latest Lab and website main SHAs, and overlapping PRs. Wait for Github Actions to start, fix failures by focused Stackbreaker-only commits. Optionally perform browser UI QA at mobile 390px and desktop 1280px. Once final PR-head CI green, merge PR #101 with explicit SHA. Verify Cloudflare `deep-cuts-game-lab` production deployed exact merged SHA with `deploy:success`. Then mark **Step 2** on roadmap issue #96 checked and record test/deploy evidence in an issue comment. Stop until owner says “next” to begin **Step 3 mastery ledger**. Rollback is revert PR #101; Classic saved progress intact.
