# Revision 33 expansion batch 1 — 2026-11-24

Development only; PR #352. Issue #204. Baseline is the exact 145-card r32 commit 0e242f21622656e38a7c2ef454498cdfe03605bd. Do not merge or repin without the Release Manager. Three-card boosters unchanged; scoring gb-score-2 unchanged. Candidate rules graftbound-rules-1.9.1-candidate, real-pool-151-v9, challenge revision 33. Prior verifier sources and saves remain separate.

## Six creature additions

| Card / selected printing | RPG adaptation | Added trait weight |
|---|---|---:|
| Inspiring Overseer / SNC | Encounter start: gain one, draw one; Flying | 2.5 |
| Cloudkin Seer / M20 | Encounter start: draw one; Flying | 1.5 |
| Pitiless Plunderer / RIX | Friendly nonhero death: one Treasure | 3.5 |
| Vindictive Vampire / RNA | Friendly nonhero death: nominal gain one, damage nearest foe if still alive | 3.5 |
| Monastery Swiftspear / KTK | Noncreature cast: temporary +1/+1; Haste | 2.5 |
| Krenko, Tin Street Kingpin / WAR | Hero attack: +1/+1 counter, then red 1/1 Goblins equal to effective power, board bounded | 6 |

Cloudkin replaces Aether Channeler (bounce/modal token design needs unsupported systems). Vindictive replaces Grim Haruspex (nontoken deaths are rare in the current ally model). Both preserve color and creature count. These are documented adaptations, not claims of full MTG rules parity. Krenko, Mob Boss remains an encounter-only boss. All six new traits are single-level and excluded from duplicate offers; reward budgets still apply.

Source checks: https://magic.wizards.com/en/rules ; https://magic.wizards.com/en/news/feature/rivals-ixalan-release-notes-2018-01-10 ; https://magic.wizards.com/en/news/feature/war-spark-release-notes-2019-04-19 . Exact printing data is queried by name and set by the live verifier; selected printing, mana value, colors, and rarity are checked for the twelve pilot and six new cards. No card scans are used as sprite art.

## Pilot follow-up included in this revision

- Vito nominal gain at all graft levels, including already-earned counters when the gain wins a battle.
- Dedicated original Saproling crest, green palette, front/back state-driven motion, separate sprite key. Six new authored graft accents. Automated geometry/phase tests are not visual approval.
- Interactive Scry and card-first popup need independent real browser acceptance on desktop and mobile. Pilot #350 retains the original exact verifier; these follow-up changes are on #352, not silently backported.
- 151 playable cards (114 creatures, 25 spells, 12 attachments). Remaining to reach 200: 28 creatures, 16 spells, 5 attachments. No further batch until this candidate is independently checked.

## Booster experiment #351 (not included in this candidate)

Exact head 0d0e325eaacfc1178bf60cd7835029e03a5069d2: 791/791 tests passed, 167 card records verified; unchanged r32 digest d77cdc111dcb2b9fe3e04a4c9f1df2c6a80a72ae8ba304f3048b07455d6f8f5c. 10,800 matched packs plus 160 campaign runs. Current/expanded: 14/17 wins, 27/32 reach act II, 15/21 reach act III, 56/70 boss wins, 31/29 rare selections, 4/2 timeouts, 80 runs per arm. Five policies, 8 seeds, normal/Pauper, alternate elite routes. These are bot outcomes, not measured human balance. Hold adoption until larger paired samples and browser/owner review.

## Release gates

Exact-head CI; independent card/interaction review; asset provenance and owner visual signoff; isolated preview accessible for full browser testing; Release Manager sequential integration #339 → #349 → #350 → #352 and explicit website verifier repin. No production deploy, ranked activation, or historical replay reinterpretation.
