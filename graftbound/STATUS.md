# Status — GRAFTBOUND v0.5.0

## Done in v0.5 (local build; not merged, not deployed)
1. **Floor glitch fixed at the root.**
   - The v0.4 foundation's top face was coplanar with every tile top (both at y = 0), so two textured surfaces z-fought across the whole board.
   - The foundation top now sits at y = −0.27, and the slabs no longer emit a hidden internal face.
   - Distant shimmer was fixed with a pre-filtered terrain atlas, blended by per-pixel texel footprint, plus calmer stone textures.
   - Covered by a geometry audit test and before/after screenshots.
2. **Real Magic cards only.**
   - 50 creatures and 13 spells, every one passed through the compatibility layer.
   - Original cards are kept only as resolvable legacy content for old saves, never offered in packs.
   - The tutorial gives Typhoid Rats. The card-source setting was removed.
3. **Booster overhaul:**
   - Original ornamental wrapper with brass filigree, sigil medallion, foil sheen, motes and a cursor-reactive tilt.
   - Sequence: seal charge, seal shatter, flap opens, cards rise and fan out.
   - Rarity effects (uncommon glow, rare and mythic rays and flare); magnifier inspect; a "you become X/Y" comparison.
   - Chosen-card focus while the others discard; a mobile snap carousel of readable cards.
4. **Wayshrines:** a pool of 6 offerings with up to 4 per shrine, each with a cost or cap. One per shrine, state-dependent.
5. **Rebalance:**
   - Health = Spark 6 + Toughness; Resonance gives +2 Spark; wounds carry between battles.
   - Graft capacity 4/6/8; power-rating budgets for packs; act-capped reinforcements.
   - Bosses don't strike back but telegraph; spellbook focus adds mana.
   - Simulations are in `docs/BALANCE-v0.5.md`.
6. **Spell VFX library:**
   - Lightning Bolt in 5 phases (charge arcs → intensify → jagged branching bolt → impact arcs, flash and shake → residual arcs).
   - Distinct effects for spark, chain, fire, fireball, frost, poison, heal, shield, growth, drain, summon and wind.
   - Reduced-motion and particle-density aware.
7. **No spell range limits** for offensive and area spells; summon and teleport keep placement limits.
8. **Three acts and 24 nodes:**
   - Ashen Warrens (lava hazard) and Fractured Nexus (rift hazard), each with its own environment, music mode, 5+ new enemies, an elite and an original boss.
9. **Rename:** `graftbound/`, a `/living-card/` redirect stub, canonical metadata and package name. Save keys are intentionally unchanged.

## Verified in the sandbox (headless Chromium + SwiftShader; NOT real devices)
- `npm test`: 79/79 passing. These cover rules, cards, packs, evolution, combat, enemies, spells, shrines, campaign completion, migrations, balance invariants, rendering geometry and routes.
- `tests/e2e.py`: see HANDOFF.md for the latest count.

## Not done / limitations
- **Elites:** rarely defeat a capacity-full build at full health (though they hurt). Tune after human playtests.
- **Art:** programmer-art placeholders. The booster and VFX are original CSS/SVG/WebGL work, not commissioned art.
- **Card facts and live Scryfall:** card facts were not checked against live Scryfall (no network). Run `node tools/verify-real-pool.mjs`.
- **Catalog:** the Game Lab catalog entry could not be edited (repository not accessible). Instructions are in HANDOFF.md.
- **Coverage:** no real-phone, Safari or Firefox testing; no preview deployment.
- **Unit-test count:** 79 vs v0.4's 84. Several v0.4 single-assertion tests were merged into broader v0.5 tests; no behaviour lost coverage. New areas (hazards, 8 new enemies, shrines, acts, migration, rendering geometry, routes, balance) were added.
