# GRAFTBOUND v1.4.2 — Original Cat Soldier, Skeleton, Zombie and Construct runtime anatomy

## Implemented in the actual game

These eight existing, authoritative runtime IDs no longer use a recolored generic human/archer, Riftstalker or Sentinel body underneath their species identity:

| Runtime identity | New native anatomy |
| --- | --- |
| `mtg_friendlyCatSoldier` | Feline militia warrior: ears, muzzle, tail rooted to the hips, furry paws, leather tunic, hand-attached sword |
| `mtg_friendlySkeleton` | Exposed bone skeleton: pelvis, vertebrae, ribcage, clavicles, arm/leg joints and skull with eye cavities |
| `mtg_zombie` | Shambling undead body, asymmetrical arms, wounded flesh, torn cloth, drooping face |
| `mtg_nullwarden`, `mtg_golemVigilance` | Stone-and-metal golems with segmented hips, shoulders, elbows, hand plates and lit core |
| `mtg_golemTrample` | Heavy Gearhulk with enlarged shoulder masses, working joints and six-tooth side gears |
| `mtg_golemFly`, `mtg_sentinel` | Armored Titan anatomy with shoulder fins, metallic material and integrated core |

The new `detailed-humanoid-art.js` produces original 96×96 transparent RGBA cells, each with front/back directional views and six animation states: idle, walk, attack, cast, hurt and defeat. The existing renderer caches the atlas once when game assets load. No frame is generated during live battlefield rendering. All animation changes derive from view, state and frame; gameplay RNG, combat state, save keys and replay rules are untouched.

`real-creature-models.js` now selects these native species models and never draws the borrowed base asset beneath them. `pixelScale` preserves each existing model's original rendered height and one-tile tactical occupancy. The existing ally-blue/enemy-red HP bars remain unchanged.

## Verification

Run `cd graftbound && npm test`, required Game Lab release checks and Cloudflare deployment QA. Review `/graftbound/dev/humanoid-art-qa.html` on the preview and final deployed site: it reads the actual runtime texture sheets and rejects empty, repeated or clipped frames across both views and six states. The new source tests also check that the feline, skeletal, zombie, Gearhulk, stone Golem and Titan use physically different geometry, not recolors.

## Art-quality boundary

This implements **original native-scale species-specific animation studies**, not fully finished premium hand-painted HD-2D sprites. Independent artist-level detailing, character-accurate illustration comparisons, more movement directions, longer animation sequences, mobile performance QA and further boss/roster coverage remain outstanding. Do not mark those accepted or finished based only on CI and pixel fingerprints.

Changes are confined to `graftbound/**`. Rollback: revert the isolated PR, leaving all gameplay, saves and sibling games unaffected.
