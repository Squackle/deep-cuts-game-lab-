# Milestones & Release Checklist

## Repository and isolation

- [x] Separate GitHub repo established: **Squackle/deep-cuts-game-lab-** (note trailing hyphen).
- [x] Source-of-truth documentation and dated DEVLOG introduced.
- [ ] Set up separate Cloudflare Pages project and verify live testing URL.
- [ ] Decide legally safe final game title and original art.
- [ ] Add CI checks once actual game code exists.

## Prototype 0.1 — Genuine arcade gameplay

- [ ] Responsive crisp Canvas arena playable portrait on iPhone and desktop.
- [ ] Deterministic four-direction fixed-timestep hive movement.
- [ ] Touch swipes and WASD / arrow controls.
- [ ] No immediate 180° reversal or accidental scroll inside game area.
- [ ] Valid spawn tiles; brood pickup, score and hive growth.
- [ ] Arena boundaries and self-collision cause game over.
- [ ] One-tap restart and persistent personal best.
- [ ] Start, pause, resume, safe background/visibility handling.
- [ ] Simple on-screen instructions; accessible buttons and focus.
- [ ] Automated movement, pickup, collision and restart tests.
- [ ] Mobile width tests: 320px, 375px, 390px; tablet 768px; desktop.
- [ ] No horizontal overflow or obstructed touch targets; mobile browser manual QA.
- [ ] Isolated test site deployed and checked; commit, URL and results logged.

**Acceptance criterion:** A player can load the site on a phone without installing anything, swipe to turn, collect brood, grow, collide, lose, restart and chase a real saved high score. No mocked controls.

## Alpha 0.2 — Hive mutations / hazard stages

- [ ] Mutation selection draft with three choices after a score threshold.
- [ ] Five meaningful mutation families with tested whole-swarm effects.
- [ ] Stage changes: Hatchery, Burrows, Fracture.
- [ ] Terrain walls, enemy movement, fair difficulty escalation.
- [ ] Balance based on recorded real playtests.

## Beta 0.3 — Engagement and polish

- [ ] Daily seeded challenge and reproducible conditions.
- [ ] Client and/or server scoreboard design, abuse protection before online leaderboards.
- [ ] Original pixel-art creatures, animations and optional chiptune/sound.
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
