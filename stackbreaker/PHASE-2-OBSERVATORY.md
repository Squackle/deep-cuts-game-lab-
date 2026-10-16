# Stackbreaker 1.5 · The Arcane Observatory — Phase 2

**Owner authorization:** "deploy phase 2 phase 1 looks good" (October 16, 2026).

## What changed
- A continuous astral dueling surface joins the battlefield and the stack. A non-interactive, CSS-drawn orrery lives beneath the actual cards.
- Life totals became circular, targetable medallions; the current last-in-first-out stack becomes the more prominent spell sequence within the same tabletop.
- Land permanents and mana indicators occupy a raised mana shelf; seven distinct Scryfall card faces remain in a prominent, horizontally navigable hand tray.
- Mission, priority, game controls and presentation use the same midnight/brass/deep-forest art direction, not disconnected bordered dashboard sections.
- Updated headings use meaningful game language; all existing DOM IDs and interactions remain.
- All new presentation lives in `observatory.css`, loaded **after** existing styles and bundled inline in `index.html` by `build.py`. No new network font, framework, art dependency, or new game rule.
- Phone width renders battlefield and stack inside one vertical frame, with a purpose-built compact hand, land and control layout. Spell lists scroll rather than silently hiding deeper entries.

## Scope and safeguards
- Stackbreaker game appearance version 1.5; rules version remains `sb-mtg-training-0.3.0`.
- All 250 scenario IDs, seven-card hand compositions, game engine, Scryfall calls and saved progress key `dc-stackbreaker-progress-v3` remain unchanged.
- The Galaxy Atlas is deliberately unchanged; its larger visual redesign is Phase 5.
- Physical card movement effects and audio are future Phase 3/4 work.
- Changes belong only to `stackbreaker/**` in the standalone Cloudflare Game Lab repository. No Hive Run, Mana Heist, common Lab catalog, database or public main-site edit.

## Validation
- `cd stackbreaker && npm test && python build.py && npm test` should pass. The new Observatory regression checks build-to-source CSS parity, old DOM controller hooks, progress IDs and mobile/reduced-motion rules.
- Run the shared Game Lab CI suite, confirm the exact commit's Cloudflare Pages preview and deployment success, and verify visible cards, lands, stack and buttons at 320, 390, 768 and desktop widths in a real browser where possible.
- No physical iPhone/Android verification is claimed from simulated tests.

## Rollback
Revert only this Stackbreaker Phase 2 PR and rebuild. No user save migration or game-score correction is needed.
