# Playtest and Quality Assurance

Mark checks only after verification. Capture device, browser, build and observed results.

## Device matrix

- [ ] 320px portrait phone
- [ ] 375px portrait phone
- [ ] 390px portrait iPhone-class phone
- [ ] 768px tablet
- [ ] Desktop keyboard
- [ ] Real iOS Safari (when available)
- [ ] Real Android Chrome (when available)

## Gameplay and UX

- [ ] Game loads independently of backend connectivity.
- [ ] Four-direction swipe works without accidentally scrolling the page.
- [ ] Rapid reverse or multiple inputs in one tick do not cause impossible turns.
- [ ] WASD and arrow movement works on desktop.
- [ ] Collectibles only spawn on free tiles.
- [ ] Pickup increases score and hive length.
- [ ] Wall/self collision ends the run correctly.
- [ ] Restart resets run and preserves best score.
- [ ] Pause and foreground/background interruptions are safe.
- [ ] No clipped HUD/control buttons or horizontal overflow.
- [ ] Text and controls readable outdoors on phone.
- [ ] Audio is optional/muted until user input, settings persist.
- [ ] Reduced-motion options do not hide gameplay-critical state.
- [ ] No uncaught console errors or missing licensed assets.
- [ ] Automated tests cover pure rules and restart.

## Playtest feedback record

- **Build / commit / URL:**
- **Device / OS / browser:**
- **Minutes played / number of retries:**
- **Swipe control difficulty (1–5):**
- **Most fun moment:**
- **Most confusing or unfair moment:**
- **Bug and steps to reproduce:**
- **Suggested improvements:**
- **Would you play again tomorrow? Why?:**
- **Severity:** blocker / high / medium / polish
- **Resolution and verification (after fix):**

Transfer significant findings into dated DEVLOG entries. Never mark untested outcomes as passing.

## Alpha 0.2 mutation regression matrix

- [ ] Fifth brood freezes movement and music; exactly three different choices display
- [ ] Draft cards all fit on 320px portrait and remain accessible at 375px, 390px and 768px
- [ ] 1, 2, 3 keyboard shortcuts select the visible mutation
- [ ] White: shield charge visible, consumed on fatal wall/self hit; avoids death
- [ ] Blue: visible aura and slowed movement expire after 28 steps
- [ ] Black: stored molt charge, consumes three tail segments to survive collision
- [ ] Red: speed increase, 2× brood points for 24 steps, then normal score returns
- [ ] Green: four bonus-growth pickups add one extra segment each
- [ ] Multiple drafted powers co-exist and timers decrement only during running play
- [ ] Draft choice visibly modifies the creature and updates mutation inventory/HUD
- [ ] Music stops for draft/death/pause, resumes after choice if enabled
- [ ] Reset clears mutations and buffs but retains local personal best
- [ ] Real-device touch steering after a draft has no delayed or unexpected turn
