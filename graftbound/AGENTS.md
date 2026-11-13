# AGENTS.md — graftbound/

- Everything for GRAFTBOUND lives in `graftbound/`. The sibling `living-card/` is a **redirect stub only**; never put game files there.
- Never edit other games (Hive Run, Stackbreaker, Mana Heist), shared infrastructure, the production DeepCutsEDH site, accounts, leaderboards, payments or D1 data.
- The only shared-file change v0.5 needs is the **existing** Game Lab catalog entry: retitle it to GRAFTBOUND and link it to `/graftbound/`. Do not add a duplicate entry.
- Simulation (`src/core`, `src/data`, `src/engine`, `src/cards`) must stay DOM-free and covered by `npm test`.
- Rewards must be real Magic cards from `src/cards/real-pool.js`. Never invent cards. Every spell needs a reviewed adaptation in `compatibility.js` with an honest note.
- Save keys `deepcutsedh.livingcard.*` are intentionally unchanged. Never delete saves; add a versioned migration instead.
- Art is original. Never convert Magic card artwork into sprites or textures.
- Do not merge or deploy without owner authorization, including the standing Game Lab release direction below.

## Direct-to-Game-Lab release direction (owner decision, November 13, 2026)

- **The intended release destination for GRAFTBOUND is this repository's Game Lab `main` branch**, automatically published by Cloudflare Pages at `https://deep-cuts-game-lab.pages.dev/graftbound/`. A branch-specific Cloudflare preview is a QA artifact, not the final destination.
- For an owner-requested GRAFTBOUND implementation or update intended for playtesting, ship the tested change to Game Lab `main` after the normal PR, required checks, and available smoke tests; do not leave it indefinitely on a separate preview branch waiting for public-site promotion. If the owner explicitly says preview-only or hold, honor that.
- **Do not bypass CI, branch protections, versioned replay, or safety checks to ship faster.** Mark known incomplete or experimental gameplay as beta, disclose unverified browser/device acceptance and remaining gameplay limitations, and never claim those checks passed if they have not.
- No update to `Squackle/deep-cuts-edh`, public accounts, leaderboards or production D1 is authorized by a Game Lab release. Public Arcade promotion requires a separate explicit owner request and website integration review.
- Every playable title and in-game pause menu must offer an accessible path back to the shared Game Lab catalog (`/lab/`), without requiring the user to discard a saved run.

## Preserved game-lab lane rules (PR #136)

- Follow repository root `AGENTS.md`, `docs/SHARED-GAME-LAB.md` and `docs/TEST-FIRST-RELEASE-POLICY.md`.
- Use a fresh `game/graftbound-*` branch. Edit shared `lab/**` or shared tests only through separately coordinated, owner-authorized changes.
- Never change Hive Run, Mana Heist, Stackbreaker, production DeepCutsEDH, public profiles/scores, payments or D1.
- Local Lab progress remains unranked and does not affect user profiles. Promotion requires separate user authorization.
- Run game and shared Lab checks, record test evidence and rollback plan.
