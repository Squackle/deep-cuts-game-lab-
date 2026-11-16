# GRAFTBOUND — Global Threat pressure and selected-tile dock (November 15, 2026)

## Problem verified in source

Global Threat was implemented and applied during encounters, but its ward strength
was computed only as a percentage of enemy max HP. High-power grafted builds could
remove most regular foes and their small wards in one blow even at Threat 12.
The selected terrain summary was collision-positioned **only on mobile**; on
desktop it inherited the generic inspect panel's bottom-left placement, directly
beneath the Library/Graveyard pile rail.

## Changes

- Persistent Threat still rises with flawless wins, rises after repeated light hits,
  and drops after significant enemy-caused wounds. The strong-build adaptive floor,
  campaign HUD forecast, reinforced enemy selection and act reinforcement caps remain.
- At Threat 5–10 the temporary enemy ward gains a bounded hero-attack-based floor.
  It reaches up to one current hero attack at Threat 10–12 for ordinary enemies,
  and 75% of that amount for boss encounters, capped at 56 shield. This is a
  **temporary encounter ward**, not added printed toughness, permanent enemy HP,
  or a change to the hero's stats. Weak builds still use the existing percentage
  ward. The scripted tutorial remains exempt.
- Changed gameplay is isolated as `graftbound-rules-1.3.8-beta` and fixed ranked
  challenge revision 21. Previous ruleset replays are explicitly retired.
- Selected terrain details now use the same measured, obstacle-aware placement on
  **desktop and mobile**, avoiding the hero plate, Library/Graveyard, hand, End Turn
  and top controls. Reposition on viewport changes. If no space exists, the
  existing touch/inspect Details modal still works; don't paint over controls.

## Scope and checks

Only `graftbound/**`; no sibling games, main site, D1, accounts or profiles.
New regression coverage asserts ward size versus high hero power and printed
stats, desktop/landscape/mobile collision-safe panel placement, and current
versioned replay policy. Full `npm test`, shared Game Lab checks, and exact-SHA
Cloudflare smoke verification must be checked from this PR's actual results.
Device usability and human-calibrated late-game balance remain to be playtested.
