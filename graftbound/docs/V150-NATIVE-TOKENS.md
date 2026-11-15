# GRAFTBOUND v1.5.0 — Native Squirrel and mushroom Saproling summon art

## Original runtime art implementation

The user-approved richly shaded reddish-brown Squirrel is a mandatory quality benchmark. This PR replaces the in-game Squirrel's borrowed generic Hound character body with **original 96×96 RGBA token anatomy**: a large upward-curled multilayered fluffy tail, rooted to the hips; warm chestnut/cream fur contrasts; pointed ears, expressive face, cream muzzle/belly; distinct forepaw and hind-leg movement, tail follow-through, damage recoil and falling defeat. These are connected-body animation frames, not a picture sliding across tiles.

The Sproutling and Saproling also receive one coherent species-appropriate *fungal* anatomy, rather than a repainted Grub: layered mushroom umbrella with gills and individual patches, root legs with timed foot lifts, connected mycelial arms and spores, natural idle/casting and defeat. Their identities keep separate runtime palettes.

New `detailed-token-art.js` is used by `real-creature-models.js` only at initial source-atlas creation and selects original geometry **instead of** borrowed base images. Actual runtime identities:

- `mtg_friendlySquirrel`
- `mtg_friendlySproutling`
- `mtg_saproling`

Each has two authored viewing directions, four frames in all six states (`idle/walk/attack/cast/hurt/defeat`), original 96px source cells and the existing one-tile combat footprint/world scale. Motion is deterministic and never consumes simulation RNG. No card rules, HP, save keys, equipment effects or replay versions changed.

## Release QA

- `npm test` under `graftbound`, including new `v150-native-squirrel-saproling.test.mjs`, earlier art tests and replay checks. Inspect **GRAFTBOUND source-bundle `graftbound-tests.txt` actual `EXIT_CODE=0`**, since the read-only bundle workflow does not fail when tests do.
- `/graftbound/dev/token-art-qa.html` browser diagnostic reads the actual 96px runtime sprites and checks three identities, front/back, six states, 3+ distinct pixels/frames and zero clipped cell edges.
- Protected Unified Game Lab tests, release coordination and exact-SHA Cloudflare preview/production verification.

## Artistic acceptance boundaries

This is a code-authored **native token anatomy study**, not a finished hand-painted interpretation of the owner-approved concept; it must still undergo side-by-side concept comparison, richer fur/lichen pixel texturing, intermediate frame expansion, more directions and mobile-device performance acceptance. The whole GRAFTBOUND roster still contains other unfinished/borrowed artwork. No complete-game HD-2D acceptance is claimed.

Rollback by reverting isolated GRAFTBOUND visual PR, leaving Game Lab combat and difficulty changes intact.
