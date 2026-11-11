# HANDOFF — GRAFTBOUND v0.4 → Game Lab slot `living-card/` (for the deploying agent)

Built in an isolated sandbox **without** GitHub, npm or Scryfall access. Nothing was committed or deployed.

## 1. Branch
Create `game/living-card-graftbound-v0.4` from the latest Game Lab `main`.

## 2. Files
- **Replace the contents of** `living-card/` with this package, **but first read and preserve** the existing `living-card/AGENTS.md` and `living-card/README.md` from PR #136. If they have Game Lab-specific rules, merge them into this README rather than overwriting.
- **Do not** create `/graftbound/`, redirects, or catalog changes. **Do not touch** `lab/`, `mana-heist/`, `stackbreaker/`, Hive Run root files, `functions/`, `db/`, `.github/`, the root `package.json`, or `Squackle/deep-cuts-edh`.
- The catalog entry still says whatever PR #136 set. Renaming it to GRAFTBOUND is a **coordinated** follow-up, not part of this change.

## 3. Tests & expected results
```bash
cd living-card && npm test                     # tests 84, pass 84, fail 0
python3 living-card/tests/e2e.py               # (server at :8765 from repo root) expect 38/38 (real cards)
LC_QUERY="&cards=original" python3 living-card/tests/e2e.py   # expect 37/37
node --test tests/*.test.mjs stackbreaker/tests/*.test.mjs mana-heist/tests/*.test.mjs   # existing suites, unchanged
```

## 4. Cloudflare Pages
Static, no build, no env vars or secrets. Runtime network: `api.scryfall.com` (JSON, cached, ≥110 ms apart) and `cards.scryfall.io` (images, hot-linked, unmodified). If a CSP exists, allow `connect-src https://api.scryfall.com` and `img-src https://cards.scryfall.io`. Verify on a **preview** deployment only.

## 5. Check after the preview deploy
1. Title shows GRAFTBOUND and the tagline; browser tab title is GRAFTBOUND.
2. A booster shows real card images, and the console has no "Scryfall mismatch" warnings.
3. Play the tutorial on a phone: intro → battle → graft the 2/2 deathtouch → 3/3 with a venom-spotted sprite.

## 6. Unverified
Live Scryfall, physical devices, Safari/Firefox, and the repo's own `AGENTS.md` / `docs/*` conventions (not readable from the sandbox).

## 7. Known test-harness flakiness
In the sandbox (SwiftShader software WebGL at ~1–2 fps), Chromium occasionally dropped the **first injected touch tap** of the touch battle in 2 of 5 full runs. The game logic was verified separately in isolated runs. The check now retries only until the game has demonstrably received the first tap, then still asserts the two-tap confirmation, and it prints diagnostics if it fails. Verify on a real phone.
