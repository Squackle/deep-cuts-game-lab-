# GRAFTBOUND v1.2.7.1 — portrait terrain inspection layout hotfix

Owner-reported bug: selecting a Leyline on an iPhone in **portrait** mode displayed an oversized translucent terrain-inspection panel directly over Library, Graveyard, spells, and End Turn. The v1.2.7 fix only limited text wrapping and panel height; it did not reserve screen space for those controls.

## Fix

- On mobile widths up to 760 CSS pixels, selecting a noncreature tile creates a concise, two-line summary with a visible **Details** button. Full authoritative rule text and path warnings remain accessible in the existing modal.
- A presentation-only placement helper checks the *current bounding rectangles* of the hero plate, Library/Graveyard, spell hand, End Turn button, and top controls before placing the tile panel. It chooses a free position instead of using the old `bottom:104px` rule.
- On unusually compact windows where no position fits, the summary stays hidden rather than blocking controls; tapping the tile opens full details. No simulation, scoring, replay, save key, or tile rule changed.
- Disables positional CSS transitions on the compact panel so it does not sweep across the deck during repositioning.
- Creature and spell inspection preserve their existing behavior.

## Test evidence

- `cd graftbound && npm run assets` succeeded.
- `cd graftbound && npm test`: 290 total: 289 passed, 0 failed, 1 expected local network-only Scryfall skip. New six-case regression covers portrait iPhone, narrow portrait, high-placed deck piles, large portrait, tiny fail-closed cases and DOM/CSS hooks.
- Headless Chromium rendered real GRAFTBOUND CSS and markup via `page.set_content` at 320×568, 375×667, 390×844 and 430×932. Result: compact tile panel clear of controls, with inspect CSS custom positioning (no unwanted top/left transition). This is not a live Safari device certification.
- Remote GitHub Actions must re-run the full Scryfall and repository-wide checks before merging.

## Release and rollback

Game Lab only (`graftbound/**`); no public main-site or sibling game edits. Rules version remains `graftbound-rules-1.2.7-beta` and ranked revision remains unchanged. Rollback by reverting this isolated PR to prior Game Lab `main` commit `46de11ed8026e9f8aec6ad9084555de8e8cdcec2`.
