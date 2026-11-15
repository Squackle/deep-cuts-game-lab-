# GRAFTBOUND native HD-2D sprite intake — implementation status

This pipeline is implemented for independently authored **non-player** game-ready RGBA sheets, not a completed visual overhaul. The manifest is intentionally empty until independently authored, fully directional frame sheets pass review. The owner-approved roster reference has been inspected, and Soldier/Squirrel raster benchmarks are separately loaded from `assets/hd2d/benchmarks/`. Those benchmarks are not yet full animation acceptance. It is **not** permission to ship enlarged legacy sprites, generic creature silhouettes or inconsistent generated animation frames.

## Authoring a unit

Add a PNG under `assets/hd2d/` and register its existing runtime identity in `assets/hd2d/manifest.json`. Example **schema only; no artwork is implied**:

```json
{
  "key": "mtg_friendlySoldier",
  "file": "soldier/sheet.png",
  "skinMaskFile": "soldier/skin-mask.png",
  "frameWidth": 128,
  "frameHeight": 128,
  "columns": 8,
  "pivotX": 64,
  "pivotY": 119,
  "views": ["front", "back", "left", "right"],
  "animations": {
    "idle": {"row": 0, "frames": 6, "fps": 5, "loop": true},
    "walk": {"row": 1, "frames": 8, "fps": 10, "loop": true},
    "attack": {"row": 2, "frames": 8, "fps": 12, "loop": false},
    "cast": {"row": 3, "frames": 6, "fps": 10, "loop": false},
    "hurt": {"row": 4, "frames": 4, "fps": 9, "loop": false}
  },
  "anchors": {"rightHand": [90, 72], "ground": [64, 119]}
}
```

Each view occupies one contiguous block of animation rows. Every animation occupies the declared row within that view. All frame cells use the same dimensions and a stable pivot. Required states are idle, walk, attack, cast, hurt. The extra `defeat` state is supported by the runtime death event; use individually authored frames for that state. Pixel data must be independently authored—not enlarged programmer sprites or extracted Magic illustrations.

The loader verifies safe paths, known live identities, unique views and rows, frame-counts, FPS, pivots, and exact image dimensions. Soldier replacement **requires** a matching `skinMaskFile` sheet because in-game deterministic skin recoloring depends on it. Mask cells follow the exact same column/view/animation layout as the artwork. All art and masks are validated before changing any live sprites. The scene uses per-identity animation metadata, independent four-way artwork when available, and a cumulative world-pixel compensation ratio: replacing a previously-upgraded 128px benchmark with a 96px or 160px sheet does not change the unit's gameplay footprint. Rendering still does not own combat RNG.

**Important unimplemented gates:** The current Blank's 64px graft, skin-mask and Equipment compositors cannot safely accept an HD swap; the loader rejects it rather than breaking morphologies. Equipment/attachment anchors are stored as metadata but do not yet drive all gear integration. The input images must be visibly checked against the three approved concepts and actual in-battle screenshots on mobile before any model is declared approved. This pipeline alone does not satisfy Phase A, the full bestiary, or all bosses.

Test: `cd graftbound && node --test tests/hd2d-art-pack.test.mjs`; run the full `npm test` and browser/gameplay smoke checks before merging new art.
