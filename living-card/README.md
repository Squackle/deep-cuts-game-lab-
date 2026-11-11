# GRAFTBOUND — Deep Cuts Game Lab (internal slot: `living-card/`)

*Begin as nothing. Become everything.*

An HD-2D tactical RPG. You begin as **The Blank**, a powerless 1/1 creature. After each victory you open a three-card booster of real Magic: The Gathering cards, adapted to this game's rules. **Graft** a creature into yourself (its power, toughness and abilities add to yours, and your pixel-art body visibly changes) or inscribe a spell into your spellbook.

> Status: **v0.4 Game Lab playtest build.** The directory, route (`/living-card/`) and localStorage keys (`deepcutsedh.livingcard.*`) intentionally keep the original internal name. See `HANDOFF.md`.

## Run
```bash
# from the Game Lab repo root
python3 -m http.server 8765
# open http://localhost:8765/living-card/
```
There is no build step and there are no runtime dependencies. It needs WebGL2.
Dev URL overrides: `?gfx=high|balanced|performance`, `?anim=normal|fast|instant`, `?cards=reference|original`, `?live=0`.

## Test
```bash
cd living-card
npm test                          # 84 unit tests (Node 20+)
python3 tools/build_assets.py     # rebuild all pixel art deterministically
python3 tests/e2e.py              # browser flows (server on :8765 from repo root; Playwright + Chromium; LC_CHROMIUM=path to override)
LC_QUERY="&cards=original" python3 tests/e2e.py
```

## Dev tools
`dev/bench.html` (HD-2D benchmark scene) · `dev/evolution.html` (evolution sprite gallery) · `tools/preview_real_cards.py` (booster with **mocked** Scryfall data) · `tools/shot.py`.


## Game Lab integration rules (preserved from PR #136)

- The route remains `/living-card/`; this is a separate, unranked Game Lab prototype, not the production DeepCutsEDH Arcade.
- Read root `AGENTS.md`, `docs/SHARED-GAME-LAB.md`, `docs/TEST-FIRST-RELEASE-POLICY.md` and the existing `living-card/AGENTS.md` before editing. Keep all GRAFTBOUND code, assets, and tests inside `living-card/**` and use scoped `game/living-card-*` branches.
- Do not edit Hive Run, Stackbreaker, Mana Heist, the shared `lab/**` catalog or CI, the production site, accounts, ranked scores, subscriptions or D1 without separate authorization.
- Local Lab save data is not an authoritative user identity or public leaderboard. A Lab release does not authorize production promotion.
- Prior Scryfall-backed experiments are not blanket licenses to distribute Wizards/Scryfall content in new games; retain the original-art and replaceable-data boundaries and review rights before any production promotion.
