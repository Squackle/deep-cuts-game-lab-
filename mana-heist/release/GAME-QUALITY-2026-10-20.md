# Gameplay quality audit: heading and status layout

Owner work order: test all games, improve presentation, and verify reasoning-based difficulty scaling. Branch: `game/mana-heist-decision-quality-20261020`, based on Lab `3d634002b46a957f34fe6009c4a268a0001b1868`.

## Completed

`tabletop-immersion.css` now separates the vault name from Final Turn/Undo/Restart at phone widths, restores TURN/LIFE labels, reserves space for the short-phone auto-cast toggle, and bounds long desktop headings. Colors, content, game engine and existing controls are preserved.

- `node --test mana-heist/tests/*.test.mjs`: **215/215**.
- Real Chromium: 320×568, 390×844, 1280×900. Checked title/control intersection and status visibility; tapped the Island, cast the first ward, reached victory, confirmed local save and refresh, and checked JS errors/horizontal fit. All external requests blocked.
- Reproducible browser regression lives in companion Website branch `site/games-quality-20261020`, `scripts/game-quality/browser.mjs`. With playwright-core 1.56.1 and Chromium installed, run from that checkout: `node scripts/game-quality/browser.mjs /path/to/this-lab /path/to/stackbreaker-patch /tmp/game-screens`.
- These are emulated browser dimensions, not physical device or every-vault UI certification. Full campaign certificate tests run separately.

## Difficulty finding — unresolved

The current D formula gives a single blue ward on one Island D=17; repeating the same ward six times over six turns gives D=60. That increase is not evidence of richer reasoning. The Website audit includes a bounded graph analyzer, repetition regression and 750-puzzle evidence file. Only 175/500 MH graphs finish at a 1,500-state budget; incomplete graphs are not rated. Structural family matches are candidates for curriculum review, not proven duplicate strategies.

No difficulty rating, puzzle identity, saved best, original 18 boards, 500-stage access, auto-cast default or mana rule changed. This is partial P11/P14 QA work, not completion of P02, P06–P10 or P15. Human curriculum validation remains open. Rules version unchanged.

## Handoff

No Lab or production deployment was run. Remote CI/preview results belong on the review PR and must be checked before merge. Existing rights/brand and independent rules-review gates remain unresolved. Follow-up: curated unranked tiers with interacting decisions, then consented human calibration; preserve original save keys and versioned puzzles. Rollback: revert this CSS/documentation patch; no migration or data rollback required.
