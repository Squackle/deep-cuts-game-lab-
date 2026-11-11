# AGENTS.md — graftbound/

- Everything for GRAFTBOUND lives in `graftbound/`. The sibling `living-card/` is a **redirect stub only**; never put game files there.
- Never edit other games (Hive Run, Stackbreaker, Mana Heist), shared infrastructure, the production DeepCutsEDH site, accounts, leaderboards, payments or D1 data.
- The only shared-file change v0.5 needs is the **existing** Game Lab catalog entry: retitle it to GRAFTBOUND and link it to `/graftbound/`. Do not add a duplicate entry.
- Simulation (`src/core`, `src/data`, `src/engine`, `src/cards`) must stay DOM-free and covered by `npm test`.
- Rewards must be real Magic cards from `src/cards/real-pool.js`. Never invent cards. Every spell needs a reviewed adaptation in `compatibility.js` with an honest note.
- Save keys `deepcutsedh.livingcard.*` are intentionally unchanged. Never delete saves; add a versioned migration instead.
- Art is original. Never convert Magic card artwork into sprites or textures.
- Do not merge or deploy without the owner's explicit approval.

## Preserved game-lab lane rules (PR #136)

- Follow repository root `AGENTS.md`, `docs/SHARED-GAME-LAB.md` and `docs/TEST-FIRST-RELEASE-POLICY.md`.
- Use a fresh `game/graftbound-*` branch. Edit shared `lab/**` or shared tests only through separately coordinated, owner-authorized changes.
- Never change Hive Run, Mana Heist, Stackbreaker, production DeepCutsEDH, public profiles/scores, payments or D1.
- Local Lab progress remains unranked and does not affect user profiles. Promotion requires separate user authorization.
- Run game and shared Lab checks, record test evidence and rollback plan.
