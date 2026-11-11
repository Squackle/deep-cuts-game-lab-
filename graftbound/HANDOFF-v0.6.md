# HANDOFF — GRAFTBOUND v0.6 (two separate PRs; PREVIEW ONLY; do NOT merge or deploy)

## A. Game Lab — `Squackle/deep-cuts-game-lab-`
1. Check PR #138's status. If v0.5 is still unmerged, branch **`game/graftbound-v0.6-living-world` from the PR #138 head** (`e784fc7…` or later) and open a **stacked PR** with base = `game/graftbound-v0.5-overhaul`. If #138 has merged, branch from the latest `main`.
2. Copy this package's `gamelab/graftbound/**` over `graftbound/`. **Keep the repository's existing PNG assets.** This package contains text files only.
3. Run:
   - `cd graftbound && npm test` (expect 109/109)
   - the repo's other suites (unchanged and green)
   - `python3 tests/e2e.py` (35) and `python3 tests/e2e_v06.py` (20), if Playwright is available
   - `node tools/verify-real-pool.mjs` (needs network; fix any flagged card)
4. Open the PR and a Cloudflare **preview**. Report the preview URL, PR link, actual test numbers and console warnings.

## B. Main website — `Squackle/deep-cuts-edh` (separate PR, `Workstream: Game Lab Promotion`)
1. Branch `site/graftbound-ranked-integration` from the latest `main`. Read `AGENTS.md` and `docs/DEVELOPMENT-LANES.md`.
2. Copy `deep-cuts-edh/**` from this package. This is additive, except `profile.html`, which gains one section and one script tag.
3. Run `node --test tests/graftbound-api.test.mjs`, plus the site's `site-quality` and the other suites.
4. In the PR body:
   - `Lab source SHA:` is the merged/tested v0.6 Game Lab commit, written into `src/graftbound-verify/pinned.js` (`LAB_SOURCE_SHA`).
   - Re-copy the rules files from that exact commit and run `node scripts/graftbound-pin.mjs --write`.
   - `Rules version: graftbound-rules-0.6.0`
   - `Score/replay validation: tests/graftbound-api.test.mjs`
5. **Do NOT run `db/graftbound-ranked-v1.sql` on production D1, flip `graftbound_launch_v1`, merge or deploy.** Those need explicit owner approval after security review and a real signed-in staging test.
