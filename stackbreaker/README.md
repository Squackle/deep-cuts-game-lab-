# Stackbreaker 0.2 — The Last Response · Game Lab

**Game Lab URL:** https://deep-cuts-game-lab.pages.dev/stackbreaker/

Stackbreaker is an independent unofficial MTG *priority and stack training tool*, not a full rules engine, and is neither affiliated with nor endorsed by Wizards of the Coast or Scryfall.

## What's new in 0.2

- Twelve deterministic hand-authored scenarios: four Apprentice, four Investigator, four Mastermind.
- Real MTG card names, rules text, printed power/toughness, card types and mana costs from a limited curated catalog, with an external Scryfall lookup for every displayed creature/spell. No MTG artwork is copied into the game. Printed names/text/characteristics are manually curated and should be checked against updated Oracle data before expanded distribution.
- Functional mana-pool payment, stack targeting, casting/activating abilities, Selfless Spirit sacrificing as cost, stat boosts, indestructible, hexproof target legality on resolution, Swords exile/life, creature damage/state-based actions and multi-spell counter wars.
- Redesigned mobile-first battlefield with original CSS-only fantasy card glyphs and presentation, selectable targets, accessible priority controls, keyboard shortcuts (1–9, Space, Z), hints, undo, restart, resolution log and local-only stars.
- All code and scenario data are bundled into `stackbreaker/index.html` and isolated from Hive Run, Mana Heist, public game scores, profiles and any APIs.

## How to test / development source

The HTML in `/stackbreaker/` is a self-contained artifact of this source package. Generate with `python build.py`. Source files: `src/cards.js`, `src/engine.js`, `src/ui.js`, `data/scenarios.json`, `styles.css`. Run `npm test` (Node 22+) and `python tests/browser_smoke.py` (Playwright/Chromium, no external network). All scenario outcomes are deterministic and scripted; the opponent passes and does not make independent decisions.

## Known exclusions / rules caveats

A two-player, limited priority window with prefilled mana and spells. No full turn-structure, triggers, optional replacement effects, unrestricted target types, continuous-effect layers, combat system, permanent spell casting or multiplayer priority. P/T boosts last for the puzzle window only, not a simulated full cleanup step. Spell abilities and paid mana costs are modeled only for 21 curated cards, and Healing Salve deliberately offers only its 3-life gain mode. The engine makes no claim to judge accuracy for interactions outside the shipped puzzles.

Card artwork is not reproduced in this release. Linkouts are the supported way to view real printed cards. Scryfall and Wizards IP policies require a separate review before any card-image import, user-submitted deck content or monetized game use.

## Release / tests

- Local Node engine regression tests: 21 passed / 0 failed (12 solved/failed-path/determinism cases plus 9 targeted assertions).
- Local Chromium/Playwright interaction checks: 320, 390, 768, 1280 px; no scroll overflow or JS errors; first and last scenario victory flows completed using UI inputs. These checks use `page.set_content` because file/HTTP navigation is blocked by container browser policy.
- Mandatory final release gates: independent GitHub PR release-coordination CI; successful Cloudflare production deployment SHA for `main`; standalone `/stackbreaker/` content serves correctly. Physical Android/iOS interaction not yet verified by owner.
- Rollback: revert the two Stackbreaker directory files only; preserve all other game deployments and data.