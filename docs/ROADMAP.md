> **Release naming:** Read [HIVE-RUN-RELEASE-NAMING.md](HIVE-RUN-RELEASE-NAMING.md). Every future Hive Run release title must be one thematic word. Current title: **Instinct** (1.0.5).

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

## Potential future: Hatchling Ward & Musical Escalation (owner ideas — not implemented)

- [ ] **Hatchling Ward mutation:** A player-placed stationary hatchling occupies **one grid square** and frightens enemies away from its square and the **eight directly neighboring squares** (one-square-radius, 3×3 deterrent). Design the usage cost/charges, safe placement, lifetime, enemy routing and visual indicators. Block passive score farming and unavoidable enemy traps; record placement decisions in deterministic server replays.
- [ ] **Level 1–4 music intensity and tempo scaling:** Make Level 1 **dramatically calmer than Level 4**, with clear steps for Levels 2 and 3. Proposed testing targets: **~80 BPM (Level 1)**, **~105 (Level 2)**, **~132 (Level 3)** and **~165 (Level 4)**. Also escalate melody, percussion layers and tension. Trigger progression based on actual evolution/encounter milestones; preserve mute and pause. **No audio tempo changes have been deployed yet.**
- [x] **Alpha 0.3.2 UI cleanup:** Hide sprite codex, GitHub repository/roadmap/devlog shortcuts, and public soundtrack selection/testing. Preserve music on/off and automatically selected combat music; preserve source documentation and automated regression tests.

## Future game mode — Classic Snake (orb-only progression; not implemented)

- [ ] Add **Classic Snake** as a separate selectable game mode alongside **Predator Hunt**, without replacing or changing the hunt-and-trap mode.
- [ ] Restore the original Snake loop: **collect orbs to grow your body, increase your score and progress toward evolutions**. No enemies, captures, minibosses or bosses in Classic mode.
- [ ] Restore the original evolution pacing: **every five orbs collected opens a three-choice WUBRG mutation draft**, independent of enemy kills or hunt energy.
- [ ] Bring back the original five playable mutations and their orb-era behavior: **White — Hardened Shell** (one collision shield); **Blue — Temporal Drift** (temporarily slow movement); **Black — Emergency Molt** (sacrifice three tail segments to survive a fatal hit); **Red — Blood Rush** (faster movement and double orb points); **Green — Rapid Brood** (bonus growth from orb pickups).
- [ ] Let Classic mode advance through the game's **different levels/environments and their distinct music**, including planned later areas, while retaining simple orb-only Snake gameplay. Level transitions are unlocked by orb/evolution progression, never combat.
- [ ] Preserve automatic soundtrack progression and the Music toggle; **do not restore a public soundtrack preview/testing panel**.
- [ ] Keep each mode's best scores, ranked leaderboards, replay validation and progression separate, since their scoring systems and difficulty are not comparable. Choose the mode from an accessible game-start menu.
- [ ] Reuse shared rendering, level assets, controls, mutation cards and original sound engine where feasible, but keep each mode's simulation and scoring rules explicitly versioned and tested.

**Design summary:** *Classic Snake is the original orb-collecting Hive Run, with the original five WUBRG upgrades and full level/music progression, but no enemies or boss fights. Predator Hunt remains its own separate mode.*


## Alpha 0.3.3 — Game Only full-screen play

- [x] Offer an explicit Game Only / Exit Game Only control adjacent to the arena header, with native Fullscreen API when supported and a robust fixed-viewport iPhone Safari fallback.
- [x] Lock page scrolling, browser overscroll and touch gestures while in Game Only mode; preserve drag/swipe steering and visible score, mutation draft, sound, pause/restart and touch pad.
- [x] Restore original scroll position on exit, allow Escape on keyboard, and leave the leaderboard and Field Network profiles available after exiting.
- [ ] Verify additional physical iPhone Safari and Android touch behavior; mobile browsers can still reserve system-edge gestures and their browser chrome.

## Alpha 0.4 — Miniboss active abilities & charge HUD (planned, NOT implemented)

- [ ] **Burrow Stalker — Burrow Dash:** Every **10 seconds of active encounter time**, the miniboss can **burrow exactly five grid steps away** (select a safe destination at Manhattan distance 5). Warn the player with a brief burrow/exit telegraph. The Stalker cannot appear on the swarm, a hazard, a web, or an occupied tile; if no fair destination exists, hold the ready ability until one is available. A non-final capture/phase transition follows the existing separate safe-gate rules, not this ability.
- [ ] **Tunnel Weaver — Web Snare:** Every **10 seconds of active encounter time**, the miniboss can place a web on **one grid square**. When the player's head enters that tile, **stun movement for two real-time seconds**. The web **expires after 15 seconds** if not triggered, and is removed when triggered or the encounter ends. Show a distinct visible tile and clear activation effect. Define cap/overlap rules and ensure a stunned player cannot be unavoidably killed by enemy contact. Favor a maximum of two lingering webs while balancing (15-second lifespan versus 10-second cooldown).
- [ ] **Top-right ability-charge indicator** whenever an ability-bearing **miniboss or boss is on screen**: use original, hand-drawn **burrow-themed SVG/pixel icons, never platform emoji**. **Burrow** = uneven cracked earth around a black tunnel mouth, **Web** = torn irregular web strands anchored in cave rock. Surround either symbol with a **dingy ochre/antique brass** circular charge ring (base `#98824B`, ready `#B19A5A`, recessed track `#414335`; subdued rather than saturated bright yellow). Fill the ring clockwise during the 10-second cooldown; a complete ochre ring means **ability charged/ready**. Casting empties the arc. Include accessible text describing ability, remaining seconds, and ready state.
- [ ] Anchor the charge HUD at the **top-right of the game viewport** (including Game Only mode), visible during boss/miniboss encounters without hiding vital board tiles. Hide outside those encounters. Reuse the same indicator for future bosses and their abilities.
- [ ] **Fair timers and ranked replay:** Cooldowns/web aging advance in active simulation time, **not** during mutation drafts, pauses, browser tab hiding, encounter intros or between-phase transitions. For two-second stun, prevent forced player death during loss of control, and document exact collision/turn-buffer behavior before implementation. Seed any dash/web AI decisions and replay them identically in the leaderboard verifier; bump rules version and add tests for both cooldowns, exact burrow distance, safe spawns, web triggering/expiry and indicator state.


## Alpha 0.4 — Burrow Uprising release checklist

- [x] Two-capture **Burrow Stalker** encounter after the second completed evolution; **Tunnel Weaver** after the sixth; repeat alternate minibosses at evolutions 10/14 etc. Full Hatchery Warden/Rift Guardian three-phase bosses remain Alpha 0.5.
- [x] Stalker **Burrow Dash**: once charged over 10 seconds of active combat, visibly marks a **safe tile exactly five Manhattan steps away** for a 500ms warning. The escape is cancelled safely if the destination becomes occupied. Abilities pause during mutation choices, between-phase introductions and browser pause.
- [x] Weaver **Web Snare**: a single newly placed web tile per 10s charged cast; 15s lifetime, max two active webs, consumed on contact, 2s player immobility with enemy/ability clock frozen during stun to prevent unavoidable damage.
- [x] **Two true trap phases**, protected safe-gate respawn warning, original full-resolution 20×20 pixel-art minibosses, phase HUD, and a highly legible 64px weathered-ochre *pixelated* charge ring at the upper-right of the arena. Exact centering (40px sprite drawn at (12,12) of 64px canvas), accessible text/ready state, visible in Game Only and hidden outside miniboss combat.
- [x] Automatic previously composed miniboss music cues while encounter is active, returning to enemy-hunt music after defeat. No public soundtrack-testing controls.
- [x] +5 EV, +750 base score, +2 growth **only after final miniboss capture**; no double award for phase 1. Previous regular prey score/evolution behavior retained; server and browser run exactly the same seeded code.
- [x] Bump leaderboard ruleset to `hive-0.4.0`; previous version rankings remain archived, and new scores require replay verification against miniboss rules.
- [ ] Physical-phone balancing, particularly winning captures at evolution 2/6 and avoiding visual overlap under different Safari browser chrome. Release automation and live browser tests are recorded separately in DEVLOG.


## Alpha 0.4.1 — Calmer player movement balance

- [x] Reduce player grid movement rate by approximately 10% following owner feedback that Alpha 0.4 is a little too difficult: starting tick `135ms → 150ms`.
- [x] Preserve per-evolution acceleration (4ms per 2 chosen mutations) while bringing the late-run minimum movement interval from `94ms → 105ms`.
- [x] Keep prey/miniboss movement measured in the same fixed simulation steps, avoid altering combat timers or mutation rules, and add automated tests for both speed curves.
- [x] Re-version replay-verified ranked results to `hive-0.4.1` to avoid mixing different difficulties; prior leaderboard entries retained in storage.
- [ ] Get player feedback on an actual iPhone to see whether 150ms gives enough planning time; adjust again if necessary.


## Ability ownership — minibosses and full bosses only

- [x] **Regular prey never have activated powers.** Skitter and Burrow Runner can move and select escape routes, but they have **no Burrow Dash, webs, cooldown meter or other unique signature abilities**.
- [x] **Burrow Stalker (miniboss):** its own enemy-only Burrow Dash teleports the **Stalker**, not the player's snake, exactly five grid steps to a safe telegraphed location after a 10-second charge.
- [x] **Tunnel Weaver (miniboss):** its own enemy-only Web Snare places a single active hazard tile every 10 seconds; the **player is the one stunned** for two seconds on entering the web.
- [ ] **Future full bosses (Hatchery Warden and Rift Guardian)** should each have a **different signature activated ability** and the same ochre top-right ring, shown only during its encounter. Boss powers are not yet implemented in Alpha 0.4.1.
- [x] The player retains only **the existing WUBRG mutation powers** (White/Blue/Black/Red/Green). Neither the Stalker burrow nor Weaver web is available as a player ability.

## Release 1.0 — Paths of the Hive (2026-10-14)

This section supersedes earlier planned/not-implemented labels above; those sections remain as design history.

- [x] Alpha 0.5: Hatchery Warden at evolution 4 and Rift Guardian at evolution 8; three trap phases, safe resets, enemy-exclusive Brood Seal/Rift Pulse and original pixel-art charge emblems. Repeat in the established cadence.
- [x] Alpha 0.6: Burrows rock islands, Fracture warning/rupture tiles, and a deeper fourth intensity tier. Both modes change depths after 4/8/12 completed evolutions.
- [x] **Brood Trail**: the themed classic Snake mode, one replenishing orb, five orbs per three-choice WUBRG draft, no prey or bosses, separate best scores and ranked boards.
- [x] **Daily Ritual** for each mode: server-selected daily seed, Central midnight reset including DST, repeat attempts, separate day/mode boards. Arcade gets a fresh random seed.
- [x] All four soundtrack intensity tiers: 80/105/132/165 BPM, additional 6/12 BPM for miniboss/full boss encounters, reduced early percussion, user-controlled music and sound.
- [x] Mode-aware deterministic server replay, transactionally single-use submissions, persisted local records/settings, historical alpha leaderboard tables preserved.
- [x] Main-site integration prepared at `/games/hive-run/`, games-hub entry, first-party cookie identity resolution, verified game records on public profiles, and anonymous/clearly unverified guest play.
- [x] In-game field guide, boss phase/death cues, responsive controls and Game Only support.
- [ ] Production deployment and live verification (record final result in DEVLOG).
- [ ] Physical-device Safari/Android playtesting remains owner feedback; emulation is not physical-phone testing.

**Not included:** Broodmother campaigns, multiplayer, additional mutation synergies, achievements, and Hatchling Ward remain uncommitted ideas. The later confirmed ability-ownership rule limits the player to the original five WUBRG mutations; enemy powers are never player upgrades.

**Balance:** Retain the 150ms opening pace and 105ms minimum. At 6,000 active simulation steps an expedition ends successfully rather than silently exceeding the replay verifier's run limit. This is a technical run boundary, not a narrative boss-campaign ending.


## Release 1.0.1 — Prey versus predator difficulty balance (2026-10-14)

- [x] Split enemy intelligence into two clear tiers: Skitters/Runners only examine adjacent free tiles, choosing to continue straight 65%/85% of the time when possible, otherwise making simple seeded turns. They no longer flood-fill future escape routes or strategically avoid the player's distant traps.
- [x] Keep encounter enemies strategic: minibosses/full bosses analyze up to 150 reachable cells, retain their 10-second activated powers and 2/3 capture phases, and remain capturable via deliberate path closures.
- [x] Retain existing enemy speeds, player pace, WUBRG mutations and both game modes to isolate the effect of prey intelligence on perceived difficulty.
- [x] Re-version ranked server replays to `hive-1.0.1` and version daily seeded challenges so players are compared against identical AI rules; older scores remain in historical storage.
- [x] Cover short-sighted dead-end decisions, legal movement and boss intelligence differences with deterministic tests.
- [ ] Playtest real gamepad/keyboard/touch skill progression and iterate on tutorial, optional beginner protection and boss introduction if early completion remains difficult.

## Release 1.0.2 — Control response and beginner-friendly hunt balance (2026-10-14)

- [x] Register valid arrow/WASD commands on the original keyboard event, ignore held-key auto-repeat, and immediately draw the queued destination and head orientation. Grid movement remains fixed-tick (150ms opening) so faster button mash cannot increase game speed or bypass ranked replay validation.
- [x] Brood Instinct: one free automatic sidestep when the player would collide with Skitter/Runner, only in Predator Hunt. No protection from bosses, walls or the player's body. Shield/Molt keep their previous boss-saving role.
- [x] Opening grace: regular prey take seven movement beats, instead of four, for nine seconds of active gameplay; no grace timer progresses during pause/draft. Bosses stay at their prior pace.
- [x] Limit simultaneous ordinary prey to one until the third chosen evolution; boss encounters unchanged.
- [x] Spawn hunt evolution orbs sooner (initial wait 72 steps; early 70–104 steps between orbs), returning to 145–229 step intervals after two evolutions. Brood Trail's normal instant orb replacement stays untouched.
- [x] Render amber outlines only for ordinary prey with zero/one legal forward exit during early evolutions; boss fights and Brood Trail receive no trap guidance. Render does not affect RNG or scoring.
- [x] Bump replay rules to `hive-1.0.2`, refresh daily seed derivation and local best key. Historical score rows retained separately; no mixing ranked simulations from prior AI rules.
- [x] Cover collisions, cadence, orb pacing, population limits, immediate input feedback, boss boundaries and deterministic nonmutating hints with automated regressions.
- [ ] Physical keyboard and phone playtesting to validate whether the early game is enjoyable and the transition to bosses remains demanding.

## Release 1.0.4 — Four painted arena environments (October 14, 2026)

- [x] Final original painted pixel-art scenes for Hatchery, Burrows, Fracture, Deep Fracture based on project-approved concept sheet.
- [x] One small 288×352 WebP atlas with 144×176 pixel source tile; loaded once for all four stages; source cropped using only biome ID.
- [x] Visible art transitions at four, eight and twelve completed evolutions, for both Predator Hunt and Brood Trail.
- [x] Tuned per-biome darkness and edge fades, grid overlays and crisp pixel display for readable gameplay on mobile and desktop.
- [x] Keep deterministic painted-cavern fallback when image loading fails; version and rules stay unchanged as this is purely visual.
- [x] Regression tests for WebP existence, correct quadrant crop and fallback robustness.
- [ ] Owner physical-device playtest for visual contrast at boss telegraphs and pickups.

## Release 1.4 — Beacon (publicly promoted October 15, 2026)
- [x] Lab first: improved amber trap assistance, score stamps blinking outside the captured tile, smaller Sliver head indicator, numeric-only mutation selection keys.
- [x] Removed separate First Hunt training, preserving the minimal arcade HUD.
- [x] Public promotion separately authorized by owner and deployed under public site commit `bc87595aec415756a143c628e1991f95e6018fbb`.
- [x] Preserved public ranked `hive-1.3` simulation/replay rules, previous verified scores and first-party authentication. Public My Profile displays server-verified, saved boss discovery milestones, not unverified defeat claims.

## Release 1.5 — Matriarch (solo Game Lab experiment, NOT public)
- [x] **Broodmother** becomes a fifth, three-capture full boss at evolution 12 in Predator Hunt and is selectable in unranked The Lair. Original 20×20 pixel artwork and a 6.5-second charged **Egg Bloom** telegraph produce four short-lived blocking egg tiles. Warning phase is 0.9 seconds; active hazard lasts 3.2 seconds and cannot materialize under occupants.
- [x] **Hatchling Ward** is an original White+Green synergy: when both mutation families are owned, spend one shield and one Green bonus-growth charge to place a stationary hatchling at the current head tile with Q or the contextual tap button. One ward at a time; its 3×3 deterrence makes ordinary prey prefer safe alternate routes, with a 24-move lifetime. Bosses ignore the ward; the ward does not award score or energy.
- [x] **WUBRG synergies:** Blue+Red simultaneously active slow/frenzy effects yield more steering time; Black+Green can save one extra body segment during Emergency Molt by spending one Green charge. No additional mutation colors or draft choices.
- [x] Standalone replay verifier recognizes valid Ward decisions as deterministic events and rejects forged/invalid placements. Lab gameplay `RULES_VERSION` is `hive-1.5`.
- [ ] Release acceptance: Lab regression suite, CI, Cloudflare deployment and owner hands-on playtest.
- [ ] **Future public promotion requires entirely separate owner approval and synchronized browser/server `hive-1.5` replay handling.** Never copy the solo Lab engine or ranked APIs directly to the public website. Older `hive-1.3` results must remain preserved and correctly distinguished.
- [ ] Real iPhone/Android Broodmother fairness, Hatchling Ward tap control and visual contrast checks.


## Current definitive vision (2026-10-16) — Dominion 2.0
**The complete, up-to-date roadmap is [HIVE-RUN-2.0-ROADMAP.md](HIVE-RUN-2.0-ROADMAP.md).** Older unchecked tasks above are historical design notes, not automatically future content commitments.

- **Two finished modes**, not an indefinite expansion: Brood Trail retains grow-to-fill classic arcade play, while Predator Hunt culminates with the fifth and final boss, the Broodmother.
- **Director Mode: Game Lab only, NEVER publish.** Dedicated `/director/` tool for immediate first/final boss phases, half-speed, invulnerability and fake victory rehearsal. Does not touch scores, auth, saved records or ranked replay. Explicit permanent exclusion in the promotion policy.
- **Predator Hunt growth redesign: proposed, not built.** Investigate seven-segment fixed length or a narrow cap. Redesign Hunt-only Green/Black growth-dependent mutation effects deliberately and run boss-capture fairness playtests. Brood Trail keeps unbounded growth. Any engine change requires a new version.
- **Authentic final celebrations: not yet implemented.** Perfect-clear celebration for Brood Trail; final victory only after defeating Broodmother for Predator Hunt. Director's forced victory is an unranked test rehearsal, not a legitimate win.
- **Release gate:** physical device signoff, ranked browser/server replay equivalence, historical score preservation, separate owner-approved production PR, verified deployment, and absolute exclusion of `director/**`.
- Existing Lab Matriarch implementation is at `hive-1.5.2`, not the stale temporary-egg /`hive-1.5` description above. No sixth boss is in scope.
