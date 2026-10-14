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
