# GRAFTBOUND architecture (v0.6)

```
src/core       rng, grid (terrain incl. LAVA/RIFT, pathing, line of sight)
src/data       keywords, legacy original cards (+ spell effect templates), enemies (3 acts), encounters (3 acts)
src/cards      real-pool (curated real cards) → compatibility (rules check + adaptations + VFX ids) → reference-set → catalog
               scryfall-adapter (fetch/normalize/cache) → live (display-only enrichment, fact cross-check)
src/engine     power (rating/budgets) · rewards (packs) · evolution (graft rules) · appearance · abilities · spells
               ai (12 behaviours) · combat (battle state machine, hazards) · encounters · campaign (act maps)
               shrines · run (acts, wounds, capacity) · progression · save (versioned migrations)
src/rendering  gl (WebGL2: shadows, point lights, bloom, tilt-shift; sharp + pre-filtered terrain atlas)
               environment (act themes; floor-fix geometry) · scene (sprites, FX meshes: lightning ribbons, rings)
               vfx (per-spell effects) · particles · evolution-visuals · sprites (loader)
src/ui         battle-ui · screens (booster, Wayshrine, acts, sheet…) · cards · icons
src/audio      synthesized SFX + per-act music
```

- The simulation is deterministic and DOM-free. Rendering and VFX only consume events and never decide outcomes.
- Spell events carry a `vfx` identity, so Lightning Bolt and Shock look different even though they share a damage template.
- Saves: run v3, meta v4. See `docs/MIGRATION-v0.5.md`.

## v0.6 additions

**Rules modules (all pure and DOM-free; the main site's server-side score checker imports a pinned copy of them):**
- `engine/legal.js`: one legal-action evaluator, used for auto-end.
- `engine/describe.js`: tooltip and hazard-path text built from `data/terrain.js`.
- `engine/scoring.js` with `data/scoring.js`: the versioned scoring model.
- `engine/ranked.js`: challenge definitions, the replay format, `applyDecision`, `applySegment`, `replayRun` and verified achievements.
- `engine/events.js`: the special encounters.
- `engine/journal.js`: the evolution journal.

**Recording.** All player battle input goes through `BattleUI.exec()`, which calls the engine and then `app.record()`. Map, shrine, event and reward choices are recorded in `main.js`. A ranked run's log replays to an identical state.

**Saves.** run v4, meta v5.
