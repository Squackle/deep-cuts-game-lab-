# GRAFTBOUND v1.4.9 — Native Wolf, Direwolf and Drake source art

## Actual runtime upgrade

These four existing runtime identities no longer paint onto a borrowed Hound/Moth body layer:

- `mtg_hound` — Bramble Hound / Wolf motion family, separate grounded canine body.
- `mtg_wolf` — friendly Wolf summon, same true Wolf anatomy with a separate material palette.
- `mtg_alpha` — larger Direwolf skull, heavier ruff, raised dorsal hackles and four independently articulated limbs.
- `mtg_friendlyDrake` — dedicated smaller dragon-like body, root-attached wings, articulated hind legs, long tail, horned skull and jaws.

The new `detailed-beast-art.js` draws original 96×96 transparent RGBA frames at asset load, with six independent animation states (idle, walk, attack, cast, hurt, defeat) across two directional views and four frames per state. Native art is selected **instead of** the borrowed base sprite, never merely painted over it. A deterministic shoulder/hip/jaw/tail rig derives all movement from the animation state, view and frame. Directional palette lighting and material surfaces are shared across these species; the Direwolf receives distinct geometry, not a simple recolor.

`real-creature-models.js` computes the source-art pixel scale from the original model's displayed world height. This preserves one-tile footprints, old proportions at gameplay zoom, and combat selection/hit-box behavior. The renderer caches the source atlas. No texture regeneration per render frame, new gameplay randomness, changes to Magic card rules, saves or ranked replay inputs.

## Verification

- `npm test` under `graftbound/`, including new `v149-native-beast-art.test.mjs` and prior species/humanoid regression suites.
- `/graftbound/dev/beast-art-qa.html`: inspect the exact runtime 96px sprite atlases for the four identities across all six states/two directions, verify nonempty frames, 3+ independent poses per state, and zero clipped edge pixels. Verify exact Cloudflare preview SHA and production after merge.
- Required Game Lab coordination, source bundle and unified checks. Check source-bundle artifact `graftbound-tests.txt` and its **EXIT_CODE=0** explicitly; source bundle intentionally records test failure without failing the bundle job.
- Final art quality and real-device FPS still require owner visual comparison and physical mobile checks; these new source assets are intermediate animation studies.

## Remaining visual debt

All characters must ultimately match the approved painterly fantasy HD-2D source references. High-fidelity hand-painted creature textures, longer motion sequences, more views, consistently grafted anatomy/equipment, full remaining creature registry coverage and on-device performance verification remain pending. Do not call the master art overhaul complete solely because these models load or have distinct frames.

Changes are only in `graftbound/**`. Rollback by reverting isolated art PR. Existing threat and enemy-first combat rules remain untouched.
