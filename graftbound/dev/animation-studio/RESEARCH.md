# Cinderstorm smoke study — game references and engineering notes

November 19, 2026. Visual test only: `/graftbound/dev/animation-studio/`.

## Source research
- **NVIDIA GPU Gems, Chapter 38: Fast Fluid Dynamics Simulation on the GPU:** https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu . Explains smoke density advection through a velocity grid, pressure projection, semi-Lagrangian backtracing and buoyancy. The studio implements an independently written, reduced-resolution CPU/grid adaptation. It does **not** copy the chapter's source code or depend on CUDA.
- **Epic Games: Fluid Simulation in Unreal Engine — Overview:** https://dev.epicgames.com/documentation/en-us/unreal-engine/fluid-simulation-in-unreal-engine---overview . Describes the separate gas fields for density, velocity and temperature and why 2D gas simulations are a practical browser-friendly approximation to 3D volumes. GRAFTBOUND doesn't use Unreal or Niagara.
- **Unity: Particle Movement Patterns / Curl Noise:** https://docs.unity.com/en-us/engine/7000.0/manual/particle-movement-patterns . Recommends lower-frequency curl noise for billowing smoke and more energetic turbulence for hot embers. GRAFTBOUND doesn't import Unity.
- **Valve: Counter-Strike 2 Responsive Smokes:** https://www.counter-strike.net/cs2 . Demonstrates the design direction of a physically responsive smoke volume. Valve does not publish its full implementation; no claim that the studio duplicates CS2 smoke or its engine.

## What changed from the earlier prototype

**Previous:** A nearly full-screen dark rectangle plus smoke circles seeded across the entire arena. Smoke often appeared on a location without ever leaving the caster.

**Now:** Only the player's two raised-hand emission points inject density and heat. At a fixed 30 Hz, a small 2D grid:
1. Advects air velocity via semi-Lagrangian backtracing.
2. Drives swirl and outward fire gusts; adds stream-function curl turbulence.
3. Projects the velocity onto a lower-divergence field with pressure iterations, then adds vorticity confinement.
4. Advects the smoke-density and heat fields, applies dissipation and buoyancy.
5. Injects new source density only next to the player's hands, and advects glowing embers along the same velocity field.
6. Composites smoke with density-based transparency and temperature-based warm lighting. No global screen-darkening veil or distant smoke spawners.
7. Leaves battlefield damage purely in the isolated 2-damage fixture; casualties become ash after the blast.

## Limits and QA
- This is a **2D camera-facing approximation**, not a photorealistic 3D GPU volumetric ray-march. The game still uses WebGL2 to render the arena; the dense smoke plane is composited on a small 2D canvas above it.
- Field resolution is selectable via existing High/Balanced/Low controls, with a separate visual smoke-opacity setting. A reduced-motion setting limits spin and embers.
- The same scene is replayable and does not mutate real game saves, card rules, equipment, ranked replay, server scores, or D1.
- Hardware iPhone/Android acceptance and subjective smoke look require human review after deployment. Test spatially progressive emission (first second), outward traveling clouds (middle), all-entity damage (impact), and ashes (aftermath).
- Rollback: revert the isolated smoke module and its studio imports/tests; no gameplay version migration needed.

## November 19 — invisible battlefield box

- The gas grid is now **square in GRAFTBOUND world coordinates**, exactly matching the actual 8×8 tile bounds. It is no longer a rectangular screen-space field.
- All four walls have **zero-normal velocity**; tangential airflow is damped but free to slide. Inward restitution produces a visible rebound where gusts strike the boundary. Density/heat ghost cells reflect back into the chamber rather than disappearing off the edges.
- Ember streaks and charcoal billows bounce within the same limits and use the same simulated flow; there is no smoke spawned outside the caster.
- `arena-projection.js` takes actual `Scene.world()` and `Scene.project()` coordinates. A perspective-corrected patch mesh projects the smoke texture onto the arena; the tile-footprint polygon strictly clips blurred wisps and glows away from surrounding lava and environment props.
- A second lightweight elevated smoke sheet gives a subtle illusion of height while preserving the same battlefield outline. This **is not full 3D collision or true volumetric CFD**—walls are simulated in the 2D horizontal velocity field and projected in screen space.
- Smoke density and pressure now respond to walls. No visible boundary geometry is drawn. The illusion is an invisible arena-sized enclosure.
- Tests enforce zero outward velocity on all walls, trapped particle centers, retained edge density, and correctly projected/masked tile geometry. Check rotations and mobile camera after each release.

## November 19 — Pyroclasm fire-dominant combustion pass

**Visual goal:** Use the John Avon / Duskmourn Pyroclasm visual direction: an incandescent yellow-white and orange fireblast should be the primary effect; dark gas should trail, then linger as the flame extinguishes. The 80:20 fire/smoke description is an **art-direction target**, not a measured physical percentage or promise that every frame has exact pixel coverage.

**Additional research:**
- NVIDIA GPU Gems 3, *Real-Time Simulation and Rendering of 3D Fluids*: https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-30-real-time-simulation-and-rendering-3d-fluids . Reference for advection, temperature and simplified combustion/reaction in bounded fluid grids.
- SideFX Houdini, *Understanding How Pyro Works*: https://www.sidefx.com/docs/houdini/pyro/background.html . Reference for separate velocity, temperature, fuel/combustion and density fields, and density dissipation.
- SideFX Houdini, *Flames*: https://www.sidefx.com/docs/houdini/pyro/flames.html . Reference for reaction/fuel-driven emission and smoke/heat byproducts.
- SideFX Houdini, *Shading and Rendering*: https://www.sidefx.com/docs/houdini/pyro/shading.html . Reference for independently shading emissive fire versus absorbing soot.
- Epic Unreal Niagara, *Fluid Simulation Overview*: https://dev.epicgames.com/documentation/en-us/unreal-engine/fluid-simulation-in-unreal-engine---overview . Reference for velocity/temperature/density grids and boundary conditions.
- Original Magic card information/art reference: https://mtg.ink/card/pyroclasm ; the card art is a visual reference **only** and is never copied or embedded as game art.

**Engineering implementation (isolated to Animation Lab):**
1. Existing semi-Lagrangian 2D vortex with reflective/tangential wall behavior and 8×8 tile perspective projection remains. The sim now advects distinct **fuel**, **flame reaction**, **temperature**, and **soot density** fields.
2. Caster hands are the only fuel/heat source. Every 30 Hz tick consumes fuel where the gas is hot enough, generates a transient reaction/flame channel, adds heat and only a small soot byproduct. Fuel and flame fade when not replenished.
3. Heat and the reaction field control an **incandescent fire-color ramp**, not the amount of smoke. Soot retains its own translucency and becomes more visible during the ashfall; light bloom is sourced *only* from the flame image.
4. Short-lived flame tongues originate near the caster, advect along the same velocity field, bend in its wind, rise above the tiles and clip at the invisible battlefield outline. Existing embers are similarly carried by the flow.
5. Two projective flame layers and a few rising tongues provide a *pseudo-volume* illusion. Particle-density and reduced-motion settings remain for mobile accessibility/performance.
6. Existing main-game HP bars, game-state-independent 2-damage fixture (to **all seven** creatures), three deaths and temporary ash piles are preserved.

**Honesty and limits:** These are established *techniques adapted to a CPU 2D visual simulator*, not a scientific combustion solver, 3D collision field, or genuinely photorealistic volumetric fire. The blackbody-*inspired* ramp is artist-directed rather than an integration of a calibrated blackbody spectrum. No imported Unreal/Houdini/NVIDIA code or copyrighted MTG art. The system changes neither actual game combat, card rules, ranked replays, accounts nor public Arcade. Any user-subjective visual quality still needs owner feedback after deployment.

**Acceptance checks:** node syntax, stand-alone GRAFTBOUND and shared Game Lab CI, flame generated only near the caster, fuel consumed over time, all fields finite, flame reaction stronger than soot during attack, no particle leaves the invisible box, all screen-canvas corners outside the tiles transparent, desktop/mobile browser scene functioning, responsive controls, seven hits, three deaths, replay/reset unchanged. Rollback by reverting the Animation Lab PR.

### Browser visual acceptance refinement (same day)

A desktop browser capture of PR #212 at the **THE DEVASTATION** phase showed oversaturated yellow-white particles shaped like sharp upward spikes, even though the flame/soot simulation was fire-dominant and board clipping worked. Numerical simulation checks alone were not sufficient for visual acceptance.

This follow-up keeps the same physics and repairs presentation: (1) reduce heat and reaction saturation caps, (2) lower the hottest-color ramp's effective temperature, (3) render 96 or fewer moving flame tongues rather than 210, (4) replace hard additive white cores with smaller translucent Bézier-curved ribbons that bend with the measured airflow. The aim is a readable, moving firestorm rather than white shards. Performance and real-device appearance still require end-user review.

## November 19 — approved original pixel-art asset pass

Owner-approved visual treatments:
- **Ash A** is a compact, low, pale gray and charcoal powder heap with loose ash grains, NOT the previous smooth ellipse/shadow or fiery rock mound. It stays on dead creature tiles and must NOT emit flames itself.
- **B — Rising Ember** is an eight-frame discrete hot-pixel cluster carried by the actual simulated airflow, drifting upward and fading, visible through invocation, charge, vortex, impact and initial cool-down.
- **C — Curling Flame** is an eight-frame, irregular S-curved fire tongue (red rim / orange / yellow-hot core), following the same fluid velocity and the board clip. It replaces canvas-gradient Bézier wedge shapes — no vector fire triangles.
- The overall larger effect retains the agreed spiral fire-ribbons + ground-hugging inferno (the existing contained fuel/reaction field). Existing blue/red HP bars, exactly 2 damage to both sides, 3 ash casualties, scene controls and test-only isolation are unchanged.

Implementation: `pixel-art.js` builds deterministic, original low-resolution 48×29 Ash A, 9×13 Ember B and 17×23 Flame C raster images (8 frames each). The browser uploads each image to a dedicated tiny offscreen Canvas only once; the actual battle overlay draws them nearest-neighbor (no blurred strokes, smoothed vector wedges or triangles). Sprites are positioned via `Scene.world()` + `Scene.project()`, follow live particle positions, and are clipped inside the 8×8 arena tile polygon. Sprites are deterministic for a fixed simulation state and have lower particle counts under reduced-motion settings.

Important: This is **original procedural pixel art approximating the owner's chosen concepts**, not a conversion of the reference illustration or Magic card art. It must be visually reviewed on the deployed Animation Lab and can be tuned after user feedback. Physics remains the same 2D approximation; this PR does not claim true 3D fluid collision. Roll back by reverting this Animation Lab-only PR, restoring the previous test visuals without changing normal game saves or rules.

## November 19 — comparing fire sprite quantities

Added an independent **Fire sprite density** selector to the Cinderstorm preview with `Original 1×`, `Light 1.35×`, `Requested 1.5×`, and `Full 1.75×`. The three larger settings are intentionally compared against the previously approved 1× baseline.

This control affects **only** the frequency and corresponding live cap of the original Rising Ember B and Curling Flame C particles. A deterministic fractional spawn accumulator preserves the requested average factor (including 1.35× and 1.75×, which cannot be represented by rounding each spawn tick independently). Actual advected smoke, heat, fuel, fire combustion field, Ash A graphics, 2-damage fixture, and creature health bars remain unchanged. Density changes replay the fixture from the beginning for a useful visual comparison; the HUD shows active B/C counts and their peak counts after completion.

Sprite population and reduced-motion caps scale together; the original 1× behavior remains the default. QA must confirm both particle families are visibly more numerous at all three higher presets, the 8×8 board mask still clips them, and the preview works on desktop/mobile without changing live gameplay or saved runs.
