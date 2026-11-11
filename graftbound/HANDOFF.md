# HANDOFF — GRAFTBOUND v0.5.0 → Game Lab (for the deploying agent)

Built in an isolated sandbox **without** GitHub, npm or Scryfall access. Nothing was committed, merged or deployed.
**The owner authorizes:** a branch, commits, a PR and a Cloudflare **preview**. **The owner does NOT authorize:** merging or deploying the v0.5 PR without explicit approval.

## 1. Branch
`game/graftbound-v0.5-overhaul` from the latest `main`. If `AGENTS.md` requires another naming convention, follow it.

## 2. Read first
Root `AGENTS.md`, `README.md`, `DEVLOG.md`, `docs/SHARED-GAME-LAB.md`, `docs/TEST-FIRST-RELEASE-POLICY.md`, `docs/MAIN-SITE-PROMOTION.md`, and the current `living-card/AGENTS.md` and `README.md` (from PRs #136/#137).

## 3. File changes (exact)
1. **Move** the game: `git mv living-card graftbound`, so git keeps file history.
2. **Overwrite** `graftbound/` with this package's `graftbound/` contents.
   - Merge any Game Lab rules from the old `living-card/AGENTS.md` into `graftbound/AGENTS.md`.
   - Keep any slot hook or metadata file the shared lab or its tests read (from #136/#137), adjusting its path to `graftbound/`.
3. **Re-create** `living-card/` with ONLY this package's `living-card/index.html` and `living-card/README.md` (the redirect stub).
4. **Catalog:** edit the EXISTING Game Lab catalog entry for the game (currently titled "The Living Card", or GRAFTBOUND after #137):
   - title → `GRAFTBOUND`
   - tagline → `Begin as nothing. Become everything.`
   - link/route → `/graftbound/`
   - description → "An HD-2D tactics RPG: begin as a blank 1/1 creature and graft real Magic cards into yourself across three acts."

   Do not add a second entry. Do not touch other games' entries.
5. **Route tests:** update any shared route/catalog test that expects `/living-card/` to expect `/graftbound/`, and keep a check that `/living-card/` redirects.
6. **Optional:** if (and only if) the repo already has a root `_redirects`, append the lines from `graftbound/_redirects-snippet.txt`.
7. **Do NOT modify:** Hive Run, Stackbreaker, Mana Heist (code, engines, tests), `functions/`, `db/`, the production DeepCutsEDH site, accounts, leaderboards, payments, D1 data, or the root `package.json` dependencies.

## 4. Tests (report actual numbers)
```bash
cd graftbound && npm test                         # expect: tests 79, pass 79, fail 0
cd .. && python3 -m http.server 8765 &            # from the repo root
LC_CHROMIUM=<path> python3 graftbound/tests/e2e.py   # expect 35/35 (sandbox run; see §7)
node --test <the repo's existing shared + other-game suites, exactly as documented>   # must remain green, unmodified
cd graftbound && node tools/verify-real-pool.mjs  # NEEDS NETWORK — fix or remove any card it flags, then re-run npm test
```

## 5. Cloudflare preview checklist
- `<preview>/graftbound/` shows GRAFTBOUND; begin → intro → battle; no console errors.
- `<preview>/living-card/?x=1` lands on `<preview>/graftbound/?x=1`.
- The catalog card says GRAFTBOUND and opens `/graftbound/`. The other three games still open.
- A booster shows real card images from cards.scryfall.io. Report any "Scryfall mismatch" console warnings verbatim.
- A CSP (if present) allows `connect-src https://api.scryfall.com` and `img-src https://cards.scryfall.io`.
- An existing v0.4 adventure in that browser continues (same origin, same keys) with a "v0.4 adventure continues" notice.

## 6. PR description must include
Summary · exact changed paths · test results · gameplay and visual changes · save-compatibility notes (`docs/MIGRATION-v0.5.md`) · preview URL · screenshots (`graftbound/docs/screenshots/`) · known limitations (`STATUS.md`) · rollback.

**Rollback:** revert the merge commit. `living-card/` then serves v0.4 again. v0.5 saves (run v3) would be refused by v0.4 and quarantined, not deleted. To return players to v0.4 without loss, restore `deepcutsedh.livingcard.run.pre-v2` (kept automatically on first v0.5 load) or keep v0.5 live.

## 7. Sandbox evidence & caveats
- SwiftShader software WebGL runs at ~3 fps on phone viewports, so the e2e suite waits for CSS transitions to settle.
- Earlier in this session, hover/touch checks were flaky because HUD elements covered tiles; the suite now targets uncovered tiles.
- Nothing was tested on physical devices, Safari or Firefox.
