# Status — GRAFTBOUND v0.6.0 (local build; not merged, not deployed)

Built on the **actual PR #138 source** (Game Lab `game/graftbound-v0.5-overhaul` @ `e784fc7507daddec6556a2c151c21cbdbb5318b8`), recovered from GPT's verified text bundles. Nothing has been committed to GitHub, because this sandbox has no GitHub or network access.

## Done in v0.6

1. **Auto-End Turn.**
   - `src/engine/legal.js → getLegalPlayerActions / shouldAutoEnd` reuses the engine's own move, attack, cast and interact rules.
   - It never fires while busy, while targeting, during the enemy turn or after a win, and has a 25-turn safety valve.
   - On by default (setting). Not counted as an action.
2. **Subtle wind.**
   - Anchored canopy sway in the sprite shader (displacement ∝ height², per-plant phase, tiny amplitudes). Rigid things never sway.
   - A sparse, consistent breeze per act: pollen and leaves in the Hollow, rising ash in the Warrens, motes in the Nexus.
   - Off with reduced motion or the Ambient setting.
   - Not done: a heat-shimmer post effect.
3. **13 distinct spell animations.** New: Shock (fast crack), Flame Slash (crescent blade), Healing Salve (droplets), Giant Growth vines. Lightning Bolt keeps its 5-phase sequence. A dev gallery (`dev/vfx.html`) lists every spell by name.
4. **Evolution presentation.**
   - Fliers levitate.
   - Attack style follows abilities: Deathtouch venom trail, heavier Trample impact, a visible second Double Strike lunge, and a Lifelink stream back to you.
   - The graft sequence now notes the journal entry.
   - Not done: **the sprite art itself is unchanged programmer art.** No new body shapes, horns or silhouettes were drawn.
5. **Multi-phase bosses** (66% / 33% health thresholds, each announced once with a name):
   - **Thornmother:** briars sprout around ground builds, and she summons archers against fliers.
   - **Pyre Matron:** a Harpooner against spell-heavy builds, more lava, and lava during her breath in phase 3.
   - **The Unwritten:** Redaction temporarily suppresses one of your abilities for exactly one turn, every other cycle. It is never permanent.
6. **Special encounters** (`src/engine/events.js`): Wandering Archivist, Graft Exchange, Cursed Well and Forgotten Trial.
   - Deterministic, one-time, with explicit costs; Graft Exchange shows exactly what you lose before you confirm.
   - 1–2 Mystery nodes per act, placed with a separate RNG so the battle/elite/shrine layout is untouched.
7. **Evolution Journal:**
   - current creature with stats, abilities, traits and stage
   - chronological graft history (active or released, act/node)
   - spellbook and a timeline of milestones
   - before/after sprites rebuilt from data (no images stored)
8. **Interactive terrain:**
   - Crystals: attune for +2 mana, or a lightning strike within 1 tile makes one discharge 2 damage to every foe within 1 tile. Each works once.
   - Fire burns brambles, and frost hardens lava for 2 rounds.
   - Enemies refuse paths whose hazards would kill them.
   - All numbers live in `src/data/terrain.js`.
9. **Universal inspection:**
   - Every tile explains itself on hover, keyboard cursor, or first tap on mobile, with live values.
   - Hazard paths need a confirming second click or tap, with predicted damage (shield-aware, flags lethal paths).
   - HUD stats, status chips, map nodes and event choices all carry tooltips.
10. **Scoring and Ranked Expedition (Game Lab side):** the brief's formula, a fixed challenge, a replay recorder, local verification, a parchment results screen and local personal records. Everything is labelled LOCAL/UNRANKED. See `docs/SCORING-v0.6.md` and `docs/RANKED-AND-SECURITY-v0.6.md`.

## Tests (this sandbox: headless Chromium + SwiftShader; NOT real devices)

| Suite | Result | Notes |
|---|---|---|
| `npm test` | **109/109** | 79 existing (3 assertions updated on purpose: run version 4, Shock's VFX id `shock`, e2e run version) + 30 new |
| `tests/e2e.py` (v0.5 browser suite) | **35/35** | Win helper now clicks through the new results screen |
| `tests/e2e_v06.py` | **20/20** | |
| Main-site `tests/graftbound-api.test.mjs` | **8/8** | Run against an in-memory SQLite D1 shim |

## Balance

The naive bot over 16 seeds (`tests/_probe.mjs greedy`): full-adventure wins went from **31% (v0.5) to 25% (v0.6)**. Most deaths are still at the Act I elite and the Thornmother. Directional only; human playtests decide.

## Not done / limitations

- **Real-card facts are still not checked against Scryfall** (no network). Run `node tools/verify-real-pool.mjs`.
- Ranked play in the Game Lab is a **local preview only**. The authenticated ranked page on the main site is **not built**. Only its API, database setup, server-side score checker and My Profile section are prepared, in a separate deep-cuts-edh package.
- No real-device, Safari or Firefox testing; no deployment.
- Sprite art and the heat shimmer are not upgraded (see items 2 and 4).
