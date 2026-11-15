# GRAFTBOUND v1.3.2-beta — The Blank's starting clothing

Visual-only update; the player's base starts with a small irregular cloth loin wrap rather than a vest, boots and trousers.

## What changed
- Repainted **all 40 front/back idle, walk, attack, cast and hurt frames** of the 64-pixel base Blank with an exposed, organically shaded torso, bare arms, bare legs and feet.
- Added a brown cloth covering at the pelvis, with stitched/folded details. It has its own material independent of skin tone.
- Masked skin consistently across chest, arms, head, legs and feet. Exact garment masking prevents skin-tone recolors from repainting the loincloth or leaving fixed-color thigh/boot artifacts.
- Preserved separately composited armor grafts: armor appears only if the evolution has the `armor` graft; Equipment is still rendered separately by the existing Equipment system.
- Preserved the existing half-height tactical scale and current rules/replay fingerprint. This cosmetic update requires no save migration.
- Added deterministic pixel tests for baseline anatomy, garment isolation, all 40 poses, and conditional armor.

## Verification
- Required: `npm test` in `graftbound/`, bundle build, shared Game Lab CI, release-coordination check, Cloudflare preview and production commit match.
- The update does not modify `deep-cuts-edh`, sibling games, scores, accounts, or D1.

## Rollback
Revert the isolated Game Lab GRAFTBOUND PR if its new art fails QA. It has no save schema or combat rules changes.
