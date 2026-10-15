# Hive Run Game Lab — developer agent contract

This repository `Squackle/deep-cuts-game-lab-` is a **separate solo prototype environment**. The production website is `Squackle/deep-cuts-edh`.

- **Hive Run developer** owns mechanics, sprites, boss AI, music, rendering, balance, deterministic client/playback tests and lab releases here. Research first when owner assigns research-only work.
- **Website developer** owns production website, authenticated profiles, scored/replay-verified leaderboards, APIs, and **promotion** of tested gameplay into `deep-cuts-edh`.
- **Project assistant** documents requirements/QA, maintains GitHub issue #14, reviews work, and does not silently change game code.

**Permanent owner release rule (Oct 15, 2026): TEST SERVER FIRST for every Hive Run update.** Follow [the test-first release policy](docs/TEST-FIRST-RELEASE-POLICY.md). Deploy and verify this Lab, then provide an explicit user-triggered promotion control. Do not touch the public game until the owner activates promotion in a subsequent turn. The Codex must live on authenticated My Profile, not in the gameplay HUD; no local Lab preview may be represented as a saved public profile.

Before editing, inspect both repository `main` SHAs and open PRs. Never reuse someone else's working branch. Prefer `game/<topic>` or `coord/<topic>` from latest main and fill the PR template. Test each rules change against deterministic playback/versioning. If paths overlap an older open PR, wait and coordinate.

**Isolation is mandatory:** This lab does not issue authoritative player identities, submit public scores or connect to production D1. Its intentionally retired leaderboard API remains disabled. Lair is unranked; past verified public scores remain on the main site. Never revive retired Daily Ritual competition accidentally.

A lab merge or deployment is **not** permission to update production. Main-site promotion requires owner authorization, a separate integration PR with full tested lab SHA and replay evidence, and website-developer approval/verification. Never copy a game patch directly into main or overwrite website changes.

Read [docs/MAIN-SITE-PROMOTION.md](docs/MAIN-SITE-PROMOTION.md) and the main repository's [development lanes](https://github.com/Squackle/deep-cuts-edh/blob/main/docs/DEVELOPMENT-LANES.md).

Branch protection must be enabled separately by the repo owner. CODEOWNERS with `@Squackle` is accountable ownership, not independent assistant identity.
