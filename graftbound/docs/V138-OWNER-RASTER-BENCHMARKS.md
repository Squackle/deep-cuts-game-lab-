# GRAFTBOUND v1.3.8 — Owner-reference raster benchmarks (art implementation)

**Approved reference:** The owner-supplied "GRAFTBOUND — Unit Roster & Art Style Preview" image, together with the earlier owner-approved Blank, Soldier/Caterpillar and Squirrel concepts described in the production directive. This PR replaces **actual game runtime pixels for Soldier and Squirrel**, not just CSS, shaders or scaling. The new Blank asset is staged but held back by a failed graft visual-quality check.

## Runtime integration

Three original painterly pixel-art source sets are now checked into `assets/hd2d/benchmarks/` at native size:

| Runtime identity | Native sprite size | Source poses and view | Runtime rendering |
|---|---:|---|---|
| `blank` (The Blank) | 128×128 | Six independent front poses and a separately illustrated rear three-quarter pose | **Staged, NOT installed.** Legacy Blank stays in combat because previewing 64px graft/Equipment overlays on this base visibly failed art-quality acceptance. |
| `mtg_friendlySoldier` | 128×128 | Six independent front poses, one rear three-quarter view, dedicated skin mask | Replaces old 64px generic/generated Soldier in battlefield, including attached gear and deterministic skin tones |
| `mtg_friendlySquirrel` | 96×96 | Six independent idle/gait/lunge poses and one independently illustrated rear three-quarter pose | Replaces legacy Hound-derived token in battlefield at a smaller consistent one-tile world size |

Pixels originate in original generated artistic reference poses that have been **individually extracted, aligned, quantized and committed**. The game assembles directional atlas sheets once at asset load. Changing sprite sources does not affect combat state or ranked RNG.

### Art-production status — not yet accepted as final

- The **front** idle, walk and attack states use genuine different poses. Looping reuses these poses, but is not merely a static illustration translated across tiles.
- The **rear** state currently has only one independently drawn original view; its subtle motion is a placeholder for a future fully articulated rear suite.
- Cast and hurt presently reuse and interpolate approved source poses. Authored unique cast, damage, and defeat frames remain required, particularly for the Blank and Soldier.
- The original 64px player graft and Equipment compositors remain authoritative in the live game. The 128px base was tested with those layers and **rejected for live use** because the old shapes obscured the detailed body. Rebuild graft anatomy and Equipment at native quality before enabling the new Blank.
- New skin-material masks support persisted deterministic skin-tone selection; additional manually painted masks and pose-specific Equipment anchors still need visual QA.
- No other creature or legendary boss is claimed complete. They retain their previous assets and were not silently marked upgraded.

### Scale and performance

Each installed benchmark sprite declares `pixelScale = priorHeight/nativeHeight`, so native detail **does not enlarge** the one-tile footprint. The Squirrel's in-game scale is specifically reduced to 0.24 relative to the Soldier's 0.39. Atlases are generated once at load, not each frame. The existing blue allies / red enemies health bars remain unchanged.

## Tests and release gates

- `npm test` (game engine plus presentation integration tests); dedicated `tests/v138-raster-benchmarks.test.mjs` checks shipped image dimensions, native pose coverage, distinct source poses, safe asset metadata and DOM-free engine imports.
- `npm run assets` builds the existing legacy art; the raster benchmark source files are retained alongside it.
- Shared Game Lab / release-coordination workflows must pass on the PR before merge.
- The runtime gallery at `/graftbound/dev/hd2d-gallery.html` uses actual game assets and distinguishes benchmark WIP, fully authored sheets and legacy models.

**Visual release limitations:** Automated tests cannot verify professional art quality. Live-browser WebGL visual comparison and physical mobile FPS are still separate gates, and without those tests the entire art overhaul is **not complete**. The owner reference is a standard, not an asset copied into the game. No Magic card illustration is used as a texture.

**Rollback:** Revert this PR; it changes only `graftbound/**`. No save keys, combat rules, ranked revision, public website, other Game Lab titles or production D1 are touched.