# GRAFTBOUND v1.5.0 — Native Saproling, protected owner-approved Squirrel

## Original runtime Saproling art

This PR replaces the Grub-based placeholder underlying both Saproling/Sproutling identities with **original 96×96 native transparent RGBA mushroom anatomy**:

- `mtg_saproling`: a living mushroom cap with detailed gills and authored light patches; one central stalk, five rooted feet, connected mycelial hands; swaying/bouncing gait, attack reach, emitted spores, recoil and defeat.
- `mtg_friendlySproutling`: the same actual fungal anatomy family with its own material palette and unchanged tactical scale.

The new `detailed-token-art.js` produces cached source sprites at asset load; it is not regenerated during combat. Both front/back views have six independent animation states (`idle,walk,attack,cast,hurt,defeat`) with four frames each. The in-game one-tile footprint, save keys, game mechanics and replay rules are untouched.

## Approved raster Squirrel is explicitly protected

The actual production `mtg_friendlySquirrel` sprite was **already overridden by the higher-priority, owner-approved authored painterly Squirrel raster** in `src/rendering/raster-benchmarks.js`, loaded from `hd2d/benchmarks/squirrel-poses.png` at 96px. Initially this patch attempted a new procedural squirrel layer, but browser QA correctly detected the existing raster installation. Replacing the painted reference with a code-drawn approximation would reduce quality, so the procedural Squirrel source was not adopted.

We preserve this artwork as authoritative and add source **and browser** regressions asserting the Squirrel retains `artPack:'owner-raster-benchmarks-v1'`, `artSource:'squirrel-poses.png'`, and its original 96px frame size. Its five-state source pose atlas is **not** incorrectly labeled a final fully authored six-state animation. The approved Squirrel still requires more real authored rear, casting, hurt and defeat frames before claiming final acceptance.

## Verification

- Run GRAFTBOUND `npm test` including `v150-native-squirrel-saproling.test.mjs` and earlier artwork tests. Check `graftbound-tests.txt` in the source bundle for `EXIT_CODE=0` because the bundle workflow records failures without failing itself.
- Preview `/graftbound/dev/token-art-qa.html`: confirms two actual fungus RGBA sprite atlases, both views, all six states, 3+ different nonempty animation frames, zero edge contact, **and preservation of approved raster Squirrel**.
- Protected Unified Game Lab, release coordination and Cloudflare preview/production exact-SHA checks.

## Not yet final HD-2D art acceptance

These Saproling sprites are code-authored anatomical studies. The owner's painterly art reference remains mandatory; genuinely finished hand-painted textures, extended animation frames, directional artwork, player graft/equipment anatomy, mobile FPS, and remaining long-tail roster quality require further authoring and comparison. Do not call the whole project artistically complete.

Rollback by reverting isolated GRAFTBOUND visual PR; existing combat, threat and replay rules are untouched.
