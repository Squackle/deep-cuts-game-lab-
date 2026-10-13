# Technical Architecture — Proposed

## Project boundaries

GitHub repository: https://github.com/Squackle/deep-cuts-game-lab- . **Keep Sliver Swarm game development separate from Squackle/deep-cuts-edh**; don't deploy game experiments to the production site. Cloudflare Pages test project is **not yet provisioned**. Do not claim a live URL before verifying a deployment.

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

## Intended structure (not yet implemented)

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
