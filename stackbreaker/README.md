# Stackbreaker 0.3 — Tap. Cast. Survive.

An **unofficial, limited Magic: The Gathering tactical training tool** on the independent Deep Cuts Game Lab site.

Permanent Lab URL: https://deep-cuts-game-lab.pages.dev/stackbreaker/

**Core promise:** One turn to live. Find the response that changes everything.

## New in 0.3

- **Real named land cards:** Plains, Island, Swamp, Mountain, Forest and Wastes (curated basic mana abilities only). Tap an untapped land to add a specific color of mana to the pool; it becomes tapped and cannot be tapped again. The action is reversible through Undo, and mana abilities do not use the stack.
- **Manual, rules-enforced mana payment:** Spells do not become affordable until the player taps sufficient lands; colored pips and explicit colorless costs are checked; alternate payments for generic costs appear in the spell's payment selector when relevant. Spent mana comes from the visible pool, and excess floating mana remains available within the priority window.
- **Drag spells onto the stack:** Desktop HTML5 drag-and-drop, mobile touch/pen pointer drag, and accessible click-to-cast/target-selector controls. The selected spell leaves the hand, appears on the LIFO stack and obeys the scripted rules engine.
- **The Final Exchange is level 06:** Five intro cases lead to the original Final Exchange puzzle; levels 07–12 are new and require multiple answers, more priority sequencing and harder mana/target decisions. 12 total cases.
- **Single-screen gameplay:** Game controls, battlefield, lands, mana pool, hand, stack, Undo, Restart, Pass/Resolve and Next Case fit within the browser viewport; at 320×568, 390×844, 768×900 and 1280×900 all actionable pieces were verified inside the screen. Objectives, hints, result explanations and resolution log continue below the game, as optional educational content.

## How to play

1. Select a case. Evaluate the stack from **top to bottom** and your objective.
2. Tap named land cards to add mana to the pool. Check the color pips on the spells in your hand.
3. Choose any target or generic mana payment on a spell. Drag the spell onto the **Stack** table. You can also use the **Cast** button or numeric hotkeys.
4. Use **Pass / Resolve** to pass priority; the scripted opponent passes and the stack resolves in last-in-first-out order.
5. Click **Next Case** or **Reset** from the control strip without scrolling.

## Quality and limitations

- Engine suite: `node --test tests/engine.test.mjs` — 22 tests passing. Includes all 12 puzzle win/loss paths, deterministic replay, land tapping, color and generic payment, targeting, sacrifice, state-based damage, hexproof and countering.
- Browser suite: `python tests/browser_smoke.py` — Chromium viewport checks at 320×568, 390×844, 768×900 and 1280×900; desktop HTML drag, touch-pointer drag, first real mana payment, complete level-six victory, Next Case, no clipped core controls, no JS exceptions.
- Build: `python build.py` produces self-contained `index.html` from `template.html`, `styles.css`, `src/{cards,engine,ui}.js`, and `data/scenarios.json`. Static Cloudflare Pages hosting uses the compiled file directly. No account or storage service required; completion stars are local to the browser.
- **Limited scope:** One scripted two-player priority window with a pass-only opponent. No full Magic game simulation, combat, complex layers, four-player priority, triggered abilities, official card art, judge rulings or user-supplied decks.
- Card names/stats/rules are curated references. All frames, visual ornament and symbols are original stylized UI; card reference links open Scryfall. Do not describe this as an official Wizards or Scryfall product.

## Release boundary

Only `stackbreaker/**` in `Squackle/deep-cuts-game-lab-`. Do not modify Hive Run, Mana Heist, the production `Squackle/deep-cuts-edh` Arcade, site accounts, D1, score stores or other games. Roll back by reverting the specific Stackbreaker 0.3 PR, preserving concurrent Lab work.