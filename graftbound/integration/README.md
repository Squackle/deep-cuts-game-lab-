# GRAFTBOUND — future main-site integration handoff (Game Lab only)

**Status:** This package is a *preparation tool*, not a website launch. GRAFTBOUND remains playable only on the canonical Game Lab route, `https://deep-cuts-game-lab.pages.dev/graftbound/`. Nothing in this package creates accounts, talks to production D1, enables a leaderboard, or sends a score to the main site.

## Problem solved

The historical main-site review PR [Squackle/deep-cuts-edh#133](https://github.com/Squackle/deep-cuts-edh/pull/133) pins a **v0.6** verifier with a manually maintained rules-file list and a placeholder commit SHA. The current Game Lab rules and replay schema have evolved substantially. Reusing that package unchanged could silently omit dependencies or produce incompatible ranked replays.

Instead of maintaining another stale list, `tools/integration-manifest.mjs` recursively walks the actual static imports of the **current** ranked verifier and bundled real-card reference loader. It emits sorted filenames, original-byte SHA-256 hashes, a single reproducible rules digest, current version/replay/challenge metadata, and optional explicitly provided full source commit. It includes source-only rules dependencies and fails closed on nonlocal imports, browser-only dependencies, or path escapes.

## Prepare a source snapshot, without deploying to the main website

1. Finish normal Game Lab PR review and required checks. Record the *full* 40-character merged Game Lab `main` commit, not the source commit of an older draft.
2. Run `cd graftbound && npm test` (includes `tests/integration-readiness.test.mjs`). Record actual totals and skips. Keep source verifier inputs browser-free and deterministic.
3. From the **exact same commit**, run `cd graftbound && node tools/integration-manifest.mjs --source-sha=<full-merged-SHA> > integration-source-manifest.json`. The output file is local until explicitly reviewed and carried into a later website integration PR.
4. Copy **exactly the listed `src/**` rule files** (preserving paths, bytes and dependency closure) into an isolated, reviewable server verifier. Recompute and compare every per-file SHA-256 and the ordered aggregate digest before accepting a pin. Import/initialize `src/cards/reference-set.js` as the browser does; no live Scryfall fetch is required for deterministic rules.
5. In a separate *future, owner-authorized* main-site PR, adapt the stale site v0.6 verifier/API as necessary to the current decision schema, score model, checkpoint state and challenge revision. Validate real Workers/D1 behavior, authenticated ownership, origin/CSRF policy, rate limits, restart/resume, replay tampering, old-version isolation and safe rollback. A matching digest alone is **not** proof of server replay parity.
6. Only after successful signed-in staging tests and a new explicit public-site launch authorization may site operators enable production score submission and profile/leaderboard integrations. The Lab itself must remain locally unranked.

## Contract and boundaries

- The source of truth is `src/engine/ranked.js`: `RULES_VERSION`, `CARD_POOL_VERSION`, `REPLAY_VERSION`, `RANKED_CHALLENGES`, `MAX_DECISIONS` and `MAX_SEGMENT`. The browser game version is `src/config.js`; `SCORING_VERSION` is incorporated via the active challenge.
- The engine accepts **player decisions**, not client-reported score, damage, kills, rewards, profile identity or RNG results. Only a trusted server can start/checkpoint a competitive session. This manifest does not authorize server submissions.
- The source manifest is deterministic by design: no timestamp or inferred commit. The optional `sourceCommit` string is an operator-supplied label, **not verified by the generator**. Reviewers must independently verify it against GitHub source for the supplied commit.
- A change to gameplay or scoring rules requires a reviewed rules fingerprint and challenge-revision policy. Previously verified records must not be silently replayed under newer mechanics.
- Do not copy `src/ui/**`, `src/rendering/**`, artwork, browser saves, local scores, auth cookies or account data into a Worker verifier. The website can separately reuse approved visual/UI assets after rights and integration review.
- Keep `deepcutsedh.livingcard.*` local saves and the existing `/graftbound/` URL. Do not alter the retired Lab leaderboard endpoint, other games, shared services or the production website.

**Open gates:** GitHub's shared Lab workflow has historically not executed `graftbound/npm test`; verify GRAFTBOUND-specific test evidence explicitly. Physical Safari/Android playtesting, real Cloudflare Worker/D1 replay parity, security staging, and main-site launch approval remain separate.
