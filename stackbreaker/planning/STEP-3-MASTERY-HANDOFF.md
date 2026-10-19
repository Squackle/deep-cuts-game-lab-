# Stackbreaker Roadmap — Step 3 Mastery Ledger

**Status:** IMPLEMENTED ON FEATURE BRANCH, pending unified CI + release coordination + exact Cloudflare Game Lab deployment. Do NOT mark roadmap Step 3 checked until verified.

**Owner authorization:** 2026-10-19 “next” after Step 2 completed. This authorizes **Step 3 only**, not Step 4 cosmetic equipment, new Magic rules (Steps 5–8), authenticated profiles and D1 (Step 9), or public website promotion.

**Branch:** `game/stackbreaker-mastery-ledger-step3-20261019`; **tracking:** [issue #96](https://github.com/Squackle/deep-cuts-game-lab-/issues/96). **PR:** include PR link in issue #96 on creation.

## Implementation
- `data/mastery-catalog.json`: **24 achievement definitions** with stable Step 1 contract IDs. Exactly **15 locally eligible**, 6 future advanced-rule gated and 3 future **server-verified Daily** gated. Rewards (title, frame, spell color) are *descriptions only* until Step 4; no equipping this step.
- `src/mastery.js`: Pure semantic event generator from **actual before/after rules-engine state**, independent of VFX. Event types include action accepted, priority passed, spell cast, ability activated, mana tapped, land played, stack object resolved, actually countered spell (removed target), permanent entering/moving zones, protection newly granted, stats changed, life delta, and objective genuinely completed. Events are deterministic per transition and never created by graphical FX.
- Winning Classic puzzle transitions record one **distinct scenario ID and revision**, best stars and real mechanics encountered during winning runs. Milestone metrics count unique completed cases, never raw repetitive stack casts or VFX replays. World complete means ten unique cases in that world; each of five galaxies requires one completed world. `clean` records no hints/undo *in that winning run*. Undo restores prior transition journal and permanently marks the run unclean; restarting begins a fresh run. Re-solving a case can update best performance, but cannot add another distinct puzzle.
- `src/ui.js`: connect the journal to normal Classic `pushState`, explicitly **exclude Daily scored/practice** from this local Classic ledger. Mastery restores from `dc-stackbreaker-mastery-local-v1`, separate from `dc-stackbreaker-progress-v3`, `dc-stackbreaker-last-level`, and `dc-stackbreaker-daily-local-v1`. Shows one-time local achievement toast on unlock.
- `template.html` + `observatory.css`: accessible expandable "Stackbreaker Mastery" list with all 24 progress bars/statuses and explicit **LOCAL / UNVERIFIED** disclaimer. Advanced and Daily-only milestones display why locked. No site profile rewards, authenticated account claims, equipment UI or database writes.
- `build.py` and regenerated standalone `index.html`: embed catalog and ledger module before `src/ui.js`.
- `tests/mastery.test.mjs`: genuine rules-engine Counterspell, Selfless Spirit protection, Healing Salve, no false uncounterable counter, idempotency, clean-vs-hints/undo, ten distinct wins/world, future lockouts, isolated persistence, panel and build parity.

## Known constraints
- Local browser storage is user-editable, and these achievements are **not verified rewards**. No mechanism to authenticate users, tamper-proof achievements or export them as official Deep Cuts EDH profile bling until a separately authorized website integration.
- No retroactive proof available for past Classic stars; **existing stars are preserved**, but mastery tracks new actual winning runs **starting with this feature**. Step 4 may add locally equipped visuals; Step 9 verified sync must replay from trusted data, not adopt arbitrary browser ledger claims.
- Current advanced `sb-mtg-training-0.4.0` and verified Daily credentials **do not exist**: their 9 achievement types must remain locked.
- All changes under `stackbreaker/**`, legacy 250 scenarios and rules engine untouched, no other Game Lab lanes, website site or production D1 changes.
- Complete tests/coordination, browser smoke at mobile 390 / desktop 1280 where available, Cloudflare preview, merged exact SHA production deployment, and update issue #96 **Step 3 only**. Stop until owner requests Step 4.
- Rollback: revert Step 3 PR. Independent local mastery storage key may remain in browsers harmlessly; existing campaign/Daily progress untouched.
