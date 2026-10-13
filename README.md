# Deep Cuts Game Lab

**Status:** Repository created and documentation imported; no playable build or Cloudflare test deployment has been created.

A separate GitHub repository for experimental browser games associated with Deep Cuts EDH. It is intentionally independent of the existing `Squackle/deep-cuts-edh` production website.

## First project: Sliver Swarm (working title)

A mobile-first, Snake-inspired, retro fantasy arcade survival game. Grow a hive, collect brood, select mutations, survive increasingly difficult arenas, and chase high scores.

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
3. Develop a small playable **v0.1** that runs locally and in a browser.
4. Connect a separate Cloudflare Pages test site once it exists; never assume a deployment is successful without checking it.
5. Iterate from real mobile playtesting, then consider linking from Deep Cuts EDH's Daily Games page.

**Potential test URL only:** `https://deep-cuts-game-lab.pages.dev/` — **not yet created or verified**. Final Cloudflare project name and URL to be recorded after setup.

## How to keep this log useful

Each substantive session should append a dated `DEVLOG.md` entry covering the goal, decisions, changed files, tests, known problems, and the next task. Major design changes should also update the corresponding document and decision register. Do not silently overwrite earlier decisions; record what changed and why.