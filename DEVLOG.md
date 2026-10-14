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
- **Verification:** pending final CI and live browser confirmation for this commit. Main Deep Cuts EDH production site remains unchanged.
