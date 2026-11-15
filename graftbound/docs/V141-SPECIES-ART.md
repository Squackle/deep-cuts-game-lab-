# GRAFTBOUND v1.4.1 — Original arthropod and serpent animation rigs (code-only)

## Why this change exists

The live Spider identities previously reused the Hound's source rig; the Snake used a recolored Hound; the Hornet and Stinger reused a Moth source. This contradicted the owner's mandatory creature-specific-anatomy standard.

## Actual code integration

The new `detailed-species-art.js` replaces those borrowed-source layers with individually constructed, native **96×96 RGBA animation cells** generated exactly once in `installRealCreatureModels`. No sprites are regenerated during the render loop. It covers five actual registry identities:

- `mtg_spider`, `mtg_friendlySpider`: low eight-legged spiders with independently positioned knee/tarsus joints, rounded segmented abdomen, fangs, front/back views, diagonal stepping, strike, recoil, casting and non-looping collapse.
- `mtg_friendlySnake`: continuous coiled snake body with layered scaled shading, articulated raised head, bite/lunge, tongue gesture, recoil, and collapse; **zero legs**.
- `mtg_friendlyHornet`, `mtg_moth`: six-legged, three-segment flying insects with two independently articulated translucent wings, antennae, abdominal bands, stinger, grounded leg articulation, strike, and collapse.

All five use six animation states (`idle`, `walk`, `attack`, `cast`, `hurt`, `defeat`) and front/back artwork. The per-identity `pixelScale` is calculated from the former rig's source height so that **96px is only a source resolution**, not a change to battlefield size or one-tile occupancy.

All generated poses and color ramps are deterministic functions of view, animation state and frame index, preserving game/replay RNG. Source files live in the repo; assets are fully reproducible. They are **original geometry-based painterly studies**, not extracted or recolored Magic illustrations.

## Verification

- `npm test` in `graftbound/`, plus GitHub unified Game Lab and release-coordination workflows.
- Browser QA at `/graftbound/dev/species-art-qa.html`: uses actual game sprites, all six animation states, front/back views, per-frame RGBA fingerprints, opacity, frame boundaries and world-pixel scale.
- No claim of physical-phone FPS or subjective reference-quality approval without direct inspection.

## Remaining work and quality limits

This is a major anatomical correction in the **runtime** but not final hand-painted premium HD-2D art: further organically painted scales, fur/feather textures, intermediate frame counts, additional directional angles, and all remaining ordinary creatures and bosses remain incomplete. The two-view four-frame studies should not be called full final production assets. Do not replace their identity-specific shapes with borrowed Hound/Moth fallback or claim full art overhaul acceptance.

No combat, Equipment, card, save, AI, boss phase, leaderboard, or shared Game Lab changes. Rollback: revert this isolated PR.
