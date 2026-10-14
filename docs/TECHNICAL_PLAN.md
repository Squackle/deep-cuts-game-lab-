# Technical Architecture — Proposed

## Project boundaries

GitHub repository: https://github.com/Squackle/deep-cuts-game-lab- . **Keep Sliver Swarm game development separate from Squackle/deep-cuts-edh**; don't deploy game experiments to the production site. Cloudflare Pages test project `deep-cuts-game-lab` is created and verified live at https://deep-cuts-game-lab.pages.dev/; automatic deployments from GitHub main are enabled.

## Recommended stack

- **Renderer:** Canvas 2D, nearest-neighbor image scaling, local original sprites.
- **Code:** ES modules / modern vanilla JavaScript initially; add Phaser only if complexity justifies it.
- **Model:** Pure state functions handling movement, pickup spawning, collisions and scoring independent of browser.
- **Simulation:** Fixed ticks decoupled from requestAnimationFrame, with lag cap/pause on backgrounding.
- **Input:** Swipe recognizer for touch/pointer, desktop arrow/WASD, normalized single-direction queue; block impossible instant U-turns.
- **Accessibility:** keyboard accessible menus, visible pause controls, reduced-motion accommodations, readable HUD.
- **Persistence:** versioned localStorage for best score and mute option (try/catch safe fallback). No login needed for first version.
- **Testing:** Node native test runner for deterministic model, browser viewport smoke tests for mobile, manual real-device QA.
- **Hosting:** Static Cloudflare Pages with independent build/deploy pipeline; add server functions only when justified for leaderboards.

## Initial implementation (and proposed future module split)

~~~text
/
  index.html
  styles.css
  src/
    main.js          boot and lifecycle
    game-state.js    pure rules and state
    config.js        balance and game settings
    renderer.js      Canvas drawing
    input.js         touch and keyboard normalization
    storage.js       high scores and preferences
    audio.js         optional sound, gesture-gated
  assets/            original sprites and audio, with licensing manifest
  tests/             rules and input tests
  docs/
    GAME_DESIGN.md
    ROADMAP.md
    DECISIONS_AND_RISKS.md
    TECHNICAL_PLAN.md
    PLAYTEST.md
  DEVLOG.md
~~~

## Engineering guardrails

No fake game interactions; protect v0.1 scope. Prevent impossible 180° U-turns, pickups inside the hive, or time skips on returning from background tabs. Use touch-action restrictions only on game play area. Offer restart independent of network. Do not copy third-party proprietary graphics or music. Keep user feedback and tested deployment links dated in DEVLOG; mark anything not implemented honestly.


## v0.1 implemented reality

- `src/engine.js`: pure deterministic movement, collision, spawning and game state.
- `src/main.js`: Canvas drawing, swipe/key/on-screen controls, loop, pause, best-score persistence and sound.
- `index.html`, `styles.css`: static mobile-first game UI.
- `tests/engine.test.mjs`, `.github/workflows/game-tests.yml`: automated engine and syntax checks.
- Additional modules, bosses and mutation handling in the earlier proposed file layout are **not yet implemented**.


## Alpha 0.2 — Evolution system architecture

- `src/engine.js`: pure deterministic mutation choices, game state, effects, duration-limited powers, safe collision rescue, scoring and double growth; can be unit-tested without browser APIs.
- `src/evolution-ui.js`: DOM-managed accessible mutation buttons, mobile three-choice draft and active buff HUD.
- `src/evolution-visuals.js`: independent Canvas aura and evolution bursts, reduced-motion aware.
- `src/main.js`: event integration; pauses the fixed-step loop/audio on draft, resumes after chosen mutation, updates HUD on every simulation step.
- `tests/mutations.test.mjs`: pure-model regression checks. Existing tests for movement, soundtrack, background and pickups stay enabled in CI.
- `src/soundtrack.js`: already implemented original Web Audio theme; paused during mutation selections.
- No new route, remote backend or main-site production change required. All five color effects work locally; high scores remain on-device until server-side anti-abuse and profiles are designed.


## Alpha 0.3 predator engine and portable leaderboard

- `src/enemies.js` holds bounded flood-fill prey AI, motion, safe spawns and capture conditions. `src/engine.js` runs deterministic seeded movement, energy progression, WUBRG, rare orbs, captures and game terminal state. `src/enemy-render.js` draws original contrast-corrected enemy shapes and capture burst.
- `src/leaderboard-client.js` logs accepted turns and choices per simulation tick. `functions/api/leaderboard.js` verifies the entire finished run using the **same pure simulation modules** and accepts a score only if it agrees with every step. Games still work offline/unranked.
- `src/integration.js` is the single identity/URL adapter for eventual main-site merge. All assets/APIs live below the game folder, rather than absolute site root.
- The Game Lab uses isolated D1 `deep-cuts-hive-leaderboard`, bound to Pages as `HIVE_DB`. There are no writes to the main EDH database or main EDH repository.
- Profile deep links point to `community.html?profile=Handle`; handles are not authenticated cross-origin and are clearly flagged **unverified**. After main-site merge, verify with the same-origin remembered-device session server-side; see `docs/MAIN_SITE_MERGE.md`.
