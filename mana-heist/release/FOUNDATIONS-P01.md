# P01 — Release Foundations: scope, decisions, gates and handoff

**Package:** P01 / 15 · **Workstream:** Game Lab · **Date:** 2026-10-15
**Status:** IMPLEMENTED IN LAB, **BLOCKED ON RIGHTS/BRAND OWNER DECISION** for complete P01 sign-off. All technical inventory documents may be deployed; this does **not** authorize public promotion, commercial use, removal of existing prototype features, or P02.
**Baseline SHA:** `1f3502c33c8ecb86159d83e3377968993e0b3c1d`
**Rules engine:** `mh-landfall-0.2.0` (UNCHANGED)
**Current preview:** `https://deep-cuts-game-lab.pages.dev/mana-heist/`
**Package scope:** documentation, audit registry and automated baseline assertions only. No gameplay changes, no new storage/network calls, no production website edits.

## Product boundary and release promise

**Positioning:** "Master mana resource decisions, one puzzle at a time." Focused, browser-playable learning puzzle for newcomers to lands, mana costs, generic/colorless and turn sequencing, and intermediate players improving multicolor land decisions. Not a replacement for MTG Arena, a full Magic client, an official WotC product, multiplayer, deck import, live matchmaking, or a tournament rules engine.

**1.0 must ship:** 250 educationally reviewed puzzles across 5 galaxies, 25 worlds, 10 levels/world; optional Learn Mode and Challenge Mode; 3-tier solver-verified hints and post-win explanations; supported-mechanics audit and truthful simplification disclosures; readable mobile cards and non-drag alternatives; fluid cauldron feedback that does not alter game rules; working saves/export; regression-verified progression and accessibility.

**Explicitly deferred:** multiplayer, opponents/full game loop, unrestricted deck import, authenticated ranking, paid membership, intrusive ads or production Arcade score APIs. Daily puzzle/achievements are P13 enhancements, subordinate to the core learning product.

## 1.0 acceptance contract (owner sign-off remains pending)

| ID | Release acceptance requirement | Evidence to collect | Owner/reviewer |
|---|---|---|---|
| AC-01 | Rights to distribute branding, artwork, card identity and game presentation resolved **in writing**, or individually reviewed original-IP direction | Rights decision and counsel review in [ASSET-RIGHTS-P01.md](ASSET-RIGHTS-P01.md) | Owner + qualified rights reviewer |
| AC-02 | Every *claimed-to-teach* mechanic has an accurate, versioned rule contract or prominent simplified-model disclaimer | P02 official source/Oracle matrix, reducer tests | Rules reviewer |
| AC-03 | Exactly 250 valid unique IDs and 25 world brackets; preserve progress or migrate safely | CI replay/auto-cast, save migration tests | Engine agent |
| AC-04 | At least 50 manually reviewed anchor puzzles, 10 per galaxy; all other puzzles reviewed for learning objective, duplicates, shortcuts and quality | P06–P10 curriculum audit, P03 validator reports | Puzzle designer |
| AC-05 | Learn Mode covers land vs mana, tapping, land drops, turns, colored vs generic vs true colorless | Usability interviews and guided challenge replay | Education reviewer |
| AC-06 | Three-level optional hints + correct *why it worked* explanations, valid for current state and auto-cast | Solver-derived tests and manual copy review | Education reviewer |
| AC-07 | Pointer-only non-drag play action, keyboard access, readable cards, color labels and reduced motion/effects | WCAG 2.2 AA review, physical iOS/Android QA | Accessibility reviewer |
| AC-08 | No softlocks, unreadable hand, blocked controls, stale ward colors or data loss | Real device smoke and regression suite | QA reviewer |
| AC-09 | Target desktop ~60 FPS and phone ≥30 FPS on agreed support devices (measured, not assumed) | Device/frame timing, battery/thermal observation | Performance reviewer |
| AC-10 | Saved guest scores survive upgrades; export/import and disaster recovery tested | Storage fixture and restore tests | Release engineer |
| AC-11 | Proposed 15–20-person closed beta; target ≥80% beginners finish first 5 Learn Mode puzzles unassisted; can explain core distinctions | Session logs with opt-in consent, redacted summary | Product reviewer |
| AC-12 | No changes to public site before separate release rights + owner authorization; rollback built and tested | P15 promotion SHA, checklist and smoke evidence | Owner + website agent |

**Success threshold:** All AC-01 through AC-12 have affirmative evidence and no P0 issues. Current prototype passes only pieces of some gates. Don't report the table as already complete.

## Immediate P01 decisions

| Decision | Recommended direction | Actual status | Follow-on |
|---|---|---|---|
| Public art/cards/IP | **Recommended:** original fantasy lands/cards, art, UI symbols, named identities and presentation specifically reviewed for independent distribution. **Alternative:** obtain written permission/license covering cards/art/trademarks/game usage. | **OWNER DECISION REQUIRED; NO LICENSE CONFIRMED.** Do not pretend "unofficial" disclaimer suffices. | Legal/brand sign-off before P15; implementation track affects P02, P11–P12 |
| Product identity | Retain `Mana Heist` as a working title only, pending branding/trademark check. | TITLE NOT CLEARED | P01 owner review |
| Rules fidelity | Favor a **scope-limited but accurate supported-mana model** over a full rules engine. Where a pedagogic abstraction remains, make it conspicuous and avoid quoting printed-card behavior. | RULES SCOPE PROPOSED, NOT SIGNED OFF | P02 |
| Steps/phases | Decide whether to model step/phase expiration and mana windows or explicitly teach simplified turn resource puzzles; avoid claiming a full MTG simulation. | OPEN | P02 |
| Data model | Continue standalone guest `localStorage`; no account, D1 or scores API in Lab. | EXISTING LAB CONSTRAINT | P13 migration/export |
| Targets | Mobile Safari/iOS, Chrome/Android, desktop Chrome/Firefox/Safari; 320/375/390px plus tablet/desktop responsive checks. | TARGETS PROPOSED; PHYSICAL DEVICES NOT TESTED | P11/P14 |
| Accessibility | WCAG 2.2 AA as design target; mouse-only drag **not** sufficient; color labels and reduced motion mandatory. | TARGET PROPOSED | P11 |
| Release ownership | Each package individually authorized. No public Arcade publication until separate owner-authorized main-site PR, production developer review and rights clearance. | EXISTING REPOSITORY POLICY | All packages |

**Why IP blocks public release:** Wizards' [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy) explicitly says not to use Wizards' IP "in other games" even when distributed for free. Existing Scryfall-served scans, genuine land names, mana symbols and card frames are **not licensed for this game's public distribution by virtue of being available on an API**. WotC's [Terms](https://company.wizards.com/en/legal/terms) describe reserved game/content rights. Seek a qualified IP review; this is an engineering risk record, **not legal advice**.

## Existing technical product inventory

| Surface | Where | Verified behavior/baseline | Gap |
|---|---|---|---|
| Campaign | `src/levels.js`, `src/campaign.js` | 5 galaxies; 25 worlds; 250 unique IDs; original 18 hand-designed, 232 variants from templates | 232 variants not educationally curated; solver replay ≠ quality or unique difficulty |
| Mana/state | `src/engine.js` | 24 land identities; 6 mana colors including true `C`; `N` generic; one-symbol tap; reducer/legal actions | Simic Growth Chamber incorrect against Oracle; no phases; audit pending |
| Auto-cast | `src/auto-cast.js` | Uses legal reducer casts without user Cast button; tries to preserve completable future | Must retest all levels if mana rules change |
| Graphics | `src/fluid-ward.js`, `src/pigment-mixer.js` | 64×64 fluid grid, colored dye conservation, hover-stir & mobile touch | Physical performance and accessibility audit missing |
| Hand / mobile | `src/drag-lands.js`, `styles.css`, `index.html` | Mobile scroll, readable card image, gesture drag, click/tap inspector | Non-drag land placement, screen reader and actual device QA missing |
| Artwork | `src/printing-art.js`, `src/scryfall-cards.js`, `src/card-references.js` | 24 official land identities use Scryfall redirects including randomized printings | IP/legal clearance; external uptime / request policy review |
| Guest progress | `src/main.js`, `src/campaign.js` | Local browser bests under `dc-mana-heist-landfall-v2`; only completed levels unlock following levels | User export/import, schema migration, storage-denial UX, retention unknown |
| Backend | Lab `mana-heist/**` | Engine/browser visual code inspected: no gameplay `fetch` or public scores in engine | Whole-project network/analytics privacy assessment before P15 still required |

## Privacy and external resource baseline

- **Direct game requests:** Browser `<img>` redirects to `api.scryfall.com/cards/random` with queried genuine card names and random cache-bust tokens; named image/reference endpoints also exist. Not all of these are fetched on every level.
- **Player saves:** `localStorage` contains `v:2`, selected level index and personal best turn/life-spend scores (no profile identities in these records). No consent to share those records externally has been established.
- **No inferred accounts:** the standalone Lab must never invent logged-in users, authenticated achievements or production scores. Do not add trackers, third-party ads or production D1 without new authorization/privacy review.
- **Remaining review:** network headers and domains in a real browser session; CDN response behavior; CSP/referrer constraints; retention policy for any future analytics; Scryfall availability and alternative asset strategy.
- **Scryfall policy verification:** `https://scryfall.com/docs/api` and `https://scryfall.com/docs/api/images` are primary references to review. These pages could not be independently fetched in this P01 pass (403); mark usage-term clearance **OPEN**, not implicitly approved.

## Risk register and mitigation priority

| ID | Severity | Risk | P01 mitigation and owner | Package |
|---|---|---|---|---|
| R-01 | **BLOCKER** | Authentic cards, names, WotC art and mechanics incorporated into separate game without confirmed permission | Owner chooses written license or independent original approach; expert rights review, no public release meanwhile | P01, P15 |
| R-02 | **HIGH** | Learners acquire incorrect real-world card habits because engine is simplified | Source-grounded Oracle/rules ledger and tests; correct or disclose | P02 |
| R-03 | **HIGH** | 232 generated puzzles may feel repetitive, unsuitable difficulty, or have alternate trivial solutions | Solver + auto-cast validator, audit 50 anchors and 250 goals | P03, P06–P10 |
| R-04 | **HIGH** | iPhone drag/card visibility/final-turn softlocks remain outside tested viewports | Alternative tap-to-play, actual device tests, WCAG audit | P11, P14 |
| R-05 | **HIGH** | Browser-local progress lost through clear storage or schema changes | Versioned save migration, export/import, recovery test | P13 |
| R-06 | **MEDIUM** | Colored cauldron creates inaccessible cues or poor mobile frame pacing | Exact pip labels, reduced FX/motion, benchmark target devices | P11–P12 |
| R-07 | **MEDIUM** | Scryfall image requests fail, return unexpected printing, or usage terms differ | External request review, safe fallback, rights path | P01, P11 |
| R-08 | **MEDIUM** | Auto-cast route selection creates unintended mistakes after changing mana rules | Exhaustive solver/auto-cast reruns and traceable decisions | P02–P03 |
| R-09 | **MEDIUM** | User-facing promise "real MTG mana practice" overstates scoped rules | Truthful product positioning, on-screen scope description, curriculum review | P01–P05 |
| R-10 | **MEDIUM** | Game Lab release accidentally promoted to public monetized website | Maintain branch/PR isolation and independent owner approval | All |

## P01 exit gate and handoff

- [x] 1.0 product scope, non-goals and acceptance targets documented.
- [x] Current engine/24-card/250-level technical baseline and primary user-facing assets inventoried.
- [x] Mechanic coverage and deviations in [MECHANICS-MATRIX-P01.md](MECHANICS-MATRIX-P01.md).
- [x] Artwork/API/IP pathways, risk register and decision template in [ASSET-RIGHTS-P01.md](ASSET-RIGHTS-P01.md).
- [x] Owner sign-off decisions and launch gates spelled out, with an explicit unresolved state.
- [ ] **OWNER SELECTION:** choose written licensing route vs proposed original-asset route; confirm intended title/brand posture.
- [ ] **RIGHTS REVIEW:** legal review of chosen route with documented evidence (not assumed based on Scryfall).
- [ ] **P02 RULES SCOPE SIGN-OFF:** determine exact scope before engine refactor.
- [ ] **PHYSICAL DEVICE BASELINE:** hands-on iPhone and Android performance/UX measurements; browser simulations are not substitutes.

**P01 delivery status:** LAB DEPLOYABLE FOUNDATION; **SIGN-OFF BLOCKED**, not "public-release cleared." Future agents should complete the pending decisions, then change the roadmap ledger to `LAB MERGED / OWNER SIGN-OFF PENDING` until authorized evidence exists. P02 is not automatically authorized.

**Official sources last consulted:** [Wizards Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy) (page lists last update 2017-11-15); [Wizards Terms](https://company.wizards.com/en/legal/terms); [Magic official Rules hub](https://magic.wizards.com/en/rules); [WCAG 2.2 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements) and [Target Size](https://www.w3.org/TR/WCAG22/).
