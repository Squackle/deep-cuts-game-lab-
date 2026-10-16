# Phase 1 / P02 — Mana Engine 2.0 calibration release

**Owner authorization:** "alright deploy phase 1 and ill test" (2026-10-16). This is the standalone Game Lab, not the public Deep Cuts EDH Arcade.

**Playable integration:** The main /mana-heist/ campaign now uses the advanced mana ability and payment kernel on selected generated levels. The diagnostic /mana-heist/mana-engine-test.html route remains available for internal QA but is no longer linked as a separate game from the campaign map. Real actions include paying mana to activate Signets and filter lands, multiple-mana output, mana-unit restrictions, Urborg/Coffers types, scaling Nykthos, sacrifice of tokens, real colorless, manual casting, Undo/Restart, and phase advancement. The ten exercise boards are unscored.

**Engine version:** mh-mana-lab-2.0.0 in src/mana-engine-v2.js. The existing 250-level Landfall campaign remains mh-landfall-0.2.0 with local save key dc-mana-heist-landfall-v2. Progress and medals are preserved. The existing campaign reducer now imports the pure kernel to model mana activations and restricted spending, while retaining its reducer interface, stage IDs and guest saves. The separate prototype still serves as an extensive mechanics regression bench. Completing the full 1.0 rules/phase migration requires separate acceptance.

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
- All 250 stage IDs and old guest completions remain. Simic Growth Chamber now produces G and U together on one tap. Generated variants occasionally include a new mana source without replacing the proven original puzzle route. The old simplified turn structure still clears mana at End Turn; exact per-step/per-phase gameplay is future work.
- Old Lab Scryfall artwork remains subject to unresolved rights review. New test tabletop uses original CSS art instead.
- P02 remains IN PROGRESS. Phase 1 mana mechanics are incorporated into the main Mana Heist campaign, but this is NOT a completed full Magic rules engine or full P02 acceptance.

## QA, release and rollback

Scope: mana-heist/** only; no accounts, D1, public Arcade, or other game changes. Required: Mana Heist unit tests, original campaign regression, Game Lab shared checks, Cloudflare branch preview and live browser smoke. Rollback: revert the Game Lab merge commit and verify Cloudflare returns to the prior main-site Game Lab version. Saved progress keys remain untouched.
