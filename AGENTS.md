# Deep Cuts Shared Game Lab — developer agent contracts

This repository `Squackle/deep-cuts-game-lab-` is the **separate solo prototype environment for Hive Run, Stackbreaker, Mana Heist, GRAFTBOUND, and ARCHEMANCY**. The central playtest catalog is published at `/` from `index.html`, with the previous `/lab/` page retained as an equivalent legacy entry. Hive Run's play page is `/hive-run/` (`hive-run/index.html`) while its existing engine and art remain under root-level `src/**` and `assets/**`. The production website is `Squackle/deep-cuts-edh`. Other original game routes stay intact.

- **Hive Run developer** owns `/hive-run/` gameplay and existing root-level `src/**`, `styles.css`, assets, deterministic client/playback tests and Hive Lab releases here. Shared catalog `index.html` and `lab/**` remain centrally coordinated.
- **Stackbreaker developer** owns only `stackbreaker/**` in branches `game/stackbreaker-*`; never touches other game source.
- **Mana Heist developer** owns only `mana-heist/**` in branches `game/mana-heist-*`; never touches other game source.
- **ARCHEMANCY developer** owns `archamancy/**` and the `archemancy/index.html` entry. Owner requires deployment to the canonical Game Lab menu, not separate preview URLs. Keep the public Arcade untouched.
- **Shared Lab catalog** lives at root `index.html` (primary URL `/`) and `lab/index.html` (legacy URL `/lab/`), with shared `lab/**` assets, and is centrally coordinated; game agents request catalog changes rather than editing it. Research first when owner assigns research-only work.
- **Website developer** owns production website, authenticated profiles, scored/replay-verified leaderboards, APIs, and **promotion** of tested gameplay into `deep-cuts-edh`.
- **Project assistant** documents requirements/QA, maintains GitHub issue #14, reviews work, and does not silently change game code.

**Permanent owner release rule (Oct 15, 2026): TEST SERVER FIRST for every Hive Run update.** Follow [the test-first release policy](docs/TEST-FIRST-RELEASE-POLICY.md). Deploy and verify this Lab, then provide an explicit user-triggered promotion control. Do not touch the public game until the owner activates promotion in a subsequent turn. The Codex must live on authenticated My Profile, not in the gameplay HUD; no local Lab preview may be represented as a saved public profile.

Before editing, inspect both repository `main` SHAs and open PRs. Never reuse someone else's working branch. Prefer `game/<topic>` or `coord/<topic>` from latest main and fill the PR template. Test each rules change against deterministic playback/versioning. If paths overlap an older open PR, wait and coordinate.

**Isolation is mandatory:** This lab does not issue authoritative player identities, submit public scores or connect to production D1. Its intentionally retired leaderboard API remains disabled. Lair is unranked; past verified public scores remain on the main site. Never revive retired Daily Ritual competition accidentally.

A lab merge or deployment is **not** permission to update production. Main-site promotion requires owner authorization, a separate integration PR with full tested lab SHA and replay evidence, and website-developer approval/verification. Never copy a game patch directly into main or overwrite website changes.

Read [docs/MAIN-SITE-PROMOTION.md](docs/MAIN-SITE-PROMOTION.md) and the main repository's [development lanes](https://github.com/Squackle/deep-cuts-edh/blob/main/docs/DEVELOPMENT-LANES.md).

Branch protection must be enabled separately by the repo owner. CODEOWNERS with `@Squackle` is accountable ownership, not independent assistant identity.

## One Lab, five independent playtests

See [SHARED-GAME-LAB.md](docs/SHARED-GAME-LAB.md) for canonical game URLs, game-agent branch/path lanes, combined tests, and promotion requirements. This is a **single testing site**, never a single shared rules engine, shared score store, or authorization to modify the production Arcade.

## MTG rules verification — all game and QA agents

For Stackbreaker, Mana Heist, and any Magic-derived claims in future game mechanics, validate card interactions against Wizards' **latest [Comprehensive Rules](https://magic.wizards.com/en/rules)** and **[Gatherer Oracle text/rulings](https://gatherer.wizards.com/)** first. Include official release notes/Commander-format restrictions where relevant, and record rule numbers / text / effective date. For complicated or uncertain interactions, **also check [Card-Forge/forge](https://github.com/Card-Forge/forge) when reasonably practical** (inspect code/tests or reproduce in a real build); distinguish this from a merely proposed comparison. Forge is unofficial and never outranks official Magic rules. If Forge is unavailable, say so; do not fabricate a check. When changing our game rules, add a regression test and preserve deterministic replay/versioning boundaries. Do not copy/import Forge GPL-3.0 implementation, runtime or assets without separate approval and license review.

Shared checklist: [website docs/MTG-RULES-VERIFICATION.md](https://github.com/Squackle/deep-cuts-edh/blob/main/docs/MTG-RULES-VERIFICATION.md) (canonical after its companion PR is merged). This policy applies to rules claims, not unrelated original Hive Run mechanics, and does not authorize production promotion.

## Shared reliability lane

The dedicated security/QA developer owns shared CI, shared testing infrastructure and maintenance docs on `coord/*` branches. Consult [docs/RELIABILITY-HANDOFF.md](docs/RELIABILITY-HANDOFF.md). Coordinate game-specific tests/source with the game owner; do not alter rules or production data. All required prerequisite suites must succeed at the exact PR head, including GRAFTBOUND verification; a green source export is not test evidence.

## Targeted maintenance navigation
Read [docs/MAINTENANCE-HANDBOOK.md](docs/MAINTENANCE-HANDBOOK.md) before reliability or release work. Start at the affected game's entry and own source folder; for catalog/presence use index.html, lab/** and functions/api/lab-presence.js. For CI use .github/workflows/ and scripts/release-coordination.mjs. Run the exact failed test file first, then complete required CI. Don't read or modify every game for a shared navigation issue. Keep new runtime edits in the Game Lab lane with central coordination, never disguise them as Coordination docs. No live presence writes or score submissions for QA.
