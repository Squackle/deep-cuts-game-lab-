# GRAFTBOUND v0.5 — balance notes and simulation evidence

These numbers come from a deterministic **naive bot** (`tests/helpers.mjs → botPlay`). It dodges telegraphs and
hazards, attacks the weakest reachable foe and casts every available spell. It does not plan, flank or kite. Treat
the numbers as **directional**. They are not proof that the game is fun or well balanced; human playtests decide that.

## What changed and why
| v0.4 source of runaway power | v0.5 rule | Why |
|---|---|---|
| Health = Spark 5 + **2 ×** Toughness | Health = Spark 6 + Toughness | Toughness doubled into health, so tanky grafts snowballed. |
| Resonance: duplicate ability → **+1/+1** | Duplicate → **+2 Spark** (max health) | Stacking duplicates no longer feeds power, the stat that let builds one-shot bosses. |
| Pack eligibility by **mana value** | **GRAFTBOUND power rating** vs a budget per campaign step and tier, measured against what the graft ADDS to your build | A 1-mana creature can still be a monster under additive grafting; rarity ≠ power. |
| Unlimited grafts | **Graft capacity 4 / 6 / 8** by act; a full body must release a graft to take a new one | Preserves "+2/+2 for a 2/2" exactly, but bounds total growth and forces choices. |
| Full heal after every battle | Victory restores **half** the missing health (Wounds); bosses and Restoration restore all | Normal battles now matter for the next one. |
| Reinforcements cap 2 | Cap 1 / 2 / 3 by act; never extra health | Strong builds still draw more foes. |
| Bosses struck back | Bosses never strike back; they threaten with telegraphed area attacks, lashes and summons | Pure-melee builds were unable to win any boss (0%). |
| Spell range by tiles | No range or line of sight for offensive/area spells. Real-card spell costs raised (Lightning Bolt 2, Flame Slash 3) and Null Wardens tax spells | Spells reach anywhere, so each cast costs more. |
| — | Spellbook focus: every 3 spells → +1 max mana, +1 mana/turn | Makes spell-focused characters a real option. |

## Full-adventure results (16–20 runs per policy, three acts, 24 nodes)
`node tests/sim-report.mjs` prints the current numbers. Last run in the build sandbox:

full adventure · greedy: win 50% · reached Act II 83% · Act III 58% · turns/battle 3.1 · final P/T 23.8/22.8
full adventure · random: win 25% · reached Act II 25% · Act III 25% · turns/battle 3.2 · final P/T 7.7/7.5
full adventure · melee: win 25% · reached Act II 42% · Act III 25% · turns/battle 4.9 · final P/T 14.6/13.4
full adventure · tank: win 42% · reached Act II 50% · Act III 42% · turns/battle 5.0 · final P/T 16.3/16.0
full adventure · spells: win 0% · reached Act II 8% · Act III 8% · turns/battle 3.5 · final P/T 1.0/1.0
full adventure · flyDeath: win 25% · reached Act II 42% · Act III 25% · turns/battle 4.2 · final P/T 15.0/14.3

For comparison, v0.4 (one act, 8 nodes) had a 75–85% win rate for the same bot, and characters reached ~30/29 within those 8 nodes.

## Archetype matrix (fixed builds at full health per act; 12 fights each)
The fights start at full health, so this table overstates safety. In a real run, wounds carry over.

| Build | Act | Battles win% / dmg taken / turns | Elites win% / dmg | Boss win% / dmg taken |
|---|---|---|---|---|
| melee | I (max HP 18) | 100% / 6.8 / 3.9 | 100% / 11.8 | 67% / 15.3 |
| melee | II (max HP 30) | 100% / 8.8 / 3.8 | 100% / 16.6 | 8% / 29.9 |
| melee | III (max HP 42) | 100% / 6.7 / 3.7 | 100% / 16.6 | 100% / 35.8 |
| tank | I (max HP 18) | 100% / 1.8 / 3.9 | 100% / 3.3 | 100% / 1.8 |
| tank | II (max HP 29) | 100% / 2.6 / 3.8 | 100% / 7.0 | 100% / 23.3 |
| tank | III (max HP 42) | 100% / 2.1 / 3.7 | 100% / 9.3 | 100% / 24.5 |
| flyDT | I (max HP 16) | 92% / 5.6 / 3.6 | 100% / 6.8 | 67% / 13.9 |
| flyDT | II (max HP 30) | 100% / 9.8 / 3.2 | 100% / 17.7 | 100% / 39.3 |
| flyDT | III (max HP 50) | 100% / 6.2 / 2.9 | 100% / 6.9 | 100% / 52.6 |
| dsTrample | I (max HP 16) | 83% / 6.7 / 3.9 | 83% / 11.8 | 100% / 11.4 |
| dsTrample | II (max HP 27) | 100% / 6.8 / 3.7 | 100% / 15.5 | 25% / 24.4 |
| dsTrample | III (max HP 43) | 100% / 6.5 / 3.6 | 100% / 14.3 | 92% / 31.8 |
| lifelink | I (max HP 17) | 100% / 5.9 / 3.7 | 100% / 7.6 | 100% / 14.4 |
| lifelink | II (max HP 31) | 100% / 6.4 / 3.8 | 100% / 10.4 | 100% / 37.5 |
| lifelink | III (max HP 46) | 100% / 4.0 / 3.5 | 100% / 6.8 | 92% / 161.9 |
| spells | I (max HP 10) | 100% / 1.6 / 2.6 | 58% / 8.8 | 0% / 10.0 |
| spells | II (max HP 19) | 100% / 4.0 / 2.4 | 100% / 11.3 | 33% / 17.5 |
| spells | III (max HP 33) | 100% / 5.1 / 2.6 | 100% / 12.3 | 100% / 24.0 |
| hybrid | I (max HP 13) | 92% / 2.2 / 3.7 | 100% / 2.9 | 100% / 2.3 |
| hybrid | II (max HP 22) | 100% / 2.4 / 3.1 | 100% / 3.3 | 100% / 21.6 |
| hybrid | III (max HP 39) | 100% / 1.3 / 3.0 | 100% / 2.3 | 92% / 73.8 |

**Reading it:**
- Normal fights are rarely lost at full health but cost 10–35% of max health, and that damage carries forward.
- Bosses are the most dangerous fights. Every archetype has at least one boss that kills it or costs ≥ 40% of its health (asserted in `tests/balance.test.mjs`).
- **Known weak spot:** elites are still beaten consistently by capacity-full builds at full health. They hurt (5–18 damage) but rarely kill. Elite tuning is the first follow-up after human playtests.
- Pure spell builds with few grafts are fragile (low health). Lifelink builds sustain very well. Both need human evaluation.
