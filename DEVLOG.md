# Game Development Log — Deep Cuts Game Lab

This is the permanent development timeline and handoff record for the proposed retro arcade game. Keep entries in chronological order. Distinguish **implemented and verified** from **planned**.

## 2026-10-13 — Project conception and design baseline

**Status:** DESIGN DOCUMENTED; DEVELOPMENT NOT STARTED. No separate GitHub repository, playable build, or Cloudflare test project existed **at the time of this entry** (see subsequent entries).

### Background

- The owner of Deep Cuts EDH asked whether an actual, playable video game could be integrated into the website—not merely a UI animation or a trivia widget.
- An early idea was *Commander Dungeon*, a much larger top-down action roguelike. To minimize complexity and validate gameplay quickly, the discussion shifted toward adaptations of classic arcade mechanics.
- The inspiration referenced was Rethink35's Frogger-style adaptation: recognizable, quick-to-learn arcade play with a distinctive topical theme.
- Several concepts were brainstormed: Snake-like **Sliver Swarm**, Space Invaders-like **Eldrazi Invaders**, Breakout-like **Mana Breaker**, Pac-Man-like **Graveyard Escape**, and Bomberman-like **Goblin Bombardment**.
- **Sliver Swarm** became the favored direction because growing a swarm with shared upgrades is intuitively compatible with Snake's mechanics, and the retro aesthetic is appealing.
- The user explicitly said **the game must work on mobile**, and specifically liked that Sliver Swarm would be retro.
- A **separate GitHub repository and Cloudflare test site** were proposed so iteration doesn't touch the live Deep Cuts EDH site or require searching its large codebase.

### Working game identity

- **Working title:** Sliver Swarm (provisional; potential MTG IP concerns).
- **Core pitch:** “A growing hive. Endless mutations. One mistake ends the run.”
- **Genre:** Snake-inspired arcade survival with upgrades and hazards.
- **Platforms:** Mobile and desktop browsers. Mobile is mandatory from prototype 0.1.
- **Orientation:** Portrait-first phone layout; desktop adapts to a centered playable arena.
- **Visual direction:** Crisp 1990s-style pixel art; dark green / warm gold palette, simple UI, no need for official MTG artwork.
- **Target typical run:** Approximately 2–5 minutes, to be playtested rather than treated as a strict requirement.

### Intended core loop

1. Spawn as a single hive creature moving continuously across a grid.
2. Swipe to turn on mobile, use WASD/arrow keys on desktop.
3. Collect brood to score points and lengthen the swarm.
4. Avoid walls, obstacles, foes, and collisions with the growing body.
5. After enough brood, choose one of three mutations that apply to the *whole swarm*.
6. Survive escalating stages and attempt a higher score; collision ends the run unless a defensive upgrade intervenes.

### Proposed mutation families

| Path | Philosophy | Example power | Design state |
| --- | --- | --- | --- |
| White — Carapace | Defense/protection | Hardened Shell: absorb one collision | Concept |
| Blue — Adaptation | Precision/control | Temporal Drift: briefly slow the arena | Concept |
| Black — Regeneration | Sacrifice/recovery | Emergency Molt: lose three tail segments to survive | Concept |
| Red — Frenzy | Speed/scoring | Blood Rush: temporary speed and scoring multiplier | Concept |
| Green — Brood | Growth/expansion | Rapid Brood: extra segments / brood bonus | Concept |

The family names and implementations are **proposals**, not tested balance decisions.

### Proposed content progression

- **The Hatchery:** beginner arena for movement and growth.
- **The Burrows:** tighter passages, obstacles, basic enemies.
- **The Fracture:** changing hazards and dangerous ground.
- **The Broodmother:** proposed boss stage, deferred beyond the first simple prototype.

Planned modes are **Arcade** (endless high-score play) and later **Daily Challenge** (same seeded arena for all players). Menus may later include Leaderboards and a Mutation Guide. Persistent profiles, server leaderboards, achievements, and boss campaigns are **not part of the minimal prototype**.

### Mobile requirements (explicit user priority)

- Portrait mode fully playable without rotation.
- Swipes to change direction; no reliance on keyboard or hover.
- Responsive from narrow phones (including 320 px, 375 px, 390 px) to tablets and desktop.
- Touch gestures within the game must not scroll the page accidentally.
- Pause on tab/app interruption; obvious on-screen pause and restart.
- No installation; play immediately in a normal browser.
- Aim for smooth 60 Hz rendering on modern phones (performance target, not a verified metric).
- Respect reduced-motion preference where feasible; user-controllable audio.

### First milestone — v0.1

Build one **genuinely playable** Snake-style arena: real movement, directional input, brood pickups, body growth, scoring, collision/game-over logic, start/restart, pause/resume, and an attractive mobile layout. Avoid premature scope creep into bosses, accounts, multiplayer, or elaborate card/MTG integrations. Verify on actual mobile-sized browser viewports and include simple automated logic tests.

### Copyright, trademark and fan-use boundary

The user explored using official MTG art, pixelating and renaming characters, and offering the game for free. None of those steps automatically authorizes MTG character/art use in a separate video game. Wizards' Fan Content Policy restricts using Wizards IP in other games, even free ones. **No official artwork, Sliver illustrations, MTG character designs, card images, card mechanics copied verbatim, or protected names should ship as game content absent the required permission and legal review.** Use original hive creatures and an original final name if necessary. External reference: https://company.wizards.com/en/legal/fancontentpolicy .

### Technical and operational decisions proposed

- Keep the game in a **separate repository** (`Squackle/deep-cuts-game-lab` proposed; not yet created).
- Use HTML5 Canvas and modern JavaScript modules, initially with minimal dependencies; Phaser is optional if later justified.
- Grid-based fixed-timestep logic should be separate from rendering and input.
- Store local best score locally at first; add an authenticated server leaderboard only after gameplay is fun and security needs are addressed.
- Deploy to a **separate Cloudflare Pages project** for testing. Only link it from the main site once ready.
- Use a simple, modular layout with folders for `src/`, `assets/`, `tests/` and `docs/` when implementation starts.

### Decisions still needed from owner

- Confirm final name and legally safe theme/visual identity.
- Confirm whether the first build should contain just endless Arcade mode (recommended) or stage completion objectives.
- Choose first-pass difficulty and mutation timing after trying playable v0.1.
- Confirm preferred controls for one-handed mobile use: swipe anywhere on arena is the current concept.
- Decide whether high scores should initially remain on device or later connect to Field Network.

### Verification and links

- **None yet:** This entry records a design conversation, not a released game or a provisioned repository.
- Existing production website (unaffected): https://deep-cuts-edh.pages.dev/

### Next action

Create the separate `deep-cuts-game-lab` repository; commit this documentation; then implement v0.1 gameplay in the new repository and deploy it to an isolated test project.

---

## Entry template (append for each development session)

### YYYY-MM-DD — Short descriptive title

- **Status:** planning / in progress / implemented / verified / blocked
- **Goal:**
- **Decisions:**
- **Files changed:**
- **Testing performed and results:**
- **Deployment / commit:**
- **Known issues and risks:**
- **Next action:**

---

## 2026-10-13 — Separate GitHub repository established, project notes imported

- **Status:** DOCUMENTATION COMMITTED; GAMEPLAY NOT STARTED; TEST SITE NOT CREATED.
- **Goal:** Preserve the full design conversation and establish a separate source of truth away from the public Deep Cuts EDH site.
- **Repository found:** [Squackle/deep-cuts-game-lab-](https://github.com/Squackle/deep-cuts-game-lab-) — **note the actual GitHub repository ends with a trailing hyphen**. The proposed name without the hyphen is not the created repository.
- **Decisions:** Mobile-first, genuine gameplay, pixel-art retro identity, Snake-inspired growth, full-swarm mutations, Arcade-first prototype, later challenges/leaderboards; all gameplay details remain proposals until tested.
- **Files established:** README.md, DEVLOG.md, docs/GAME_DESIGN.md, docs/ROADMAP.md, docs/TECHNICAL_PLAN.md, docs/DECISIONS_AND_RISKS.md, docs/PLAYTEST.md and .gitignore.
- **Protection:** No files were changed in Squackle/deep-cuts-edh; no game code or Cloudflare deployment is implied by creating documentation.
- **Verification:** Confirmed GitHub repository and write access; reviewed starter documentation. Commit link: see repository history for this entry.
- **Remaining tasks:** Create the isolated Pages test project; build and test prototype v0.1; record real-device feedback in this log.
- **Open legal risk:** Sliver Swarm is a working project name, not permission to use Wizards' Sliver character/art IP. Use original assets unless properly licensed.


---

## 2026-10-13 — Separate Cloudflare site created and playable prototype deployed

- **Status:** DEPLOYED AND LIVE-BROWSER VERIFIED. First working v0.1 arcade build; not feature-complete.
- **URL:** https://deep-cuts-game-lab.pages.dev/ (Cloudflare Pages project: deep-cuts-game-lab).
- **GitHub source:** https://github.com/Squackle/deep-cuts-game-lab- (the repository includes a trailing hyphen).
- **Deployment configuration:** GitHub source, automatic deployments from main; separate from Squackle/deep-cuts-edh production.
- **Game commit:** https://github.com/Squackle/deep-cuts-game-lab-/commit/5527d3f6045f218de36937b18f6f375a4a4a59c0
- **CI:** https://github.com/Squackle/deep-cuts-game-lab-/actions/runs/38483294930 — successful Node tests and JS syntax check.
- **Cloudflare deployment:** 07fa6bd7-a555-4715-81c7-bf20073a1d5b — reported success.
- **Actually implemented:** Original-creature Snake gameplay, Canvas pixel graphics, fixed timestep, keyboard/WASD and touch-swipes, four on-screen direction buttons, collectible spawn/growth, 100-point scoring, stage/speed scaling, wall/self-collision, pause/resume, restart, on-device personal best and optional synthesized audio.
- **Automated tests:** Ten engine checks for movement, reverse-turn blocking, pickup growth, score/stage, wall/self collision, tail exception, pause, deterministic spawning and win condition. All passed in Actions.
- **Live browser testing:** 390px viewport had no horizontal overflow; Start, Pause, Resume and Restart controls worked. 320px viewport showed arena and four direction controls with no overflow. Desktop 1280px viewport also showed gameplay and Start worked without overflow.
- **Not yet verified:** Extended actual gameplay playtests on physical iOS Safari/Android Chrome; touch feel, scoring and death in real multi-minute runs, 375px/tablet breakpoint, high-score persistence through full restarts on a physical device.
- **Not implemented:** Mutation draft, enemy stages and bosses, seeded daily challenge, public leaderboard, Field Network linkage or multiplayer. Stages currently increase by brood count, not new maps.
- **IP caution:** Public prototype is branded HIVE RUN with original geometric creatures. Sliver Swarm remains the working concept title only; no official MTG artwork or Sliver character is used.
- **Next steps:** Open the test URL on a phone and play it; capture swipe control/pace feedback. Fix issues in this game repository, then introduce mutation mechanics after basic controls feel good.


---

## 2026-10-13 — Input latency response: v0.1.1

- **User feedback:** First mobile build is fun, but input feels far too slow.
- **Diagnosis:** Swipe movement was processed only on finger **release** (pointerup), up to one 155 ms simulation tick later; only one turn could be queued, so rapid cornering could be lost. Touch-pad buttons also waited for click/release.
- **Change:** Detect the first deliberate swipe after 12 px of movement on `pointermove`, with a pointerup fallback for very quick flicks. Execute direction-pad commands on pointerdown while keeping keyboard/screen-reader click activation. Queue up to two valid turns for consecutive movement ticks (while rejecting 180-degree reversals). Start movement tick at 120 ms, scaling to a 75 ms floor as the run progresses. Reset captured gesture state on pause/restart.
- **Files:** `src/engine.js`, `src/main.js`, `tests/engine.test.mjs`, `index.html`.
- **Risk/tradeoff:** Faster speed increases difficulty; owner should test on an actual phone and give feedback. Gesture changes make touch input register during swipe rather than requiring finger lift. Actual perceived latency varies by screen and device.
- **Verification:** **PASSED, v0.1.1.** Final corrected engine regression suite passed **13/13 tests** in [GitHub Actions run 38484426135](https://github.com/Squackle/deep-cuts-game-lab-/actions/runs/38484426135). Cloudflare Pages reported **successful production deployment** `db2cb7b5-b619-4b6c-8fee-13ab553a01b1` at commit `db11c7f0ae596975e05d103a6d07fe9f881745c8`. Browser-rendered verification at 390px on https://deep-cuts-game-lab.pages.dev/ observed the creature actually move upward after a simulated pointerdown+pointermove while the finger was **still down**; no horizontal overflow and the v0.1.1 badge was present.
- **Testing correction:** Two transient failed Actions runs reflected an incorrect **test fixture/expectation** (a move onto a vacating tail square is permitted; a fatal collision does not advance the head). The final test asserts collision against a still-occupied segment and all checks pass. No gameplay defect was identified in these failures.
- **Remaining feedback:** Please confirm whether shorter 120ms start cadence plus early swipe detection feels better on a physical phone. Real-device Safari/Android touch responsiveness still needs user playtesting.


## 2026-10-13 — v0.1.2: creature identity and gentler movement

- **User feedback:** Movement should be a tiny bit slower, but retain immediate mobile input. Creature should resemble a segmented sliver with a distinct head, tail, and 45 visually different body-section types.
- **Implemented:** Base movement tick increased from 120 to **135 ms** (minimum speed 85 ms, down from 75 ms), preserving early-swipe detection and buffered turns.
- **Implemented:** Original procedural pixel creature artwork drawn on Canvas: elongated horned head with eye and beak, tapered hooked tail, and **45 deterministic combinations** of armor, dorsal spines, crests, markings and colors for middle sections. Segments are oriented along movement; body patterns remain consistent while moving.
- **Copyright approach:** New pixel artwork is original and sliver-inspired, not a transformation or trace of official MTG illustrations.
- **Next QA:** Verify tests and actual mobile browser rendering. Long-term polish: turn-joint transitions and silhouette refinement.


## 2026-10-14 — v0.1.3: Save approved art and put it in the actual game

- **User request:** Save the generated HIVE RUN WUBRG concept sheet and move its character design into the playable game.
- **Original saved:** Full 1312×1199 PNG concept sheet uploaded to persistent ChatGPT Library: `/Deep Cuts Game Lab/Hive Run - WUBRG Creature Concept.png`.
- **Implementation:** 45 body sections selected from the poster (9 per W/U/B/R/G color row), plus pointed single-armed head and double-pronged tail. Pixel-reduced and indexed for a tiny embedded sprite module, without third-party hosting or extra network requests. Uses native browser zlib decompression; existing procedural art is retained as fallback.
- **Gameplay:** Render actual concept-derived sprites, rotated with movement direction, connected with a WUBRG-colored spine. Every new body section cycles W/U/B/R/G, while successive cycles use new section designs. Adds an on-page Creature Codex preview of all 45 body types, head and tail.
- **Files:** `src/creature-sprites.js`, `src/main.js`, `index.html`, `styles.css`, `docs/ART_DIRECTION.md`, tests, README, CI.
- **QA: VERIFIED.** [GitHub Actions run 38489259321](https://github.com/Squackle/deep-cuts-game-lab-/actions/runs/38489259321) completed **successfully** (engine, sprite-data tests and JS syntax). Cloudflare deployment `1f704f6f-ef7f-4c95-88d5-13e2c495ca48` completed **successfully** for commit `6dcd5ab8208c9e85be0ce30a8aeaa32798fac67a`. A live 390px mobile browser audit showed v0.1.3, no horizontal overflow, 45-section Creature Codex drawn (8,575 non-background body-region pixels), visible head (722) and forked tail (349), four touch controls, and Start entered IN MOTION with overlay hidden. Physical-device QA is still pending. Source artwork is an original generated concept and does not incorporate a pasted official card image.


## 2026-10-13 — Level 01: The Hatchery background integrated (v0.1.4)

- **Owner direction:** Stop deferring game updates to copy-paste patches; directly edit and deploy the code. Use the newly generated Gothic Alien Hive background for Level 1.
- **Approved source:** Original vertical 941 × 1672 pixel Hatchery artwork, featuring spines, glowing organic egg clusters, textured central floor, and WUBRG colors.
- **Source preservation:** Saved the full PNG to persistent ChatGPT Library at `/Deep Cuts Game Lab/Hive Run - Level 1 Hatchery Background.png`.
- **Game asset:** Optimized real WebP source at `assets/backgrounds/hatchery.webp` (240 × 427, 12,430 bytes), committed as a binary Git blob. Game loads this local image; no network hosting dependency or copied third-party assets.
- **Rendering:** New `src/level-background.js` handles image loading, fallback, subtle tint and grid overlay. Main Canvas draws the image every frame before food and original WUBRG creature artwork. Entire artwork is retained, not center-cropped; readability overlay remains subtle.
- **Level labeling:** HUD names **Level 01 / The Hatchery**; the numerical Stage counter remains a rising speed tier, not a change in background or map (no other levels built yet).
- **Status: DEPLOYED AND VERIFIED.** Build commit `bd1fd30633501b676fdb40193476517c9c1014cf` successfully deployed as Cloudflare Pages deployment `2d26d7f5-8d13-4a3d-835b-18c1c939fb81`. GitHub Actions run [38491324429](https://github.com/Squackle/deep-cuts-game-lab-/actions/runs/38491324429) passed. A live 390px mobile browser test confirmed the optimized WebP returned as a real loaded 240 × 427 image, `PROTOTYPE 0.1.4 · HATCHERY` was visible, Level 01 Hatchery appeared in the arcade cabinet, there was no horizontal overflow (390px content for 390px viewport), and Start entered `IN MOTION`. Extended physical-phone QA remains pending.


## 2026-10-13 — v0.1.5: Hatchery readability / brood visibility fix

- **User feedback:** The first-level background is too intense, and the brood orbs are very difficult to distinguish from the brightly colored background eggs.
- **Implemented:** Increased the full-arena dark veil from 12% to 36%, darkened each bright edge independently using transparent gradients, and reduced grid contrast. Art remains visible and full-frame, but is distinctly subordinate to gameplay.
- **Implemented:** Replaced the small flat gold diamond with a high-contrast brood beacon: dark near-black disc, thin ivory rim, bright amber center, white core and sparkle, plus soft pulsing radial glow extending beyond one cell. The animation does not affect collision or score logic.
- **Files:** `src/level-background.js`, `src/pickups.js`, `src/main.js`, `index.html`, new tests, CI.
- **Verification: PASSED and LIVE.** Commit `83fff16e1057c463659986da29415371a15865dd` deployed successfully to Cloudflare Pages deployment `8b20bd2c-d984-44c7-a0c1-6a1ec233e8c2`. [GitHub Actions run 38491878510](https://github.com/Squackle/deep-cuts-game-lab-/actions/runs/38491878510) passed engine, background/pickup and syntax checks. Live 390px mobile browser test confirmed v0.1.5, the original Hatchery asset loaded, no horizontal overflow (390px), the upgraded orb drew a bright white core RGB (255,249,231), and pressing Start entered `IN MOTION`. Main Deep Cuts EDH production site remains unchanged.


## 2026-10-13 — v0.1.6: Original retro soundtrack for Alpha 0.2

- **Owner request:** Include a cool retro soundtrack in the upcoming major Evolution & Mutations update.
- **Delivered early:** Original, code-composed **The Hatchery Theme**: 108 BPM, eight bars, original melody with square-wave lead, triangle arpeggio, sawtooth bass, and synthesized kick/snare/hi-hat. No samples, streaming, external libraries or asset copyright questions.
- **Mobile/accessibility:** Independent `♫ MUSIC ON/OFF` button alongside existing effects toggle, saved preference, no autoplay on page-load, music can be enabled from the ready screen, Web Audio timing rather than frame-timed sounds, stops on pause/death/background and can resume without resetting the composition.
- **Source:** `src/soundtrack.js` exports a deterministic original composition and lightweight Web Audio scheduler. `src/main.js` starts/stops based on game state; `index.html` and `styles.css` add touch-friendly controls and track info.
- **Still planned:** The three-choice mutation system and five WUBRG abilities, new maps/enemies, and potential further music for future levels. This is a soundtrack addition, not a claim Alpha 0.2 is complete.
- **Verification: PASSED and DEPLOYED.** Commit `33fa4e9aed9f78d99127339cfe7876230faa1c50` deployed successfully to Cloudflare Pages deployment `bb27adad-f59a-4bbe-844d-530ebf768b0c`. [GitHub Actions run 38492848717](https://github.com/Squackle/deep-cuts-game-lab-/actions/runs/38492848717) passed the full Node regression suite, including soundtrack sequence/scheduler checks and syntax checks. Live 390px browser confirmed an eight-bar 108 BPM soundtrack with all six voices, 10 oscillators actually created during playback, separate music and effects toggles, saved on/off preference, and no further notes scheduled after pause. Live 320px mobile check confirmed all four action buttons were legible 43px-high targets in a 2×2 arrangement, no horizontal overflow, and a running game. Real physical-phone listening is still useful for volume/timbre feedback.


## 2026-10-13 — Alpha 0.2: Complete five-color evolution system

- **User request:** Implement in one deployment the major update promised: draft every five brood, all five real WUBRG powers, evolution visuals, HUD/status, soundtrack integration and robust tests.
- **Pure game engine:** Deterministic three-distinct-color draft per five brood; draft freezes game and pauses music. Select using mobile cards or keys 1/2/3. Effects: white collision shield, blue 28-step slow-time, black rescue charge consuming three tail segments, red 24-step speed/2× points, green four double-growth pickups. Color effects stack with bounded durations; collision saves pick a safe diversion or respawn safely when trapped.
- **Visuals:** Whole-swarm WUBRG-colored protection/slow/frenzy/molt/growth effects, animated evolution burst respecting reduced-motion, selected mutation announcement.
- **HUD:** Owned color counts, active effect durations/charges, countdown to next draft and number of evolutions. Main Hatchery stage speed-tier counter remains separate from actual map progression.
- **Music:** Original Hatchery theme from v0.1.6 preserved; stops while draft is open, resumes upon selection if user enabled music, without automatic page-load sound.
- **Files:** `src/engine.js`, `src/evolution-ui.js`, `src/evolution-visuals.js`, `src/main.js`, `index.html`, `styles.css`, dedicated test files, roadmap and QA notes.
- **Excluded intentionally:** Stage 2/3 maps, hazards, enemies, daily challenge and multiplayer, all of which remain separate later milestones.
- **Verification: DEPLOYED, CI PASSED, MOBILE SMOKE PASSED.** All Alpha 0.2 gameplay features were committed together in `f35d264812c4051e7e2769f4aaebce61dc778151` and deployed successfully as Cloudflare Pages deployment `8b1fe736-43b5-412f-a856-3c61b84f0e1e`. [GitHub Actions run 38494069394](https://github.com/Squackle/deep-cuts-game-lab-/actions/runs/38494069394) completed successfully, running the complete Node regression suite and module syntax checks. Independently checked all 17 new mutation model tests and all 13 original engine tests with no failures. Live 320px mobile-browser check confirmed `ALPHA 0.2 · EVOLUTION`, no horizontal overflow, a deterministic fifth-brood draft with three distinct options, three accessible touch cards all fitting within the 336px-tall arena without internal scrolling, card click callbacks, a working White shield inventory/status render, and main game Start entering `IN MOTION`. Manual real-device balancing, audio perception, full multi-run mutation playtests and additional browser widths (375px, 390px, tablet, desktop) remain pending; an additional live browser call was temporarily blocked by Cloudflare Browser Rendering rate limits.


## 2026-10-13 — Approved combat redesign: HUNT → TRAP → EVOLVE (planning only)

- **Owner approved direction:** Move away from primarily orb-based Snake progression; enemies move continuously and try to avoid danger, while the growing player body acts as a light-cycle-style barrier to surround and capture them. Rare orbs remain but spawn much less frequently.
- **Owner expanded scope:** Enemies, minibosses and bosses should appear after specified numbers of **completed evolutions**.
- **Encounter design:** First proposed schedule is a miniboss at 2, 6, 10, etc. evolutions; a full boss at 4, 8, 12, etc. Miniboss requires two successful trap phases; full boss requires three. Bosses change visible behavior per phase, with protected between-phase respawns. AI continuously moves outside clear countdown/transition windows and favors survival while remaining catchable.
- **Provisional economy:** prey +3 EV, rare orb +1 EV (20–32 sec active-time spawn), 5 EV per chosen mutation, miniboss +5 EV, boss +8 EV. Carry over excess energy. Numbers are design values pending testing, not shipping behavior.
- **Design resource:** Added [Predator Loop & Evolution Bosses](docs/ENCOUNTER_DESIGN.md), with kill-credit logic, AI safety, combat mutations, encounter roster, mobile HUD and test gates. Updated GDD, roadmap and decision register. No gameplay code changed by this design commit.
- **Live reality:** Current Alpha 0.2 on isolated Game Lab site remains orb/evolution based, without moving enemies or bosses. The next gameplay implementation must follow the design stages and pass CI/mobile checks before making feature claims.


## 2026-10-13 — Original three-tier battle music (Alpha 0.2.1)

- **Owner request:** Include original music for ordinary enemies, minibosses and bosses, each a distinctive retro composition.
- **Composed:** Skitter Chase (ordinary prey, 124 BPM), Stalker's Pursuit (miniboss, 142 BPM), Warden of the Hive (boss, 156 BPM). Previous The Hatchery Theme (108 BPM) remains. Every piece is a newly authored 8-bar chiptune with original melody, chords, bass, synthesized kick/snare/hat.
- **Player interface:** Four accessible music-preview buttons in the sidebar, with current title/tempo, touch targets and separate Music/Effects toggles. Music is user-gesture gated and muted when draft, pause, death or tab hidden.
- **Encounter integration:** Original soundtrack module now accepts distinct tracks via a track registry, deterministic sequencer, track selection method and encounter-to-track mapping. Future boss code must call the director when real encounters begin; this does not imply any current live enemies or bosses.
- **Status: DEPLOYED AND VERIFIED.** Soundtrack feature committed at `b0e4c9cc15d1e2b369df58d229833bc3bdced47e`, then strengthened by note-range regression correction `a7ec9c0a322ead4228dcc1b38574489037a249e0` and 320px track-tile layout fix `f48145f2605e9846cb6320e29fd806fe40f163ef`. Final GitHub Actions run [38498142969](https://github.com/Squackle/deep-cuts-game-lab-/actions/runs/38498142969) passed, and final Cloudflare Pages deployment `06426e48-686e-4cc0-b82b-7476c1ad0a2a` succeeded. Live 390px mobile browser verified all four original compositions trigger actual oscillator output, preserve separate Sound/Music preferences, game still enters IN MOTION and pause prevents further notes. Live 320px phone browser confirmed no page horizontal overflow, a true two-column grid with four 132px-wide × 62px-high preview buttons, successful Boss preview selection and independent SFX still off. The next combat release must still connect automated track switching to real enemies, minibosses and bosses; those are not live.


## 2026-10-13 — Alpha 0.3: Predator Hunt and persistent leaderboard

- **Owner requested:** Deliver Alpha 0.3 with continuous enemy motion/Tron-body captures, kill-first evolution with rare orbs, and a public leaderboard linking to existing Field Network profiles, while preparing a frictionless future merge. Owner did not authorize editing the production Deep Cuts EDH repository.
- **Game mechanics:** Two enemy personalities (Skitter and Burrow Runner), no instant reversal, survival-scored bounded flood fill; start with a seven-segment player body for meaningful tactical barriers. Captures earn +3 EV; rare 20–32-second orbs earn +1; five EV triggers choice. Score, captures and evolution count tracked; five existing WUBRG powers retained with kill-related score/growth behavior.
- **Visual/audio:** Original pixel opponent silhouettes, capture burst, kill and energy HUD, rewritten onboarding, automatically switched Enemy Hunt soundtrack at game start.
- **Leaderboard:** Isolated `deep-cuts-hive-leaderboard` D1 created with `HIVE_DB` Pages production/preview binding, unique single-use seeded session, hourly rate limiter, completed-run replay verification in a Cloudflare Pages Function; official handles displayed as **user-supplied unverified profile links** until identity bridge can be built on the main domain. No main production files touched.
- **Portability:** Relative JS/CSS/image/API paths, one `src/integration.js` origin config, D1 migration SQL and `docs/MAIN_SITE_MERGE.md` copying/merging plan.
- **Verification: CI PASS / DEPLOYED / LIVE API PASS.** Gameplay release commit `64554c4f2b4faa2abe020b36c5f29747824ba3a0` and post-game submit shortcut commit `335713dec1f0a6dd67f0f19c6561604cade16e6e` deployed to Cloudflare Pages; latest deployment `c29abff9-3a96-44a0-bb5d-8ad1940967e3` succeeded. The final [GitHub Actions run 38500517370](https://github.com/Squackle/deep-cuts-game-lab-/actions/runs/38500517370) passed Node tests (pure engine, enemy AI, evolution, score replay, music, backgrounds and syntax). A live Cloudflare browser at 390px confirmed Alpha 0.3 labeling, no page horizontal overflow, live 1-prey HUD, score/energy indicators, Start entering IN MOTION and no captured JavaScript errors. Live Pages Function GET returned Alpha 0.3 rules and zero initial scores; a POST started a one-time seeded session, the exact shared engine replayed an eight-step game-over, POST accepted the 0-point matching replay (201), and a subsequent GET returned the test score; the test score was then removed from D1 (board returned to zero entries). Server-side replay spoof/invalid-turn cases are also covered by the CI suite. Further Cloudflare Browser Rendering tests at 320px and 768px were temporarily rate-limited; physical Safari/Android movement-and-trapping balance remains pending. Main Deep Cuts EDH repository and database were not modified.


## 2026-10-13 — Alpha 0.3.1: Half-speed prey balance adjustment

- Owner playtest feedback: “enemies move a bit too fast maybe half their speed.”
- Changed Skitter and Burrow Runner base movement intervals from 2 to 4 player simulation steps. Both still continuously pursue safe routes and cannot reverse instantly. Player speed, WUBRG mutations, capture scoring and rare-orb timers are unchanged.
- Added explicit test coverage for both enemy defaults, spawn interval and three waiting beats followed by a fourth-beat move.
- Leaderboard rules bumped to `hive-0.3.1` so faster predecessor runs are retained in D1 but not mixed with the slower update. Client reads the shared engine version rather than repeating a string constant.
- Deployment checks pending CI and Cloudflare verification.

## 2026-10-13 — Alpha 0.3.2: immersive UI cleanup and upcoming features

- Owner proposed a deployable stationary **Hatchling Ward** covering its tile and the eight neighboring tiles with an enemy-fear field; future design must address charges, duration, valid placement and verified score replay.
- Owner wants significant Level 1-to-Level 4 soundtrack escalation (draft playtest targets 80/105/132/165 BPM); this remains **future music work**, not live tempo changes.
- Removed the public creature codex, three bottom developer-resource links and interactive soundtrack-testing/preview interface. Preserved music mute, automatic encounter selection, internal soundtrack unit tests, leaderboard and WUBRG art used in actual play.
- **Verification: PASSED / DEPLOYED.** Commit `973e8e1fc37718fa47b26c3057b81831af8826d5` deployed successfully to Cloudflare Pages deployment `45baaa92-c39f-453b-bcf7-4ada515168d0`. [GitHub Actions run 38502196865](https://github.com/Squackle/deep-cuts-game-lab-/actions/runs/38502196865) passed all existing gameplay, soundtrack and syntax checks. Live 320px mobile browser confirmed no horizontal overflow, zero codex/music-preview/developer-link elements, working Music and Sound toggles, leaderboard intact, Hunt entering IN MOTION with prey visible, Enemy Hunt music enabled and pause working; no browser exceptions observed. Level music tempo rebalancing and Hatchling Ward are future work only.

## 2026-10-13 — Future idea: Classic Snake alternate mode (design only)

- Owner requested a second game mode that restores the original orb-only Snake loop, including the original five WUBRG mutations (White collision shield, Blue movement slow, Black three-segment emergency molt, Red speed/double orb points, Green bonus growth), a three-card mutation draft every five orbs, and progression through all game levels with their corresponding music.
- The new **Classic Snake** mode must have **no enemies, minibosses, bosses or kill-driven evolution**. It should be selectable separately from the existing **Predator Hunt** and share art, maps, soundtrack and UI components where practical.
- Classic mode and Predator Hunt should keep separate scoring and replay-verified ranking categories so the two rulesets remain comparable within their respective modes. Do not reintroduce soundtrack preview controls; players discover different themes through advancement.
- Recorded as a **future roadmap idea only**. No gameplay code, main-site repo or production UI modified by this documentation change.


## 2026-10-13 — Alpha 0.3.3: Game Only display and swipe protection

- Owner feedback: downward swipes scroll the webpage while playing, leading to accidental deaths. Added an accessible Game Only button directly in the arcade header, switching to an isolated screen-filling arcade UI with visible game controls. Tapping again returns to the original page position.
- Implemented viewport locking via `src/game-only.js`: fixed document height from `visualViewport`, scroll-gesture cancellation outside mutation overlay, fullscreen API when available, reliable iOS Safari CSS-only fallback, keyboard Escape, native fullscreen dismissal cleanup.
- Added touch-action and overscroll prevention for the arena and on-screen directional pad even outside Game Only, while preserving pointer-swipe turn handling. No changes to deterministic engine, rankings, enemy speed or mutations.
- **QA passed / deployed:** Gameplay+UI commit `51b8cd20ac5c78326124281bb719dd739874cae5`, aspect-ratio/leaderboard polish commit `27690febcfe25b5db6e3e5575470982507447f3b`. Final [GitHub Actions run 38504188337](https://github.com/Squackle/deep-cuts-game-lab-/actions/runs/38504188337) passed; Cloudflare Pages production deployment `50b7310f-e614-4439-b85a-583f0630bdb8` succeeded. Live 320×700 mobile browser verified game frame occupying 320×700, no underlying page scroll, no horizontal overflow, canvas aspect ratio 0.816 (target 18:22), touchmove scroll blocked, touch pad fully visible, game enters IN MOTION, exit returns to normal page and leaderboard, no JavaScript exceptions. Physical iPhone Safari gesture testing remains outstanding; browser chrome/system-edge gestures may be reserved.

- Final mobile QA polish: constrain arena height by viewport width to preserve the 18:22 canvas aspect ratio in Game Only; intercept the post-game score link to exit Game Only before scrolling to the leaderboard form.

## 2026-10-13 — Miniboss abilities and top-right charge ring (design-only update)

- Owner defined **Burrow Stalker** power: a **five-tile burrow** available every **10 seconds**. Design now requires a safe, visible arrival location, deterministic AI and clear counterplay.
- Owner defined **Tunnel Weaver** power: creates **one web tile per cast** every **10 seconds**. Contact **stuns player for two seconds**; an untriggered web disappears after **15 seconds**. Provisional cap of two simultaneous webs and anti-unavoidable-death behavior need testing.
- **HUD specification:** small boss/miniboss ability icon at the **top-right of the game**, with a clockwise **yellow/gold circular cooldown meter** surrounding it. A **completely yellow ring means charged**; it resets after use. Symbols: 🕳 (Burrow) and 🕸 (Web). Show only during an active encounter with a defined special ability, including Game Only.
- Timers use active gameplay time and freeze during pause/draft/intro/phase resets. Server-side replay and new regression coverage required when implemented.
- Added plans to encounter spec, roadmap and GDD. **No production gameplay code was changed or deployed in this design-only update.** The live build remains Alpha 0.3.3.


## 2026-10-13 — Alpha 0.4 signature cooldown icon art direction revised (design only)

- Owner requested symbols to better match the **Hatchery/Burrows gothic cave identity**, and the yellow ring to look **dingy rather than bright**.
- Replaced emoji glyphs in the planned UI specification with **custom icon art**: Stalker = fractured stone tunnel opening, Weaver = ragged irregular web fixed to cavern rock; textured, low-gloss look in worn limestone over peat-black backgrounds.
- Charge ring: **weathered ochre** `#98824B`, **fully charged antique brass** `#B19A5A`, dark olive recessed track `#414335`. Clockwise fill to a continuous dull brass ring at 100%; no flashy neon effects. Ready state additionally uses a small solid notch for non-color accessibility.
- This changes the **future Alpha 0.4 visual design only**. No existing game code, music, or production Deep Cuts site modified.


## 2026-10-13 — Alpha 0.4 Burrow Uprising implementation

- Owner approved one release implementing both minibosses with two trapping phases each, timed signature powers and **high-quality hand-authored pixel art**. Stalker at evolution 2 (and 10), Weaver at evolution 6 (and 14). Full bosses at 4/8 are a different future milestone and not falsely advertised as live.
- Built `src/miniboss.js` as a fully seeded, deterministic encounter/special-ability state machine, shared by browser and score replay. 10s active cooldown, exact 5-tile safe Stalker dash after 500ms marked entrance, 10s single web placement, 15s lifetime, max 2 webs, web contact freezes both sides for 2s to avoid an unfair forced death. Two real captures with safe respawns, only final capture awards +5 EV/+750 base/+2 growth.
- Built `src/boss-art.js` with original 20x20 hand-pixelled cave-mouth and rough cobweb sprites, nearest-neighbor rendering, centered art with mathematically accurate 64px chunky pixel-charge ring (`#98824b` charging / `#b19a5a` ready). Boss shapes appear in-arena, upper-right ability HUD is noninteractive and responsive including Game Only.
- Player-facing UI gains phase indicators, live cooldown and warning feedback, active encounter soundtrack changing automatically, and small high-contrast web/burrow telegraphs. No new public preview gallery and main Deep Cuts site unchanged.
- Ranked rules bumped to `hive-0.4.0`, historical D1 scores remain separated, original anti-fraud seeded full-replay validation retained, normal and minboss stats verified against exact same logic.
- **QA:** Pending end-to-end CI and live deployment confirmation before marking shipped.


## 2026-10-13 — Alpha 0.4.1: Slower, fairer player pace

- Owner feedback: "Unfortunately the game is a little bit too difficult. Can we tone the speed of the character down a little bit?"
- Changed **only the player movement pacing**: initial grid step from 135ms to **150ms** (~10% slower in grid steps per second), late-stage minimum from 94ms to **105ms**, retaining 4ms per 2 chosen evolutions speed scaling. WUBRG Blue/Red modifiers apply as before; deterministic model remains shared between browser and server. Existing enemy movement periods, miniboss burrow/web charges and trap mechanics remain untouched.
- Leaderboard rules version updated from `hive-0.4.0` to `hive-0.4.1` so different play speeds don't compete on the same ranked table; old scores preserved in D1.
- Added speed-curve and deterministic-input regression tests; changed the public release badge and game description to show new player pace.
- **Validation: ALL PASSED / LIVE.** Code commit `93f319781ba301e441804b9dac78c174ad78e091` deployed to production Pages deployment `659a89e0-4149-49ae-9769-5122396dfc2a` (success). [GitHub Actions run 38507679139](https://github.com/Squackle/deep-cuts-game-lab-/actions/runs/38507679139) passed the full gameplay, encounter, deterministic replay and syntax suite, including two new pacing tests. Live mobile browser at 320×700 confirmed Alpha 0.4.1 release badge, exact 150ms initial movement and 146ms after two mutations, unchanged Skitter/Runner 4-step periods, server leaderboard GET 200 on ruleset `hive-0.4.1`, Game Only fully fits 700px viewport with touch scrolling blocked and directional pad visible, Start entered IN MOTION, Pause entered PAUSED, Exit restored the page, and no captured JavaScript errors. Additional physical-device feel testing remains valuable.

## 2026-10-13 — Player-facing cleanup and enemy-only abilities clarified

- Removed the standalone player-training video and watch page from the Game Lab deployment at the owner's request, along with their GitHub documentation references. This does not alter gameplay or leaderboard rules.
- Confirmed signature powers are **exclusive to miniboss enemies now and to full-boss enemies when implemented**. The Burrow Stalker's five-tile Burrow Dash moves **the enemy**, while the Tunnel Weaver enemy lays player-stunning webs. Regular Skitter and Burrow Runner prey have no activated abilities, and the player cannot acquire boss abilities through mutation drafts.
- GitHub deletion and CI passed at commit `ec089801d55cdb9e41477d6d0c9b343679c7e83f`, but spot-testing exposed **stale CDN HITs** on the old exact URLs despite those assets being absent from the latest Git tree. Added a retired-path Cloudflare Pages Function returning **410 Gone, no-store**, so the old URLs no longer deliver the video or watch page. Deployment QA and exact-path verification pending.

## 2026-10-14 — Release 1.0 Paths of the Hive implementation

Owner authorized all committed remaining milestones plus a thematic classic Snake mode. Implemented **Brood Trail**, full Warden/Guardian three-capture bosses and distinct ten-second powers; safe terrain warnings and Burrows/Fracture/deep-Fracture rendering; four music-intensity tiers; Daily Ritual per mode with Central date keys; independent replay-verified boards and local records; new v1 tables without altering legacy score data; first-party profile integration and games-hub entry in the main repository.

Fairness fixes: collision checks retain a tail tile while growth debt exists; phase reset can recover from a full board without an infinite frozen loop; unsafe terrain activation cancels; surplus evolution energy yields the next earned draft. Original five WUBRG powers and slower 0.4.1 player pace retained. Enemy pathfinding uses bounded integer-grid flood fills to reduce replay CPU work without changing area scores.

Tests so far: 75 passing engine/audio/UI/API tests, including SQLite-backed D1 adapter transactions, duplicate submissions, mode/day isolation, spoofed-score rejection and server-derived profile ownership. Browser and production results follow after completion. The physical-phone balance check remains explicitly separate from automated browser emulation.

### Release verification before deployment

75 tests pass. Browser rendering checked at 320/375/390/768/1280 CSS pixels: no horizontal overflow or JavaScript errors, pause works, Game Only directional controls remain visible. The 320px start-menu clipping was corrected and rechecked; keyboard turn acceptance and resulting movement confirmed. Late-stage renderer fixtures verified Warden/Guardian art, centred ochre charge rings, phase banners, and Burrows/Fracture terrain. Fixtures are local QA only, not a shipped cheat/debug route. Authentic control-only replays were verified for a 225-step Predator run and a full 6,000-step Brood Trail run. Database schema applied additively; main Pages project receives the existing HIVE_DB while retaining DB. Production rollout is via each repository's main branch; verify deployed commit before announcing completion.

## 2026-10-14 — Hive Run 1.0.1 prey intelligence balance

Following owner feedback that ordinary enemies feel unreasonably difficult, split ordinary prey away from the advanced pathfinding AI. Skitters favor forward steps at 65% and Burrow Runners at 85%, both making legal but short-sighted turns without flood filling; minibosses and bosses retain enhanced long-range escape analysis and their established telegraphed abilities. Preserve speed, enemy contact danger, capture/evolution mechanics and Classic mode. Bumped rules version / daily seed to 1.0.1 to keep ranked replay verification consistent. Added regression tests for a tempting dead-end and intentional non-reversal. Next: owner playtest whether beginners can consistently reach evolution 2 while boss encounters remain tense.

## 2026-10-14 — Hive Run 1.0.2 beginner balance and input response

Implemented owner-selected fixes together: synchronous accepted-input marker/head facing, suppression of held-key repeats, one free ordinary prey-only Brood Instinct evasive recovery, nine seconds of active-play prey slowdown, single normal enemy until the third evolution, faster initial/early Hunt evolution orbs, and amber trap hints for zero/one legal escape directions. Boss speed, strategic AI, hazards, abilities and capture phases were preserved. Server and client use the same deterministic version `hive-1.0.2` with versioned daily seed and historical score isolation. The UI explains the free rescue and amber hints. Regression suite includes mechanic separation and input feedback. Await owner keyboard and touch playtest.

## October 14, 2026 — 1.0.3 Boss dossiers

Added polished cave-themed paused boss-introduction dossiers for the Burrow Stalker, Tunnel Weaver, Hatchery Warden, and Rift Guardian. Each is introduced once per encounter, not between individual capture phases, with an authentic boss-specific hand-drawn pixel ability icon, exact ability intervals, telegraphs, hazard durations, phase counts, and survival tips. Begin Encounter runs a fully paused three-second countdown. Regrouping freezes gameplay entirely, and backgrounding requires a fresh deliberate resume. No gameplay rules, seeded RNG, or server replay version changed.
