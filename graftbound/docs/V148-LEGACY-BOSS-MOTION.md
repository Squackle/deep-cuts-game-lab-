# GRAFTBOUND v1.4.8 — Original act-boss animation pass

## Implemented in the battle renderer

All three pre-legendary original GRAFTBOUND bosses now use original, species-specific, **six-state 112px cached RGBA atlases**, matching the runtime atlas convention of the six legendary bosses. They retain their own character designs rather than borrowing an unrelated creature body.

| Runtime key | New articulated visual motion |
| --- | --- |
| `thornmother` | Seven grounded, branching roots, counterbalanced crown, attached bramble lashes, animated heartwood and rooted defeat |
| `matron` | Low-slung furnace abdomen, jointed brood legs, articulated forward claws, glowing molten core, tilted crown and distinctive collapse |
| `unwritten` | Floating void mask, independently moving scroll cape, anchored void limbs, glyph-burst casting and dispersing defeat |

All nine current boss identities now support front/back direction and idle, walk, attack, cast, hurt and defeat. Each state contains four deterministic frames. The real renderer generates the atlas at load time and caches it; nothing in this PR generates a new texture per WebGL frame.

The art and motion code is strictly presentation-only. Gameplay AI, boss phases, effects, movement rules, combat timing, ranked replay, saved keys, Magic card mappings, and existing enemy statistics are not modified.

## Source and browser verification

- Run `npm test` in `graftbound` and all protected Game Lab checks.
- `tests/v148-legacy-boss-motion.test.mjs` verifies non-repeated poses, species-specific movement, linked attachments and no forbidden combat or random mutations.
- The updated `/graftbound/dev/boss-motion-qa.html` uses the exact nine sprite sheets loaded in combat, with both directional views and all six states, and rejects empty, identical or clipped atlas frames.
- Inspect the Cloudflare preview and verify the production SHA once the PR merges. Mobile device FPS and owner-approved concept fidelity still require dedicated testing.

## Quality and scope honesty

This is a code-based articulated anatomy study, **not** the final hand-painted painterly HD-2D rebuild required by the owner-approved art direction. The entire roster still needs authored high-fidelity details, long animation suites, additional directions, graft/equipment compatibility across more bodies, side-by-side gameplay comparisons and real-phone performance acceptance. No final artistic approval is asserted by automated tests.

Only `graftbound/**` changes. Rollback by reverting this isolated art PR; no migration is required. No main-site DeepCutsEDH or sibling game work is authorized by this release.
