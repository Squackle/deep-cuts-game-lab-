# Mana Heist · optional local playtest notes and mobile mana-choice usability

**Game Lab only · October 19, 2026 · Scoped P03/P11 evaluation tooling, not 1.0 acceptance.**

## Purpose and observed problem

The 500 vaults use reproducible **structural difficulty heuristics**, not measured player success rates. The owner asked to proceed from the last release's next step of *playtest difficulty and mobile usability*. This package does **not** fabricate user sample data or silently retune difficulty scores. Instead it adds an entirely voluntary, local-only method for collecting *future* first-party playtest feedback, while making narrow-screen mana choices easier to reach and navigate.

## What changes

- **Consent off by default.** The campaign screen displays a collapsible **OPTIONAL PLAYTEST NOTES · ON THIS DEVICE ONLY** section. A checkbox explicitly enables local aggregate counts. If disabled later, no more attempts are captured; existing counts remain until explicitly cleared.
- With consent, the active puzzle session counts **attempts, wins, exits, restarts, Undo moves, unsuccessful Cast actions and elapsed seconds**. A win also offers a single **optional 1–5 perceived difficulty rating**. No timing data, player identity, email, IP, browser identification, precise location or move history is exported; the locally stored records contain only **puzzle ID + rules revision** and aggregate totals.
- The user can **COPY LOCAL REPORT** themselves. If clipboard access fails, the JSON is shown in a selectable text box. This game does not transmit, fetch or upload a report automatically. **CLEAR PLAYTEST NOTES** asks for confirmation and leaves every existing campaign/lesson/bonus/local-medal save untouched.
- **Mobile mana-ability choice sheet** becomes viewport/safe-area bounded, independently scrollable and uses >=44px buttons. The sheet moves focus to Cancel when opened, retains keyboard Tab cycling and returns focus after closing, preserving tap-to-play cards and Undo.
- No rules engine, card identities, scenario, autoward behavior, old scores, stage IDs or official 1.0 rights gate changes. Pure metric/normalization functions and dedicated localStorage keys: `dc-mana-heist-playtest-v1`, `dc-mana-heist-playtest-optin-v1`.

## Evidence/QA

- `node --test mana-heist/tests/*.test.mjs` and `node --check mana-heist/src/main.js`, plus the Unified Game Lab suite.
- New `tests/local-playtest-mobile.test.mjs` checks opt-out default, explicit event counting, 1–5 rating cap, invalid record rejection, stage *revision isolation*, no identifying fields/action histories/network calls in exporter, and responsive focus/touch CSS.
- Cloudflare branch preview and post-merge deployment verification required for every release.
- **Not claimed**: any real player difficulty measurements, representative sample, empirical balance, physical iPhone/Android tap testing, cross-browser device testing or formal accessibility audit. Physical hardware and human usability testing are still required before asserting their acceptance criteria are complete.

## Data minimization limitations

LocalStorage is browser-local and not encrypted. This is **not** authenticated or authoritative performance measurement. Counts can be altered by the player and are not verified score records. Users should only voluntarily copy/share reports with people they trust; do not ingest reports into production analytics without separate privacy review and authorization. Elapsed seconds are clock-based estimates per play attempt (capped) rather than active engagement time, and difficulty reports reflect only opt-in respondents. Opting out does not delete existing local notes; use the separate clear control for that.

## Rollback

Revert the Game Lab PR and redeploy the prior Cloudflare SHA. The two new playtest storage keys may remain inert until re-enabled, without affecting any gameplay save namespace. None of the existing scores, progress, and rev3/rev4 archives is changed. No database or backend migration, and no public Deep Cuts EDH promotion. P01 rights/brand clearance remains BLOCKED.

## Next decision

After enough **actual voluntary** device reports arrive, review aggregated per-vault completed attempts, resets, failed Cast frequency, elapsed time and voluntary difficulty ratings. Choose a minimum sample size and opt-in bias disclosure *before* calibrating any score or editing any puzzle, with new puzzle revisions and separate medals if the board/rules change.
