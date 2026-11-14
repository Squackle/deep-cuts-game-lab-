# GRAFTBOUND v1.2.6 mobile card display hotfix (Game Lab only)

Owner QA on iPhone Safari (November 14, 2026) identified two separate presentation defects:

1. **Inverted/mirrored pack cards:** iOS WebKit could show a back face after the three-dimensional card flip when a filtered/scrolling ancestor is involved. For reward cards at mobile widths (≤760px), use an explicit two-face visibility switch instead of CSS `rotateY`, so a revealed Magic image is never drawn from behind. The existing reveal/skip logic and rarity timing remain unchanged.
2. **Card zones overlap spell hand:** Previous `bottom: ...+94px` assumed one hand height. After `renderHand`, the card-zone dock measures the actual top of `#tray` and its HUD container and positions itself at least 14px above the tray, including in smaller viewport sizes. Resizes and visual viewport changes update the measurement. The deck/graveyard actions remain accessible.
3. **Authentic standard Magic card back:** For facedown library cards and pack cards, the shared `backHTML()` now loads Scryfall's documented `https://cards.scryfall.io/back.png` as an external, read-only image. Its prior GRAFTBOUND design remains behind the image for offline or failed requests. The image is NOT bundled or re-created in this repository. The owner explicitly requested real backs; this does **not** grant or verify a license for Wizards of the Coast's artwork, which requires separate review before wider promotion.

No simulation, rewards, save keys, score/replay rules, Magic front artwork, other games, or main-site code is modified.

## Tests

- `npm run assets` regenerates 21 expected sprite sheets.
- `npm test` local: **274 total, 273 pass, 0 fail, 1 skipped network-only Scryfall check**.
- Focused `v1261-mobile-cards.test.mjs`: explicit card-back source/fallback, Safari upright face visibility, and measured zone-dock logic.
- Headless Chromium static CSS fixture across viewport 320×568, 375×667, 390×844, 430×932, 700×1000: card-zone rail above tray with measured ~14px clearance, correct front/back visibility on reveal. The fixture is NOT a physical iPhone Safari or full game playthrough.
- Run GitHub unit/curated card-fact CI, unified Game Lab checks and release-coordination gates against the exact PR head before merge. Confirm Cloudflare production deployment SHA afterward.

Rollback: revert this isolated PR, retaining the prior v1.2.6 Game Lab main SHA `f60d9f0625f7e4f5a47dd0e31e74903cd01daed3`.
