# ARCHEMANCY 13.66 — Ambient title and first balance pilot

Owner-approved, November 26 Central. Stacked after flight-priority hotfix #372; no public Arcade promotion.

## Presentation
Retain the painted river keep WebP and existing menu. Decorative, pointer-transparent SVG overlays align to the cover crop: four flags (clipped fabric texture), beacon flicker, drifting valley mist, river ripples and foreground waterfall/rapids shimmer. CSS-only looping transforms, opacity and short stroke animation; no video, animation frame loop, external request, or runtime game-state changes. Reduced-motion users see the original still art; unsupported container units fall back to still art. Visual acceptance on actual desktop/phone still required.

## Balance pilot
- Deep Freeze III: slow duration 2.2 to 2.6 seconds; root 0.4 to 0.5 seconds. Keep its basic 0.6-second cadence, damage and reveal. A 0.7-second root would exceed the ordinary attack interval, so start at 0.5 to avoid deliberately introducing continuous single-target lock.
- Grasping Forest III: root duration 2.0 to 1.5 seconds; retain radius, damage, poison and other branches. This reduces control but does not prove permanent rooting is eliminated. Diminishing returns and wider adjustments require controlled tests.
- Soul Foundry: income per death at tiers II/III/IV increases from 18/23/28 to 22/27/32 before specialization and other multipliers. Tier I remains 13; existing per-wave caps unchanged. Shared base helper keeps simulation and preview consistent.
- No change to difficulty, global enemy HP, Red, White, Mana Grove, commander, or spell rules. Eight owner reports are not a controlled balance dataset. Compare actual same-seed outcomes before tuning further.
- SAVE_FORMAT remains 1; new combat behavior revision 13.66. Old exact replay behavior belongs to its original engine.

## Verification
Add regression coverage for actual root durations, capped Foundry income and display, existing flight priority, static artwork alignment/reduced motion. Run all exact-head CI and matched-seed blue/green/black checks; check desktop and mobile visual alignment, clickability and reduced motion. No test or deployment success claimed at commit creation.
