# Milestones & Release Checklist

## Repository and isolation

- [x] Separate GitHub repo established: **Squackle/deep-cuts-game-lab-** (note trailing hyphen).
- [x] Source-of-truth documentation and dated DEVLOG introduced.
- [x] Set up separate Cloudflare Pages project and verify live testing URL: https://deep-cuts-game-lab.pages.dev/
- [ ] Decide legally safe final game title and original art.
- [x] Add CI engine tests and syntax checks (first workflow run passed).

## Prototype 0.1 — Genuine arcade gameplay

- [x] Responsive crisp Canvas arena playable portrait on iPhone and desktop.
- [x] Deterministic four-direction fixed-timestep hive movement.
- [x] Touch swipes and WASD / arrow controls.
- [x] No immediate 180° reversal or accidental scroll inside game area.
- [x] Valid spawn tiles; brood pickup, score and hive growth.
- [x] Arena boundaries and self-collision cause game over.
- [x] One-tap restart and persistent personal best.
- [x] Start, pause, resume, safe background/visibility handling.
- [x] Simple on-screen instructions; accessible buttons and focus.
- [x] Automated movement, pickup, collision and restart tests.
- [ ] Mobile width tests: 320px, 375px, 390px; tablet 768px; desktop. Automated browser checked 320px, 390px and desktop 1280px; 375px and tablet remain to check.
- [ ] No horizontal overflow or obstructed touch targets; mobile browser manual QA. Automated widths 320px, 390px, 1280px had no overflow; real-device manual QA remains.
- [x] Isolated test site deployed and checked; commit, URL and results logged.

**Acceptance criterion:** A player can load the site on a phone without installing anything, swipe to turn, collect brood, grow, collide, lose, restart and chase a real saved high score. No mocked controls.

## Level 01 Environment — The Hatchery

- [x] User-approved original background generated and archived.
- [x] Optimized mobile WebP (12.4 KB) committed as `assets/backgrounds/hatchery.webp`.
- [x] Canvas draws actual artwork behind sprites/collectibles with subtle darkening and guide grid.
- [x] Retain fallback grid if the background image cannot load.
- [ ] Real-device visual tuning and game readability checks.
- [ ] Add distinctive Stage 2+ maps only alongside real level progression; current numbered stage counter measures speed tiers, so stay in Hatchery during endless runs.

## Alpha 0.2 — Hive mutations / hazard stages

- [x] Begin soundtrack work early: original Hatchery chiptune loop, independent music toggle, user-gesture audio and pause/mute behavior (v0.1.6). Musical polishing remains a future task.
- [x] Mutation selection draft with three choices after every five brood, mobile click and keyboard shortcuts.
- [x] Five meaningful, tested mutation families: white shield, blue slow-time, black sacrifice, red frenzy/scoring and green extra growth.
- [x] WUBRG visual auras and evolution-selection burst for the active hive.
- [x] HUD: owned mutations, shield/molt charges, timed effects and next draft countdown.
- [x] Original Hatchery soundtrack integrated with drafts and gameplay pause.
- [ ] Physical-device balance/playtesting and final polish before declaring Alpha 0.2 release complete.
- [ ] Stage changes: Hatchery, Burrows, Fracture.
- [ ] Terrain walls, enemy movement, fair difficulty escalation.
- [ ] Balance based on recorded real playtests.

## Next Major Update — Predator Loop and Evolution Bosses (design complete; NOT implemented)

**Accepted gameplay direction:** replace common-orb Snake progression with a continuous, territorial **HUNT → TRAP → EVOLVE** loop. Full spec: [ENCOUNTER_DESIGN.md](ENCOUNTER_DESIGN.md).

- [x] Design approved: moving survival-first enemy AI, trap/corralling captures using player body, rare orb supplement.
- [x] Encounter cadence designed: miniboss at evolutions **2/6/10/...**, full boss at **4/8/12/...** (completed choices, not accumulated EV).
- [x] Initial design for Skitter, Burrow Runner, Burrow Stalker, Hatchery Warden, Tunnel Weaver and Rift Guardian, with 2-/3-phase boss captures.
- [x] Alpha 0.3: kill-driven EV energy (+3 normal captures, +1 rare orb, 5 EV per evolution).
- [x] Alpha 0.3: rare-orb active-tick cooldown, no XP from unrelated prey crashes, no evolution from passive waiting. Further mobile balancing and softlock audit remain.
- [x] Alpha 0.3: seeded continuously moving Skitter/Runner AI, bounded flood fill, no reversal and safe initial spawning; physical-phone difficulty balance pending.
- [x] Alpha 0.3: moving-body trap collision, capture energy/scoring, kill burst and status announcements.
- [x] Alpha 0.3: Skitter and Burrow Runner movement personalities; cap of two after first evolution.
- [ ] Evolution-based miniboss and boss triggers; multi-capture phases with safe gate resets.
- [ ] Boss/enemy art, attack telegraphs and encounter HUD.
- [x] Compose original normal-enemy, miniboss and full-boss chiptunes; 4-track preview controls with opt-in Web Audio (Alpha 0.2.1).
- [ ] Automatically switch audio by real encounter state, and add final victory/phase stingers once enemies and bosses exist.
- [ ] Physical-device volume, loudness matching and smoother musical transitions.
- [x] WUBRG capture integration: Red doubles score not EV, Green adds growth from kills/orbs, White/Black defensive saves, Blue steering control.
- [ ] Burrows/Fracture environments only after trap combat is proven fun and fair.
- [ ] Full regression, mobile browser and real physical-device QA.

## Beta 0.3 — Engagement and polish

- [ ] Daily seeded challenge and reproducible conditions.
- [x] Alpha 0.3: D1-backed top-25 leaderboard, server-seeded replay verification, single-use sessions, rate limiting and same-origin POST; main-site profile links clearly unverified until a first-party identity bridge exists.
- [ ] Original pixel-art creatures, animations and optional chiptune/sound. **Original 8-bit Hatchery soundtrack is implemented in v0.1.6; final animation and music balance remain to polish.**
- [ ] Scores and settings persist gracefully.
- [ ] QA across actual Safari/Chrome phones, accessibility and performance.

## Release 1.0 — Integration

- [ ] Reliable game loop, menus, sound controls, pause, high scores and challenges.
- [ ] Clear licensing-safe branding and original art.
- [ ] Link from Deep Cuts EDH only after owner approval.
- [ ] Production changes are isolated and documented.

## Potential future (NOT yet committed)

- [ ] Broodmother boss and campaigns.
- [ ] Mutation synergies and new stages.
- [ ] Field Network accounts / achievements.
- [ ] Multiplayer only after dedicated product/security review.


## Migration / Main Site Merge Preparation (Alpha 0.3)

- [x] Single source-of-truth profile origin and URL builder in `src/integration.js`.
- [x] Game assets load relative to their own folder and no app routes depend on absolute root paths.
- [x] Separate database and portable Cloudflare Pages Function for submissions and leaderboard reads.
- [x] Complete move/copy checklist and D1 schema tracked in `docs/MAIN_SITE_MERGE.md` and `db/leaderboard.sql`.
- [ ] Build verified first-party profile bridge on the main site **when authorized to modify it**; do not link a handle as authenticated merely because a guest typed it.
- [ ] After merger, migrate D1 leaderboard data and function binding, point game nav from main page, run full authentication and score regression matrix.


## Alpha 0.3.1 — Prey pace playtest tuning

- [x] Half Skitter and Burrow Runner speeds (movement period 2 → 4 player ticks) following owner feedback.
- [x] Version game rules and isolate new rankings by version to keep the leaderboard comparable.
- [ ] Gather real-device feedback about whether the slower pace makes trapping more enjoyable; adjust different enemy personalities separately if needed.
