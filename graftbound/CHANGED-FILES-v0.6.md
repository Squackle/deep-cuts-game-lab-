# Changed paths (v0.5 → v0.6), all inside `graftbound/`

**New engine and data**
- `src/engine/{legal,describe,scoring,ranked,events,journal}.js`
- `src/data/{terrain,scoring}.js`

**Changed engine and data**
- `src/engine/{combat,ai,spells,run,save,campaign,encounters,rewards,progression,abilities}.js`
- `src/data/encounters.js`, `src/core/grid.js` (comment only), `src/cards/compatibility.js` (three VFX ids)

**Presentation**
- `src/rendering/{gl,scene,environment,vfx}.js`
- `src/ui/{battle-ui,screens,cards}.js`, `src/main.js`, `src/config.js` (0.6.0)
- `styles.css`, `dev/vfx.html`, `package.json`

**Tests**
- New: `tests/{v06-gameplay,v06-scoring,v06-adventure,v06-presentation}.test.mjs`, `tests/ranked-bot.mjs`, `tests/e2e_v06.py`
- Changed: `tests/{cards,run}.test.mjs` (intended expectation updates), `tests/e2e.py` (results-screen click-through, camera settle), `tests/sim.mjs` (handles events)

**Docs**
- `STATUS.md`, `HANDOFF-v0.6.md`, `CHANGED-FILES-v0.6.md`, `ARCHITECTURE.md`
- `docs/{SCORING-v0.6,RANKED-AND-SECURITY-v0.6,MIGRATION-v0.6}.md`

**Saves**
- Run v3 → v4; meta v4 → v5. `deepcutsedh.livingcard.*` keys are unchanged. The untouched pre-v3 copy is kept under `.pre-v3`.
