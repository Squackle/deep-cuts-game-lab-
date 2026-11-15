# GRAFTBOUND v1.3.7-beta — Global Threat feedback and strength-adaptive pressure

## Audit finding

The older system only increased persistent Global Threat after **two consecutive enemy-damage-free victories**. A single point of enemy-caused HP damage immediately reset the streak. As a result, builds capable of effortless wins while occasionally taking tiny scratches could keep Global Threat at zero. Once the player was ahead of the strength curve, a simple shield of +1 on ordinary small enemies had little effect. Encounter reinforcement bonus was limited to one at level 6.

## New rule

- An enemy-damage-free victory **immediately raises** saved threat by 1 (up to level 12).
- Two wins each taking **at most 10% enemy-caused HP loss** also raise threat by 1. The existing save shape `{level,flawlessStreak}` is preserved.
- Taking at least **20% enemy-caused HP damage** in a win lowers saved threat by 1. Intermediate damage leaves threat unchanged and resets the low-damage streak.
- The tutorial and losses do not advance persistent threat.
- Enemy-caused health damage is already recorded by `dealDamage` as `stats.enemyHealthDamage` and differs from terrain damage and blocked shields. No client-submitted threat values are trusted.

## Automatic response to strong grafts

At encounter creation the game calculates the player's **existing effective strength estimate** versus the expected strength for the current act/depth. The active pressure is the higher of:
- The persistent saved Global Threat, or
- An adaptive floor of `floor(max(0, strength - expectedStrength) / 3)`, capped at 12.

The adaptive floor **does not overwrite** persistent threat or affect the save's future progression. Weak builds are unaffected by the floor. Both values are visible in saved battle metadata; the player sees the active threat banner at battle entry.

At level 12, temporary enemy shields now reach **42% of max HP** for ordinary encounters or **27% for boss encounters**, rounded up per creature, with no printed Toughness or max HP modification from these wards. No shields are added at zero threat. At threat 5+, the counter-reinforcement allowance is 1; at threat 10+, it is 2. Existing `REINFORCE_CAP` limits of 1/2/3 for acts I/II/III apply to the **combined** build-strength and World Threat reinforcements. Tutorials, boss encounters and protected Act I early nodes do not get threat-based extra foes. The existing maximum-level +1 power bonus to one ordinary foe remains as before.

## Ranked and saved adventures

This changes combat outcomes. `RULES_VERSION` increments to `graftbound-rules-1.3.7-beta` and the fixed ranked challenge advances from revision 19 to **20**. Earlier replay logs/checkpoints must not be silently mixed with this ruleset; the public DeepCutsEDH verifier and rankings are not modified. The battle and run **save schemas are unchanged** and old free-adventure saves still load, with the current battle preserved and the new threat rules applying when subsequent encounters begin. No save keys are removed.

## Technical verification

Run `cd graftbound && npm test`, CI source bundle, unified Lab checks, release coordination, and inspect the exact Cloudflare preview before merge. New regression coverage verifies clean and low-damage escalation, serious-damage relief, capped difficulty, preserved printed toughness, act-level reinforcement caps, adaptive strong builds, deterministic battle state for identical seeds, and ranked replay separation.

## Art work remaining

This release addresses balancing, not the entire art overhaul. Six legendary bosses have intermediate runtime motion studies, but complete premium painterly HD-2D final assets, the legacy bosses, long-tail roster quality, directional animation and physical mobile performance remain unverified. No claim of visual completion follows from a passing gameplay test.

Rollback: revert this isolated GRAFTBOUND rules PR, preserving prior archive and keeping existing saved keys. Scope is strictly `graftbound/**`; no sibling game, production website, account, payments, D1 or public ranked service is edited.
