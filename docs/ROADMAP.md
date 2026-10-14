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

## Beta 0.3 — Engagement and polish

- [ ] Daily seeded challenge and reproducible conditions.
- [ ] Client and/or server scoreboard design, abuse protection before online leaderboards.
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
