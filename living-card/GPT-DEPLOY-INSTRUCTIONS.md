# Instructions for the deploying agent: put GRAFTBOUND v0.4 on a Cloudflare PREVIEW for playtesting

Repository: https://github.com/Squackle/deep-cuts-game-lab-  (the trailing hyphen is part of the name)
Goal: the owner wants to PLAYTEST this build on a preview URL. Do NOT merge to `main` and do NOT promote to production.

## Steps
1. Create branch `game/living-card-graftbound-v0.4` from the latest `main`.
2. Read the repo's `AGENTS.md`, `docs/SHARED-GAME-LAB.md` and `docs/TEST-FIRST-RELEASE-POLICY.md`, plus the existing `living-card/AGENTS.md` and `living-card/README.md` (from PR #136). Follow their rules.
3. Replace the contents of `living-card/` with this package.
   - KEEP the existing `living-card/AGENTS.md`. If the existing `living-card/README.md` has Game Lab rules, merge them into the new README instead of discarding them.
   - Do NOT touch anything outside `living-card/`: no catalog (`lab/`), Hive Run, `stackbreaker/`, `mana-heist/`, `functions/`, `db/`, `.github/` or root `package.json`, and nothing in the production site repo `Squackle/deep-cuts-edh`.
   - Do NOT create a `/graftbound/` route or any redirects.
4. Run the tests:
   - `cd living-card && npm test` → expect **84 pass, 0 fail**
   - From the repo root, run the existing suites unchanged: `node --test tests/*.test.mjs stackbreaker/tests/*.test.mjs mana-heist/tests/*.test.mjs`
   - Optional browser tests (need Playwright + Chromium): `python3 -m http.server 8765` from the repo root, then `LC_CHROMIUM=<chromium path> python3 living-card/tests/e2e.py` → expect 38/38
5. Commit ("GRAFTBOUND v0.4 in living-card/ (playtest build)"), push the branch, and open a **draft PR**.
6. Let Cloudflare Pages build the branch preview (static site, no build step, no env vars, no secrets).
7. Give the owner the playtest link: `<preview-url>/living-card/`
8. Smoke-check that link:
   - The title says **GRAFTBOUND** and "Begin as nothing. Become everything."
   - Begin Adventure → intro → first battle loads with no console errors.
   - Win the battle and open the booster. With network access, real Magic card images should load from `cards.scryfall.io`. Report any "Scryfall mismatch" console warnings verbatim.
   - If the site has a Content-Security-Policy, it must allow `connect-src https://api.scryfall.com` and `img-src https://cards.scryfall.io`. Without them the game still works, just with its own card frames.

## Report back to the owner
Branch name, PR link, preview URL, test results (actual numbers), and any warnings. Do not claim anything you did not run.
