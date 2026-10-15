# Stackbreaker 0.5 — Tap. Cast. Survive.

An **unofficial, limited Magic: The Gathering tactical training tool** on the independent Deep Cuts Game Lab site.

Permanent Lab URL: https://deep-cuts-game-lab.pages.dev/stackbreaker/

**Core promise:** One turn to live. Find the response that changes everything.

## 0.3 gameplay carried forward

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
- **Limited scope:** One scripted two-player priority window with a pass-only opponent. No full Magic game simulation, combat, complex layers, four-player priority, triggered abilities, judge rulings or user-supplied decks. Card artwork is now supplied dynamically by Scryfall in version 0.5.
- Card names/stats/rules are curated references. The surrounding interface and ornament are original; Magic card artwork is provided by Scryfall (copyright Wizards of the Coast and respective artists); reference links open Scryfall. Do not describe this as an official Wizards or Scryfall product.

## Release boundary

Only `stackbreaker/**` in `Squackle/deep-cuts-game-lab-`. Do not modify Hive Run, Mana Heist, the production `Squackle/deep-cuts-edh` Arcade, site accounts, D1, score stores or other games. Roll back by reverting the specific Stackbreaker 0.5 PR, preserving concurrent Lab work.


## Scryfall card imagery (0.5)

Every supported card and basic land is looked up at startup using Scryfall’s `/cards/collection` endpoint (one batched request). The returned `image_uris.small` are shown for hand, battlefield and lands; `image_uris.art_crop` is shown in stack entries, with an immediate full `image_uris.normal` preview when hovering the artwork. Moving the pointer off the image dismisses the preview. Touch/keyboard alternatives are supported. Scryfall Oracle text appears under each stack card title. Images/metadata are cached in localStorage for 24 hours; the curated engine remains authoritative for rules simulation. If the collection endpoint is unavailable, the UI tries paced individual named lookups; when both are unreachable the game remains playable with placeholders and its existing rules-text catalog.

Scryfall-supplied art crops have full-card hover previews and artist/copyright credit beside the full card. The full card scans are not cropped or distorted. This is unofficial fan-developed training content; official Magic images remain copyright of Wizards of the Coast and their artists. Do not claim any endorsement.

## v0.5 physical-card play UI
- No synthetic ability cards or Cast buttons in hand. Each hand entry is only the actual Scryfall card image; hover/tap art to inspect.
- Tap real land images to put colored mana into the pool. Drag a card onto the battlefield or stack. Spells cast by dragging to the battlefield are still placed onto the rules stack before resolving, per MTG rules.
- Activate Selfless Spirit by clicking/tapping the real battlefield permanent; sacrifice is an activation cost, not a hand spell. Hold on touch to inspect its full card without activating.
- If a spell has multiple legal targets, a small in-game target picker appears; choose by tapping a valid permanent/stack entry/life total or by accessible choices. Generic mana selection appears only when genuinely ambiguous.
- Keyboard equivalent: Enter on hand card, then Enter on battlefield or stack. No Cast button. All game controls remain within viewport.