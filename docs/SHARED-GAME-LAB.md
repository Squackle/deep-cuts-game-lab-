# Shared Game Test Lab — three games, independent agents

**Playtest catalog:** https://deep-cuts-game-lab.pages.dev/lab/

The **one lab website** contains all three independently built prototypes:

| Game | Preview | Owned paths | Primary developer |
|---|---|---|---|
| Hive Run | [Play Hive Run](https://deep-cuts-game-lab.pages.dev/) | Root game `index.html`, `styles.css`, `src/**`, Hive-specific `tests/**`, `assets/**`, `functions/**` | Hive Run developer |
| Stackbreaker | [Play Stackbreaker](https://deep-cuts-game-lab.pages.dev/stackbreaker/) | `stackbreaker/**` | Stackbreaker developer |
| Mana Heist | [Play Mana Heist](https://deep-cuts-game-lab.pages.dev/mana-heist/) | `mana-heist/**` | Mana Heist developer |
| Shared playtest catalog | [All three games](https://deep-cuts-game-lab.pages.dev/lab/) | `lab/**`, shared documentation and shared CI/coordination files | Coordination / website-integrator when explicitly authorized |

All three games **already existed in this repo** before the shared lab catalog was created. This update does **not** copy source from the older website-incubator branch handoffs, alter either game engine, or reset browser progress. Prior starter documents in the website repo can remain as historical design briefs. New development should use the **Lab repository** and game directories above, not write game files in the production website.

## Rules for simultaneous agents

1. Check **Lab main SHA, open PRs and recent shared-file changes** before starting. Create a fresh branch from the latest Lab main; never share a working branch or worktree across agents.
2. **Stackbreaker:** branch names `game/stackbreaker-*`; edit **only** `stackbreaker/**`. **Mana Heist:** `game/mana-heist-*`; edit **only** `mana-heist/**`. These lanes are enforced at PR checks by `scripts/release-coordination.mjs` and tested.
3. **Hive Run:** continue in its current Lab workstream (e.g. `game/matriarch-*`, `game/beacon-*`) and stay within Hive game ownership. Do not edit Stackbreaker, Mana Heist or the shared Lab catalog.
4. **Shared catalog:** `lab/index.html`, `lab/lab.css` and supporting integration tests/CI are centrally maintained. Game agents should request updates to the catalog, **not directly rewrite it**. Neither standalone game imports shared runtime modules or needs the other games' scripts.
5. Fill the existing PR metadata (Workstream: Game Lab, Owner authorization, Files/Scope, Concurrent work, Test plan, Rollback, Rules version, Main-site impact). Wait for overlapping older PRs, rebase/retest after they merge. GitHub's shared account is **not** independent approval from separate people.
6. Lab main is test hosting only. Do not add production authentication, leaderboard score submission, public D1, account keys, player identities or monetization. Local-only personal best/progress stays inside each game's original storage. Never claim Lab unlocks were added to the real user profile.

## Unified testing

- **Full shared smoke/engine suite:** `node --test tests/*.test.mjs stackbreaker/tests/*.test.mjs mana-heist/tests/*.test.mjs`
- **Shared catalog contract:** `node --test tests/lab-catalog.test.mjs`
- **Syntax checking:** `node --check` for each game's main engine/UI (configured in `.github/workflows/lab-catalog.yml`).
- **Cloudflare Pages:** Project `deep-cuts-game-lab` publishes Lab `main` to `deep-cuts-game-lab.pages.dev`. Verify all three routes, direct deep links, responsive layout and successful exact SHA after every shared-catalog release.
- The Hive-specific `verify` workflow and Mana Heist's scoped workflow remain in place. This adds cross-game regression coverage but doesn't replace each agent's richer browser/manual checks, particularly Stackbreaker's Python Chromium smoke suite. One green catalog check is not a blanket claim that every game was manually playtested.

## Promotion boundary

The shared catalog provides one **place to playtest**, not one shared gameplay engine. Each game still has its own rules version, changelog, validation and release approval. For an approved Hive Run change, use [MAIN-SITE-PROMOTION.md](MAIN-SITE-PROMOTION.md), full tested SHA, replay validation and an authorized separate production PR. Other games require their own owner-approved Website Developer integration plan, tests and IP review before inclusion in the public Arcade.

**Never automatically promote from Lab main to production Deep Cuts EDH.**

## Agent prompt snippets

- **Hive Run:** “Continue Hive Run in the Game Lab repo `Squackle/deep-cuts-game-lab-`. Own Hive source/root game only, preserve other games and shared `lab/**` catalog. Run Hive and unified Lab checks. Do not touch production. Use test-first promotion.”
- **Stackbreaker:** “Build solely in `Squackle/deep-cuts-game-lab-`, branches `game/stackbreaker-*`, paths `stackbreaker/**`. Read `AGENTS.md` and `docs/SHARED-GAME-LAB.md`. Keep one standalone test route and run Stackbreaker plus shared Lab checks. Do not change Hive Run, Mana Heist or the public Arcade.”
- **Mana Heist:** “Build solely in `Squackle/deep-cuts-game-lab-`, branches `game/mana-heist-*`, paths `mana-heist/**`. Read `AGENTS.md` and `docs/SHARED-GAME-LAB.md`. Keep one standalone test route and run Mana Heist plus shared Lab checks. Do not change Hive Run, Stackbreaker or the public Arcade.”
