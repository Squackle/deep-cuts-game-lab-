# Save migration v0.5 → v0.6

## Run v3 → v4 (`RUN_MIGRATIONS[3]`)

The migration is additive and idempotent:
- **Scoring.** Adds an empty scoring ledger. Earlier battles are **not** back-filled.
- **Journal.** Reconstructs a journal from the existing graft list and spellbook; each entry is marked "acquired before v0.6".
- **Events.** Adds `event: null` and `eventsSeen: []`.
- **Battles in progress.** Battle counters start at 0, and the battle is flagged `unscored`.

The untouched v3 save is kept in `deepcutsedh.livingcard.run.pre-v3`. v0.4 saves still go v2 → v3 → v4.

## Meta v4 → v5

- Adds `settings.autoEnd = true`, `settings.ambient = true` and `records = {}` (local personal records).
- Achievements, unlocks and statistics are untouched.

## Local vs verified

Local saves and records are **never** uploaded or converted into verified records. A ranked preview stores its decision log in `run.ranked.log` for local re-verification only.

## Rollback

If v0.6 is reverted, v0.5 refuses v4 saves and quarantines them as `.corrupt`; it never deletes them. To return a player to v0.5, restore `.pre-v3`.
