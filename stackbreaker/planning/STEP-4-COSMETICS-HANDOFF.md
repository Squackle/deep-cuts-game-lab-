# Stackbreaker Roadmap — Step 4 Cosmetic Equipment

**Date:** 2026-10-19  
**Status:** Implemented in isolated Game Lab branch. Mark completed **only after** green CI, preview QA, merge and SHA-matched Cloudflare production deployment.  
**Owner authorization:** User said “next” after verified Step 3, authorizing Step **4/10 only**.  
**Tracking:** [Issue #96](https://github.com/Squackle/deep-cuts-game-lab-/issues/96); feature branch `game/stackbreaker-cosmetics-step4-20261019`.

## Scope and implementation

- `src/cosmetics.js` **pure appearance module**: 13 titles, 7 frames (white, blue, black, red, green, plus prismatic and gold), 6 VFX themes (five colors and prismatic), all derived from the previously committed 24-achievement catalog. The base **Default** choice in each category is always available.
- A cosmetic may be chosen only when `evaluateMastery(ledger).unlocked` confirms its **source achievement** was earned through authentic Step 3 Classic results. Six advanced and three server Daily milestones remain locked; no free unlock on browsing, animation or edited equip preferences. Foreign, stale, corrupted, or locked stored IDs are discarded by `sanitizeCosmeticEquip`. The separate local key is `dc-stackbreaker-cosmetics-local-v1`.
- `template.html` adds a keyboard-accessible expandable **Arcane Identity** gallery and a purely local profile **preview**, with disabled locked buttons, `aria-pressed`, `aria-live`, five mana frame previews, prismatic/gold future frames, and text labels for all colors. The word **LOCAL / UNVERIFIED** is always visible. This is **not** a real My Profile picture/frame or authoritative account item.
- `observatory.css` styles the frames and color-coded VFX palette, mobile 390px / desktop layouts and reduced-motion opt-out. No remote art or licensed assets added.
- `src/ui.js` validates user equip clicks through `equipLocalCosmetic`, persists locally, previews title/frame, and decorates an **actual existing spell resolution event** by adding only an inert `cosmeticTheme` string. Game rules, mana payment, targets, damage, outcomes, stars, hints, campaign, and Daily scored attempts are untouched.
- `src/vfx-events.js` only sets a whitelisted `data-vfx-theme` attribute on the existing pointer-inert, aria-hidden spell VFX overlay; the outcome-gated effect and reduced-motion cancellation remain unchanged. A cosmetic never creates a new spell or fakes a win.
- `build.py` includes the cosmetics module before game UI; rebuilt standalone `index.html` uses current isolated source, static bundled Core/Daily/Mastery scenario data.
- `tests/cosmetics.test.mjs`: 10 checks for 24 catalog IDs, all 26 display reward choices, actual Selfless Spirit first win unlocking first-responder title + white frame, locked/future rewards, tampering, persistence isolation, stale local grant revocation, unchanged engine states, whitelisted FX overlays, reduced-motion suppression, and standalone/builder parity. Full 250 Classic and Daily/Mastery regression suite must also pass.

## Release boundaries and validation

1. **Step 4 is NOT website integration.** Locally modifiable `dc-stackbreaker-mastery-local-v1` and `dc-stackbreaker-cosmetics-local-v1` cannot provide authenticated profile badge, official frame or signed ownership proof. All new visuals are Game Lab local preview only; website developer-owned Step 9 needs *fresh explicit owner approval* and trusted replay verification.
2. Step 5 advanced typed stack and other rules are not started. No rules, cards, scenarios, player identities, D1 tables, main public website, lab catalog or other game lanes are changed.
3. At final PR head, require Unified Game Lab tests + release coordination green. Cloudflare SHA-matched preview then browser QA at 390px and 1280px: exercise legitimate earned title/frame equip, locked reject, reset/default, reload local equip persistence, VFX theme overlay, no horizontal overflow, and reduced motion when possible. Do not claim tests that are rate-limited.
4. Merge to Lab main with explicit head SHA, then verify exact merged SHA on successful **production** `deep-cuts-game-lab` Pages deployment. Update roadmap issue #96 to **4/10** only after these gates.
5. Rollback: revert this PR. Existing Classic keys `dc-stackbreaker-progress-v3`, `dc-stackbreaker-last-level`, Daily `dc-stackbreaker-daily-local-v1`, and mastery `dc-stackbreaker-mastery-local-v1` remain untouched. Cosmetic key can harmlessly persist on clients.
6. **Next permitted work:** Step 5 typed advanced engine foundation only after owner says “next.”
