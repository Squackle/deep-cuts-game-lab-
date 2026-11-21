# Shared Game Test Lab — five games, independent agents

**Playtest catalog:** https://deep-cuts-game-lab.pages.dev/ (canonical homepage). The previous /lab/ address remains functional.

The **one Lab website** now contains five independent playtests:

| Game | Preview | Owned paths | Primary developer |
|---|---|---|---|
| Hive Run | [Play Hive Run](https://deep-cuts-game-lab.pages.dev/hive-run/) | `hive-run/index.html` for the entry page; original `src/**`, `styles.css`, `assets/**`, Hive tests and API remain rooted at repository top level | Hive Run developer |
| Stackbreaker | [Play Stackbreaker](https://deep-cuts-game-lab.pages.dev/stackbreaker/) | `stackbreaker/**` | Stackbreaker developer |
| Mana Heist | [Play Mana Heist](https://deep-cuts-game-lab.pages.dev/mana-heist/) | `mana-heist/**` | Mana Heist developer |
| GRAFTBOUND | [Play GRAFTBOUND](https://deep-cuts-game-lab.pages.dev/graftbound/) | `graftbound/**` | GRAFTBOUND developer |
| ARCHEMANCY | [Play ARCHEMANCY](https://deep-cuts-game-lab.pages.dev/archemancy/) | `archamancy/**`, `archemancy/index.html` | ARCHEMANCY developer |
| Shared playtest catalog | [All five games](https://deep-cuts-game-lab.pages.dev/) | Root `index.html`, `lab/index.html`, `lab/**`, shared catalog test/CI and docs | Central coordination / website integrator |

**Homepage routing, November 16, 2026:** The four-game catalog now occupies the real root `/`. The Hive Run entry HTML was moved to `/hive-run/` without moving its runtime modules, sprites, backgrounds or saved local progress. Its entry page includes a root `<base>` so existing paths still resolve and its in-page skip link explicitly targets `/hive-run/#game`. Both root and legacy `/lab/` catalogs are kept in sync by a regression test.

The Lab is separate from the production Deep Cuts EDH Arcade. No identity, D1, real ranking, user-authenticated score, or payment integration is promoted by this routing change.

## Rules for simultaneous agents

1. Check **Lab main SHA, open PRs and recent shared-file changes** before starting. Create a fresh branch from the latest Lab main; never share a working branch or worktree across agents.
2. **Stackbreaker:** branch names `game/stackbreaker-*`; edit **only** `stackbreaker/**`. **Mana Heist:** `game/mana-heist-*`; edit **only** `mana-heist/**`. These lanes are enforced at PR checks by `scripts/release-coordination.mjs` and tested.
3. **Hive Run:** continue in its current Lab workstream (e.g. `game/matriarch-*`, `game/beacon-*`) and stay within Hive game ownership; coordinate edits to the root catalog and entry-route shell. Do not edit Stackbreaker, Mana Heist or the shared Lab catalog.
4. **Shared catalog:** root `index.html`, the legacy `lab/index.html`, `lab/lab.css` and supporting integration tests/CI are centrally maintained. Game agents should request updates to the catalog, **not directly rewrite it**. Neither standalone game imports shared runtime modules or needs the other games' scripts.
5. Fill the existing PR metadata (Workstream: Game Lab, Owner authorization, Files/Scope, Concurrent work, Test plan, Rollback, Rules version, Main-site impact). Wait for overlapping older PRs, rebase/retest after they merge. GitHub's shared account is **not** independent approval from separate people.
6. Lab main is test hosting only. Do not add production authentication, leaderboard score submission, public D1, account keys, player identities or monetization. Local-only personal best/progress stays inside each game's original storage. Never claim Lab unlocks were added to the real user profile.

## Unified testing

- **Full shared smoke/engine suite:** `node --test tests/*.test.mjs stackbreaker/tests/*.test.mjs mana-heist/tests/*.test.mjs archamancy/tests/*.test.mjs`
- **Shared catalog contract:** `node --test tests/lab-catalog.test.mjs`
- **Syntax checking:** `node --check` for each game's main engine/UI (configured in `.github/workflows/lab-catalog.yml`).
- **Cloudflare Pages:** Project `deep-cuts-game-lab` publishes Lab `main` to `deep-cuts-game-lab.pages.dev`. Verify the root homepage and all five game routes, direct deep links, responsive layout and successful exact SHA after every shared-catalog release.
- The Hive-specific `verify` workflow and Mana Heist's scoped workflow remain in place. This adds cross-game regression coverage but doesn't replace each agent's richer browser/manual checks, particularly Stackbreaker's Python Chromium smoke suite. One green catalog check is not a blanket claim that every game was manually playtested.

## ARCHEMANCY playtest release instruction

Owner instruction: develop and deploy ARCHEMANCY to the canonical Game Lab at `/archemancy/` (legacy `/archamancy/` redirects), with a tile in the main and legacy catalogs. Do not generate or provide separate branch-preview URLs; use the normal Lab release and verify the canonical site. This is not authorization for public Arcade promotion. Shared-menu changes require central coordination (explicitly authorized for the ARCHEMANCY addition).

## Promotion boundary

The shared catalog provides one **homepage to playtest**, not one shared gameplay engine. Each game still has its own rules version, changelog, validation and release approval. For an approved Hive Run change, use [MAIN-SITE-PROMOTION.md](MAIN-SITE-PROMOTION.md), full tested SHA, replay validation and an authorized separate production PR. Other games require their own owner-approved Website Developer integration plan, tests and IP review before inclusion in the public Arcade.

**Never automatically promote from Lab main to production Deep Cuts EDH.**

## Agent prompt snippets

- **Hive Run:** “Continue Hive Run in the Game Lab repo `Squackle/deep-cuts-game-lab-`. Own Hive source/root game only, preserve other games and shared `lab/**` catalog. Run Hive and unified Lab checks. Do not touch production. Use test-first promotion.”
- **Stackbreaker:** “Build solely in `Squackle/deep-cuts-game-lab-`, branches `game/stackbreaker-*`, paths `stackbreaker/**`. Read `AGENTS.md` and `docs/SHARED-GAME-LAB.md`. Keep one standalone test route and run Stackbreaker plus shared Lab checks. Do not change Hive Run, Mana Heist or the public Arcade.”
- **Mana Heist:** “Build solely in `Squackle/deep-cuts-game-lab-`, branches `game/mana-heist-*`, paths `mana-heist/**`. Read `AGENTS.md` and `docs/SHARED-GAME-LAB.md`. Keep one standalone test route and run Mana Heist plus shared Lab checks. Do not change Hive Run, Stackbreaker or the public Arcade.”
