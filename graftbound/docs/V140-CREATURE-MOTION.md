# GRAFTBOUND v1.4.0 — Creature motion and material consistency pass

Owner direction: continue the approved Painterly Fantasy HD-2D artwork overhaul **using code only**; do not generate or deliver concept images. The existing owner-supplied unit-roster image remains the visual benchmark.

## Actual runtime changes

`src/rendering/creature-motion.js` introduces deterministic per-state poses for the existing Wolf/Dire Wolf, friendly Drake, Goblin and Saproling feature rigs. `real-creature-models.js` now uses these motions when rendering each existing animation cell:

- **Wolves**: distinct four-leg diagonal walking, articulated hocks and feet, moving tail, recoil, lunge and opening bite rather than a wholly translated quadruped.
- **Drakes**: rooted left/right wings with separate spread and lift, moving hind legs, head/neck extension and casting posture.
- **Goblins**: stepped legs, separate weapon-arm swings and head movement for regular and friendly goblin variations.
- **Saprolings**: two roots/feet that move independently, cap tilt and an organic spore casting posture.

The renderer also removes the old coordinate-hash pixel speckle pass and replaces it with coherent shared upper-left lighting and broad material-specific shading for fur, fungal material and metal. The upgraded families additionally receive an individually rendered four-frame **defeat** atlas row (7 FPS, non-looping), distinct from the existing damage reaction; legacy creature identities retain their previous death presentation. The combat death event and attack/status resolution remain unchanged. This does **not** alter sprites outside the creature-model renderer, such as the independent premium legendary-boss artist.

New runtime review screen: `/graftbound/dev/creature-motion-qa.html`. It uses actual sprite sheets loaded by the game to inspect the animated states and counts distinct RGBA frames. The page does **not** substitute for player-relevant in-battle visual review.

## Acceptance and limitations

This is an **intermediate species-specific animation and material improvement, not the final premium hand-authored artwork**. Most ordinary enemies are still based on their earlier low-resolution silhouettes, and the four updated families still require independent high-resolution directional raster assets and final visual acceptance against the owner-approved preview. The new collapse frames are procedural motion studies and **not** individually hand-painted defeat artwork; independently authored higher-fidelity animation remains outstanding. Other families, the full bestiary and the six legendary bosses remain distinct outstanding workstreams. Do not mark the overhaul complete.

All changes are inside `graftbound/**`. Character gameplay identities, summoned units, card mechanics, saves, balance, collision and ranked deterministic combat are unchanged. All animation variation derives exclusively from `anim`, `frame`, and `view`. No gameplay RNG, storage, API or new remote assets.

## Release QA and rollback

Run `cd graftbound && npm test`; run shared Game Lab catalog, source bundle and release-coordination CI. Inspect the new QA screen on an exact-SHA Cloudflare preview and confirm the Wolf, Drake, Goblin and Saproling rigs each show nonempty distinct walk/attack frames. Recheck tactical scene sizing; physical phone performance, subjective art acceptance and original concept comparison remain unverified unless explicitly performed.

Rollback is a revert of this isolated PR. It changes no saved data and no shared site files.
