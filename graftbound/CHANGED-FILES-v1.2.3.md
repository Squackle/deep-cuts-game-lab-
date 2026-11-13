# Changed files — v1.2.3 (base: game/graftbound-v1.2-living-cards-20261112 @ e3c5210b)

New
- src/engine/printed-triggers.js — Gearhulk choice, Shinobi exile/free-play, Scarab God upkeep/reanimate/return, opponent library
- tests/v123-printed-triggers.test.mjs — 13 regression cases
- CHANGED-FILES-v1.2.3.md

Modified
- src/engine/abilities.js — Shinobi combat-damage hook; Scarab death bookkeeping
- src/engine/ai.js — Gearhulk ETB queue; Scarab upkeep/reanimate use printed-triggers
- src/engine/combat.js — gearhulkChoice action; choice gating; end-step return; opponent main phase; graveyard reshuffle; oppSeed
- src/engine/deck.js — refillFromGraveyard
- src/engine/legal.js — pending choice is a legal action (never auto-end past it)
- src/engine/spells.js — cast blocked while a choice is pending
- src/engine/ranked.js — rules 1.2.3-beta, challenge revision 10, `gearhulk` decision
- src/ui/battle-ui.js — non-dismissible Gearhulk prompt; ability/exile/reshuffle feedback
- src/data/legendary.js — accurate Scarab God ability text
- package.json — 1.2.3-beta
- tests/helpers.mjs, tests/ranked-bot.mjs — bots answer the Gearhulk choice
- tests/v06-scoring, v08-tactics, v10-affinity-guard, v111-feedback — intentional version pins (1.2.3-beta / rev 10)
- tests/e2e.py — handles v1.2 Pack 3 of 3 (pre-existing staleness)
- docs/V12-LIVING-CARD-DEVELOPMENT.md — v1.2.3 section

Not changed: other games, lab/**, production site, save keys, D1, leaderboards.
Generated (not source): assets/sprites/*.png, assets/textures/* via `npm run assets`.
