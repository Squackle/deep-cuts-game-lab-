# GRAFTBOUND v0.6 — competitive scoring (model `gb-score-1`)

The formula is the one from the design brief, unchanged. The browser and the server run the same code (`src/engine/scoring.js`).

```
victory     = 1000                                       (no clear = 0 points)
efficiency  = round(600 × min(1, parActions / max(1, acceptedActions)))
avoidance   = round(400 × max(0, 1 − rawHpDamageTaken / damageBudget))
encounter   = round((victory + efficiency + avoidance) × multiplier)      multiplier: normal 1.0 · elite 1.25 · boss 1.5
expedition  = Σ encounters (each counted once) + 2,500 if all three acts are completed
```

## What counts

| Counter | Counted when | Never counted |
|---|---|---|
| **Accepted actions** (the efficiency metric) | the engine accepts a move, attack, spell cast or crystal interaction | rejected clicks, invalid targets, hovering, inspecting, menus, animations, network calls, **ending a turn (manual or automatic)** |
| Tiles moved | shown separately | — |
| Turns | shown separately; also a leaderboard tie-break | — |
| **Raw HP damage** | health actually lost, before any healing | damage absorbed by shields; max-health changes. Healing never reduces it. |

## Benchmarks (versioned in `src/data/scoring.js`)

Fixed when the encounter is built, from the definition only (tier, act, foes at the start). They are never adjusted for how the player is doing.

- `parActions = max(2, ceil(perFoe × startingFoes))`, where perFoe is 1.5 for normal battles, 1.75 for elites and 2.5 for bosses.
- `damageBudget` by tier and act: normal 8/10/10 · elite 14/18/18 · boss 20/36/48 · tutorial 6.

Calibration came from the naive bot (`tests/sim`):
- It used 1.8–2.3 accepted actions per foe. Par sits near its 25th percentile.
- The damage budgets sit near its 75th percentile.

**This is a starting model, not final balance.** Early two-foe battles give the full efficiency bonus quite easily (par 3). Human playtests should tune `PAR_PER_FOE` and `DAMAGE_BUDGET`. Any change needs a new `SCORING_VERSION` and a new challenge revision so old and new scores are never mixed.

## Farming and exploits

- **One entry per encounter.** The key is act:node, so each encounter scores once per run.
- **No points outside combat.** Wayshrines, special events and environmental activations give none.
- **Healing can't erase damage.** Damage is recorded when it happens, so taking a hit and healing before winning doesn't help.
- **Shield builds still pay.** Shield-heavy play avoids HP damage but spends actions, which lowers efficiency.
- **Battles in progress during the upgrade aren't scored.** A battle saved mid-fight under v0.5 is flagged `unscored`, because its counters are partial.

## Verified achievements (derived only from a replayed run)

| Achievement | Condition |
|---|---|
| First Graft | Absorb a creature. |
| Untouched Victory | Clear an encounter with 0 HP damage. |
| Efficient Hunter | Clear an encounter in ≤ par actions. |
| Hollow / Ashen Conqueror, The Unwritten End | Defeat that act's boss. |
| Graftbound | Complete all three acts. |
| Perfect Expedition | Complete the expedition with an average efficiency of ≥ 480 per cleared encounter **and** ≤ 60 total HP damage. The thresholds are explicit constants in `PERFECT_EXPEDITION`; confirm they're attainable with human play before launch. |
