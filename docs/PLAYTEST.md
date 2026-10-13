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
