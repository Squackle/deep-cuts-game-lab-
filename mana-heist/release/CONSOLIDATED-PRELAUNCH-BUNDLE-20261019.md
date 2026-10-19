# Consolidated prelaunch feature bundle — Game Lab ONLY

**Date:** October 19, 2026. **Owner authorization:** “can you deploy the rest of the phases at once”. This permits a *coordinated build in the isolated Game Lab*, not pretending all P01–P15 acceptance gates are complete or copying Wizard/Scryfall assets to a public site. **Public release remains BLOCKED.**

## Bundled, tested functionality

### P05 partial — three-step state-verified hints
- A voluntary panel inside the existing optional Field Guide reveals **Hint 1** conceptual color-cost guidance; **Hint 2** a specific next legal action; **Hint 3** the complete replay-verified winning continuation from the **current actual game state**, not simply a stale solution from level start.
- Nothing is spoiled before an explicit click. Every completed path is replayed through `engine.actions/reduce`. The system tries a validated original-level certificate, then a **bounded** solver search on the real current position. If it cannot certify a finish, it states that truth and recommends Undo/Restart rather than inventing steps.
- User actions invalidate stale hints. No direct move/medal/engine mutation, and no claim routes are globally optimal. The concept hint describes true colorless distinct from generic where relevant.
- **P05 not fully accepted:** no controlled beginner-comprehension study, no independent multi-hour puzzle clarity audit and no route-optimality guarantee.

### P12 partial — optional reduced effects
- Campaign screen includes a **Reduce animated effects** setting, stored exclusively in `dc-mana-heist-reduced-effects-v1`. It gates fluid frame animation, mana flight orbits, optional cast-error/ward glow and CSS transitions while honoring operating-system reduced motion. The liquid remains a static, valid color depiction based on actual mana; game legality, timing for auto-cast and scores do not change.
- Does not add audio, claim 30–60fps performance, or fabricate tests on physical phones.

### P13 partial — no-account guest achievements
- Eight visual milestones are **derived** each time the campaign screen opens from the six existing guest save families. First win, 10, 50, 250, 500 scored vaults, 28 Learn Mana lessons, both optional bonus trials, and five changed galaxy remixes. No writes, badges on a public profile, server rankings or new account permission.
- Their status is inherently local and **not verified competitive proof**. Existing progress exports still include only original guest saves (unchanged).

### P14 preparation — verifiable scope ledger
- Test `node --test mana-heist/tests/*.test.mjs` including new `tests/consolidated-beta.test.mjs` for current-state certification, illegal route rejection, replay, user-only spoiler stages, score-only derived milestones, reduced-FX integration and 500/28/2 invariants.
- Existing manual nine-case device checklist and consent-only anonymized-on-export playtest records remain, untouched. **No new human results are inferred**. There is no basis to claim beta targets are met.

## Honest completion ledger for the 15 packages

| Package | This release status | Why it is not fully signed off |
|---|---|---|
| P01 Foundation/IP | **BLOCKED** | Owner/legal brand and real MTG-card-art usage decision outstanding |
| P02 Rule fidelity | **IN PROGRESS** | Core kernel usable, but no full Magic steps/phases or full Oracle audit; current game is deliberately simplified |
| P03 Solver/validation | **IN PROGRESS** | 500 stable puzzles with replay certificates; uniqueness, unintended shortcuts, empirical level balancing unproved |
| P04 Learning | **IN PROGRESS** | 28 unscored lessons; observed new-player mastery not validated |
| P05 Hints | **NEW PARTIAL BUNDLE** | Three-tier hints and verified current-state line; human instructional acceptance incomplete |
| P06 Foundations curriculum | **IN PROGRESS / NOT REVIEWED** | 50 existing Galaxy I levels; no 10-anchor human curation audit |
| P07 Color mastery | **IN PROGRESS / NOT REVIEWED** | 50 existing Galaxy II levels; comprehensive authored anchor review pending |
| P08 Complex lands | **IN PROGRESS** | Some revised Galaxy III boards, full human education audit incomplete |
| P09 Sequencing | **IN PROGRESS** | Some revised Galaxy IV boards, no full anti-shortcut curation |
| P10 Grand Heist | **IN PROGRESS** | Some revised Galaxy V boards; requires comprehensive proof/curriculum assessment |
| P11 Mobile/accessibility | **IN PROGRESS** | Keyboard, touch, manual checklist shipped, but no verified physical iOS/Android/screen-reader run |
| P12 Cauldron | **NEW PARTIAL BUNDLE** | Reduced FX added; audio/mute and true-device rendering performance still unresolved |
| P13 Progression/replay | **NEW PARTIAL BUNDLE** | Guest backups and derived milestones in Lab; account/leaderboard verification intentionally absent |
| P14 Beta | **PREPARATION ONLY** | No ~15–20 real testers, observation data or learning threshold evidence |
| P15 Public 1.0 | **BLOCKED** | G1–G3, P01 rights clearance, actual beta and separate website-team owner approval absent |

**The entire roadmap cannot truthfully be deployed as a completed public 1.0 simultaneously**, because some acceptance work is dependent on rights decisions and actual external people/devices. This bundle ships concrete non-blocked changes in a single isolated release, not a false sign-off. The user may separately authorize a public promotion only after those gates clear.

## Scope, rollback and QA limitations

- Files restricted to `mana-heist/**`, with no change to `lab/**`, Hive Run, Stackbreaker, main `deep-cuts-edh` website, Cloudflare D1, public profiles, production monetization, account storage, or owned art.
- No change to the rule engine `mh-landfall-0.2.0`, integrated `mh-mana-lab-2.0.0`, puzzle IDs, scenario costs, saves, or first 18 original levels; 500 scored vaults + 28 lessons + two bonus trials retained.
- Roll back by reverting the isolated Game Lab PR and redeploying the prior successful Lab SHA. The optional reduced-FX localStorage key becomes inert. All prior guest bests, archives, imports and manual QA persist unchanged.
- Source-level UI checks and Cloudflare HTML response do **not** substitute for human tap-through/browser interaction testing. A complete on-device QA pass must still be conducted and documented.
