# GRAFTBOUND architecture (v0.5)

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
