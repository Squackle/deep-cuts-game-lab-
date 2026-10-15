# Hive Run Game Lab → main site promotion protocol

This repository is for **solo** experiments and reproducible previews. Only `Squackle/deep-cuts-edh` owns production account identities, leaderboard writes, versioned server-side replay validation, and public score history.

## Game Lab work

1. Create a new `game/<topic>` branch from the current Lab main (inspect other open PRs).
2. Log changed paths, tests, mode/version, and score-compatibility decision in a PR. The `release-coordination` check flags overlaps with older open PRs.
3. Use the existing deterministic game tests `npm test` / `.github/workflows/game-tests.yml`; cover keyboard/swipe, obstacles, boss cooldowns, replay stability, Lair eligibility and score logic.
4. Merge to Lab main only after checks pass; verify the Lab's own Cloudflare deployment, not main-site production.

## Promoting to the production website

1. Record **full 40-character Lab source commit**, exact rules version, changed gameplay paths, test URLs and rollback to stable version. Changes can require server+client migration.
2. Notify website developer and Control Room issue #14. Wait for owner authorization of the separate production update.
3. Website developer opens a PR in `Squackle/deep-cuts-edh` with `Workstream: Game Lab Promotion` and the three required fields: `Lab source SHA:`, `Rules version:`, `Score/replay validation:`.
4. Integrate/retest client and server replay against the same rules version; reject tampered or old-version scores. Ensure old verified rankings stay preserved and labeled, retired Daily Ritual remains retired, and Lab D1 remains isolated.
5. Run main site's `site-quality`, `integration` (Hive), auth/score and real-browser tests. Review overlapping work. Then merge and verify exact Cloudflare production commit.

## Ownership and emergency coordination

- Other assistant chats cannot read one another's unwritten plans. Shared GitHub issues/PRs are the durable handoff.
- Separate PRs/branches prevent accidental replacement, but only GitHub branch protections **enforce** PR/CI gating; see main [development lanes](https://github.com/Squackle/deep-cuts-edh/blob/main/docs/DEVELOPMENT-LANES.md).
- If a conflicting website PR exists, pause. Website owner chooses integration order; don't overwrite either commit.
- Research-only requests authorize documentation/recommendations, **not** a game release.
