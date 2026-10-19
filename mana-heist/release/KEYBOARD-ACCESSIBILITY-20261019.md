# Mana Heist · Keyboard and Focus Accessibility Increment

**Game Lab-only release · October 19, 2026.**

## Authorization and scope

Owner requested "deploy next phase" after the in-game *manual device QA* checklist release. Without real phone observations to validate, this package advances the implementable **P11 accessibility** work supported by the existing source: keyboard card navigation, observable focus and safe return from the heist table. This is **not** a claim of independent hardware, screen-reader or formal WCAG acceptance testing, and it does not mark P11 complete.

Only `mana-heist/**` is changed. No rules, player saves, game economy, card content, scored puzzle difficulty or public-site account infrastructure changes.

## Before / after

- **Before:** cards were Tab/Enter/Space focusable and "I" inspected them, but card rows had no Left/Right/Up/Down/Home/End navigation. On crowded 8+ card mobile racks, the same card could be hard to reach by keyboard as card images overlapped. No rack-specific instructions were announced.
- **After:** focused card buttons in `#battlefield` and `#hand` support **Left/Right/Up/Down** one card at a time and **Home/End** to the first/last. The modifier keys are ignored, boundaries clamp, and Enter/Space/native button click plus I inspection retain their prior game logic. Navigation uses `focus({preventScroll:true})` and `scrollIntoView({block:"nearest",inline:"nearest"})` so the 8–12-source battlefield rack follows the focused card without relocating the fixed tabletop.
- **Before:** when a player returned to the campaign/lessons screen, active focus might remain on a button within the now-hidden `#gameScreen`.
- **After:** focus returns preferentially to the still-visible original launch control (including the manual QA test's stage-launch button), then to the same vault/lesson/bonus trial, and finally to the current mode button. Boot-time `showMap()` does not seize focus, and buttons in hidden panels are never chosen as the target.
- **Communication:** the optional Field Guide describes the keyboard mapping; a visually clipped but screen-reader-available description is linked to both card racks by `aria-describedby`. Focused cards have a clear high-contrast visible outline above overlapping images. No interaction forces users to drag cards.

## Deterministic tests

`node --test mana-heist/tests/*.test.mjs`, including new `keyboard-accessibility.test.mjs`, validates arrow direction, Home/End, boundary handling, skipping disabled cards, modifier passthrough, explicit focus/scroll behavior with DOM doubles, guide markup and focus restoration/source integration. Required PR Mana Heist + unified Game Lab + release-coordination checks, preview and exact-merged-SHA Cloudflare production deploy are gates.

**Not established without humans:** full screen reader usability, VoiceOver/TalkBack behavior, physical iPhone/Android/keyboard UX and WCAG conformance. The already shipped guided QA checklist remains the pathway for gathering actual evidence. These changes do not silently mark any of those nine cases Pass.

## Progress and rollback

500 scored campaign stages, 28 practice lessons, two local scored bonus trials, current v4 and archived v3 medals and all browser-local keys are unchanged. Pure keyboard UI functions do not call the mana reducer or save layer. Revert the isolated PR to restore prior focus behavior; no save migration needed.

P01 rights/brand review still BLOCKED. No promotion to Deep Cuts EDH public production website, which remains a separate authorization and workstream.

## Human smoke-test script after this deploy

From the campaign screen, expand **Guided Device Check**, open the **Keyboard and screen reader labels** case, and use a physical keyboard on the linked Fellwar lesson. Tab to Fellwar, arrow between cards, press Enter or Space to choose a source, Tab around the color-choice dialog, press Escape to cancel, press I to inspect a focused card, close the inspector and return to the map. Verify focus is now on an active visible lesson launcher rather than a hidden tabletop button. Repeat Galaxy X vault **451** with ten or more battlefield sources: arrows and End should bring the intended card into the swipeable rack without scrolling the whole page. **Do not mark any QA case Pass from this script alone; a human must actually perform and record the observation.**
