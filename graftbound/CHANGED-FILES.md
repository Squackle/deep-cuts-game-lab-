# Changed paths (v0.4 → v0.5)
**Moved:** `living-card/**` → `graftbound/**` (use `git mv`).

**New `living-card/`** (redirect stub only): `living-card/index.html`, `living-card/README.md`.

**Shared files the deploying agent must edit** (see HANDOFF §3):
- the existing Game Lab catalog entry
- any route test that expects `/living-card/`
- optional root `_redirects`

## Within `graftbound/`
**New:**
- `AGENTS.md`, `CHANGED-FILES.md`, `_redirects-snippet.txt`
- `docs/BALANCE-v0.5.md`, `docs/MIGRATION-v0.5.md`, `docs/screenshots/*`
- `dev/floor.html`, `dev/vfx.html`
- `src/engine/power.js`, `src/engine/shrines.js`, `src/rendering/vfx.js`
- `tests/rewards.test.mjs`, `tests/campaign.test.mjs`, `tests/rendering.test.mjs`, `tests/paths.test.mjs`, `tests/balance-lib.mjs`, `tests/sim-report.mjs`
- `tools/verify-real-pool.mjs`
- `assets/textures/terrain_blur.png`, 11 new enemy sprite sheets, 4 new foliage kinds

**Rewritten or substantially changed:**
- `index.html`, `styles.css`, `package.json`, `src/config.js`, `src/main.js`
- `src/core/grid.js`
- `src/data/{cards,keywords,enemies,encounters}.js`
- `src/cards/{catalog,real-pool,compatibility,reference-set,live,scryfall-adapter}.js`
- `src/engine/{abilities,ai,appearance,campaign,combat,encounters,evolution,progression,rewards,run,save,spells}.js`
- `src/rendering/{environment,geometry,gl,math,particles,scene,sprites,evolution-visuals}.js`
- `src/ui/{battle-ui,cards,icons,screens}.js`, `src/audio/audio.js`
- `tools/{build_assets,pixelkit,sprites_def,enemies_def,shot}.py`
- `tests/{helpers,sim,evolution,combat,spells,cards,run,balance}.test/mjs`, `tests/e2e.py`
- all `*.md` docs

**Removed:** `tools/preview_real_cards.py`, `dev/bench.html`, `dev/evolution.html` (superseded by `dev/vfx.html` and `dev/floor.html`), `assets/cards/*` (legacy illustrated-card art; no longer offered)
