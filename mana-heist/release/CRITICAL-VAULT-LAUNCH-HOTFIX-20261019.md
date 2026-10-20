# Mana Heist · CRITICAL hotfix — vault buttons failed to enter game

**Incident:** October 19, 2026. **Owner report:** “mana heist is broken, the level buttons dont lead anywhere, please continue what you were doing but first check that the game works!”

## Exact reproduction and root cause

Production Game Lab deployment `d9ffea7538be36f364a4ee3a20b1642824df23c7`. Using a real Cloudflare Chromium Browser Rendering interaction (inject a local diagnostic script *only into the ephemeral test browser*, no repository player data), click `[data-mode="heist"]`, then `.overworld-stage[data-level="0"]`.

**Reproduction:** Map renders **10 visible, enabled stage buttons**, but clicking Level 1 leaves `#gameScreen.hidden=true`. Browser error:

```
Uncaught ReferenceError: selectedHandId is not defined
https://deep-cuts-game-lab.pages.dev/mana-heist/src/main.js:787:32
```

**Cause:** A prior device-QA integration refactored the top-level state declaration from `let world=...,landDrag=null,lastCardId=null,selectedHandId=null` to `let world=...,landDrag=null,lastCardId=null`. The missing mutable state was first accessed by `load()` *before* `showGame()`, so stage buttons, Learn exercises and bonus trial buttons looked unresponsive. Existing Node syntax/engine tests did not execute this actual click path.

**Fix:** restore `selectedHandId=null` to the original top-level state declaration, **before** any `load()` or UI event binding. No changes to engine, card/level data, balance, published game links, HTML or historical save keys.

## Evidence after patch on Cloudflare branch previews

1. SHA `b918593612ef62871c5eeacb873f43bef1dabc06`, preview `https://7c3712ea.deep-cuts-game-lab.pages.dev/mana-heist/`: real browser click campaign, open Level 1, click battlefield card, wait for 2-second mana orb animation, Cast Spell, confirm win, Return Map. All passed: `stageOpened=true | castReady=true | won=true | mapRestored=true | stageButtons=10`.
2. SHA `4fe48d72ab67161fde14aa6b4ba68b03e5a2c8e1`, preview `https://1ee4d6d3.deep-cuts-game-lab.pages.dev/mana-heist/`: actual browser clicks successfully opened Level 1, Learn 01/28, scored Bonus Trial 1/2, Galaxy X revised vault 451 with 12 source cards, and final vault 500 with 21 sources. No uncaught JS errors; each stage had `#gameScreen.hidden=false`. No changes to player's browser data.
3. Added `tests/vault-launch-regression.test.mjs` asserting pre-load variable initialization, delegated campaign/learn/bonus launch wiring, and all 500 campaign/28 lessons/2 trials and existing key invariants. **These static tests supplement but do not replace the actual browser interaction above**.
4. All Mana Heist and unified Game Lab checks and release coordination PR gates must be green before merge. Verify the merged commit's exact SHA has a successful Cloudflare production deployment and recheck a real stage-click and cast on the immutable live deployment.

## Remaining limitations / safety

Cloudflare ephemeral Chromium interaction is **real browser automation** but not physical iPhone/Android/VoiceOver testing. Unchanged rules engine `mh-landfall-0.2.0` and `mh-mana-lab-2.0.0`. Existing 500 scored vaults, 28 lessons, two bonus trials, historical v3 medals, current v4 remixes, guest exports, metrics, manual QA remain unchanged. No public Deep Cuts EDH website promotion, other games, player accounts or D1 changes. Rights review P01 remains BLOCKED.

**Rollback:** Revert the isolated main.js variable fix and its test (but doing so would deliberately reintroduce the critical crash); restore last known working build only if independent validation finds new issues. As this is a one-line repair, forward fix is strongly preferred. Branch: `game/mana-heist-critical-vault-launch-fix-20261019`. Separate readiness audit branch is still in progress and not mixed into this hotfix.
