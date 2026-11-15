# GRAFTBOUND v1.3.6-beta — Enemies act before allied summons on the foe turn

## Authorized behavior change

During the existing enemy/foe phase, the enemy team now performs all its combat actions **before** the surviving allied summons take their actions. Within each side, existing stable unit-array order is retained. This is a combat rule change (not merely a UI animation change) because it affects who survives and what targets are available.

- Enemies may attack, move, cast or summon using their existing AI and special rules.
- A Soldier, Squirrel or other allied summon killed during the foe phase **cannot act later that turn**.
- Surviving allied summons then move/attack with the existing `actAlly` behavior.
- Temporary allied Empowered buffs expire only after the allies' action opportunity, matching prior expiration timing.
- Player-end-step triggers (including Toxrill and The Scarab God), enemy boss phase announcements, enemy start-of-turn poisoning, enemy end-step hazards and abilities, summoning, and the return to the player turn remain in their existing phases.
- The blue allied and red enemy HP bar colors are unchanged.

The `endTurn` simulation generates the entire ordered event list in one deterministic call; `BattleUI` plays that list in order. The change uses no new simulation RNG, saves, data migrations or UI-only hidden reordering.

## Ranked/replay compatibility

Because this changes actual combat outcomes, `BATTLE_VERSION` increments from 10 to 11, `RULES_VERSION` from `graftbound-rules-1.3.5-beta` to `graftbound-rules-1.3.6-beta`, and `gb-expedition-01` challenge revision from 18 to **19**. Old replay/challenge revisions must not be mixed with revision 19. Old free-adventure save keys are retained, and existing unranked games load through the same code, but a resumed fight now uses the new foe priority; there is no automatic migration or deletion.

This Game Lab beta rules change is not public DeepCutsEDH website promotion or Cloudflare Worker deployment. Any public-site ranked verifier must pin a compatible challenge version separately before this ruleset can be used there.

## Regression acceptance

Run `npm test` in `graftbound` and required Game Lab source-bundle, unified lab and release coordination workflows. Added `v144-enemy-first-turn.test.mjs` covers stable enemy/allied event ordering, preemptive ally kill prevention, dead ally suppression, buff timing and rules-version replay separation. Inspect the exact PR preview and production Game Lab browser for in-battle sequencing. Do not claim physical-device tests unless performed.

Rollback: revert the isolated code changes and version updates through the normal PR workflow. Replay checkpoints using the newer version should never be silently replayed under the old version.
