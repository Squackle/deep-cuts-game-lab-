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
