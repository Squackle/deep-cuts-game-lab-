# Status — GRAFTBOUND v0.4 (2026-11-12)

## Milestone history
- v0.1–v0.2: engine, vertical slice, HD-2D WebGL2 renderer, sprite pipeline, layered evolution.
- v0.3: real Magic cards by default, creature-type traits, armor layer, Briar Hexer, boss mechanics, threat-scaled reinforcements.
- **v0.4 (this session):** sandbox reset, so v0.3 was restored and verified exactly (84/84 unit tests; balance simulations reproduced v0.3's figures to the decimal; asset counts identical). Then the **GRAFTBOUND** identity:
  - Title screen logo with an original sigil, the tagline, page title and metadata, and a favicon; branded loading screen, booster pack, card backs, map header, pause menu, character sheet and end screens ("The Graft Unravels" / "The Heartwood Falls").
  - New **adventure introduction** (full the first time, brief afterwards; skippable with Enter or Space); timer-driven reveal so text can't stay hidden on slow devices.
  - Player-facing verbs: "Graft", "Grafts" history, "Creatures grafted".
  - Internal directory, route and save keys unchanged (`living-card`).

## Verified (sandbox: headless Chromium + SwiftShader; not physical devices)
- Unit tests: 84/84.
- Browser: full acceptance flow (Blank 1/1 → battle → booster → graft 2/2 deathtouch → 3/3 + visual change → deathtouch kills a 50-health foe → save/reload), intro, branding (no "Living Card" in player-facing text), spellbook, invalid actions, restart, touch, and layouts at 320/375/390/768/1280.

## Placeholder / not verified
Programmer pixel art (sprites, layers, terrain); live Scryfall; real devices.

## Next milestone (v0.5)
Combat feel and visual quality: per-element spell VFX (fire, venom, frost, radiant), hit-stop and sprite squash on impact, a stronger staged evolution sequence (silhouette pulse → layer reveal), and a pass on enemy sprite detail.
