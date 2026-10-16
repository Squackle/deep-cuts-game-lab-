# Phase 1 / P02 — Mana Engine 2.0 calibration release

**Owner authorization:** "alright deploy phase 1 and ill test" (2026-10-16). This is the standalone Game Lab, not the public Deep Cuts EDH Arcade.

**Playable test:** The existing campaign map links to /mana-heist/mana-engine-test.html, with ten deterministic calibration boards. Real actions include paying mana to activate Signets and filter lands, multiple-mana output, mana-unit restrictions, Urborg/Coffers types, scaling Nykthos, sacrifice of tokens, real colorless, manual casting, Undo/Restart, and phase advancement. The ten exercise boards are unscored.

**Engine version:** mh-mana-lab-2.0.0 in src/mana-engine-v2.js. The existing 250-level Landfall campaign remains mh-landfall-0.2.0 with local save key dc-mana-heist-landfall-v2. Progress and medals are preserved. The new pure engine is the forward-looking kernel for both planned modes; replacing the legacy engine requires a separate migration and complete revalidation of the 250 puzzles.

## Rule verification — Wizards Comprehensive Rules, effective September 25, 2026

Official source: https://magic.wizards.com/en/rules and https://media.wizards.com/2026/downloads/MagicCompRules%2020260925.txt

- 106.3–106.4: Each unit of mana has a color/type, enters the mana pool, and expires at the end of each step and phase.
- 106.6: Mana may carry restrictions such as "spend only to cast creature spells." The lab tracks source-associated individual mana units and restrictions.
- 107.4: Distinct colored pips, true colorless and numerical generic costs; checked by payment tests.
- 601.2f–h, 602.2: Activation and spell costs are paid before effects resolve; no partial payments. The lab requires explicit input mana before conversion.
- 605.1a, 605.3: The supported tapped and untapped mana abilities produce mana immediately, without a stack.
- 305.6 and 604: Urborg's land-type static ability grants the Swamp subtype to other lands, and Cabal Coffers counts Swamps.
- Card Oracle / official card database https://gatherer.wizards.com/: Simic Growth Chamber adds G and U together; Cascade Bluffs filters U/R; Azorius Signet costs 1 and taps for W/U; Lotus Field adds three of one color; Ancient Ziggurat restricts spending; Nykthos generates fixed snapshot devotion; Lotus Petal and Treasure are sacrificed on activation.

## Known deliberate scope boundaries

- Laboratory scenarios start with permanents ALREADY on the battlefield. Enter-the-battlefield events, shock-land decisions, bounce-land return triggers, and land drops are excluded from these snapshots.
- Abbreviated four-phase track: main1, combat, main2, end. Real Magic has multiple steps within those phases and additional priorities. This lab clears mana at represented phase boundaries, but does not simulate every step.
- Pre-existing devotion is supplied as an explicit, fixed background board value. No full creature/spell/stack simulation, opponent responses, comprehensive layering system, or actual full-game engine.
- The 250 original puzzle definitions are NOT switched to the new rules. The legacy bounce land simplification and end-turn-only mana clearing remain there until migration and re-solves.
- Old Lab Scryfall artwork remains subject to unresolved rights review. New test tabletop uses original CSS art instead.
- P02 remains IN PROGRESS; this is an owner-approved Phase 1 playable engine foundation, NOT a completed full 1.0 rules certification.

## QA, release and rollback

Scope: mana-heist/** only; no accounts, D1, public Arcade, or other game changes. Required: Mana Heist unit tests, original campaign regression, Game Lab shared checks, Cloudflare branch preview and live browser smoke. Rollback: revert the Game Lab merge commit and verify Cloudflare returns to the prior main-site Game Lab version. Saved progress keys remain untouched.
