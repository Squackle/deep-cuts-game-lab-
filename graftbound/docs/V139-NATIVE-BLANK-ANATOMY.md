# GRAFTBOUND v1.3.9 — Native 128px Blank graft/Equipment compositor

## Implemented

The owner-approved **loincloth-only Blank raster artwork** is now installed in the actual runtime, along with its 128px material skin mask. The existing Soldier and Squirrel raster benchmarks remain unchanged. The Blank's idle, walk and attack use the committed independently painted source poses (the rear view currently uses an original rear illustration with approximated motion). The player remains barefoot, bare-chested and unarmored at the start.

To remove the previous quality blocker, `native-blank-art.js` uses per-pose anatomical anchors derived from the seven source poses to paint native-resolution changes:

- Behind the body: wings, tail, shell, spikes.
- Integrated on the body: feline/draconic/avian head details, fur/scales/bark/chitin, horns, antlers, claws, tusks, beak, moss, eyes, armor graft, and venom/tendrils.
- Separate Equipment layer: the five existing card Equipment identities receive pose-anchored boots, collar, mask, shield and spear; Equipment is never silently treated as an acquired graft.

The appearance state is still derived from existing saved cards, grafts, and Equipment. Recoloring continues to operate only on skin-mask pixels, preserving cloth and other material colors. No gameplay RNG is consumed and save keys, AI, ranked rules and hit timing do not change. Sprite atlases are cached and recomposited only on visual state changes, not drawn every render frame.

## Art acceptance boundary

This is a **native compositor implementation**, not a claim that every graft species or its animation has achieved the final approved painterly quality. These original procedural accent/attachment drawings need actual battle/reference comparison for each high-level anatomy and equipment pairing. The rear, cast and hurt benchmark frames still reuse source pose studies and need distinct authored art. All remaining non-benchmark creatures and bosses are also outstanding. Do not claim full artwork completion.

## Verification & rollback

Run `cd graftbound && npm test` and the combined Game Lab suite. Inspect the real game at `/graftbound/dev/hd2d-gallery.html` and during battle with early Blank, wings, claws, horns, shell, armor, shield, and spear; check real smartphone FPS and alignment before final art signoff. If browser visual QA fails, reject or correct this patch rather than substituting unrelated silhouettes.

Rollback by reverting this PR; the existing legacy Blank and art sources remain in the repository. No engine rule, save, public-site, or sibling-game changes.
