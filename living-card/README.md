# The Living Card — Game Lab integration slot

**Status: Reserved integration path; not a playable build.**

- Lab route: `/living-card/`
- Future URL on the Lab production branch: https://deep-cuts-game-lab.pages.dev/living-card/
- Repository: `Squackle/deep-cuts-game-lab-`
- Owned directory: `living-card/**`
- Existing standalone prototype has been reported by Claude as `games/living-card/**` in a separate ZIP. It has **not** been inspected, imported, verified, or deployed by this setup.
- The current `index.html` is a truthful staging page and MUST be replaced with a tested working entry when the game is integrated.

## Project goal

An HD-2D fantasy tactical RPG with 2D creature sprites and dimensional environments. Begin as a blank 1/1; win battles; reveal a three-card reward pack; absorb creature cards to add power/toughness and supported abilities, or learn spells; visibly evolve; continue a non-daily campaign.

## Guidance for the incoming Claude developer

1. Read repository-root `AGENTS.md`, `docs/SHARED-GAME-LAB.md`, `docs/TEST-FIRST-RELEASE-POLICY.md`, and this file. Inspect current `main` and open PRs.
2. Do **not** overwrite existing projects (`src/**`, `stackbreaker/**`, `mana-heist/**`, production website, or shared `lab/**` catalog).
3. Use a fresh `game/living-card-*` branch. All gameplay code/assets/tests belong under `living-card/**`. Coordinate shared catalog/CI changes separately.
4. Integrate the actual prototype from the ZIP; identify functional vs. placeholder features. Preserve tested code; migrate from `games/living-card/` to `living-card/` carefully.
5. Keep rules/state independent from graphics; prefer modular HD-2D renderer with real original sprite assets. Avoid claiming polished art when using placeholders.
6. Provide direct URL playtest and run automated and browser tests. Minimum end-to-end acceptance: blank 1/1 → victory → three-card choice → absorb 2/2 deathtouch → 3/3 deathtouch in the next fight → save/restore.
7. Scryfall-linked card metadata in other games is **not** blanket permission to use Wizards/Scryfall assets in a new distributed game. Maintain a replaceable content adapter and resolve rights before public promotion.
8. Local Lab progress is never a public profile, score, or verified leaderboards. No Lab-to-production D1/auth/payment connections.
9. Record changes, tests, limitations and next work in a scoped development log. Coordinate root `DEVLOG.md` edits to avoid overlapping other agents.
10. A Lab preview is not a production Arcade release. Public site promotion requires a separate explicit approval.

## Handoff boundary

The placeholder HTML contains no gameplay engine, scripts, or third-party dependencies. Its purpose is to reserve the route, make the new game discoverable with honest status, and establish the correct file ownership. Once Claude's source is provided, replace this entry with the actual tested game. Do not call the placeholder a playable release.
