# Stackbreaker 0.9 — Five Worlds Campaign

Game Lab URL: https://deep-cuts-game-lab.pages.dev/stackbreaker/

**Core promise:** One turn to live. Find the response that changes everything.

This is an independent, unofficial Magic: The Gathering priority-and-stack training prototype, not a full comprehensive-rules implementation or rules judge. It links and hotlinks card data/art through Scryfall rather than committing card art into the repository. Respect Wizards/Scryfall's attribution and fan-content limitations.

## Campaign release

- **Five distinct worlds, six levels each — 30 total cases**, all hand-authored, validated and tested. The first twelve stages and their saved progress IDs remain intact. **The Final Exchange is World 1, Level 6**.
- **Chapter-select world map:** five colorful themes (The First Spark, Shatterwood Trail, Spellwater Coast, The Mana Rift, Last Response Citadel), connected level nodes, chapter-end castle/boss markers, solved flags, and local best-of-three stars. Every stage remains directly available for practice; no account or forced lockout.
- **Previous and Next buttons** sit together in the game's one-screen control strip; Previous is disabled at the start, Next at the end. The global dropdown remains for direct jumps. MAP opens and closes a keyboard-accessible map overlay; Esc closes it. The last selected level is remembered locally. Local progress uses the existing storage key `dc-stackbreaker-progress-v3` and never overwrites old results.
- **More real-card variety:** Blossoming Defense, Dive Down, Titanic Growth, Lightning Strike, and Cancel join the curated catalog. Targeted friendly-creature hexproof/buffs, color-sensitive payment decisions, exile vs destruction, anti-counterwars, and simultaneous creature-preservation / opponent-lethal objectives appear in the later worlds.
- **Game feel preserved:** Tap named land cards for mana, drag real Scryfall card images onto the stack, creature, or life totals, observe gold legal-target glows, click permanent abilities, resolve the LIFO stack, and undo. The hand contains **only actual card images**, with no faux Cast buttons. The battlefield shows only Scryfall's printed power/toughness unless an effect actually changes those values.
- **One-screen play:** game controls remain inside the viewport on tested mobile, tablet, and desktop sizes. Explanations and log continue below the playing area.

## Development workflow

Use `npm test` to run the deterministic scenario suite and campaign validators. Run `python build.py` after modifying `src/**`, `data/**`, `styles.css`, or `template.html`; commit the generated `index.html` alongside sources. Browser tests require local Chromium and Playwright: `python tests/world_map.test.py`, `python tests/drag_targets.test.py`, `python tests/gold_drag.test.py`, `python tests/physical_cards.test.py`, `python tests/printed_stats.test.py`, `python tests/scryfall_art.test.py`.

The current rules subset supports two players and scripted always-pass opponent priority, mana tapping/payment, spells/abilities on the stack, life totals, spell counters, typed target legality, creature damage/state-based actions, destruction, indestructible, hexproof, exile/bounce, targeted pump, and the specified preservation/win objectives. Multi-target spells, full combat, continuous layers and full multiplayer Commander interactions are not implemented. Only ship new cases whose applicable interactions are modeled and regression-tested.

## Rollback / release limits

All code and content edits for this playtest belong to `stackbreaker/**` in the Game Lab repository. Do not edit other games' code, the main Deep Cuts EDH website, its public Arcade, databases, login or scores. Keep a protected PR and SHA-matched Cloudflare preview/production deployment with source tests; revert the Stackbreaker PR alone if rollback is needed.

The 12 original scenarios stay in `data/scenarios.json` (preserving the shared Lab catalog contract). The 18 additional campaign stages live in `data/campaign-expansion.json` and are concatenated by the Stackbreaker controller and standalone build; other game CI scripts and shared site files are unchanged.