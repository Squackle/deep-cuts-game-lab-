# Stackbreaker — Creature P/T readability hotfix (2026-10-17)

**Owner authorization**: Explicitly requested changing the Classic creature card UI so the real printed P/T stays visible when boosted (e.g., Elite Vanguard +3/+3); a green rounded chip appears above the printed P/T. Base-setting effects keep an overprinted effective P/T box, redesigned so multi-digit stats don't clip. Owner requested an immediate Game Lab deployment.

## Contract
- Visual-only change in Classic Stackbreaker (not Final Turn's no-creature pilot). **Do not change the engine's legal gameplay, the Scryfall picture, any scenario, or progress keys.**
- `src/pt-display.js` is a pure formatting helper. `presentCreaturePT(unit,printed,effectivePower,effectiveToughness)` returns `printed`, `modifier`, or `replacement`.
- For effects represented by additive `powerBoost`/`toughnessBoost`, add an accessible green chip **above** the native Scryfall P/T region, e.g. `+3/+3`, `0/+3`, `-2/-2`. The Scryfall image and printed box are never overwritten.
- Recognized explicit +1/+1 counters (future-facing state): display `N × +1/+1` when no other boosts apply; a mixed counter + pump displays the net modifier and gives a screen-reader description of the counters.
- For a declared base-setting effect or other **non-additive** effective P/T, render a high-contrast replacement with room for e.g. `15/18`. Current Classic engine does **not yet implement base-P/T-setting spells**; the display path is prepared for their output, but this release does not claim those rules are playable.
- No saved player data, remote leaderboard, or production public website changes. Do not confuse Game Lab `deep-cuts-game-lab` with the production site `deep-cuts-edh`.

## QA / rollback
Run the complete unified Lab regression suite (all 250 Classic puzzles) including `tests/pt-display.test.mjs`, verify generated `index.html` built via `build.py`, check card overlay on a buffed Elite Vanguard at phone and desktop viewport sizes, and confirm no clipping for 2-digit replacement tests. After review, verify exact SHA Cloudflare Game Lab production deployment. Revert only this isolated PR to restore the prior presentation.
