# Mana Heist readiness audit · P03/P06–P10 first quality gate

**October 19, 2026 · Scope: `mana-heist/**` · Game Lab only.**

## Deployment priority: game-breaking bug fixed first

The owner reported **clicking level buttons never opened any vault** during this audit's development. We reproduced that directly in the live Chromium browser: `ReferenceError: selectedHandId is not defined` in `main.js:787`, caused by a missing top-level selection variable in an earlier device-QA refactor. The standalone critical hotfix [PR #124](https://github.com/Squackle/deep-cuts-game-lab-/pull/124) merged at **`f08c2bef3c249557a95fbb7635301cc8d61217a3`**, Cloudflare production deployed that exact commit and both postmerge checks passed. A real browser smoke verified **open vault → tap land → mana flight → Cast Spell → win → Return Map** on the *production* SHA. Five separate stage-launch cases also passed on preview (early vault, lesson, scored bonus, revised 451 and final 500).

**This audit release is now rebased-by-copy onto that known-working exact hotfix commit**. The prior, unmerged audit exploratory branch is abandoned; it is not the release branch. Only a separate source-derived inventory/CLI/HTML page and documentation/tests are changed. No more modifications to `src/main.js`, its button handler, or the game engine in this PR.

## What's delivered

- **In-browser inspectable atlas:** `/mana-heist/readiness.html`. Search all 500 unique vault IDs/titles, filter by ten galaxies or review focus, see approximate structural C/D, base-template lineage, similar board footprint, revisions and repeat-family candidates. Export the **full structural report** as a browser-local CSV/JSON; zero player data sent. Audit rows are informational, NOT misleading deep links to a nonexistent query-based vault launcher.
- **Offline reproducible legal-route audit:** `node mana-heist/scripts/run-readiness-audit.mjs --json=/tmp/mana-audit.json --csv=/tmp/mana-audit.csv`. Replays all 500 scores via the deterministic reducer. For legacy derived boards uses the same original legal reference line, for revised families uses its current family-specific independently authored/constructed certificate. Checks stage completion, turn limits, and survival, with explicit `failed`, `inconclusive` and `not-run` statuses; a CLI failure is nonzero, not a fabricated all-green conclusion.
- **Honest metric boundaries:** Structural similarity is **not confirmed strategy duplication**; reference replay **does not prove optimal, unique or intended difficulty**; existing C/D values remain heuristics; all 500 player educational reviews and all physical-device human reviews start **NOT PERFORMED**. Identifying these candidates creates a prioritized review queue, not false G1/G2/G3 acceptance.
- **CI:** `tests/readiness-audit.test.mjs` verifies campaign identity, original 18 IDs, 10x50 atlas, structural fingerprint semantics, exact report/CSV, all 500 reducer-valid reference replays, no false human outcomes, no localStorage/external network dependency, and preserves the hotfix selection state. Existing full Mana Heist suite, unified Lab and release coordination remain mandatory.

## Human review plan after this first phase

1. Prioritize vaults with **REPEATED_FAMILY** / **SIMILAR_BOARD** indicators and origins `template-variant`, selecting representative anchors across all ten galaxies. Do not automatically discard based on signatures.
2. Review intended learning objective, player decisions, source/card legibility, counterexample paths, and alternate strategies; record which versions/IDs have passed *real* review.
3. Compare voluntary player difficulty data **separately** from structural estimates. Do not alter completion medals on old levels without versioned score migration.
4. Independently close the P02 official mana-rules discrepancies, the physical-device QA gates, 15–20-person beta and P01 rights/artwork approval. Public Deep Cuts EDH promotion requires its own explicit authorization.

## Verification and rollback

- Release from a fresh `game/mana-heist-*` lane branch based on hotfix main. Do not touch public `deep-cuts-edh`, Stackbreaker, Hive Run, shared `lab/**`, D1, profiles, ads or guest saves.
- Live browser audit needs to display populated metrics and 500 rows; CSV/JSON exports should have exactly 500 records. Recheck *game* after deploy: first stage opens and survives click/cast/win/return, including Learn/bonus and representative late-game launches.
- After all 4 pre-merge gates, merge, verify exact Cloudflare production SHA and both postmerge workflows.
- **Rollback:** Revert only this audit feature PR, leaving deployed PR #124 hotfix intact; the game and all six local progress namespaces, old medals, lessons, opt-in QA, reduced-motion settings remain untouched. No data migrations.
- Rules versions **mh-landfall-0.2.0 / mh-mana-lab-2.0.0** unchanged. P01 rights/IP remains BLOCKED, no 1.0 public release.
