# Deep Cuts Game Lab

**Status:** PLAYABLE TEST BUILD v0.1 IS LIVE. Arcade core deployed on a separate Cloudflare Pages project; mutations, enemies and bosses remain planned.

A separate GitHub repository for experimental browser games associated with Deep Cuts EDH. It is intentionally independent of the existing `Squackle/deep-cuts-edh` production website.

## First project: HIVE RUN (playable prototype for Sliver Swarm concept)

A mobile-first, Snake-inspired, retro fantasy arcade survival game. The current build includes brood collection, growing hive, collision survival, high scores, pause/restart and original pixel-drawn art. Mutation choices and enemy stages are future features.

> **IP note:** “Sliver Swarm” is a provisional name connected with Magic: The Gathering. The game must use original names, designs, sprites, sound, and lore unless Wizards of the Coast provides permission for actual MTG characters or assets. Being free or pixelating official art does **not** automatically grant reuse rights. See `docs/DECISIONS_AND_RISKS.md`.

## Documentation index

- [`DEVLOG.md`](DEVLOG.md) — dated development log and history; update this after each development session.
- [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) — vision, controls, gameplay, systems, stages, modes, UI.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — milestone checklist and acceptance criteria.
- [`docs/TECHNICAL_PLAN.md`](docs/TECHNICAL_PLAN.md) — planned web architecture and repository layout.
- [`docs/DECISIONS_AND_RISKS.md`](docs/DECISIONS_AND_RISKS.md) — confirmed preferences vs. proposals, open decisions, IP and licensing.
- [`docs/PLAYTEST.md`](docs/PLAYTEST.md) — QA checklist and feedback format.

## Planned development process

1. **Done:** Create independent [`Squackle/deep-cuts-game-lab-`](https://github.com/Squackle/deep-cuts-game-lab-) GitHub repository (actual name includes the trailing hyphen).
2. **Done:** Commit the dev log, design, roadmap, risk decisions, architecture and QA notes as the source of truth.
3. **Done:** Implement mobile-first playable v0.1 and ten automated arcade engine checks.
4. **Done:** Connect independent Cloudflare Pages and verify the game live on mobile browser sizes.
5. Iterate from real mobile playtesting, then consider linking from Deep Cuts EDH's Daily Games page.

**LIVE TEST SITE: https://deep-cuts-game-lab.pages.dev/** (Cloudflare Pages project `deep-cuts-game-lab`, auto-deploys from the separate repository's `main` branch). This is a prototype test build, not a polished release.

**Run tests:** `npm test` using Node.js 22+. CI runs checks on game code changes.

## How to keep this log useful

Each substantive session should append a dated `DEVLOG.md` entry covering the goal, decisions, changed files, tests, known problems, and the next task. Major design changes should also update the corresponding document and decision register. Do not silently overwrite earlier decisions; record what changed and why.

## Creature art — WUBRG concept sheet (v0.1.3)

The approved original 1312×1199 concept poster is preserved in the user's ChatGPT Library at `/Deep Cuts Game Lab/Hive Run - WUBRG Creature Concept.png`. The **game uses artwork sampled and pixel-reduced from that exact poster**, packed as a small self-contained indexed sprite module (`src/creature-sprites.js`) rather than loading the multi-megabyte poster at runtime. It includes 45 WUBRG body variations, the one-armed pointed head, and forked tail. The gallery on the live game page previews all 45, and gameplay draws those same sprites. The fallback procedural renderer is retained for browsers without `DecompressionStream`. See `docs/ART_DIRECTION.md`.


## Level 01 — The Hatchery

The first environment now uses the original Gothic Alien Hive artwork, optimized to a ~12 KB WebP and rendered beneath the moving creature and brood in `src/level-background.js`. The original full-resolution PNG is preserved in ChatGPT Library at `/Deep Cuts Game Lab/Hive Run - Level 1 Hatchery Background.png`. It is a real image, not a conceptual placeholder. Stage numbers currently increase movement speed; future levels and arenas will introduce new maps when built. The old grid remains a loading/error fallback.


### Hatchery pickup readability (v0.1.5)

The Level 1 art is intentionally dimmed more than before (36% global veil plus edge fades). Brood collectibles now use a high-contrast illuminated, outlined amber orb drawn by `src/pickups.js`. This addresses the user-reported issue of pickups blending into the ornamental hatchery egg clusters.


## Original Hatchery Theme (v0.1.6)

Music is **opt-in** via the separate `MUSIC` button, and the setting is remembered on that device. All musical notes and synthesized percussion are authored in `src/soundtrack.js` and produced locally with Web Audio, so the game needs no external sound files or licensing. The melody continues across an eight-bar sequence, pauses cleanly with gameplay, and stays off when a tab is backgrounded. Sound effects remain independently selectable. Full five-color mutation gameplay belongs to Alpha 0.2 and is **not yet implemented**.


## Alpha 0.2 — Evolution & Mutations

Every five brood, the game pauses for a touch-friendly three-card WUBRG draft. Choose one of the five working abilities: White (impact shield), Blue (time-slow), Black (shed three segments on fatal collision), Red (faster speed and 2× pickup scoring), or Green (bonus segment for four brood). The HUD shows acquired powers and active charges/timers, and WUBRG visual effects surround the actual moving creature. The original soundtrack pauses during choices. All updates remain in this isolated Game Lab site; new levels and enemies will follow in a later release.


## Original enemy, miniboss and boss themes (Alpha 0.2.1)

The existing original 108 BPM Hatchery Theme is now joined by three new tracks: **Skitter Chase** (normal enemy, 124 BPM), **Stalker's Pursuit** (miniboss, 142 BPM), and **Warden of the Hive** (boss, 156 BPM). Every track is a locally synthesized original composition in the single src/soundtrack.js module; there are no downloaded audio files, samples or added dependencies. Try the four preview buttons in the Game Lab music panel. All music requires a deliberate user click/tap. Automatic encounter transitions will be connected when the separately designed enemy AI/boss update ships. The existing main Deep Cuts EDH site is unaffected.


## Alpha 0.3 — PREDATOR HUNT + server-replayed leaderboard

The playable Hatchery now has moving Skitters and Burrow Runners. Each makes continuous scheduled grid moves, picks escape routes with a bounded flood-fill path planner, and earns the player a capture only when forced into their living body wall. Kills award 3 evolution energy; rare orbs appear after about 20–32 seconds of active play and award 1; 5 energy opens the familiar 3-choice WUBRG draft. Red doubles score, never evolution energy. Green boosts growth from captures and orbs. The 108/124 BPM Hatchery and Enemy Hunt themes switch when entering/leaving play; miniboss and boss compositions remain previews until their gameplay ships.

**Leaderboard:** Cloudflare Pages Function `functions/api/leaderboard.js` uses a dedicated D1 `HIVE_DB` binding (SQL source in `db/leaderboard.sql`). Server creates one-time seeded runs and independently replays all player turns and mutation choices before accepting final results. Only finished runs can enter the top 25. The game remains playable in practice mode if the API is unavailable. Profile handles, if entered, link to real public Field Network profile URLs but are **unverified self-reported links**, not impersonation-safe account ownership. Rules replay limits simple score manipulation but cannot establish that input came from a human. The production Deep Cuts EDH repository was not edited.

**Merge guide:** `docs/MAIN_SITE_MERGE.md`. All game files are portable into `/games/hive-run/` with relative assets/API paths; identity verification requires a future main-site endpoint with owner approval.


## Alpha 0.3.1 — Predator speed adjustment

Skitter and Burrow Runner now take **one grid step every four player simulation steps**, compared with every two before this update. Player movement and controls are unchanged. Because this affects difficulty and submitted score comparability, the ranked leaderboard uses rules version `hive-0.3.1`; historical `hive-0.3.0` results remain stored separately rather than mixed into the adjusted leaderboard.

## Alpha 0.3.2 — Immersive game-page layout

The public game UI no longer displays its pixel-art codex, GitHub/roadmap/devlog shortcuts or soundtrack preview/testing panel. Original music still plays automatically during its appropriate game state if enabled, and the Music toggle works separately from sound effects. Soundtrack regression tests remain in CI. A one-square-radius Hatchling Ward and dramatically scaled music intensity from Levels 1–4 are future ideas, not present gameplay.


## Alpha 0.3.3 — Game Only mode

Tap **⛶ GAME ONLY** in the arcade header to isolate the game in the visible viewport, including score, WUBRG status, swipeable Canvas, Pause, Restart, Sound/Music, and directional buttons. It prevents accidental page scrolling from downward swipes on mobile. Exit using **↙ EXIT GAME ONLY** or keyboard Escape to return to the leaderboard and rest of the page, restoring scroll position. Uses real browser fullscreen where supported and an iPhone-compatible CSS fixed-viewport fallback otherwise. Game scoring and leaderboard rules do not change.


## Alpha 0.4 — The Burrow Uprising

**Minibosses now playable:** Burrow Stalker arrives at the second evolution, Tunnel Weaver at the sixth, with repeating Stalker/Weaver encounters on later milestones. Each must be trapped **twice**; only the final capture pays +5 EV/+750 base score/+2 growth. Stalker marks a safe tile five grid steps away and burrows after a warning every charged 10s; Weaver creates an individual one-square web every 10s (15s lifetime), stopping the player for 2s if triggered. Bosses and player are both protected/frozen during web stun so the effect cannot force an unavoidable death. Both are styled using original 20x20 hand-authored pixel art, centered beneath a chunky 64px weathered-ochre charge ring in the arena's upper-right. Three-choice WUBRG drafts, full-screen Game Only, mobile swipe and score replay all remain. Separate season `hive-0.4.0` preserves prior rankings for historical comparison. Full three-phase bosses are planned for the next milestone.


## Alpha 0.4.1 — Player movement balance

Owner playtesting found Alpha 0.4 slightly too fast. The starting movement interval increases **135 → 150 ms per grid step**, which means **about 10% fewer player moves per second**. Later evolution speed scaling retains the existing 4-ms-per-two-evolution progression, but its fastest base speed is raised from **94 → 105 ms per step** (also around 10% fewer moves per second). Regular enemy step intervals (Skitter/Runner 4 player ticks), miniboss powers, WUBRG mutations, controls, music, touch controls and Game Only are unchanged. The leaderboard simulation uses `hive-0.4.1`, separating the balanced run rankings from older `hive-0.4.0` scores while retaining historical entries in D1. The main Deep Cuts EDH site remains untouched.

**Ability ownership:** Only miniboss enemies currently cast unique signature powers (Burrow Stalker burrows; Tunnel Weaver places webs). Regular Skitters and Burrow Runners have movement AI, not activated abilities; the player's powers come solely from five WUBRG mutations. Full bosses will receive their own exclusive signature abilities when implemented in a future update.
