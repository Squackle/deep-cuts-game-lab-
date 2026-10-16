# Mana Heist — Roadmap to public 1.0

**Status:** APPROVED PLANNING BASELINE (documented 2026-10-15); **P01–P15 NOT YET IMPLEMENTED OR RELEASED as roadmap packages**. This is an implementation plan, not a certification that current game mechanics or legal rights are ready for public launch.

**Source of truth for agent workflow:** [AGENTS.md](AGENTS.md). **Current rules vs proposed rules:** [RULESET-1.0.md](RULESET-1.0.md). **Existing historical playtest log:** [README.md](README.md). Root-level [../AGENTS.md](../AGENTS.md) and [../docs/TEST-FIRST-RELEASE-POLICY.md](../docs/TEST-FIRST-RELEASE-POLICY.md) still apply.

## Mission and positioning

> **Master Magic's mana system, one puzzle at a time.** Learn to play lands, choose colors, sequence turns, and cast spells through short, satisfying challenges.

Position 1.0 as a **focused mana-learning puzzle game**, not an MTG Arena replacement, full match simulator, multiplayer client, deck tester, or complete Magic rules engine. Two intended audiences: newcomers confused by lands vs mana, generic vs colorless, land drops, and untapping; intermediate players seeking deliberate land sequencing, fixing and life-total tradeoffs.

### Scope of the 1.0 promise

- Five galaxies × five worlds × ten levels = **250 playable learning puzzles**.
- Learn Mode (guided onboarding) and Challenge Mode (minimal assistance).
- A three-step hint ladder and **why it worked** explanations.
- Realistic, documented behavior for each *supported* mechanic or an explicitly labeled simplified mechanic. Do not market approximations as Oracle-accurate Magic.
- Large interactive Chromatic Cauldron, readable card interactions on mobile, keyboard/accessibility alternatives, reliable save/export, and optional replay hooks.
- **No public release or integration into monetized Deep Cuts EDH before explicit rights/brand review and a separate owner-approved production promotion.** The existing authentic-card-image Lab prototype is **not** proof of licensing.

## Baseline inventory (not 1.0 acceptance)

| Area | Observed in repository | Gap / caution |
|---|---|---|
| Puzzle atlas | 250 unique IDs, 5 galaxies, 25 worlds, 10 stages/world in `src/levels.js` | First 18 are authored; other **232 are generated** from templates. Legal winning-route replay is necessary, but does NOT prove distinct instructional value, fairness or best solution |
| Game engine | `src/engine.js` has `VERSION="mh-landfall-0.2.0"`, pure `actions`/`reduce`/`payOptions`/validation | Simplified model; no full step/phase loop; mana expires on `end` turn, not every step and phase |
| Land catalog | Real Magic land identities/images are in Lab, with basic, dual, shock, pain, check, fetch, bounce, colorless families | Simic Growth Chamber is currently modeled as U **or** G per tap; real card makes U **and** G. Complete support and Oracle accuracy unverified |
| Casting | `src/auto-cast.js` chooses a legal payment and automatically resolves wards | Preserve current UX, but retest the whole campaign if actual mana outputs change |
| Ward | Stirrable top-down pigment cauldron with precomputed mixtures | Needs polish, perf tuning, non-color cues, sound controls and accessibility alternatives |
| UI | 250-stage overworld, mobile full-card hand, magnifier, drag-to-play, final-turn guidance | Physical iOS/Android testing, keyboard alternative to dragging, focus, visibility and low-height layouts are not complete |
| Progress | Browser-local guest bests (`dc-mana-heist-landfall-v2`) | Export/import and save migration missing; do not reset progress or identifiers |
| Infrastructure | Standalone Cloudflare Game Lab with GitHub CI | Not public website/Arcade, no public leaderboard/auth/D1 integration |

**Important:** Older sections near the start of README describe earlier releases (e.g. original art, manual casting, 18 acts) and are historical, not the current contract. Start with source, tests, and this baseline.

## 15 independent deployment packages

Every package produces: a scoped design/spec or implementation, deterministic tests, review of user-visible copy and mobile UX where relevant, a GitHub PR, a **standalone Game Lab preview**, a concise release/QA/rollback record, and **explicit owner approval for any production deployment or public promotion**. Nothing here grants a standing authorization to deploy each package.

### Phase I — Foundations

| Package | Work | Acceptance/exit gate | Dependencies |
|---|---|---|---|
| **P01 — Release Foundations** | Define supported mechanics and exact 1.0 scope; inventory card art/names, API/assets and IP risks; choose rights/permission or original-assets strategy; review player data/privacy and game branding; baseline mobile/performance | Recorded legal/brand decision, risk register, rules applicability matrix, signed-off acceptance criteria; no public launch until permissions or an independently vetted original presentation | None |
| **P02 — Mana Engine 1.0** | Audit lands, mana abilities, colored vs generic vs true colorless, multiple mana outputs, untapping, turn/step/phase expiration, life/entry costs, legal taps/payment and automatic casting | Every supported land family has source-grounded behavior tests; declared simplifications are conspicuous; no false real-world rules; version/replay and save migration plan; all affected puzzle routes revalidated | P01 |
| **P03 — Puzzle Engine & Validator** | Solver-backed authoring tools, solution replay, effective difficulty, unintended solutions/shortcuts, duplicate-archetype detection, explanation trace and solvability monitoring | Reliable validator distinguishes solvable, impossible and inconclusive; tests cover auto-cast (not only manual cast), cost constraints, alternate pay routes and puzzle uniqueness; CI regression gate | P02 |

**Hard gate G1 (after P03):** The engine and puzzle validator must support the rules *we claim* to teach, with a reviewed, versioned contract and actual tests.

### Phase II — Teaching

| Package | Work | Acceptance/exit gate | Dependencies |
|---|---|---|---|
| **P04 — Learn Mode** | Guided onboarding for land≠mana, tapping, one land drop/turn, colors, generic/colorless, costs and untapping; opt-out/skip; teach without penalty | First 5–10 teaching puzzles have tested step-by-step prompts; learn/challenge settings cannot alter core legal outcomes; suitable touch and keyboard controls | P03 |
| **P05 — Hints & Explanations** | Three-level hints: conceptual nudge → specific sequencing clue → demonstrated solution. Show why a win worked and why a mistaken move failed | Hints are tied to solver-validated routes, do not reveal answers unprompted, honor available mana and turn limits, explain colored/generic costs accurately | P03–P04 |

### Phase III — Five-galaxy curriculum

**Package boundary:** these improve the EXISTING 250 IDs, not an additional 250 levels. Keep `5 × 5 × 10`, old completed progress where possible, world locks, and existing solution/replay guarantees; plan migration if any ID or difficulty is changed. Minimum **50 manually curated/authored anchor puzzles total** (approximately 10 per galaxy), not a claim 250 are hand-authored.

| Package | Galaxy | 50-level teaching focus | Acceptance/exit gate |
|---|---|---|---|
| **P06 — Foundations** | I | Lands vs mana, basic colors, tapping, generic requirements, turns, land drops | 5 worlds × 10 stages; progressively learn fundamentals; 10 reviewed anchors and an integrative finale |
| **P07 — Color Mastery** | II | Dual lands, mixed costs, true colorless, preserving critical colors, multi-pip requirements | Same 50-stage audit, meaningful decisions, varied cost patterns, explanations |
| **P08 — Complex Lands** | III | Shock/check/pain/fetch land effects, typed lands, entering tapped, life/tempo | Faithful behavior for each included mechanic or explicitly labeled simplified case; all targets/choices verified |
| **P09 — Sequencing** | IV | Planning land drops and turns, life tradeoffs, bounce lands, untaps, chained wards | Decisions cannot be bypassed by an unintended auto-cast shortcut; meaningful planning progression |
| **P10 — Grand Heist** | V | Combined mechanics, challenging color competition, efficient routes, multi-turn/multi-ward mastery | 50 reviewed climax puzzles; final worlds combine 2+ learned mechanics; no softlocks or accidental missing moves |

**Hard gate G2 (after P10):** Exactly 250 validated, educationally distinguishable challenges with reviewed world objectives, consistent difficulty escalation and satisfying finale structure. Winning replay alone is insufficient.

### Phase IV — Production quality

| Package | Work | Acceptance/exit gate | Dependencies |
|---|---|---|---|
| **P11 — Mobile & Accessibility** | Real iPhone/Android card handling, drag alternatives (tap/select land then tap battlefield), keyboard support, color labels, target size, browser zoom, focus and reduced motion | Real-device smoke at narrow portrait, large phone, tablet/desktop; no unreadable cards, dead controls, trapped scrolling, color-only communication or drag-only critical action | P04–P10 |
| **P12 — Chromatic Cauldron Polish** | Full-color coverage/mixing, injection and finale, sound/mute, optional reduced FX, adaptive 30–60 FPS targets, safe background pause | Color fractions preserved, fluid blend visible, ward mana accurately reflects actual resource state, neutral on turn/end/Undo, mobile fallback stable | P11 |
| **P13 — Progression & Replay** | Reliable save/export/import, medals, achievements/world mastery, optional daily puzzle/share image/result | Save/upgrade compatibility and offline fallback tested; daily challenges are not required for the core 250; no unapproved account/score/production data use | P03/P10 |

### Phase V — Beta and launch

| Package | Work | Acceptance/exit gate | Dependencies |
|---|---|---|---|
| **P14 — Closed Beta & Hardening** | Recruit ~15–20 mixed-experience testers; watch real beginners, log confusions, balance levels, mobile/performance/a11y audit, bug bash | Proposed targets: ≥80% of new testers complete first five guided puzzles without external help; testers explain land/mana, generic/colorless and untapping; no known progression blocker or data-loss bug | P01–P13 |
| **P15 — Mana Heist 1.0 Release** | Freeze rules/content; complete legal/IP clearance, documentation, release branding, SEO, full regression, controlled public promotion and rollback | All G1–G3 checks green; a separately authorized promotion PR verified by website owner and actual live smoke; public site not touched earlier | P14 + legal clearance |

**Hard gate G3 (after P14, before P15):** Public-release rights resolved; real-device accessibility, core teaching value, rules fidelity, progress safety and complete campaign tested. Owner must explicitly authorize public promotion.

## Priorities

- **P0 / must block public release:** rights & branding; supported rules accuracy; campaign solvability; mobile usability; lost progress/softlocks; actual game-breaking defects.
- **P1 / core product:** introductory Learn Mode; structured hints and post-win explanations; 250-stage educational progression; accessible cauldron.
- **P2 / launch extras:** daily puzzle, achievements, shareable results, save export/import, adjustable effects (unless required for accessibility).
- **Post-1.0, not roadmap prerequisites:** opponent/full match simulator, multiplayer, unrestricted deck import, full ranked leaderboard, complex account infrastructure and monetization.

## Release quality gates (for every package)

1. **Owner authorization:** research/documentation may be prepared on request; do not assume approval of all 15 packages, Game Lab production deployments, or public site integration.
2. **Isolation:** `Squackle/deep-cuts-game-lab-` (trailing hyphen), `mana-heist/**` only. Any shared `lab/**` or main-site change needs separate explicit approval/coordination.
3. **Coordination:** check current main SHA and open PRs; create fresh feature branch; never overwrite another agent's work.
4. **Rules fidelity:** use the pure reducer/legal action list as authority. Tests must prove intended behavior; avoid changing card abilities without editing levels, hints, solver and save/replay treatment.
5. **Tests:** `node --test mana-heist/tests/*.test.mjs` plus relevant syntax checks, solver replay, mandatory auto-cast, mobile fallback, keyboard/touch, and smoke for the feature.
6. **Preview first:** require successful GitHub CI and Cloudflare **Game Lab preview** before merging; check the actual user-visible UI. A merged PR/deployment stage alone is not a browser smoke test.
7. **Release evidence:** record commit SHA, PR, changed paths, exact test results, preview/live URL, known limitations and rollback.
8. **Versioning:** record engine/rules version and migration impact; preserve legacy `dc-mana-heist-landfall-v2` until a tested migration.
9. **Public gate:** NEVER promote Magic assets / gameplay to public Deep Cuts EDH or attach accounts, D1, scores, ads or production ranks without separate review and explicit authorization.
10. **Doc upkeep:** mark each package `NOT STARTED`, `IN PROGRESS`, `PREVIEW VERIFIED`, `LAB MERGED`, `BLOCKED`, or `OWNER APPROVED FOR PUBLIC` with PR/commit evidence. Do not check it off because code exists in the old prototype.

## Status ledger for future agents

| Package | Status | Evidence |
|---|---|---|
| P01 | BLOCKED | P01 technical foundation delivered for Lab: [scope/risk register](release/FOUNDATIONS-P01.md), [mechanics audit](release/MECHANICS-MATRIX-P01.md), [asset/rights decision](release/ASSET-RIGHTS-P01.md), [baseline tests](tests/release-foundations.test.mjs). **Rights route, title review and owner sign-off unresolved; not public-release cleared.** |
| P02 | NOT STARTED | Existing simplified engine is not audited 1.0 |
| P03 | NOT STARTED | Existing solver and 250-level replay tests are a baseline, not completed authoring QA |
| P04 | NOT STARTED | No approved Learn Mode acceptance |
| P05 | NOT STARTED | No approved three-tier hints |
| P06 | NOT STARTED | 50-stage baseline exists but not curriculum reviewed |
| P07 | NOT STARTED | 50-stage baseline exists but not curriculum reviewed |
| P08 | NOT STARTED | 50-stage baseline exists but not curriculum reviewed |
| P09 | NOT STARTED | 50-stage baseline exists but not curriculum reviewed |
| P10 | NOT STARTED | 50-stage baseline exists but not curriculum reviewed |
| P11 | NOT STARTED | Prior mobile fixes ≠ full real-device/accessibility acceptance |
| P12 | NOT STARTED | Current fluid effect ≠ full production polish |
| P13 | NOT STARTED | Current guest bests ≠ save export/daily/achievements package |
| P14 | NOT STARTED | Beta not performed |
| P15 | NOT STARTED | Public launch not authorized or cleared |

## Planning timeline

**Estimated 12–16 weeks** for concentrated work; not a delivery promise. Legal/licensing and engine fidelity investigations can materially extend it. Package sequence and gates matter more than dates. Prioritize P01–P03 before large-scale lesson writing.

## P01 technical delivery handoff (2026-10-15)

**Technical baseline and artifacts completed; package status: BLOCKED pending owner choice/rights review.** See [release/FOUNDATIONS-P01.md](release/FOUNDATIONS-P01.md) for release scope, AC-01–AC-12, privacy baseline and R-01–R-10 risks; [release/MECHANICS-MATRIX-P01.md](release/MECHANICS-MATRIX-P01.md) for 24 lands and 19 mechanics with mandatory P02 audit; and [release/ASSET-RIGHTS-P01.md](release/ASSET-RIGHTS-P01.md) for a recorded licensing-vs-original-asset decision awaiting approval. The main-game 250 levels, artwork, engine and score storage were not altered. **P02 is not authorized by this delivery.** A rights/brand decision cannot be signed off by an automated agent.
