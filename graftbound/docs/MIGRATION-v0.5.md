# Migration: living-card/ → graftbound/ and v0.4 → v0.5 saves

## Route
- The game now lives in `graftbound/` and is served at `/graftbound/`.
- `living-card/` keeps only a tiny `index.html` that does `location.replace('/graftbound/' + search + hash)`, with a `<meta refresh>` fallback. There is no second copy of the game.
- Optional server-side 301s are in `graftbound/_redirects-snippet.txt`, for use only if the repo already uses a root `_redirects` file.

## Saves
- `localStorage` is per origin, not per path, so `/graftbound/` reads the exact keys `/living-card/` wrote (`deepcutsedh.livingcard.run`, `.meta`). The keys are deliberately unchanged, so no path migration is needed.
- Run schema v2 (v0.4) → v3 (v0.5), in `src/engine/save.js` `RUN_MIGRATIONS[2]`:
  - Adds `act 0`, `hp` (full), `manaBonus/sparkFonts/wardNext 0` and `actHistory []`. It rolls Wayshrine options if the save was standing at a shrine.
  - **Legacy original cards are never replaced.** Grafts and spells earned from the v0.4 original set stay exactly as they were, still resolvable and labeled "Legacy · v0.4". They can no longer appear in new packs.
  - v0.4 Resonance was already baked into power and toughness as +1/+1, so it moves to `evo.legacyResonance` and does not also grant the new +2 Spark.
  - The old map is kept. The run continues in Act I and proceeds to Acts II and III.
  - The untouched pre-migration save is kept in `deepcutsedh.livingcard.run.pre-v2`. The migration is idempotent; tested in `tests/run.test.mjs`.
  - Newer-version saves are refused and quarantined (`.corrupt`), never deleted.
- Meta v3 → v4: the removed "Card source" setting is dropped. Achievements, unlocks, records and hints are kept.
- Rule changes (health formula, wounds, capacity) apply to migrated runs going forward. A migrated run may already hold more grafts than Act I's capacity of 4. It keeps them all and is only asked to release when taking a new creature.
