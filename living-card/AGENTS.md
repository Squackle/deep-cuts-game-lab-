# The Living Card — development lane

Read the root `AGENTS.md` and `docs/SHARED-GAME-LAB.md` first. This is a *new* independent, unranked prototype in `living-card/**`.

- Use `game/living-card-*` branches and stay inside `living-card/**`. Separate coordination PRs own `lab/**`, shared tests, workflows and root documentation.
- Do not touch Hive Run root gameplay, Stackbreaker, Mana Heist, production website, public user identities, score services, payments, or D1.
- Preserve the owner's core requirements: HD-2D graphics (2D sprites, dimensional scenes), blank 1/1 start, 3-card post-win rewards, absorb creature stats/abilities, distinct spellbook, visual evolution, non-daily campaign.
- Prefer deterministic rules and testable state transitions. Do not substitute nonfunctional text/UI mockups for gameplay.
- Do not turn third-party MTG references into an assertion of asset-use permission. Keep original artwork and a replaceable metadata/content layer.
- The starter `index.html` is a staging page ONLY. Replace it once a real playable build passes tests. Avoid telling users they can play until that is true.
- Run relevant scoped tests and the shared Lab checks before PR promotion. Document tests, changed files, limitations, and rollback.
