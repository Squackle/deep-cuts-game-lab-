# ARCHEMANCY 13.66 — Ambient title and first balance pilot

Owner-approved, November 26 Central. Stacked after flight-priority hotfix #372; no public Arcade promotion.

## Presentation
Retain the painted river keep WebP and existing menu. Decorative, pointer-transparent SVG overlays align to the cover crop: four flags (clipped fabric texture), beacon flicker, drifting valley mist, river ripples and foreground waterfall/rapids shimmer. CSS-only looping transforms, opacity and short stroke animation; no video, animation frame loop, external request, or runtime game-state changes. Reduced-motion users see the original still art; unsupported container units fall back to still art. Anchors stay fixed to the painted scene when the title controls scroll. Chromium verification covers desktop and two landscape phone sizes, touch controls and reduced motion.

## Balance pilot
- Deep Freeze III: slow duration 2.2 to 2.4 seconds. Keep the 0.4-second root, 0.6-second basic cadence, damage and reveal. The 2.6-second slow caused the established seed-one Easy Mono-Blue clear to fail at wave 25 even with the original root. The 2.4-second slow with the original root cleared the same seed with 4 fortress health, up from 3 in 13.65.
- Grasping Forest III: root duration 2.0 to 1.5 seconds; retain radius, damage, poison and other branches. This reduces control but does not prove permanent rooting is eliminated. Diminishing returns and wider adjustments require controlled tests.
- Soul Foundry: income per death at tiers II/III/IV increases from 18/23/28 to 22/27/32 before specialization and other multipliers. Tier I remains 13; existing per-wave caps unchanged. Shared base helper keeps simulation and preview consistent.
- No change to difficulty, global enemy HP, Red, White, Mana Grove, commander, or spell rules. Eight owner reports are not a controlled balance dataset. Compare actual same-seed outcomes before tuning further.
- SAVE_FORMAT remains 1; new combat behavior revision 13.66. Old exact replay behavior belongs to its original engine.

## Verification
Run exact-head regression and release checks. Compare matched-seed Blue, Green and Black runs with 13.65. Review title alignment before and after scrolling, desktop and touch navigation, and reduced motion.

The revised pilot passed 330 local tests. Three matched seeds per school cleared all 25 Hard Onslaught waves with Blue on Caldera, Green on Confluence, and Black on Hollow. Blue finished with 18/16/19 fortress health on both builds and Green with 7/9/4. Black finished with 18/17/20 in 13.65 and 18/20/20 with the pilot, with the same total Soul Foundry mana in each paired run. These runs use one scripted strategy per school. Readback from all five battlefields confirmed 13.65 saves load with their altitude preferences and give identical 13.66 simulation state after a further round trip.
