# GRAFTBOUND v1.5.2 — Four Original Monster Anatomy Rigs

## Implemented in-game (code-only)

Four **actual registry identities** now use original, cached **96×96 RGBA pixel-art anatomy**, not legacy borrowed sources:

- `mtg_grub` — Caustic Caterpillar: seven independently shaded cuticle segments, six-plus pairs of articulated prolegs, hinged head, feelers and contraction/attack.
- `mtg_tortoise` — the Rhino creature identity: heavy four-hoofed body, shoulder hump, hide folds, distinct nasal horn and weighted stride/charge. Preserve the authoritative real-card adaptation, rather than asserting the internal defId describes biological identity.
- `mtg_champion` — Wurm: muscular coiled serpent, rising armored neck, articulated jaws, teeth and strike, **no pasted legs or wings**.
- `mtg_slug` — Slug Horror: organic continuous foot and mantle, patterned flesh, four eye stalks, undulating glide and corrosion/defeat poses. The premium legendary boss Toxrill uses its separate, already-authoritative premium atlas; it is not overwritten.

All four have independent two-direction and six-state original source cells: idle, walk, attack, cast, hurt, defeat (four authored frames per state). They are assembled once at load time into cached standard sprite sheets. Different bodies are actual different geometry, not color-only variations. The runtime keeps each identity's original apparent pixel height and tactical one-tile occupancy through the existing `pixelScale` calculation.

## Verification and limitations

Run GRAFTBOUND `npm test`, Game Lab unified checks and release coordination. The QA page `/graftbound/dev/monster-art-qa.html` reads **the exact textures shipped to combat**, verifies frame nonemptiness, distinct animation geometry, no atlas-cell edge clipping and preserved world size for both views and all states. Only report production success after verifying Cloudflare's exact Git SHA.

This is an original native-geometry **anatomical animation study**, not complete premium owner-approved painterly HD-2D. Long-lived missing/fallback creature families, artist-quality texture work, 6–12-frame animation timing, additional diagonal views, authentic card-reference comparison and physical mobile FPS tests remain pending. No gameplay, AI, ranked replay rules, saves, equipment, cards, damage or turn-order code changes.

Rollback: revert isolated `graftbound/**` PR. No save migration required.
