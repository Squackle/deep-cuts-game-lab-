# GRAFTBOUND — Deep Cuts Game Lab · `/graftbound/`
*Begin as nothing. Become everything.*

An HD-2D tactical RPG. You begin as **The Blank**, a powerless 1/1 creature. After each victory you open a booster of three **real Magic: The Gathering cards**, adapted to GRAFTBOUND's own rules.
- **Graft** a creature: its printed power, toughness and abilities add to yours, and your pixel-art body visibly changes.
- **Inscribe** a spell: it reaches any foe on the battlefield.

The adventure has three acts: **The Forgotten Hollow**, **The Ashen Warrens** and **The Fractured Nexus**. That's 24 nodes and three seed-selected bosses (one of two real legends per act).

> **Game Lab release candidate: v1.2.6-beta.** The canonical playtest destination is [Game Lab /graftbound/](https://deep-cuts-game-lab.pages.dev/graftbound/) after this version is merged and deployed from this repository's `main`. Draft-branch URLs are previews. This is not a main DeepCutsEDH Arcade release. Formerly *The Living Card* (`/living-card/`, which redirects here). See `HANDOFF.md` and `GPT-DEPLOY-INSTRUCTIONS.md` for active beta limitations and release steps.

## Run
```bash
# from the Game Lab repo root
python3 -m http.server 8765        # open http://localhost:8765/graftbound/
```
No build step and no runtime dependencies. Needs WebGL2.
Dev URL options:
- `?gfx=high|balanced|performance`
- `?anim=normal|fast|instant`
- `?live=0` (no Scryfall)

## Test
```bash
cd graftbound
npm test                         # unit + rules + balance + rendering-geometry + route tests (Node 20+)
node tests/sim-report.mjs        # balance matrix (docs/BALANCE-v0.5.md)
python3 tools/build_assets.py    # rebuild all original pixel art deterministically
python3 tests/e2e.py             # browser flows; serve the repo root on :8765 first (Playwright + Chromium; LC_CHROMIUM=path)
node tools/verify-real-pool.mjs  # NEEDS NETWORK: checks every bundled real card against live Scryfall
```

## Dev pages
- `dev/floor.html?before=1|0` reproduces the v0.4 floor bug next to the fix.
- `dev/vfx.html?fx=lightningBolt&auto=1` shows the spell VFX library.

## v1.2.5-beta feedback update

Expanded 68-creature / 21-spell real-card pool, visible rarity labels, Inscribed Page draw tile, distance-free chain lightning, replayable X-cost Drain Life, Krenko Goblin tribe fix, attached gear card previews, revised achievements, distinct spell/death VFX, tactical scaling caps and face-anchored Mask of Memory. See `docs/V125-OWNER-FEEDBACK.md` for the exact rules, test gates and beta limitations.

## v1.2.6-beta — premium rewards and living Magic card triggers

- Real rarity-first loot tables (tier-weighted; Elite: minimum Uncommon, Boss: minimum Rare when eligible). New reviewed Rare/Mythic creatures and meaningful graft triggers; original Etched/Masterwork cosmetic overlays are independent of card rarity, **not** official Magic printing treatments.
- Library (concealed back) and Graveyard (most recent face-up) in the battle HUD, cancellable card flights, automatic reduced-motion support; the actual deck/replay remains authoritative.
- Wurmcoil Engine replaces Combustible Gearhulk and its obsolete opponent-hand simulation, with tested two-Wurm death behavior; the Scarab God retains a transparently adapted foresight/reanimation mechanic.
- Spellcasting Channel Reserve stores up to 2 mana and 2 spell charges across turns within each encounter; enhanced Shock and level-aware spell presentation.
- Final act boss awards a skippable victory celebration and run statistics, **no final pack**. Saves migrate additively and prevent duplicate completion stats.

See `docs/V126-PREMIUM-REWARDS-RELEASE.md` for tests, simulation results, limitations, and rollback.
