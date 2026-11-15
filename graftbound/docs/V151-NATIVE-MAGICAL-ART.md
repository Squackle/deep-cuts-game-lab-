# GRAFTBOUND v1.5.1 — Original Magical Creature Runtime Anatomy

## Implemented in the actual game

Four existing creature identities now render original, native-scale **96×96 transparent RGBA cells** rather than the old Moth/Grub or generic overlay model.

| Runtime identity | Creature-specific anatomy and motion |
| --- | --- |
| `mtg_friendlyElemental` | Layered animated flames emerging from a continuous core; moving arms, timed flame attacks and casting embers |
| `mtg_friendlyBirdIllusion` | Feathered wings hinged at the sternum, distinct tail feathers, beak and supported flight/attack posture |
| `mtg_friendlyTentacle` | Seven independent curved limbs attached to a central body, rooted suction cups, rippling coils and lunge |
| `mtg_angel` | Humanoid draped figure with attached feather wings, moving legs and arms, halo and correctly anchored blade |

Every identity has **front/back views** and **six states**: idle, walk/fly, attack, cast, hurt, defeat. Frames are deterministic functions of the visual state/view/frame index; no world RNG is consumed. A 96px source frame is **not** a 96px battlefield footprint: `pixelScale` still scales each identity to its existing world height and one-tile occupancy. Existing allied **blue** and enemy **red** health bars stay unchanged.

The original RGBA cells are drawn once by the game asset loader, cached as normal sprite atlases and reused during combat. No spell rules, status durations, combat timing, AI, Equipment, saves, progression or ranked replay fingerprint changes.

## Validation

- `npm test` in `graftbound/`; dedicated tests `v151-native-magical-summons.test.mjs` verify real registry coverage, species-distinct geometry, state animation, different directional views, deterministic poses and gameplay isolation
- Actual browser runtime at `/graftbound/dev/magic-art-qa.html`: reads the exact sprite sheets shipped in the game, checks all six front/back states for at least three distinct opaque frames and **zero edge-clipped pixels**
- Existing automated Game Lab shared, source-bundle and release coordination checks are mandatory
- Confirm exact Cloudflare commit before calling production deployed

## Artistic acceptance remains open

This is a substantive **native-geometry animation replacement**, but **not** complete hand-painted painterly HD-2D production art: further professional source illustration, longer animation sequences, diagonal/back-side views, intentional material brushwork, Equipment/graft silhouettes where appropriate, strict visual comparison against the approved concept references and real physical mobile performance testing remain unverified.

Other roster identities (e.g. enemy archers, Wurms, Rhino/tortoise, minotaurs, spellcasters) still use lower-fidelity renderer studies and require the same individualized art treatment. Do not mark the complete game art overhaul done.

Rollback: revert the single isolated Game Lab visual PR. No save migration or gameplay rules version change is required.